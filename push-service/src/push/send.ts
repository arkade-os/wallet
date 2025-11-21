import { buildPushPayload } from '@block65/webcrypto-web-push';
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
    // Construct the push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    // Build the push payload with VAPID authentication
    const pushPayload = await buildPushPayload(
      {
        data: JSON.stringify(payload),
        options: {
          ttl: 3600, // 1 hour
          urgency: 'normal',
        },
      },
      pushSubscription,
      {
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      }
    );

    // Send the notification using fetch
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: pushPayload.headers,
      body: pushPayload.body,
    });

    let errorMessage: string | undefined;
    let shouldDelete = false;

    // Check response status
    if (!response.ok) {
      errorMessage = `Push service returned ${response.status}: ${response.statusText}`;

      // Check if subscription is expired or invalid
      if (response.status === 404 || response.status === 410) {
        errorMessage = 'Subscription expired or invalid';
        shouldDelete = true;
      }
    }

    if (errorMessage) {
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
    const errorMessage = error.message || 'Unknown error';

    // Log failure
    await logNotification(
      env.DB,
      subscription.wallet_address,
      subscription.id,
      payload.title,
      payload.body || null,
      'failed',
      errorMessage
    );

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
