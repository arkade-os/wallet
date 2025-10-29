/**
 * Arkade Push Service - Cloudflare Worker
 * Web Push notification service for Arkade Wallet
 */

import { Env } from './types';
import { handleOptions, withCors } from './middleware/cors';
import { requireAuth } from './middleware/auth';
import { handleSubscribe } from './handlers/subscribe';
import { handleUnsubscribe } from './handlers/unsubscribe';
import { handleNotify } from './handlers/notify';
import { handleHealth } from './handlers/health';

/**
 * Main request router
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Health check endpoint (no auth required)
  if (path === '/health' && request.method === 'GET') {
    return handleHealth(request, env);
  }

  // Subscribe endpoint (public)
  if (path === '/subscribe' && request.method === 'POST') {
    return handleSubscribe(request, env);
  }

  // Unsubscribe endpoint (public)
  if (path === '/unsubscribe' && request.method === 'POST') {
    return handleUnsubscribe(request, env);
  }

  // Notify endpoint (requires auth)
  if (path === '/notify' && request.method === 'POST') {
    return requireAuth(request, env, () => handleNotify(request, env));
  }

  // 404 Not Found
  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: `Unknown endpoint: ${path}`,
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Cloudflare Worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleOptions(env, request);
      }

      // Route request
      const response = await handleRequest(request, env);

      // Add CORS headers to response
      return withCors(env, response, request);
    } catch (error: any) {
      console.error('Worker error:', error);

      const errorResponse = new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: env.ENVIRONMENT === 'development' ? error.message : undefined,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return withCors(env, errorResponse, request);
    }
  },
};
