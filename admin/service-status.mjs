import { runChecks } from './service-checks.mjs';

const workflow = 'https://github.com/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml';
const historyUrl = 'https://api.github.com/repos/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml/runs?branch=main&per_page=24';

function element(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

function renderChecks(target, results) {
  const table = element('table', '');
  const row = table.createTHead().insertRow();
  for (const title of ['Service', 'Result', 'HTTP', 'Elapsed']) row.append(element('th', title));
  const body = table.createTBody();
  for (const check of results) {
    const tr = body.insertRow();
    const th = element('th', check.name);
    th.scope = 'row';
    tr.append(th);
    for (const value of [check.detail, check.status ?? '—', check.ms + ' ms']) tr.insertCell().textContent = value;
  }
  target.replaceChildren(table);
}

async function renderHistory(target, signal) {
  try {
    const response = await fetch(historyUrl, {credentials:'omit', referrerPolicy:'no-referrer',
      signal:AbortSignal.any([signal, AbortSignal.timeout(12000)]), cache:'no-cache'});
    if (!response.ok) throw Error();
    const {workflow_runs: runs} = await response.json();
    if (!Array.isArray(runs)) throw Error();
    if (signal.aborted) return;
    if (!runs.length) { target.textContent = 'No external checks recorded yet.'; return; }
    const passed = runs.filter(r => r.conclusion === 'success').length;
    const failed = runs.filter(r => r.conclusion === 'failure').length;
    const oldest = runs.at(-1).created_at;
    const counts = element('p', `Last ${runs.length} runs since ${oldest}: ${passed} passed, ${failed} failed, ${runs.length - passed - failed} other or pending.`);
    const list = element('ol','');
    for (const run of runs.slice(0,5)) {
      const a = element('a', `${run.created_at} · ${run.conclusion || run.status}`);
      a.href = workflow.split('/actions/')[0] + '/actions/runs/' + encodeURIComponent(run.id);
      const item = element('li','');
      item.append(a); list.append(item);
    }
    target.replaceChildren(counts, list);
    if (Date.now() - Date.parse(runs[0].created_at) > 2 * 3600000) {
      target.prepend(element('p','Latest external check is more than two hours old. See the workflow for scheduling or runner delays.'));
    }
  } catch {
    if (!signal.aborted) target.textContent = 'External history unavailable from this browser. Open the workflow for its recorded results.';
  }
}

export function initializeServiceStatus(signal) {
  const panel = document.getElementById('service-panel');
  const button = document.getElementById('run-service-checks');
  const message = document.getElementById('service-message');
  const results = document.getElementById('service-results');
  const history = document.getElementById('service-history');
  async function check() {
    if (button.disabled || signal.aborted) return;
    button.disabled = true;
    message.textContent = 'Checking from this browser…';
    results.replaceChildren();
    history.textContent = 'Loading external history…';
    const external = renderHistory(history, signal);
    try {
      const rows = await runChecks(signal);
      if (signal.aborted) return;
      const failed = rows.filter(r => !r.ok).length;
      message.textContent = new Date().toISOString() + ' · ' + (failed ? failed + ' of ' + rows.length + ' checks need review.' : 'All ' + rows.length + ' checks passed.');
      renderChecks(results, rows);
    } catch {
      if (!signal.aborted) message.textContent = 'Browser checks could not complete.';
    } finally {
      await external;
      if (!signal.aborted) button.disabled = false;
    }
  }
  let started = false;
  panel.addEventListener('toggle', () => {
    if (panel.open && !started) { started = true; check(); }
  });
  button.addEventListener('click', check);
  document.querySelector('a[href="#services"]').addEventListener('click', () => { panel.open = true; });
  if (location.hash === '#services') panel.open = true;
}
