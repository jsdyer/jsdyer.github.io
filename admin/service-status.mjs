import { runChecks } from './service-checks.mjs';

const workflow = 'https://github.com/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml';
const historyUrl = 'https://api.github.com/repos/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml/runs?branch=main&per_page=24';

function element(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

const providers = [
  {name: 'GitHub', url: 'https://www.githubstatus.com', components: [
    ['vg70hn9s2tyj', 'Pages'], ['br0l2tvcx85d', 'Actions'], ['brv1bkgrwx7q', 'API Requests'],
  ]},
  {name: 'Cloudflare', url: 'https://www.cloudflarestatus.com', components: [
    ['57srcl8zcn7c', 'Workers'], ['z0yd3sxqjqdm', 'D1'],
  ]},
];

function readable(value) {
  return typeof value === 'string' && value ? value.replaceAll('_', ' ') : 'unavailable';
}

function utc(value) {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null;
}

function providerSummary(provider, payload) {
  if (!Array.isArray(payload?.components) || !Array.isArray(payload.incidents)) {
    throw Error('Unexpected response');
  }
  const components = provider.components.map(([id, label]) => {
    const component = payload.components.find(c => c?.id === id) ||
      payload.components.find(c => c?.name === label && !c.group);
    return {id: component?.id || id, label, status: readable(component?.status)};
  });
  const incidents = [];
  let unassigned = 0;
  for (const incident of payload.incidents) {
    if (!incident || ['resolved', 'postmortem'].includes(incident.status)) continue;
    // Some publishers attach component IDs only to an update within the incident.
    const ids = (incident.components || []).map(c => c?.id).filter(Boolean);
    if (!ids.length) {
      for (const update of incident.incident_updates || []) {
        for (const entry of update.affected_components || []) if (entry?.code) ids.push(entry.code);
      }
    }
    if (!ids.length) { unassigned++; continue; }
    const affected = components.filter(c => ids.includes(c.id)).map(c => c.label);
    if (affected.length) incidents.push({
      name: incident.name || 'Untitled incident', status: readable(incident.status), affected,
      updated: utc(incident.updated_at),
      url: /^[a-z0-9]+$/i.test(incident.id || '') ? provider.url + '/incidents/' + incident.id : provider.url,
    });
  }
  return {components, incidents, unassigned, updated: utc(payload.page?.updated_at)};
}

export async function loadProviderStatus(signal, request = fetch) {
  return Promise.all(providers.map(async provider => {
    const {name, url} = provider;
    try {
      const response = await request(url + '/api/v2/summary.json', {
        credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-cache',
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      return {name, url, ...providerSummary(provider, await response.json())};
    } catch {
      if (signal.aborted) throw signal.reason;
      return {name, url, unavailable: true};
    }
  }));
}

function renderProviderStatus(target, providers) {
  const content = document.createDocumentFragment();
  for (const provider of providers) {
    const title = element('h4', provider.name);
    const link = element('a', provider.name + ' status page');
    link.href = provider.url;
    content.append(title);
    if (provider.unavailable) {
      const failed = element('p', 'Could not load this provider’s status. ');
      failed.append(link);
      content.append(failed);
      continue;
    }
    content.append(element('p', provider.components.map(c => c.label + ' · ' + c.status).join(' | ')));
    if (provider.incidents.length) {
      const list = element('ul', '');
      for (const incident of provider.incidents) {
        const item = element('li', '');
        const a = element('a', incident.name);
        a.href = incident.url;
        item.append(a, ' · ' + incident.affected.join(', ') + ' · ' + incident.status);
        if (incident.updated) item.append(' · Updated ' + incident.updated);
        list.append(item);
      }
      content.append(list);
    } else {
      content.append(element('p', 'No open incidents tagged to these services.'));
    }
    if (provider.unassigned) {
      content.append(element('p', 'Open incidents without service tags on the provider page: ' + provider.unassigned + '.'));
    }
    const source = element('p', provider.updated ? 'Provider updated ' + provider.updated + ' · ' : '');
    source.append(link);
    content.append(source);
  }
  target.replaceChildren(content);
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
  const providerStatus = document.getElementById('provider-status');
  async function check() {
    if (button.disabled || signal.aborted) return;
    button.disabled = true;
    message.textContent = 'Checking from this browser…';
    results.replaceChildren();
    history.textContent = 'Loading external history…';
    providerStatus.textContent = 'Loading provider status…';
    const external = Promise.allSettled([
      renderHistory(history, signal),
      loadProviderStatus(signal).then(rows => {
        if (!signal.aborted) renderProviderStatus(providerStatus, rows);
      }),
    ]);
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
