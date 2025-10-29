# Web Push Notifications Integration Guide

This guide explains how the Web Push notification system is integrated into the Arkade Wallet.

## Overview

The Web Push notification system consists of two main parts:

1. **Push Service** (Cloudflare Worker) - Handles subscription management and sending push notifications
2. **Wallet Frontend** - Manages user subscriptions and receives notifications

## How It Works

### 1. User Flow

1. User opens wallet settings and enables notifications
2. User enables "Push Notifications" toggle
3. Wallet requests permission from the browser
4. Browser prompts user to allow/deny
5. If allowed, wallet subscribes to Push Manager with VAPID key
6. Subscription is sent to Push Service and stored in D1 database
7. When a Lightning payment is received:
   - arkd server calls Push Service webhook
   - Push Service looks up user's subscriptions
   - Push notification is sent via Web Push protocol
   - Service worker displays notification
   - User clicks notification to open wallet

### 2. Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Action                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Wallet Frontend (React)                                     │
│  - User clicks "Enable Push Notifications"                   │
│  - Calls: subscribeToPushNotifications(walletAddress)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Browser Push Manager                                        │
│  - registration.pushManager.subscribe({                      │
│      userVisibleOnly: true,                                  │
│      applicationServerKey: VAPID_PUBLIC_KEY                  │
│    })                                                        │
│  - Returns: PushSubscription object                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Wallet Frontend                                             │
│  - POST /subscribe to Push Service                           │
│  - Body: { walletAddress, subscription }                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Push Service (Cloudflare Worker)                            │
│  - Validates subscription format                             │
│  - Stores in D1 database                                     │
│  - Returns: { success: true, subscriptionId }                │
└─────────────────────────────────────────────────────────────┘

        ═══════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Lightning Payment Received (arkd server)                    │
│  - Detects incoming payment to wallet                        │
│  - Calls: notifyPaymentReceived(walletAddress, sats)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  arkd Server                                                 │
│  - POST /notify to Push Service                              │
│  - Headers: Authorization: Bearer API_KEY                    │
│  - Body: { walletAddress, notification: {...} }             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Push Service                                                │
│  - Looks up subscriptions for walletAddress                  │
│  - For each subscription:                                    │
│    - Sends Web Push notification via web-push library        │
│    - Logs result (sent/failed)                               │
│    - Removes expired subscriptions                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Browser Push Service (FCM/Mozilla/etc)                      │
│  - Receives encrypted notification                           │
│  - Routes to user's device                                   │
│  - Delivers even if wallet is closed                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Worker (wallet-service-worker.ts)                   │
│  - 'push' event triggered                                    │
│  - Parses notification data                                  │
│  - Displays notification via showNotification()              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User                                                        │
│  - Sees notification on device                               │
│  - Clicks notification                                       │
│  - Wallet opens to /wallet page                              │
└─────────────────────────────────────────────────────────────┘
```

## Code Components

### Frontend Components

#### 1. Service Worker (`src/wallet-service-worker.ts`)

Handles push events and notification clicks:

```typescript
// Listen for push notifications
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || {}
  const { title, body, icon, badge, tag, data: payload } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge, tag,
      data: payload,
      vibrate: [200, 100, 200],
    })
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/wallet'))
})
```

#### 2. Notification Library (`src/lib/notifications.ts`)

Push subscription functions:

- `isPushSupported()` - Check if browser supports push
- `getPushSubscription()` - Get current subscription
- `subscribeToPushNotifications(walletAddress)` - Subscribe to push
- `unsubscribeFromPushNotifications(walletAddress)` - Unsubscribe

#### 3. Notifications Provider (`src/providers/notifications.tsx`)

React context for push notification state:

```typescript
interface NotificationsContextProps {
  pushSupported: boolean
  pushSubscribed: boolean
  subscribeToPush: (walletAddress: string) => Promise<boolean>
  unsubscribeFromPush: (walletAddress: string) => Promise<boolean>
  checkPushSubscription: () => Promise<void>
}
```

#### 4. Settings UI (`src/screens/Settings/Notifications.tsx`)

User interface for enabling/disabling push notifications.

### Backend Components (Push Service)

#### 1. Main Router (`src/index.ts`)

Routes requests to appropriate handlers.

#### 2. Handlers

- `handlers/subscribe.ts` - Handle subscription registration
- `handlers/unsubscribe.ts` - Handle unsubscription
- `handlers/notify.ts` - Handle notification webhook (protected)
- `handlers/health.ts` - Health check endpoint

#### 3. Database (`src/db/`)

- `schema.sql` - Database schema for D1
- `queries.ts` - Database query functions

#### 4. Push Logic (`src/push/`)

- `send.ts` - Send push notifications via web-push
- `vapid.ts` - VAPID key utilities

#### 5. Middleware (`src/middleware/`)

- `cors.ts` - CORS headers
- `auth.ts` - API key authentication

## Environment Configuration

### Wallet Frontend

Add to `.env`:

```env
VITE_PUSH_SERVICE_URL=https://push.arkade.money
VITE_VAPID_PUBLIC_KEY=<vapid-public-key>
```

### Push Service

Set via `wrangler secret`:

```bash
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT
wrangler secret put API_KEY
```

### arkd Server

Add to environment:

```env
PUSH_SERVICE_URL=https://push.arkade.money
PUSH_SERVICE_API_KEY=<secure-api-key>
```

## Browser Compatibility

### Desktop
- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 79+
- ✅ Safari 16+ (macOS 13+)
- ❌ Internet Explorer (not supported)

### Mobile
- ✅ Android Chrome 50+
- ✅ Android Firefox 44+
- ✅ iOS Safari 16.4+ (requires PWA "Add to Home Screen")
- ❌ iOS Safari (in-browser, not as PWA)

## Security Considerations

### 1. VAPID Keys

- Generated once per deployment
- Private key must remain secret
- Public key is shared with clients
- Subject should be mailto: or https: URL

### 2. API Key Authentication

- Required for `/notify` endpoint
- Use cryptographically secure random string
- Rotate periodically
- Never commit to version control

### 3. Subscription Data

- Only stores endpoint URLs and encryption keys
- No personal information required
- Subscriptions auto-expire if delivery fails
- Users can unsubscribe anytime

### 4. CORS

- Configure allowed origins in production
- Use wildcard (*) only for development
- Prevents unauthorized access from other domains

## Testing

### 1. Test Push Subscription

1. Enable notifications in wallet settings
2. Enable push notifications toggle
3. Check browser DevTools → Application → Service Workers
4. Should see active push subscription

### 2. Test Notification Sending

```bash
# Using curl
curl -X POST https://push.arkade.money/notify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "ark1q...",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test",
      "icon": "/icon-192.png"
    }
  }'
```

### 3. Check Health

```bash
curl https://push.arkade.money/health
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

## Debugging

### Enable Service Worker Logs

In Chrome DevTools:
1. Application tab → Service Workers
2. Check "Update on reload"
3. Click "Inspect" to see console logs

### View Push Subscription

```javascript
// In browser console
navigator.serviceWorker.ready.then(registration => {
  registration.pushManager.getSubscription().then(subscription => {
    console.log('Push subscription:', subscription.toJSON())
  })
})
```

### Test Notification Display

```javascript
// In browser console (requires notification permission)
new Notification('Test', {
  body: 'This is a test notification',
  icon: '/icon-192.png'
})
```

## Common Issues

### Issue: "Push notifications not supported"

**Solution**: Check browser compatibility. On iOS, must be installed as PWA.

### Issue: Notifications not appearing

**Checklist**:
- [ ] Notification permission granted
- [ ] Service worker active
- [ ] Push subscription exists
- [ ] Push service URL configured
- [ ] VAPID public key set
- [ ] Do Not Disturb mode disabled (device)

### Issue: "Failed to register subscription"

**Causes**:
- Invalid VAPID key
- Push service unreachable
- CORS misconfiguration
- Service worker not registered

**Debug**: Check browser console and network tab for errors.

## Performance Optimization

### 1. Subscription Caching

Push subscription status is cached in React state to avoid repeated checks.

### 2. Database Indexes

Queries use indexes on `wallet_address` and `endpoint` for fast lookups.

### 3. Batch Processing

Multiple subscriptions for same wallet are processed in parallel.

### 4. Auto-Cleanup

Failed/expired subscriptions are automatically removed to reduce overhead.

## Future Enhancements

### Possible Improvements

1. **Rich Notifications**: Add images, action buttons
2. **Notification History**: Store notification log in wallet
3. **Custom Sounds**: Different sounds for different notification types
4. **Notification Preferences**: Fine-grained control over notification types
5. **Multi-Device Sync**: Sync read/unread status across devices
6. **Analytics**: Track notification delivery rates

### Notification Types

Currently supports:
- Payment received

Future types:
- Payment sent confirmation
- Transaction settled
- VTXOs rolled over
- Swap completed/failed
- Security alerts

## Resources

- [Web Push Protocol](https://www.rfc-editor.org/rfc/rfc8030)
- [VAPID Specification](https://www.rfc-editor.org/rfc/rfc8292)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

---

For questions or issues, please open an issue on GitHub or contact the Arkade team.
