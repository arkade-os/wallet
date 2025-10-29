import { Env, HealthResponse } from '../types';
import { getTotalSubscriptionCount } from '../db/queries';

const VERSION = '1.0.0';

/**
 * Handle health check requests
 */
export async function handleHealth(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Test database connectivity
    let databaseStatus: 'connected' | 'error' = 'connected';
    let subscriptionCount = 0;

    try {
      subscriptionCount = await getTotalSubscriptionCount(env.DB);
    } catch (error) {
      console.error('Database health check failed:', error);
      databaseStatus = 'error';
    }

    const response: HealthResponse = {
      status: databaseStatus === 'connected' ? 'ok' : 'error',
      version: VERSION,
      timestamp: Math.floor(Date.now() / 1000),
      database: databaseStatus,
    };

    // Add subscription count in development mode
    if (env.ENVIRONMENT === 'development') {
      (response as any).subscriptionCount = subscriptionCount;
    }

    return new Response(JSON.stringify(response), {
      status: databaseStatus === 'connected' ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Health check error:', error);

    return new Response(
      JSON.stringify({
        status: 'error',
        version: VERSION,
        timestamp: Math.floor(Date.now() / 1000),
        database: 'error',
      } as HealthResponse),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
