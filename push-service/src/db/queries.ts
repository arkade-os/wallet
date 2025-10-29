import { Subscription, NotificationLog } from '../types';

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in seconds
 */
function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  db: D1Database,
  walletAddress: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent: string | null
): Promise<string> {
  const id = generateId();
  const timestamp = now();

  await db
    .prepare(
      `INSERT INTO subscriptions (id, wallet_address, endpoint, p256dh, auth, user_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(wallet_address, endpoint)
       DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, updated_at = excluded.updated_at`
    )
    .bind(id, walletAddress, endpoint, p256dh, auth, userAgent, timestamp, timestamp)
    .run();

  return id;
}

/**
 * Get subscription by ID
 */
export async function getSubscriptionById(
  db: D1Database,
  id: string
): Promise<Subscription | null> {
  const result = await db
    .prepare('SELECT * FROM subscriptions WHERE id = ?')
    .bind(id)
    .first<Subscription>();

  return result;
}

/**
 * Get all subscriptions for a wallet address
 */
export async function getSubscriptionsByWallet(
  db: D1Database,
  walletAddress: string
): Promise<Subscription[]> {
  const result = await db
    .prepare('SELECT * FROM subscriptions WHERE wallet_address = ?')
    .bind(walletAddress)
    .all<Subscription>();

  return result.results || [];
}

/**
 * Get subscription by wallet address and endpoint
 */
export async function getSubscriptionByEndpoint(
  db: D1Database,
  walletAddress: string,
  endpoint: string
): Promise<Subscription | null> {
  const result = await db
    .prepare('SELECT * FROM subscriptions WHERE wallet_address = ? AND endpoint = ?')
    .bind(walletAddress, endpoint)
    .first<Subscription>();

  return result;
}

/**
 * Delete subscription by wallet address and endpoint
 */
export async function deleteSubscription(
  db: D1Database,
  walletAddress: string,
  endpoint: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM subscriptions WHERE wallet_address = ? AND endpoint = ?')
    .bind(walletAddress, endpoint)
    .run();

  return result.success;
}

/**
 * Delete subscription by ID
 */
export async function deleteSubscriptionById(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM subscriptions WHERE id = ?')
    .bind(id)
    .run();

  return result.success;
}

/**
 * Update last notified timestamp
 */
export async function updateLastNotified(
  db: D1Database,
  id: string
): Promise<void> {
  const timestamp = now();
  await db
    .prepare('UPDATE subscriptions SET last_notified_at = ? WHERE id = ?')
    .bind(timestamp, id)
    .run();
}

/**
 * Log a notification
 */
export async function logNotification(
  db: D1Database,
  walletAddress: string,
  subscriptionId: string,
  title: string,
  body: string | null,
  status: 'sent' | 'failed' | 'expired',
  errorMessage: string | null
): Promise<void> {
  const id = generateId();
  const timestamp = now();

  await db
    .prepare(
      `INSERT INTO notification_log (id, wallet_address, subscription_id, title, body, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, walletAddress, subscriptionId, title, body, status, errorMessage, timestamp)
    .run();
}

/**
 * Get notification logs for a wallet address
 */
export async function getNotificationLogs(
  db: D1Database,
  walletAddress: string,
  limit: number = 100
): Promise<NotificationLog[]> {
  const result = await db
    .prepare('SELECT * FROM notification_log WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?')
    .bind(walletAddress, limit)
    .all<NotificationLog>();

  return result.results || [];
}

/**
 * Clean up old notification logs (older than 30 days)
 */
export async function cleanupOldLogs(db: D1Database): Promise<number> {
  const thirtyDaysAgo = now() - 30 * 24 * 60 * 60;
  const result = await db
    .prepare('DELETE FROM notification_log WHERE created_at < ?')
    .bind(thirtyDaysAgo)
    .run();

  return result.meta.changes || 0;
}

/**
 * Get subscription count for a wallet
 */
export async function getSubscriptionCount(
  db: D1Database,
  walletAddress: string
): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM subscriptions WHERE wallet_address = ?')
    .bind(walletAddress)
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Get total subscription count
 */
export async function getTotalSubscriptionCount(db: D1Database): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM subscriptions')
    .first<{ count: number }>();

  return result?.count || 0;
}
