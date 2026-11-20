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
      if (!response.ok) throw Error('Cloudflare usage is unavailable (HTTP ' + response.status + ').');
      const {start, end, worker, database} = await response.json();
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
      } else results.append(element('p', 'Worker measurements unavailable for this interval.'));
      const dbFields = ['readQueries', 'writeQueries', 'rowsRead', 'rowsWritten'];
      if (counts(database, dbFields)) {
        results.append(metrics('D1 reporting database', [['Read queries', database.readQueries],
          ['Write queries', database.writeQueries], ['Rows read', database.rowsRead], ['Rows written', database.rowsWritten]]));
        results.append(element('p', 'One query can read many rows. These counts include admin and service checks.'));
      } else results.append(element('p', 'D1 measurements unavailable for this interval.'));
    } catch (error) {
      if (!session.signal.aborted) message.textContent = (error.message?.startsWith('Cloudflare usage is unavailable')
        ? error.message : 'Could not retrieve Cloudflare usage.') + ' Open the Workers or D1 dashboard below, or use Connect live usage to check setup.';
    } finally {
      if (!session.signal.aborted) button.disabled = false;
    }
  }
  panel.addEventListener('toggle', () => { if (panel.open && !started) load(); });
  button.addEventListener('click', load);
  document.querySelector('a[href="#cloudflare"]').addEventListener('click', () => { panel.open = true; });
  if (location.hash === '#cloudflare') panel.open = true;
}
