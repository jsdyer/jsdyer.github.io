const repo = 'jsdyer/jsdyer.github.io';
export const refreshWorkflow = 'https://github.com/' + repo + '/actions/workflows/catalogue-freshness.yml';
const runsUrl = 'https://api.github.com/repos/' + repo + '/actions/workflows/catalogue-freshness.yml/runs?branch=main&per_page=100';
const journalUrl = 'https://raw.githubusercontent.com/' + repo + '/catalogue-refresh-log/refresh-history.json';

export const refreshFilters = [
  ['', 'All refreshes'], ['attention', 'Needs attention'], ['changed', 'Changed or recovered'],
  ['unchanged', 'All checks unchanged'], ['unknown', 'No saved check details'],
];

function whole(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function key(id, attempt) {
  return /^[1-9]\d*$/.test(String(id)) && whole(attempt) && attempt > 0 ? id + '.' + attempt : null;
}

function validReport(report) {
  return report && key(report.run_id, report.attempt) && Number.isFinite(Date.parse(report.checked_at)) &&
    ['changed', 'recovered', 'unavailable', 'unchanged'].every(name => whole(report.counts?.[name])) &&
    (!('checked_by_tool' in report) || (report.checked_by_tool && typeof report.checked_by_tool === 'object' &&
      !Array.isArray(report.checked_by_tool) && Object.values(report.checked_by_tool).every(whole))) &&
    Array.isArray(report.details) && report.details.every(item => item &&
      typeof item.tool === 'string' && typeof item.label === 'string' &&
      ['changed', 'unavailable', 'recovered'].includes(item.status));
}

async function readJournal(signal) {
  const response = await fetch(journalUrl, {credentials:'omit', referrerPolicy:'no-referrer', cache:'no-cache', signal});
  if (response.status === 404) return [];
  if (!response.ok) throw Error();
  const data = await response.json();
  if (data.version !== 1 || !Array.isArray(data.runs) || !data.runs.every(validReport)) throw Error();
  return data.runs;
}

export async function loadRefreshes(signal) {
  const options = {credentials:'omit', referrerPolicy:'no-referrer', cache:'no-cache',
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)])};
  const [journal, actions] = await Promise.allSettled([
    readJournal(options.signal),
    fetch(runsUrl, options).then(async response => {
      if (!response.ok) throw Error();
      const data = await response.json();
      if (!Array.isArray(data.workflow_runs)) throw Error();
      return data.workflow_runs;
    }),
  ]);
  const notices = [];
  if (journal.status === 'rejected') notices.push('Saved check details could not be loaded.');
  if (actions.status === 'rejected') notices.push('GitHub workflow results could not be loaded.');
  if (notices.length === 2) throw Error(notices.join(' ') + ' Retry or open the workflow on GitHub.');
  return {entries: mergeRefreshes(journal.value || [], actions.value || []), notices};
}

export function mergeRefreshes(reports, runs) {
  const entries = new Map();
  for (const report of reports) {
    const id = key(report.run_id, report.attempt);
    if (id) entries.set(id, {id: String(report.run_id), attempt: report.attempt, at: report.checked_at, report});
  }
  for (const run of runs) {
    const attempt = run.run_attempt ?? 1;
    const id = key(run.id, attempt);
    if (!id) continue;
    const entry = entries.get(id) || {id:String(run.id), attempt, at:run.run_started_at || run.created_at};
    entry.outcome = run.conclusion || run.status;
    entries.set(id, entry);
  }
  return [...entries.values()].sort((a,b) => Date.parse(b.at) - Date.parse(a.at) ||
    b.id.localeCompare(a.id, 'en', {numeric:true}) || b.attempt - a.attempt);
}

const attention = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'stale', 'startup_failure']);

export function checkCounts(report, tool) {
  if (!report) return null;
  if (!tool) return report.counts;
  const details = report.details.filter(d => d.tool === tool);
  const checked = report.checked_by_tool?.[tool];
  if (!details.length && !checked) return null;
  const counts = {changed:0, recovered:0, unavailable:0, unchanged:null};
  for (const row of details) counts[row.status]++;
  if (whole(checked)) counts.unchanged = checked - details.length;
  return counts;
}

export function matchingRefreshes(entries, filter, tool) {
  return entries.filter(({outcome, report}) => {
    const counts = checkCounts(report, tool);
    if (tool && !counts) return false;
    switch (filter) {
      case 'attention': return attention.has(outcome) || counts?.unavailable > 0;
      case 'changed': return counts?.changed > 0 || counts?.recovered > 0;
      case 'unchanged': return counts?.unchanged > 0 && !counts.changed && !counts.recovered && !counts.unavailable;
      case 'unknown': return !report;
      default: return true;
    }
  });
}

export function renderRefresh(entry, tools, selectedTool) {
  const item = document.createElement('li');
  const runLink = document.createElement('a');
  runLink.href = 'https://github.com/' + repo + '/actions/runs/' + entry.id + '/attempts/' + entry.attempt;
  runLink.target = '_blank';
  runLink.rel = 'noopener noreferrer';
  runLink.textContent = 'Run ' + entry.id + (entry.attempt > 1 ? ', attempt ' + entry.attempt : '');
  const at = document.createElement('time');
  at.dateTime = entry.at;
  at.textContent = entry.at.replace('T',' ').slice(0,19) + ' UTC';
  item.append(at, ' · ', runLink, ' · Workflow ' + (entry.outcome?.replaceAll('_',' ') || 'result unavailable'));
  const report = entry.report;
  const summary = document.createElement('p');
  if (!report) {
    summary.textContent = 'No saved check details for this attempt. Open the run for its steps and logs.';
    item.append(summary);
    return item;
  }
  const {changed, recovered, unavailable, unchanged} = checkCounts(report, selectedTool);
  const scope = selectedTool ? (tools.get(selectedTool) || selectedTool) : 'Catalogue checks';
  summary.textContent = [scope, changed + ' changed', recovered + ' recovered',
    unavailable + ' unavailable', unchanged == null ? 'unchanged count unrecorded' : unchanged + ' unchanged'].join(' · ');
  item.append(summary);
  const rows = report.details.filter(detail => !selectedTool || selectedTool === detail.tool);
  if (!rows.length) return item;
  const expand = document.createElement('details');
  const label = document.createElement('summary');
  label.textContent = 'Inspect ' + rows.length + (rows.length === 1 ? ' check' : ' checks');
  const list = document.createElement('ul');
  for (const row of rows) {
    const line = document.createElement('li');
    const values = [];
    for (const [field, pair] of Object.entries(row.fields || {})) {
      if (Array.isArray(pair) && pair.length === 2) values.push(field + ' ' + (pair[0] ?? '—') + ' → ' + (pair[1] ?? '—'));
    }
    line.textContent = [tools.get(row.tool) || row.tool, row.label, row.status, ...values, row.reason].filter(Boolean).join(' · ');
    list.append(line);
  }
  expand.append(label, list);
  item.append(expand);
  return item;
}
