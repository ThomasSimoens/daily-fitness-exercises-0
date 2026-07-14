/**
 * Optional basic auth middleware for Cloudflare Pages.
 * Checks Authorization header against BASIC_AUTH_CREDENTIALS env var.
 * Format of the env var: "username:password"
 *
 * If BASIC_AUTH_CREDENTIALS is not set, auth is skipped (open access).
 */
export async function onRequest(context) {
  const { request, env, next } = context;
  const credentials = env.BASIC_AUTH_CREDENTIALS;

  if (!credentials) {
    // No credentials configured — skip auth
    return next();
  }

  const expected = "Basic " + btoa(credentials);

  if (request.headers.get("Authorization") !== expected) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Daily Exercise Tracker"',
      },
    });
  }

  return next();
}