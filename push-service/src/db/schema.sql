-- Subscriptions table
-- Stores push notification subscriptions for wallet addresses
CREATE TABLE IF NOT EXISTS subscriptions (
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

CREATE INDEX IF NOT EXISTS idx_wallet_address ON subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_endpoint ON subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_created_at ON subscriptions(created_at);

-- Notification log table
-- Optional table for debugging and analytics
CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'expired'
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_log_wallet ON notification_log(wallet_address);
CREATE INDEX IF NOT EXISTS idx_log_created ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_log_status ON notification_log(status);
