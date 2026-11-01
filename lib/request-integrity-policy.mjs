import { timingSafeEqual } from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

/** Pure request-integrity decision. It does not authenticate users or apply middleware itself. */
export function evaluateRequestIntegrity(input) {
  if (!input || typeof input !== 'object') return deny('REQUEST_INPUT_INVALID');
  const method = typeof input.method === 'string' ? input.method.toUpperCase() : '';
  if (!/^[A-Z]{3,10}$/.test(method)) return deny('REQUEST_METHOD_INVALID');
  const safe = SAFE_METHODS.has(method);

  if (input.secFetchSite === 'cross-site' && !safe) return deny('CROSS_SITE_MUTATION_BLOCKED');
  if (safe) return allow('SAFE_METHOD');

  if (!Array.isArray(input.allowedOrigins) || input.allowedOrigins.length === 0) {
    return deny('ORIGIN_ALLOWLIST_NOT_CONFIGURED');
  }
  const requestOrigin = parseOrigin(input.origin);
  if (!requestOrigin) return deny('ORIGIN_MISSING_OR_INVALID');
  const allowed = input.allowedOrigins.some((candidate) => parseOrigin(candidate) === candidate && candidate === requestOrigin);
  if (!allowed) return deny('ORIGIN_NOT_ALLOWED');

  if (typeof input.contentType !== 'string' || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(input.contentType.trim())) {
    return deny('UNSAFE_CONTENT_TYPE');
  }
  if (!validToken(input.csrfCookie) || !validToken(input.csrfHeader)) return deny('CSRF_TOKEN_MISSING_OR_INVALID');
  const a = Buffer.from(input.csrfCookie, 'utf8');
  const b = Buffer.from(input.csrfHeader, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return deny('CSRF_TOKEN_MISMATCH');
  return allow('REQUEST_INTEGRITY_PASSED');
}

function parseOrigin(value) {
  if (typeof value !== 'string' || value.length > 512) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== value || url.username || url.password) return null;
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
function validToken(value) { return typeof value === 'string' && TOKEN_PATTERN.test(value); }
function allow(code) { return { allowed: true, code }; }
function deny(code) { return { allowed: false, code }; }
