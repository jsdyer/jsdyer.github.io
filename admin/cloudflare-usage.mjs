const endpoint = 'https://coolcode-admin-metrics.jeffdyer.workers.dev/admin/cloudflare';
const numbers = new Intl.NumberFormat('en-CA');

function counts(report, fields) {
  return report && fields.every(field => Number.isSafeInteger(report[field]) && report[field] >= 0);
}

function element(tag, text) {
  const result = document.createElement(tag);
  result.textContent = text;
  return result;
}

function metrics(caption, rows) {
  const table = document.createElement('table');
  table.append(element('caption', caption));
  const body = table.createTBody();
  for (const [label, value] of rows) {
    const row = body.insertRow();
    const key = element('th', label);
    key.scope = 'row';
    row.append(key);
    row.insertCell().textContent = numbers.format(value);
  }
  return table;
}

function datasetIssue(label, code) {
  const reasons = {
    analytics_binding_missing: 'Check the ANALYTICS_SQL binding on the companion Worker.',
    database_id_missing: 'Set REPORTS_DATABASE_ID to the reporting database UUID on the companion.',
    query_failed: 'Cloudflare declined the analytics query. Check the companion version and the dataset in Cloudflare.',
    query_retryable: 'Try refreshing the panel again in a moment.',
    invalid_result: 'The analytics response did not contain the expected counts.'
  };
  const message = label + ' measurements unavailable for this interval.';
  return Object.hasOwn(reasons, code) ? message + ' ' + reasons[code] : message;
}

export function usageFailure(status, body) {
  if (status === 503 && (body?.code === 'owner_verification_unavailable' || body?.error === 'Owner verification unavailable.')) {
    return 'The metrics Worker could not verify your sign-in with the visitor API (HTTP 503). Open Connect live usage for the verifyOwner fix.';
  }
  if (status === 503 && (body?.code === 'analytics_unavailable' || body?.error === 'Cloudflare analytics are unavailable.')) {
    return 'Sign-in succeeded. Cloudflare usage queries failed (HTTP 503). ' +
      [datasetIssue('Worker', body?.issues?.worker), datasetIssue('D1', body?.issues?.database)].join(' ');
  }
  if (status === 403) return 'The metrics Worker denied access. Check the owner account used for this admin session.';
  if (status === 429) return 'The metrics Worker reached a request limit. Try refreshing in a moment.';
  return 'Cloudflare usage is unavailable (HTTP ' + status + '). Check the provider dashboards or Connect live usage below.';
}

export function initializeCloudflareUsage(session) {
  const panel = document.getElementById('cloudflare-panel');
  const message = document.getElementById('cloudflare-message');
  const results = document.getElementById('cloudflare-results');
  const button = document.getElementById('refresh-cloudflare');
  let started = false;

  async function load() {
    if (button.disabled || session.signal.aborted) return;
    started = true;
    button.disabled = true;
    results.replaceChildren();
    message.textContent = 'Loading Cloudflare measurements…';
    try {
      const options = {
        cache: 'no-store', credentials: 'omit',
        redirect: 'error', referrerPolicy: 'no-referrer',
        signal: AbortSignal.any([session.signal, AbortSignal.timeout(15000)]),
      };
      // Verify that the designated service is available before sending the owner's token.
      const probe = await fetch(endpoint, options);
      if (probe.status !== 401 || (await probe.json()).error !== 'Owner sign-in required.') throw Error();
      if (session.signal.aborted) return;
      const response = await fetch(endpoint, {...options, headers: {Authorization: 'Bearer ' + session.token}});
      if (response.status === 401) return session.lock();
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        if (!session.signal.aborted) message.textContent = usageFailure(response.status, detail);
        return;
      }
      const {start, end, worker, database, issues} = await response.json();
      if (session.signal.aborted) return;
      if (![start, end].every(date => typeof date === 'string' && Number.isFinite(Date.parse(date)))) throw Error();
      const utc = date => new Date(date).toISOString().slice(0, 16).replace('T', ' ');
      message.textContent = utc(start) + ' to ' + utc(end) + ' UTC';
      if (counts(worker, ['requests', 'subrequests']) && Array.isArray(worker.outcomes) &&
          worker.outcomes.every(outcome => typeof outcome?.status === 'string' && counts(outcome, ['requests']))) {
        results.append(metrics('Visitor API', [['Worker requests', worker.requests], ['Outbound subrequests', worker.subrequests]]));
        if (worker.outcomes.length) results.append(metrics('Worker requests by execution outcome',
          worker.outcomes.map(row => [row.status, row.requests])));
        results.append(element('p', 'A Worker can finish normally while returning an HTTP error. Outbound subrequests include calls the Worker makes to other services.'));
      } else results.append(element('p', datasetIssue('Worker', issues?.worker)));
      const dbFields = ['readQueries', 'writeQueries', 'rowsRead', 'rowsWritten'];
      if (counts(database, dbFields)) {
        results.append(metrics('D1 reporting database', [['Read queries', database.readQueries],
          ['Write queries', database.writeQueries], ['Rows read', database.rowsRead], ['Rows written', database.rowsWritten]]));
        results.append(element('p', 'One query can read many rows. These counts include admin and service checks.'));
      } else results.append(element('p', datasetIssue('D1', issues?.database)));
    } catch {
      if (!session.signal.aborted) message.textContent = 'Could not retrieve Cloudflare usage. Check the provider dashboards or Connect live usage below.';
    } finally {
      if (!session.signal.aborted) button.disabled = false;
    }
  }
  panel.addEventListener('toggle', () => { if (panel.open && !started) load(); });
  button.addEventListener('click', load);
  document.querySelector('a[href="#cloudflare"]').addEventListener('click', () => { panel.open = true; });
  if (location.hash === '#cloudflare') panel.open = true;
}
