import { Env } from '../types';

/**
 * Get CORS headers based on environment configuration
 */
export function getCorsHeaders(env: Env, origin?: string | null): HeadersInit {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  // Check if origin is allowed
  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (!allowedOrigins.includes('*')) {
    // If no wildcard and origin not in list, use first allowed origin
    allowOrigin = allowedOrigins[0] || '*';
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight OPTIONS requests
 */
export function handleOptions(env: Env, request: Request): Response {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(env, origin);

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Add CORS headers to a response
 */
export function withCors(env: Env, response: Response, request: Request): Response {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(env, origin);

  // Create new response with CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
