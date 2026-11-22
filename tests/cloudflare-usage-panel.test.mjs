import test from 'node:test';
import assert from 'node:assert/strict';
import {usageFailure} from '../admin/cloudflare-usage.mjs';

test('distinguishes collector handoff from a query failure in existing and updated Workers', () => {
  for (const body of [{error:'Owner verification unavailable.'}, {code:'owner_verification_unavailable'}]) {
    assert.match(usageFailure(503, body), /could not verify your sign-in/);
  }
  assert.match(usageFailure(503, {error:'Cloudflare analytics are unavailable.'}), /Sign-in succeeded/);
  const detail = usageFailure(503, {code:'analytics_unavailable', issues:{worker:'query_retryable', database:'database_id_missing'}});
  assert.match(detail, /Try refreshing/);
  assert.match(detail, /REPORTS_DATABASE_ID/);
});

test('only displays recognized diagnostics', () => {
  assert.doesNotMatch(usageFailure(502, {error:'upstream details'}), /upstream details/);
  assert.match(usageFailure(429, null), /request limit/);
});
