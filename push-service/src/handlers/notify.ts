import { Env, NotifyRequest, NotifyResponse } from '../types';
import { getSubscriptionsByWallet } from '../db/queries';
import { sendPushNotificationToWallet } from '../push/send';

/**
 * Validate notification payload
 */
function isValidNotificationPayload(notification: any): boolean {
  return (
    notification &&
    typeof notification.title === 'string' &&
    notification.title.length > 0 &&
    notification.title.length <= 200
  );
}

/**
 * Handle notification webhook requests
 * This endpoint is authenticated and used by arkd or other services
 * to trigger push notifications for wallet addresses
 */
export async function handleNotify(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Parse request body
    const body = (await request.json()) as NotifyRequest;

    // Validate request
    if (!body.walletAddress || !body.notification) {
      return new Response(
        JSON.stringify({
          success: false,
          sent: 0,
          failed: 0,
          errors: ['Missing required fields: walletAddress and notification'],
        } as NotifyResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate notification payload
    if (!isValidNotificationPayload(body.notification)) {
      return new Response(
        JSON.stringify({
          success: false,
          sent: 0,
          failed: 0,
          errors: ['Invalid notification payload: title is required and must be 1-200 characters'],
        } as NotifyResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all subscriptions for this wallet
    const subscriptions = await getSubscriptionsByWallet(
      env.DB,
      body.walletAddress
    );

    // If no subscriptions, return early
    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          errors: [],
        } as NotifyResponse),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Send push notifications to all subscriptions
    const results = await sendPushNotificationToWallet(
      env,
      body.walletAddress,
      body.notification,
      subscriptions
    );

    // Return results
    return new Response(
      JSON.stringify({
        success: results.sent > 0 || results.failed === 0,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined,
      } as NotifyResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Notify error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        sent: 0,
        failed: 0,
        errors: ['Internal server error'],
      } as NotifyResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
