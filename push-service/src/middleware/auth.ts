import { Env } from '../types';

/**
 * Validate API key from Authorization header
 */
export function validateApiKey(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return false;
  }

  // Expected format: "Bearer <API_KEY>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  const providedKey = parts[1];
  return providedKey === env.API_KEY;
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Middleware to require API key authentication
 */
export function requireAuth(
  request: Request,
  env: Env,
  handler: () => Promise<Response>
): Promise<Response> {
  if (!validateApiKey(request, env)) {
    return Promise.resolve(unauthorizedResponse());
  }
  return handler();
}
