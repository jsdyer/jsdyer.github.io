const origin = 'https://coolcode.ca';
const ownerCheck = 'https://coolcode-visitor-api.jeffdyer.workers.dev/admin/stats?days=7';

const workerQuery = `SELECT status, COUNT(*) AS requests, SUM(subrequests) AS subrequests
  FROM events.workersInvocations
  WHERE timestamp >= $start AND timestamp < $end AND scriptName = $script
  GROUP BY status`;
const databaseQuery = `SELECT COUNT(*) AS batches, SUM(readQueries) AS readQueries,
  SUM(writeQueries) AS writeQueries, SUM(rowsRead) AS rowsRead, SUM(rowsWritten) AS rowsWritten
  FROM events.d1BackendRequest
  WHERE timestamp >= $start AND timestamp < $end AND databaseId = $db`;

function reply(request, status, data) {
  const headers = new Headers({
    'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'Content-Type': 'application/json; charset=utf-8',
  });
  if (request.headers.get('Origin') === origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization');
  }
  return new Response(data === null ? null : JSON.stringify(data), {status, headers});
}

async function verifyOwner(env, authorization) {
  try {
    const response = await env.COLLECTOR.fetch(new Request(ownerCheck, {
      headers: {Origin: origin, Authorization: authorization}, redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    }));
    if (response.status === 401 || response.status === 403) return response.status;
    if (response.status === 429) return 429;
    if (response.status !== 200 || !response.headers.get('Content-Type')?.includes('application/json')) return 503;
    const data = await response.json();
    return Array.isArray(data.tools) && Array.isArray(data.experiments) ? 200 : 503;
  } catch {
    return 503;
  }
}

class MetricFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

async function readRows(env, query, params) {
  if (typeof env.ANALYTICS_SQL?.query !== 'function') throw new MetricFailure('analytics_binding_missing');
  let result;
  try {
    result = await env.ANALYTICS_SQL.query({query, params});
  } catch (error) {
    throw new MetricFailure(error?.retryable === true ? 'query_retryable' : 'query_failed');
  }
  if (!Array.isArray(result?.data)) throw new MetricFailure('invalid_result');
  return result.data;
}

function count(value) {
  if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
  if (!Number.isSafeInteger(value) || value < 0) throw Error('Invalid count');
  return value;
}

async function workerMetrics(env, start, end) {
  const rows = await readRows(env, workerQuery, {start, end, script: 'coolcode-visitor-api'});
  let requests = 0, subrequests = 0;
  const outcomes = rows.map(row => {
    if (typeof row.status !== 'string' || !row.status) throw Error('Missing outcome');
    const total = count(row.requests);
    requests += total;
    subrequests += count(row.subrequests);
    return {status: row.status, requests: total};
  });
  outcomes.sort((a, b) => b.requests - a.requests || a.status.localeCompare(b.status));
  return {requests: count(requests), subrequests: count(subrequests), outcomes};
}

async function databaseMetrics(env, start, end) {
  if (!env.REPORTS_DATABASE_ID) throw new MetricFailure('database_id_missing');
  const rows = await readRows(env, databaseQuery, {start, end, db: env.REPORTS_DATABASE_ID});
  if (rows.length !== 1) throw new MetricFailure('invalid_result');
  const row = rows[0];
  const batches = count(row.batches);
  const totals = {};
  for (const field of ['readQueries', 'writeQueries', 'rowsRead', 'rowsWritten']) {
    totals[field] = batches === 0 && row[field] === null ? 0 : count(row[field]);
  }
  return totals;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/admin/cloudflare' || url.search) return reply(request, 404, {error: 'Not found.'});
    if (request.headers.get('Origin') !== origin) return reply(request, 403, {error: 'Origin denied.'});
    if (request.method === 'OPTIONS') return reply(request, 204, null);
    if (request.method !== 'GET') return reply(request, 405, {error: 'Method not allowed.'});
    const authorization = request.headers.get('Authorization');
    if (!/^Bearer [^\s,]+$/i.test(authorization || '')) return reply(request, 401, {error: 'Owner sign-in required.'});
    const access = await verifyOwner(env, authorization);
    if (access === 503) return reply(request, access, {code: 'owner_verification_unavailable', error: 'Owner verification unavailable.'});
    if (access !== 200) return reply(request, access,
      {error: access === 429 ? 'Too many owner verification requests.' : 'Owner access denied.'});

    const now = Date.now();
    const start = new Date(now - 86400000).toISOString(), end = new Date(now).toISOString();
    const [worker, database] = await Promise.allSettled([
      workerMetrics(env, start, end), databaseMetrics(env, start, end),
    ]);
    const issues = {};
    for (const [name, group] of Object.entries({worker, database})) {
      if (group.status === 'rejected') {
        issues[name] = group.reason instanceof MetricFailure ? group.reason.code : 'invalid_result';
      }
    }
    if (worker.status === 'rejected' && database.status === 'rejected') {
      return reply(request, 503, {code: 'analytics_unavailable', error: 'Cloudflare analytics are unavailable.', issues});
    }
    return reply(request, 200, {start, end, ...(Object.keys(issues).length ? {issues} : {}),
      worker: worker.status === 'fulfilled' ? worker.value : null,
      database: database.status === 'fulfilled' ? database.value : null});
  },
};
