export function genreUsage(catalog, rows) {
  const views = new Map(rows.map(row => [row.tool, row.views]));
  const groups = new Map();
  for (const tool of catalog) {
    if (tool.access !== 'browser') continue;
    const genre = tool.genre || 'Unclassified';
    if (!groups.has(genre)) groups.set(genre, {genre, total:0, active:0, size:0, peak:0, leaders:[]});
    const group = groups.get(genre);
    group.size++;
    const count = views.get(tool.id) || 0;
    if (!count) continue;
    group.active++;
    group.total += count;
    if (count > group.peak) {
      group.peak = count;
      group.leaders = [];
    }
    if (count === group.peak) group.leaders.push(tool.title);
  }
  return [...groups.values()].sort((a,b) => b.total - a.total || a.genre.localeCompare(b.genre));
}

export function repoFromSource(source) {
  const match = /^https:\/\/github\.com\/jsdyer\/([a-z0-9][a-z0-9.-]*)(?:\/.*)?$/i.exec(source || '');
  return match?.[1] || null;
}

export async function gitTraffic(repo, metric, session, signal) {
  if (!/^[a-z0-9][a-z0-9.-]*$/i.test(repo) || !['views','clones'].includes(metric)) {
    throw Error('Unsupported repository or traffic metric.');
  }
  const response = await fetch('https://api.github.com/repos/jsdyer/' + repo + '/traffic/' + metric, {
    headers:{Accept:'application/vnd.github+json',Authorization:'Bearer ' + session.token},
    signal:AbortSignal.any([signal, session.signal, AbortSignal.timeout(12000)]),
    cache:'no-store', credentials:'omit', redirect:'error', referrerPolicy:'no-referrer',
  });
  if (!response.ok) {
    if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0')
      throw Error('GitHub rate limit reached. Retry later.');
    if ([403,404].includes(response.status))
      throw Error('Check that the token includes this repository and Administration read access.');
    throw Error('GitHub returned HTTP ' + response.status + '.');
  }
  const data = await response.json();
  if (![data.count, data.uniques].every(n => Number.isSafeInteger(n) && n >= 0))
    throw Error('GitHub returned an unreadable traffic count.');
  return data;
}
