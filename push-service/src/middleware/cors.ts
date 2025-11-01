import { Env } from '../types';

/**
 * Check if an origin matches an allowed origin pattern
 * Supports wildcards like https://*.pages.dev
 */
function isOriginAllowed(origin: string, allowedPattern: string): boolean {
  // Exact match
  if (origin === allowedPattern) {
    return true;
  }

  // Wildcard pattern matching
  if (allowedPattern.includes('*')) {
    // Convert wildcard pattern to regex
    // e.g., https://*.pages.dev -> ^https://[^/]+\.pages\.dev$
    const regexPattern = allowedPattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '[^/]+'); // Replace * with regex pattern
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(origin);
  }

  return false;
}

/**
 * Get CORS headers based on environment configuration
 */
export function getCorsHeaders(env: Env, origin?: string | null): HeadersInit {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  // Check if origin is allowed
  let allowOrigin = '*';

  if (origin) {
    // Check if wildcard is allowed (allows all origins)
    if (allowedOrigins.includes('*')) {
      allowOrigin = origin;
    } else {
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(pattern => isOriginAllowed(origin, pattern));
      if (isAllowed) {
        allowOrigin = origin;
      } else {
        // Origin not allowed - don't set CORS header (will cause CORS error)
        allowOrigin = allowedOrigins[0] || '*';
      }
    }
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
