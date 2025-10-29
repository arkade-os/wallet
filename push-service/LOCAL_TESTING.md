# Local Testing Guide

This guide covers how to test the Web Push notification system locally without deploying to Cloudflare production.

## Option 1: Local Development with Wrangler (Recommended)

Wrangler provides a local development environment that simulates Cloudflare Workers locally using Miniflare. **No Cloudflare account needed for local testing!**

### Prerequisites

```bash
cd push-service
npm install
```

### Step 1: Create Local D1 Database

```bash
# Create local D1 database (stored in .wrangler/state/)
wrangler d1 execute arkade-push --local --file=./src/db/schema.sql
```

This creates a local SQLite database in `.wrangler/state/v3/d1/`.

### Step 2: Set Up Local Environment Variables

Create `.dev.vars` file in `push-service/` directory:

```bash
# Generate VAPID keys first
npm run generate-vapid
```

Copy the output and create `.dev.vars`:

```env
VAPID_PUBLIC_KEY=BN5E4Y1JGU9jT...
VAPID_PRIVATE_KEY=bipL3lXXXX...
VAPID_SUBJECT=mailto:test@localhost
API_KEY=test-api-key-12345
```

**Note**: `.dev.vars` is already in `.gitignore` and won't be committed.

### Step 3: Start Local Development Server

```bash
npm run dev
```

The push service will be available at `http://localhost:8787`

Output should show:
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### Step 4: Test the Local API

#### Test Health Endpoint

```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": 1698765432,
  "database": "connected"
}
```

#### Test Subscribe Endpoint

```bash
curl -X POST http://localhost:8787/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "ark1qtest123",
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/test-endpoint",
      "keys": {
        "p256dh": "BN5E4Y1JGU9jT...",
        "auth": "dGVzdGF1dGg="
      }
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "subscriptionId": "uuid-here"
}
```

#### Test Notify Endpoint (Protected)

```bash
curl -X POST http://localhost:8787/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-12345" \
  -d '{
    "walletAddress": "ark1qtest123",
    "notification": {
      "title": "Test Payment",
      "body": "You received 1000 sats",
      "icon": "/icon-192.png"
    }
  }'
```

**Note**: This will attempt to send a real push notification. If the endpoint is fake (as in our test), it will fail but log the attempt.

### Step 5: Configure Wallet to Use Local Push Service

Update wallet `.env`:

```env
VITE_PUSH_SERVICE_URL=http://localhost:8787
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key>
```

Start the wallet:

```bash
cd ..  # Back to wallet root
npm start
```

### Step 6: View Logs

Wrangler shows real-time logs in the terminal. You can also use:

```bash
# In another terminal
cd push-service
npm run tail  # Only works with deployed workers
```

For local dev, logs appear in the `npm run dev` terminal.

### Step 7: Inspect Local Database

```bash
# Query the local D1 database
wrangler d1 execute arkade-push --local --command "SELECT * FROM subscriptions"

# Or use SQLite directly
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT * FROM subscriptions;"
```

---

## Option 2: Mock Server for Testing (No Dependencies)

If you want a simpler mock without Cloudflare dependencies, you can use this Node.js mock server.

### Create Mock Server

Create `push-service/mock-server.js`:

```javascript
const http = require('http');

const PORT = 8787;

// Simple in-memory storage
const subscriptions = new Map();

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Health endpoint
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '1.0.0-mock',
      timestamp: Math.floor(Date.now() / 1000),
      database: 'connected'
    }));
    return;
  }

  // Subscribe endpoint
  if (url.pathname === '/subscribe' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      const id = crypto.randomUUID();
      subscriptions.set(data.walletAddress, { id, ...data.subscription });

      console.log(`✅ Subscription added for ${data.walletAddress}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, subscriptionId: id }));
    });
    return;
  }

  // Unsubscribe endpoint
  if (url.pathname === '/unsubscribe' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      subscriptions.delete(data.walletAddress);

      console.log(`❌ Subscription removed for ${data.walletAddress}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  // Notify endpoint
  if (url.pathname === '/notify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      const subscription = subscriptions.get(data.walletAddress);

      if (subscription) {
        console.log(`📬 Notification for ${data.walletAddress}:`);
        console.log(`   Title: ${data.notification.title}`);
        console.log(`   Body: ${data.notification.body}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sent: 1, failed: 0 }));
      } else {
        console.log(`⚠️  No subscription for ${data.walletAddress}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sent: 0, failed: 0 }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Mock Push Service running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /subscribe`);
  console.log(`   POST /unsubscribe`);
  console.log(`   POST /notify`);
});
```

Run it:

```bash
node mock-server.js
```

This mock server:
- ✅ Implements all API endpoints
- ✅ Stores subscriptions in memory
- ✅ Logs all operations
- ✅ No external dependencies
- ❌ Doesn't actually send push notifications (just logs them)

---

## Option 3: Full End-to-End Testing with Real Push

To test actual push notifications, you need real browser push endpoints. Here's how:

### Prerequisites

1. Real push service endpoint (use Wrangler local dev or deploy to Cloudflare free tier)
2. HTTPS for the wallet (required for service workers)
3. Browser that supports push notifications

### Step 1: Set Up HTTPS Locally

Use a tool like `mkcert` for local HTTPS:

```bash
# Install mkcert
brew install mkcert  # macOS
# or
sudo apt install mkcert  # Linux
# or
choco install mkcert  # Windows

# Create local CA
mkcert -install

# Create certificate for localhost
cd wallet
mkcert localhost 127.0.0.1 ::1

# Update vite config to use HTTPS
```

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    https: {
      key: './localhost+2-key.pem',
      cert: './localhost+2.pem',
    },
    port: 3002,
  },
  // ... rest of config
})
```

### Step 2: Start Services

Terminal 1 - Push Service:
```bash
cd push-service
npm run dev
```

Terminal 2 - Wallet:
```bash
cd wallet
npm start
# Now available at https://localhost:3002
```

### Step 3: Test Push Subscription

1. Open `https://localhost:3002` in your browser
2. Go to Settings → Notifications
3. Enable "Allow notifications" (grant permission)
4. Enable "Enable Push Notifications"
5. Check browser DevTools → Application → Service Workers

You should see an active push subscription.

### Step 4: Trigger Test Notification

Get your wallet address from the wallet UI, then:

```bash
curl -X POST http://localhost:8787/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-12345" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test from local dev!",
      "icon": "/icon-192.png",
      "data": {
        "type": "test",
        "timestamp": '$(date +%s)'
      }
    }
  }'
```

You should see a real push notification appear!

---

## Option 4: Docker-Based Local Testing

If you prefer Docker, here's a simple setup:

### Create `push-service/Dockerfile.dev`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install wrangler globally
RUN npm install -g wrangler

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 8787

# Run in dev mode
CMD ["npm", "run", "dev", "--", "--port", "8787", "--host", "0.0.0.0"]
```

### Create `push-service/docker-compose.yml`:

```yaml
version: '3.8'

services:
  push-service:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8787:8787"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    env_file:
      - .dev.vars
```

### Run with Docker:

```bash
cd push-service
docker-compose up
```

---

## Testing Checklist

### API Testing

- [ ] Health endpoint returns 200
- [ ] Subscribe endpoint accepts valid subscriptions
- [ ] Subscribe endpoint rejects invalid data
- [ ] Unsubscribe endpoint removes subscriptions
- [ ] Notify endpoint requires API key
- [ ] Notify endpoint sends to subscribed wallets
- [ ] CORS headers are present

### Database Testing

```bash
# Check subscriptions table
wrangler d1 execute arkade-push --local \
  --command "SELECT COUNT(*) FROM subscriptions"

# View all subscriptions
wrangler d1 execute arkade-push --local \
  --command "SELECT * FROM subscriptions"

# View notification log
wrangler d1 execute arkade-push --local \
  --command "SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 10"
```

### Frontend Testing

- [ ] Push support detected correctly
- [ ] Subscription toggle works
- [ ] Permission request appears
- [ ] Subscription status updates
- [ ] Settings UI shows correct state

### Service Worker Testing

Open DevTools → Application → Service Workers:

- [ ] Service worker is active
- [ ] Push subscription exists
- [ ] Push event handler registered

Test in console:

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg)
})

// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub?.toJSON())
  })
})

// Manually trigger a notification (for testing UI only)
navigator.serviceWorker.ready.then(reg => {
  reg.showNotification('Test', {
    body: 'Testing notification display',
    icon: '/icon-192.png'
  })
})
```

---

## Troubleshooting Local Development

### Issue: "Cannot find module 'wrangler'"

```bash
# Install dependencies
cd push-service
npm install
```

### Issue: "D1 database not found"

```bash
# Create local database
wrangler d1 execute arkade-push --local --file=./src/db/schema.sql
```

### Issue: "Address already in use (port 8787)"

```bash
# Find and kill process using port 8787
lsof -ti:8787 | xargs kill

# Or use a different port
wrangler dev --port 8788
```

### Issue: "Service worker not updating"

In browser DevTools → Application → Service Workers:
- Check "Update on reload"
- Click "Unregister" and reload page

### Issue: "Push subscription fails"

Check:
1. HTTPS is enabled (required for service workers)
2. Service worker is registered and active
3. VAPID public key is correct
4. Push service URL is accessible

### Issue: "CORS errors"

Make sure `ALLOWED_ORIGINS` includes your wallet URL:

In `.dev.vars`:
```env
ALLOWED_ORIGINS=https://localhost:3002,http://localhost:3002
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test subscribe endpoint
ab -n 100 -c 10 -T 'application/json' \
   -p subscribe-payload.json \
   http://localhost:8787/subscribe

# Test notify endpoint
ab -n 100 -c 10 -T 'application/json' \
   -H 'Authorization: Bearer test-api-key-12345' \
   -p notify-payload.json \
   http://localhost:8787/notify
```

### Load Testing with wrk

```bash
# Install wrk
brew install wrk  # macOS

# Test health endpoint
wrk -t4 -c100 -d30s http://localhost:8787/health
```

---

## Continuous Testing

### Watch Mode for Changes

While `npm run dev` is running, Wrangler automatically reloads on file changes.

To test automatically on changes:

```bash
# Terminal 1: Run push service
cd push-service
npm run dev

# Terminal 2: Watch and test
watch -n 2 'curl -s http://localhost:8787/health | jq'
```

---

## Next Steps

1. ✅ Test locally with `wrangler dev`
2. ✅ Verify all endpoints work
3. ✅ Test database operations
4. ✅ Test frontend integration
5. 🚀 Deploy to Cloudflare (free tier) for production testing
6. 🧪 Test with real Lightning payments

---

## Cost Information

**Local Development**: 100% FREE
- No Cloudflare account needed
- No external services required
- Runs entirely on your machine

**Cloudflare Free Tier** (for production testing):
- 100,000 requests/day
- Unlimited D1 database reads
- 5 million D1 writes/month
- More than enough for testing and small-scale production

---

## Resources

- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Miniflare (Local Workers)](https://miniflare.dev/)
- [D1 Local Development](https://developers.cloudflare.com/d1/platform/local-development/)
- [Web Push Testing Tools](https://web-push-codelab.glitch.me/)
- [Service Worker Debugging](https://developer.chrome.com/docs/workbox/troubleshooting-and-logging/)
