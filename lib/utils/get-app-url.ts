/**
 * Resolve the application base URL from environment variables.
 *
 * Checks NEXT_PUBLIC_APP_URL first, falls back to NEXT_PUBLIC_API_URL,
 * then defaults to http://localhost:3000 for local development.
 *
 * Always trims whitespace and trailing slashes to prevent OAuth
 * redirect URI mismatches caused by stray characters in env vars.
 */
export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000'

  return raw.trim().replace(/\\n/g, '').replace(/[\n\r]/g, '').replace(/\/+$/, '')
}
