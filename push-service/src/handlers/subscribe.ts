import { Env, SubscribeRequest, SubscribeResponse } from '../types';
import { createSubscription, getSubscriptionByEndpoint } from '../db/queries';

/**
 * Validate wallet address format
 */
function isValidWalletAddress(address: string): boolean {
  // Basic validation for ARK addresses
  // ARK addresses can be quite long (100+ characters) and start with 'ark1' or 'tark1'
  return (
    typeof address === 'string' &&
    (address.startsWith('ark1') || address.startsWith('tark1'))
  );
}

/**
 * Validate push subscription format
 */
function isValidPushSubscription(subscription: any): boolean {
  return (
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.endpoint.startsWith('https://') &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string' &&
    subscription.keys.p256dh.length > 0 &&
    subscription.keys.auth.length > 0
  );
}

/**
 * Handle subscription requests
 */
export async function handleSubscribe(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Parse request body
    const body = (await request.json()) as SubscribeRequest;

    // Validate request
    if (!body.walletAddress || !body.subscription) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: walletAddress and subscription',
        } as SubscribeResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate wallet address
    if (!isValidWalletAddress(body.walletAddress)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid wallet address format',
        } as SubscribeResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate push subscription
    if (!isValidPushSubscription(body.subscription)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid push subscription format',
        } as SubscribeResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user agent for tracking
    const userAgent = request.headers.get('User-Agent');

    // Check if subscription already exists
    const existing = await getSubscriptionByEndpoint(
      env.DB,
      body.walletAddress,
      body.subscription.endpoint
    );

    // Create or update subscription
    const subscriptionId = await createSubscription(
      env.DB,
      body.walletAddress,
      body.subscription.endpoint,
      body.subscription.keys.p256dh,
      body.subscription.keys.auth,
      userAgent
    );

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: existing ? existing.id : subscriptionId,
      } as SubscribeResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Subscribe error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      } as SubscribeResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
