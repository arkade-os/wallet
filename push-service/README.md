# Arkade Push Service

A Cloudflare Worker-based push notification service for Arkade Wallet that enables Web Push notifications for Lightning Network payments.

## Features

- **Serverless**: Runs on Cloudflare Workers with zero infrastructure management
- **Scalable**: Auto-scales with Cloudflare's edge network
- **Privacy-focused**: Users can run their own instance
- **Simple deployment**: Single command deployment
- **Cost-effective**: Free tier covers most use cases (100k requests/day)
- **Web Push Protocol**: Industry-standard push notifications

## Architecture

```
┌──────────────────┐         ┌────────────────────────┐         ┌─────────────────┐
│   Arkade Wallet  │         │  Cloudflare Worker     │         │  Push Service   │
│   (PWA/Frontend) │────────►│  (Push Notification    │────────►│  (VAPID)        │
│                  │         │   Service)              │         │                 │
└──────────────────┘         └────────────────────────┘         └─────────────────┘
        │                              │
        │ Subscribe/Unsubscribe        │ Store in D1
        │                              ▼
        │                     ┌─────────────────┐
        │                     │ Cloudflare D1   │
        │                     │ (SQLite)        │
        │                     │ - subscriptions │
        │                     └─────────────────┘
        │                              ▲
┌──────────────────┐                   │
│   arkd Server    │───────────────────┘
│   (or webhook)   │   POST /notify
└──────────────────┘
```

## Prerequisites

- Node.js 18+ and npm/pnpm
- Cloudflare account (free tier works)
- Wrangler CLI (`npm install -g wrangler`)

## Quick Start

### 1. Install Dependencies

```bash
cd push-service
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create D1 Database

```bash
wrangler d1 create arkade-push
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "arkade-push"
database_id = "your-database-id-here"  # <- Update this
```

### 4. Run Database Migrations

```bash
wrangler d1 execute arkade-push --file=./src/db/schema.sql
```

### 5. Generate VAPID Keys

```bash
npm run generate-vapid
```

This will output:
```
Public Key: BN5E4Y...
Private Key: bipL3l...
```

### 6. Set Secrets

```bash
# Set VAPID keys
wrangler secret put VAPID_PUBLIC_KEY
# Paste the public key from step 5

wrangler secret put VAPID_PRIVATE_KEY
# Paste the private key from step 5

wrangler secret put VAPID_SUBJECT
# Enter: mailto:your-email@example.com

# Generate and set API key for webhook authentication
wrangler secret put API_KEY
# Enter a secure random string (e.g., use: openssl rand -base64 32)
```

### 7. Deploy

```bash
npm run deploy
```

Your worker will be available at: `https://arkade-push-service.your-account.workers.dev`

### 8. Configure Wallet Frontend

Update your wallet's `.env` file:

```env
VITE_PUSH_SERVICE_URL=https://arkade-push-service.your-account.workers.dev
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key>
```

## Local Development & Testing

**Want to test locally without deploying?** See **[LOCAL_TESTING.md](./LOCAL_TESTING.md)** for comprehensive local testing guides.

### Quick Local Setup (No Cloudflare Account Needed!)

```bash
cd push-service
npm install

# Create local database
wrangler d1 execute arkade-push --local --file=./src/db/schema.sql

# Generate VAPID keys
npm run generate-vapid

# Create .dev.vars with the keys
cat > .dev.vars << EOF
VAPID_PUBLIC_KEY=<paste-public-key>
VAPID_PRIVATE_KEY=<paste-private-key>
VAPID_SUBJECT=mailto:test@localhost
API_KEY=test-api-key-12345
EOF

# Start local dev server
npm run dev
```

The service will be available at `http://localhost:8787`

**Test it:**
```bash
curl http://localhost:8787/health
```

**See [LOCAL_TESTING.md](./LOCAL_TESTING.md) for:**
- Complete local testing guide
- Mock server alternatives
- End-to-end testing with real push notifications
- Docker-based testing
- Troubleshooting tips
- Testing checklist

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": 1698765432,
  "database": "connected"
}
```

### `POST /subscribe`

Register a push subscription for a wallet address (public endpoint).

**Request:**
```json
{
  "walletAddress": "ark1q...",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "BN...",
      "auth": "dG..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "uuid-here"
}
```

### `POST /unsubscribe`

Remove a push subscription (public endpoint).

**Request:**
```json
{
  "walletAddress": "ark1q...",
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response:**
```json
{
  "success": true
}
```

### `POST /notify` (Protected)

Trigger a push notification for a wallet address. Requires API key authentication.

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "walletAddress": "ark1q...",
  "notification": {
    "title": "Payment Received",
    "body": "You received 10,000 sats",
    "icon": "/icon-192.png",
    "tag": "payment-12345",
    "data": {
      "type": "payment_received",
      "amount": 10000,
      "timestamp": 1698765432
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0
}
```

## Development

### Local Development

```bash
# Start local dev server
npm run dev
```

This starts a local server at `http://localhost:8787` with hot reloading.

For local development with D1:

```bash
# Create local D1 database
wrangler d1 execute arkade-push --local --file=./src/db/schema.sql

# Run dev server with local D1
npm run dev
```

### View Logs

```bash
npm run tail
```

## Integration with arkd

To trigger notifications from your arkd server when Lightning payments are received:

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "os"
)

func notifyPaymentReceived(walletAddress string, sats int64) error {
    payload := map[string]interface{}{
        "walletAddress": walletAddress,
        "notification": map[string]interface{}{
            "title": "Payment Received",
            "body":  fmt.Sprintf("You received %d sats", sats),
            "icon":  "/icon-192.png",
            "data": map[string]interface{}{
                "type":      "payment_received",
                "amount":    sats,
                "timestamp": time.Now().Unix(),
            },
        },
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequest(
        "POST",
        os.Getenv("PUSH_SERVICE_URL")+"/notify",
        bytes.NewBuffer(jsonData),
    )

    req.Header.Set("Authorization", "Bearer "+os.Getenv("PUSH_SERVICE_API_KEY"))
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}
```

## Security

### API Key Authentication

The `/notify` endpoint requires API key authentication via Bearer token. This prevents unauthorized parties from sending notifications.

### CORS

Configure allowed origins in `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "https://wallet.arkade.money,https://arkade.money"
```

For development, use `*` to allow all origins:

```toml
[env.development]
vars = { ALLOWED_ORIGINS = "*" }
```

### Rate Limiting

Cloudflare provides built-in rate limiting. Additional rate limiting can be configured through Cloudflare dashboard.

## Third-Party Deployment

Anyone can run their own push notification service:

1. **Fork this repository**
2. **Follow the Quick Start guide above**
3. **Deploy to your Cloudflare account**
4. **Share your worker URL** with wallet users

Users can configure their wallet to use your push service by updating the `VITE_PUSH_SERVICE_URL` environment variable.

## Database Schema

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_notified_at INTEGER,
  UNIQUE(wallet_address, endpoint)
);
```

### Notification Log Table

```sql
CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'expired'
  error_message TEXT,
  created_at INTEGER NOT NULL
);
```

## Troubleshooting

### "Failed to subscribe" error

1. Check that VAPID keys are set correctly
2. Verify the worker is deployed and accessible
3. Check browser console for detailed error messages
4. Ensure notification permission is granted

### Notifications not appearing

1. Verify push subscription is active in settings
2. Check notification permission in browser settings
3. Test with `/health` endpoint to ensure service is running
4. Check Cloudflare Worker logs with `npm run tail`

### Database errors

1. Ensure D1 database is created and migrated
2. Verify `database_id` in `wrangler.toml` is correct
3. Check D1 dashboard in Cloudflare for database status

## Cost Estimates

Cloudflare Workers Free Tier:
- 100,000 requests/day
- 10ms CPU time per request
- Unlimited D1 database reads
- 5 million D1 writes/month

For most wallets, this is more than sufficient. Paid tier starts at $5/month for 10 million requests.

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Contact Arkade support

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for the Arkade Wallet ecosystem
