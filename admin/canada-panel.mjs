import { runCanadaChecks } from './canada-probes.mjs';

export function initializeCanadaChecks(sessionSignal) {
  const button = document.querySelector('#run-canada');
  const status = document.querySelector('#canada-status');
  const outlet = document.querySelector('#canada-results');
  button.addEventListener('click', async () => {
    button.disabled = true;
    outlet.replaceChildren();
    status.textContent = 'Waiting for public probes in Vancouver, Toronto and Halifax…';
    try {
      const signal = AbortSignal.any([sessionSignal, AbortSignal.timeout(65000)]);
      const {checkedAt, rows} = await runCanadaChecks(signal);
      if (sessionSignal.aborted) return;
      const table = document.createElement('table');
      const heading = table.createTHead().insertRow();
      for (const label of ['Requested city', 'Probe / network', 'Check', 'Destination', 'Result', 'Time']) {
        const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; heading.append(th);
      }
      const body = table.createTBody();
      for (const row of rows) {
        const tr = body.insertRow();
        for (const value of [row.city, row.probeCity ? [row.probeCity,row.network,'AS' + row.asn].join(' · ') : '—',
          row.check, row.target, row.status, row.ms == null ? '—' : row.ms + ' ms']) tr.insertCell().textContent = value;
        if (row.id && row.probeCity) {
          const link = document.createElement('a');
          link.href = 'https://globalping.io?measurement=' + encodeURIComponent(row.id);
          link.textContent = row.status; tr.cells[4].replaceChildren(link);
        }
      }
      const observed = rows.filter(row => row.probeCity).length;
      const unavailable = rows.filter(row => row.status === 'No probe returned').length;
      const errors = rows.filter(row => row.collectionError).length;
      status.textContent = new Date(checkedAt).toLocaleString() + ' · ' + observed + ' probe results · ' +
        unavailable + ' without a matching probe · ' + errors + ' collection errors.';
      outlet.replaceChildren(table);
    } catch {
      if (!sessionSignal.aborted) status.textContent = 'The regional check could not finish. Try again or open the scheduled results.';
    } finally { if (!sessionSignal.aborted) button.disabled = false; }
  }, {signal:sessionSignal});
}
