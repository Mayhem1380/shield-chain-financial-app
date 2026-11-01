import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRequestIntegrity } from '../lib/request-integrity-policy.mjs';
const token = 'A'.repeat(43);
const base = { method: 'POST', origin: 'https://app.shieldchain.example', allowedOrigins: ['https://app.shieldchain.example'], contentType: 'application/json', csrfCookie: token, csrfHeader: token, secFetchSite: 'same-origin' };

test('accepts an allowlisted JSON mutation with matching CSRF tokens', () => assert.equal(evaluateRequestIntegrity(base).allowed, true));
test('allows safe methods without CSRF tokens', () => assert.equal(evaluateRequestIntegrity({ method: 'GET' }).allowed, true));
test('blocks cross-site unsafe requests', () => assert.equal(evaluateRequestIntegrity({ ...base, secFetchSite: 'cross-site' }).code, 'CROSS_SITE_MUTATION_BLOCKED'));
test('fails closed when origin allowlist is missing', () => assert.equal(evaluateRequestIntegrity({ ...base, allowedOrigins: [] }).code, 'ORIGIN_ALLOWLIST_NOT_CONFIGURED'));
test('rejects missing or malformed origin', () => assert.equal(evaluateRequestIntegrity({ ...base, origin: 'null' }).code, 'ORIGIN_MISSING_OR_INVALID'));
test('rejects a different origin', () => assert.equal(evaluateRequestIntegrity({ ...base, origin: 'https://evil.example' }).code, 'ORIGIN_NOT_ALLOWED'));
test('rejects non-JSON content types', () => assert.equal(evaluateRequestIntegrity({ ...base, contentType: 'text/plain' }).code, 'UNSAFE_CONTENT_TYPE'));
test('rejects absent or short CSRF tokens', () => assert.equal(evaluateRequestIntegrity({ ...base, csrfHeader: 'short' }).code, 'CSRF_TOKEN_MISSING_OR_INVALID'));
test('rejects mismatched CSRF tokens', () => assert.equal(evaluateRequestIntegrity({ ...base, csrfHeader: 'B'.repeat(43) }).code, 'CSRF_TOKEN_MISMATCH'));
test('rejects unsafe plain HTTP origins outside localhost', () => assert.equal(evaluateRequestIntegrity({ ...base, origin: 'http://app.shieldchain.example', allowedOrigins: ['http://app.shieldchain.example'] }).code, 'ORIGIN_MISSING_OR_INVALID'));
test('rejects malformed method values', () => assert.equal(evaluateRequestIntegrity({ ...base, method: 'P0ST' }).code, 'REQUEST_METHOD_INVALID'));
test('does not accept substring origin matches', () => assert.equal(evaluateRequestIntegrity({ ...base, origin: 'https://app.shieldchain.example.evil.example' }).code, 'ORIGIN_NOT_ALLOWED'));
