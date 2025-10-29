import * as webpush from 'web-push';
import { NotificationPayload, Subscription, Env } from '../types';
import { updateLastNotified, logNotification, deleteSubscriptionById } from '../db/queries';

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  env: Env,
  subscription: Subscription,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Set VAPID details
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );

    // Construct the push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    // Send the notification
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 3600, // 1 hour
      }
    );

    // Update last notified timestamp
    await updateLastNotified(env.DB, subscription.id);

    // Log success
    await logNotification(
      env.DB,
      subscription.wallet_address,
      subscription.id,
      payload.title,
      payload.body || null,
      'sent',
      null
    );

    return { success: true };
  } catch (error: any) {
    let errorMessage = error.message || 'Unknown error';
    let shouldDelete = false;

    // Check if subscription is expired or invalid
    if (error.statusCode === 404 || error.statusCode === 410) {
      errorMessage = 'Subscription expired or invalid';
      shouldDelete = true;
    }

    // Log failure
    await logNotification(
      env.DB,
      subscription.wallet_address,
      subscription.id,
      payload.title,
      payload.body || null,
      shouldDelete ? 'expired' : 'failed',
      errorMessage
    );

    // Delete expired subscriptions
    if (shouldDelete) {
      await deleteSubscriptionById(env.DB, subscription.id);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Send push notifications to all subscriptions for a wallet address
 */
export async function sendPushNotificationToWallet(
  env: Env,
  walletAddress: string,
  payload: NotificationPayload,
  subscriptions: Subscription[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Send to all subscriptions in parallel
  const promises = subscriptions.map((subscription) =>
    sendPushNotification(env, subscription, payload)
  );

  const outcomes = await Promise.allSettled(promises);

  outcomes.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      if (outcome.value.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(
          `Subscription ${subscriptions[index].id}: ${outcome.value.error}`
        );
      }
    } else {
      results.failed++;
      results.errors.push(
        `Subscription ${subscriptions[index].id}: ${outcome.reason}`
      );
    }
  });

  return results;
}
