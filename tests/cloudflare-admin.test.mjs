import test from 'node:test';
import assert from 'node:assert/strict';
import companion from '../services/cloudflare-admin/worker.mjs';

const path = 'https://admin.example/admin/cloudflare';
const origin = 'https://coolcode.ca';
const headers = {Origin: origin, Authorization: 'Bearer owner-test-only', 'X-Private-Report': 'do not forward'};

function setup(identity = Response.json({tools: [], experiments: []})) {
  const calls = [], queries = [];
  const env = {
    REPORTS_DATABASE_ID: 'fixed-db',
    COLLECTOR: {async fetch(request) { calls.push(request); return identity; }},
    ANALYTICS_SQL: {async query(input) {
      queries.push(input);
      if (input.query.includes('events.workersInvocations')) return {data: [
        {status: 'exception', requests: '1', subrequests: 0},
        {status: 'success', requests: 5, subrequests: 3},
      ]};
      return {data: [{batches: 1, readQueries: 4, writeQueries: 1, rowsRead: 7, rowsWritten: 2}]};
    }},
  };
  return {env, calls, queries};
}

test('authenticated GET queries the fixed script and database over the same 24 hours', async () => {
  const {env, calls, queries} = setup();
  const response = await companion.fetch(new Request(path, {headers}), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const data = await response.json();
  assert.deepEqual(data.worker, {requests: 6, subrequests: 3,
    outcomes: [{status: 'success', requests: 5}, {status: 'exception', requests: 1}]});
  assert.deepEqual(data.database, {readQueries: 4, writeQueries: 1, rowsRead: 7, rowsWritten: 2});
  assert.equal(Date.parse(data.end) - Date.parse(data.start), 86400000);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://coolcode-visitor-api.jeffdyer.workers.dev/admin/stats?days=7');
  assert.equal(calls[0].redirect, 'manual');
  assert.deepEqual(Object.fromEntries(calls[0].headers), {authorization: headers.Authorization, origin});
  assert.equal(queries.length, 2);
  for (const {query, params} of queries) {
    assert.match(query, /timestamp >= \$start AND timestamp < \$end/);
    assert.equal(params.start, data.start);
    assert.equal(params.end, data.end);
    assert.doesNotMatch(JSON.stringify(params), /owner-test-only/);
    assert.doesNotMatch(query, /accountTag/);
  }
  assert.equal(queries[0].params.script, 'coolcode-visitor-api');
  assert.equal(queries[1].params.db, env.REPORTS_DATABASE_ID);
});

test('path, method, origin, sign-in and preflight checks run before the collector', async () => {
  const {env, calls, queries} = setup();
  for (const [url, init, expected] of [
    [path + '?script=untrusted', {headers}, 404], [path + '/other', {headers}, 404],
    [path, {headers, method: 'POST'}, 405], [path, {headers: {Origin: origin}}, 401],
    [path, {headers: {Origin: origin, Authorization: 'test'}}, 401],
    [path, {headers: {...headers, Origin: 'https://example.org'}}, 403],
    [path, {headers: {Origin: origin}, method: 'OPTIONS'}, 204],
  ]) {
    const response = await companion.fetch(new Request(url, init), env);
    assert.equal(response.status, expected);
    if (expected === 403) assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(calls.length, 0);
  assert.equal(queries.length, 0);
});

test('owner check failures never trigger analytics or forward private response content', async () => {
  for (const [reply, status] of [
    [new Response('upstream private text', {status: 401}), 401],
    [Response.redirect('https://example.invalid/', 302), 503],
    [new Response('upstream private text', {status: 403}), 403],
    [new Response('upstream private text', {status: 429}), 429],
    [new Response('upstream private text', {status: 500}), 503],
    [new Response('upstream private text'), 503], [Response.json({tools: []}), 503],
  ]) {
    const {env, queries} = setup(reply);
    const response = await companion.fetch(new Request(path, {headers}), env);
    assert.equal(response.status, status);
    assert.equal(queries.length, 0);
    const data = await response.json();
    if (status === 503) assert.equal(data.code, 'owner_verification_unavailable');
    assert.doesNotMatch(JSON.stringify(data), /upstream private text|example\.invalid/);
  }
});

test('partial analytics leave only the failed metric group unavailable', async () => {
  for (const failed of ['worker', 'database']) {
    const {env} = setup();
    const original = env.ANALYTICS_SQL.query;
    env.ANALYTICS_SQL.query = input => {
      if (input.query.includes(failed === 'worker' ? 'events.workersInvocations' : 'events.d1BackendRequest')) {
        throw Error('secret SQL error');
      }
      return original(input);
    };
    const response = await companion.fetch(new Request(path, {headers}), env);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data[failed], null);
    assert.deepEqual(data.issues, {[failed]: 'query_failed'});
    assert.ok(data[failed === 'worker' ? 'database' : 'worker']);
    assert.doesNotMatch(JSON.stringify(data), /secret SQL error/);
  }
});

test('empty time windows are distinguishable from missing or invalid metrics', async () => {
  const {env} = setup();
  env.ANALYTICS_SQL.query = async input => input.query.includes('events.workersInvocations')
    ? {data: []} : {data: [{batches: '0', rowsRead: null, rowsWritten: null, readQueries: 0, writeQueries: 0}]};
  const empty = await (await companion.fetch(new Request(path, {headers}), env)).json();
  assert.equal(empty.worker.requests, 0);
  assert.equal(empty.database.rowsRead, 0);
  const incomplete = setup().env;
  incomplete.ANALYTICS_SQL.query = async () => ({data: [{requests: null, rowsRead: null}]});
  const failed = await companion.fetch(new Request(path, {headers}), incomplete);
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), {code:'analytics_unavailable', error: 'Cloudflare analytics are unavailable.',
    issues:{worker:'invalid_result', database:'invalid_result'}});
});

test('reports missing bindings and retryable errors only after checking the owner', async () => {
  const {env, calls} = setup();
  delete env.ANALYTICS_SQL;
  delete env.REPORTS_DATABASE_ID;
  const response = await companion.fetch(new Request(path, {headers}), env);
  assert.equal(response.status, 503);
  assert.equal(calls.length, 1);
  assert.deepEqual((await response.json()).issues, {worker:'analytics_binding_missing', database:'database_id_missing'});
  const second = setup().env;
  second.ANALYTICS_SQL.query = async () => { throw Object.assign(Error('private provider detail'), {retryable: true}); };
  const data = await (await companion.fetch(new Request(path, {headers}), second)).json();
  assert.deepEqual(data.issues, {worker:'query_retryable', database:'query_retryable'});
  assert.doesNotMatch(JSON.stringify(data), /private provider detail/);
});
