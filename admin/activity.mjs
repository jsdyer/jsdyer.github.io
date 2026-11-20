import {loadRefreshes, matchingRefreshes, refreshFilters, refreshWorkflow, renderRefresh} from './refresh-journal.mjs';

const hub = 'jsdyer.github.io';
const perPage = 20;

export function sourceScope(source) {
  const match = /^https:\/\/github\.com\/jsdyer\/([\w.-]+)(?:\/tree\/main\/([\w./-]+))?\/?$/.exec(source);
  if (!match || match[1].startsWith('.') || match[2]?.split('/').includes('..')) return null;
  return {repo: match[1], path: match[2] || ''};
}

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function select(label, options) {
  const wrapper = node('label', label + ' ');
  const input = node('select');
  input.setAttribute('aria-label', label);
  for (const [value, title] of options) input.add(new Option(title, value));
  wrapper.append(input);
  return {wrapper, input};
}

function link(text, url) {
  const a = node('a', text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

async function json(url, signal, {emptyOnMissing = false} = {}) {
  const response = await fetch(url, {signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache'});
  if (emptyOnMissing && response.status === 404) return [];
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw Error('GitHub limited this lookup. Open the source history below or retry later.');
    throw Error('History lookup returned HTTP ' + response.status + '.');
  }
  return response.json();
}

export function catalogueChanges(before, after) {
  const old = new Map(before.map(tool => [tool.id, tool]));
  const changes = [];
  for (const tool of after) {
    const prev = old.get(tool.id);
    old.delete(tool.id);
    if (!prev) { changes.push(tool.title + ' · Added'); continue; }
    if (JSON.stringify(prev) === JSON.stringify(tool)) continue;
    const details = [];
    const probes = record => new Map((record.data_info?.probes || []).map(p => [p.label, p]));
    const a = probes(prev), b = probes(tool);
    for (const label of new Set([...a.keys(), ...b.keys()])) {
      const first = a.get(label), last = b.get(label);
      if (!first || !last) { details.push(label + (last ? ' added' : ' removed')); continue; }
      for (const field of ['value', 'count', 'notice']) {
        if (first[field] !== last[field]) {
          details.push(label + (field === 'value' ? '' : ' ' + (field === 'count' ? last.count_at?.unit || 'count' : field)) + ': ' +
            (first[field] ?? '—') + ' → ' + (last[field] ?? '—'));
        }
      }
      if (Boolean(first.unavailable) !== Boolean(last.unavailable)) {
        details.push(label + (last.unavailable ? ' check became unavailable' : ' check recovered'));
      }
    }
    const other = [...new Set([...Object.keys(prev), ...Object.keys(tool)])]
      .filter(key => key !== 'data_info' && JSON.stringify(prev[key]) !== JSON.stringify(tool[key]));
    if (other.length) details.push('Changed ' + other.join(', '));
    changes.push(tool.title + ' · ' + (details.join('; ') || 'Data source settings changed'));
  }
  for (const tool of old.values()) changes.push(tool.title + ' · Removed');
  return changes.sort();
}

export function initializeActivity(sessionSignal) {
  const panel = document.getElementById('activity-panel');
  const root = document.getElementById('activity-body');
  document.querySelector('a[href="#activity"]').addEventListener('click', () => { panel.open = true; });
  let ready = false;
  panel.addEventListener('toggle', async () => {
    if (!panel.open || ready) return;
    ready = true;
    try {
      const tools = await json('./activity-tools.json', sessionSignal);
      if (!sessionSignal.aborted) setup(tools);
    } catch (error) {
      ready = false;
      root.textContent = 'Could not load tool names. Close and reopen to retry.';
    }
  });

  if (location.hash === '#activity') panel.open = true;

  function setup(tools) {
    const scope = select('Project', [['', 'CoolCode catalogue and site'], ...tools.slice()
      .sort((a,b) => a.title.localeCompare(b.title)).map(t => [t.id, t.title])]);
    const kind = select('History', [['journal','Catalogue refresh journal'], ['runs','Workflow runs'], ['commits','Source changes'],
      ['catalogue','Catalogue changes'], ['lineups','Featured lineup changes']]);
    const outcomes = select('Show runs', [['','All outcomes'], ['failure','Failures'], ['cancelled','Cancelled']]);
    const filter = select('Refresh results', refreshFilters);
    const titles = new Map(tools.map(tool => [tool.id, tool.title]));
    const actions = node('div');
    actions.className = 'stats-toolbar';
    const refresh = node('button','Refresh history');
    const previous = node('button','Newer'), next = node('button','Older');
    actions.append(kind.wrapper, scope.wrapper, filter.wrapper, outcomes.wrapper, refresh);
    const status = node('p');
    status.setAttribute('role','status');
    const results = node('ol'), source = node('p');
    const warnings = node('details');
    const missing = tools.filter(t => t.unavailable.length);
    warnings.append(node('summary', 'Unavailable catalogue checks in the published snapshot (' + missing.length + ' tools)'));
    if (!missing.length) warnings.append(node('p', 'No published metadata checks are flagged as unavailable.'));
    else {
      const list = node('ul');
      for (const t of missing) list.append(node('li', t.title + ' · ' + t.unavailable.join(', ')));
      warnings.append(list);
    }
    const note = node('p', 'Each catalogue refresh checks the dates and counts published by the tools. Expand a run to see the earlier and later readings. Choose Workflow runs for an individual tool’s own updates.');
    root.replaceChildren(actions, note, status, results, previous, next, source, warnings);
    let page = 1, active, journalCache;
    async function show() {
      active?.abort();
      active = new AbortController();
      const signal = AbortSignal.any([active.signal, sessionSignal]);
      const selected = tools.find(t => t.id === scope.input.value);
      const target = selected ? sourceScope(selected.source) : {repo:hub, path:''};
      const mode = kind.input.value, runs = mode === 'runs';
      const central = mode === 'lineups' || mode === 'catalogue';
      const journal = mode === 'journal';
      outcomes.wrapper.hidden = !runs;
      filter.wrapper.hidden = !journal;
      note.hidden = !journal;
      scope.input.options[0].textContent = journal ? 'All tools' : 'CoolCode catalogue and site';
      scope.input.disabled = central;
      results.replaceChildren();
      source.replaceChildren();
      previous.disabled = next.disabled = true;
      if (journal) {
        source.append(link('Open catalogue refresh runs on GitHub', refreshWorkflow));
        status.textContent = 'Loading catalogue refreshes…';
        try {
          const data = journalCache || await loadRefreshes(signal);
          if (signal.aborted) return;
          journalCache = data;
          const entries = matchingRefreshes(data.entries, filter.input.value, scope.input.value);
          const rows = entries.slice((page - 1) * perPage, page * perPage);
          for (const entry of rows) results.append(renderRefresh(entry, titles, scope.input.value));
          previous.disabled = page === 1;
          next.disabled = page * perPage >= entries.length;
          const count = entries.length ? 'Page ' + page + ' · ' + entries.length + ' matching attempts.' : 'No matching attempts.';
          const note = selected ? ' Only attempts with recorded checks for this tool are included.' : '';
          status.textContent = [count, ...data.notices].join(' ') + note;
        } catch (error) {
          if (!signal.aborted) status.textContent = error.message;
        }
        return;
      }
      if (!target && !central) { status.textContent = 'This project has no supported GitHub source.'; return; }
      const repo = central ? hub : target.repo;
      const web = 'https://github.com/jsdyer/' + repo;
      const api = 'https://api.github.com/repos/jsdyer/' + repo;
      const path = mode === 'lineups' ? 'data/featured.json' : mode === 'catalogue' ? 'data/tools.json' : target?.path;
      const params = new URLSearchParams({per_page:String(perPage),page:String(page)});
      if (runs && outcomes.input.value) params.set('status',outcomes.input.value);
      if (!runs && path) params.set('path',path);
      source.append(link('Open history on GitHub', web + (runs ? '/actions' : '/commits/HEAD/' + (path || ''))));
      status.textContent = 'Loading history…';
      try {
        const data = await json(api + (runs ? '/actions/runs?' : '/commits?') + params, signal);
        if (signal.aborted) return;
        const rows = runs ? data.workflow_runs : data;
        for (const row of rows) {
          const item = node('li');
          if (runs) {
            const outcome = row.conclusion || row.status;
            item.append(link(row.name || row.display_title, row.html_url), ' · ' + outcome + ' · ' + row.event +
              ' · ' + row.created_at + (row.run_attempt > 1 ? ' · attempt ' + row.run_attempt : ''));
          } else {
            item.append(link(row.commit.message.split('\n')[0], row.html_url), ' · ' + row.commit.committer.date);
            if (mode === 'catalogue') {
              const more = node('button','Show what changed');
              item.append(' ', more);
              more.addEventListener('click', async () => {
                more.disabled = true;
                const raw = sha => 'https://raw.githubusercontent.com/jsdyer/' + hub + '/' + sha + '/data/tools.json';
                try {
                  const [before, after] = await Promise.all([
                    row.parents.length ? json(raw(row.parents[0].sha), signal, {emptyOnMissing:true}) : [], json(raw(row.sha), signal)]);
                  if (signal.aborted) return;
                  const list = node('ul');
                  const changes = catalogueChanges(before, after);
                  for (const line of changes) list.append(node('li',line));
                  more.replaceWith(changes.length ? list : node('span','No changed tool entries.'));
                } catch {
                  if (!signal.aborted) { more.textContent = 'Retry comparison'; more.disabled = false; }
                }
              });
            }
          }
          results.append(item);
        }
        status.textContent = (rows.length ? 'Page ' + page + ' · ' + rows.length + ' entries.' : 'No entries on this page.') +
          (runs ? ' Times are UTC. A successful job can find unchanged data. Open a run for its steps and logs.' : ' Open a commit for its file changes.') +
          (runs && target?.path ? ' This tool shares the catalogue repository. Workflow results cover the whole repository.' : '');
        next.disabled = runs ? page * perPage >= (outcomes.input.value ? Math.min(1000, data.total_count) : data.total_count) : rows.length < perPage;
      } catch (error) {
        if (!signal.aborted) status.textContent = error.message;
      } finally {
        if (!signal.aborted) previous.disabled = page === 1;
      }
    }
    for (const input of [scope.input, kind.input, outcomes.input, filter.input]) {
      input.addEventListener('change', () => {
        if (input === kind.input && ['catalogue','lineups'].includes(input.value)) scope.input.value = '';
        page = 1; show();
      });
    }
    refresh.addEventListener('click', () => { journalCache = undefined; page = 1; show(); });
    previous.addEventListener('click', () => { page--; show(); });
    next.addEventListener('click', () => { page++; show(); });
    show();
  }
}
