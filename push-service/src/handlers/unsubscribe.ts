import { Env, UnsubscribeRequest, UnsubscribeResponse } from '../types';
import { deleteSubscription } from '../db/queries';

/**
 * Handle unsubscribe requests
 */
export async function handleUnsubscribe(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Parse request body
    const body = (await request.json()) as UnsubscribeRequest;

    // Validate request
    if (!body.walletAddress || !body.endpoint) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: walletAddress and endpoint',
        } as UnsubscribeResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate endpoint format
    if (!body.endpoint.startsWith('https://')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid endpoint format',
        } as UnsubscribeResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete subscription
    const deleted = await deleteSubscription(
      env.DB,
      body.walletAddress,
      body.endpoint
    );

    if (!deleted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Subscription not found',
        } as UnsubscribeResponse),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
      } as UnsubscribeResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Unsubscribe error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      } as UnsubscribeResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
