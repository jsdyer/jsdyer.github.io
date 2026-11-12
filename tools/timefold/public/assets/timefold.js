'use strict';

// Timefold is deliberately buildless. Start here to change the archive's behavior.
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const state = { capsules: [], filtered: [], csrf: '', session: {}, view: 'table', kind: '', year: 0, minYear: 1989, maxYear: new Date().getFullYear(), surpriseIndex: -1, lastSurprise: '' };
const kindNames = { photo: 'Photograph', note: 'Note / discovery', save: 'Game save / file', web: 'Web fragment' };
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
let toastTimer;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}
function hash(text) {
  let result = 0;
  for (const char of String(text)) result = ((result << 5) - result + char.charCodeAt(0)) | 0;
  return Math.abs(result);
}
function formatDate(value) {
  const [year, month, day] = String(value).split('-');
  return `${day || '01'} ${months[Number(month) - 1] || 'JAN'} ${year || ''}`;
}
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function fileUrl(capsule, download = false) {
  return `api.php?action=file&id=${encodeURIComponent(capsule.id)}${download ? '&download=1' : ''}`;
}
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5500);
}
async function request(action, { method = 'GET', json, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = state.csrf;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
    method, headers, credentials: 'same-origin', cache: 'no-store',
    body: form || (json !== undefined ? JSON.stringify(json) : undefined)
  });
  let data;
  try { data = await response.json(); } catch { data = { error: 'The server returned an unreadable response. Check the PHP server log.' }; }
  if (!response.ok) {
    const error = new Error(data.error || `The request failed (${response.status}).`);
    error.status = response.status;
    if (response.status === 401 && action !== 'login') showLogin();
    throw error;
  }
  return data;
}
function showLogin(message = '', setup = false) {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#loading').hidden = true;
  $('#login-error').textContent = message;
  $('#setup-help').hidden = !setup;
  for (const dialog of $$('dialog[open]')) dialog.close();
}
async function loadSession() {
  const data = await request('session');
  state.session = data;
  state.csrf = data.csrf || '';
  return data;
}
async function start() {
  try {
    const session = await loadSession();
    if (!session.authenticated) return showLogin('', session.initialized === false);
    await showArchive();
  } catch (error) {
    showLogin(error.message, error.status === 503);
  } finally {
    $('#loading').hidden = true;
  }
}
async function showArchive() {
  $('#archive-name').textContent = state.session.archiveName || 'Personal archive';
  $('#demo-badge').hidden = !state.session.demo;
  $('#app-version').textContent = state.session.version || '1.0';
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#password').value = '';
  await refreshArchive();
}
async function refreshArchive() {
  const data = await request('list');
  const previousMax = state.maxYear;
  state.capsules = (data.capsules || []).map(c => ({ ...c, tags: Array.isArray(c.tags) ? c.tags : [] }));
  const years = state.capsules.map(c => Number(String(c.date).slice(0, 4))).filter(Number.isFinite);
  state.minYear = years.length ? Math.min(...years) : new Date().getFullYear();
  state.maxYear = Math.max(new Date().getFullYear(), ...(years.length ? years : [state.minYear]));
  if (!state.year || state.year === previousMax) state.year = state.maxYear;
  state.year = Math.max(state.minYear, Math.min(state.maxYear, state.year));
  $('#year-dial').min = state.minYear;
  $('#year-dial').max = state.maxYear;
  $('#year-dial').value = state.year;
  $('#first-year').textContent = state.minYear;
  $('#middle-year').textContent = Math.round((state.minYear + state.maxYear) / 2);
  $('#last-year').textContent = state.maxYear;
  const selectedTag = $('#tag-filter').value;
  const tags = [...new Set(state.capsules.flatMap(c => c.tags))].sort((a, b) => a.localeCompare(b));
  $('#tag-filter').replaceChildren(new Option('All threads', ''));
  tags.forEach(tag => $('#tag-filter').add(new Option(`#${tag}`, tag)));
  if (tags.includes(selectedTag)) $('#tag-filter').value = selectedTag;
  $$('[data-count]').forEach(node => {
    const kind = node.dataset.count;
    node.textContent = kind === 'all' ? state.capsules.length : state.capsules.filter(c => c.kind === kind).length;
  });
  const fictional = state.session.demo ? 'Fictional demo capsules · ' : '';
  $('#collection-footnote').textContent = `${fictional}Illustrated covers appear when no photo is attached.`;
  filterAndRender();
}
function filterAndRender() {
  $('#kind-filter').value = state.kind;
  $$('[data-kind]').forEach(button => {
    const active = button.dataset.kind === state.kind;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const search = $('#search').value.trim().toLocaleLowerCase();
  const tag = $('#tag-filter').value;
  const order = $('#sort-order').value;
  state.filtered = state.capsules.filter(c => Number(c.date.slice(0, 4)) <= state.year
    && (!state.kind || c.kind === state.kind)
    && (!tag || c.tags.includes(tag))
    && (!search || `${c.title} ${c.note} ${c.source} ${c.tags.join(' ')} ${c.file_name || ''}`.toLocaleLowerCase().includes(search)));
  state.filtered.sort((a, b) => order === 'title' ? a.title.localeCompare(b.title)
    : (order === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.title.localeCompare(b.title));
  $('#selected-year').textContent = state.year;
  $('#year-dial').setAttribute('aria-valuetext', `Show everything up to ${state.year}`);
  const progress = state.maxYear === state.minYear ? 100 : (state.year - state.minYear) / (state.maxYear - state.minYear) * 100;
  $('#year-dial').style.setProperty('--progress', `${progress}%`);
  $('#visible-count').textContent = state.filtered.length;
  const dates = state.filtered.map(c => c.date).sort();
  $('#date-span').textContent = dates.length ? `${dates[0].slice(0, 4)} — ${dates[dates.length - 1].slice(0, 4)} · a life in fragments` : 'your story, piece by piece';
  const active = [state.kind && kindNames[state.kind], tag && `#${tag}`, search && `“${$('#search').value.trim()}”`, state.year < state.maxYear && `up to ${state.year}`].filter(Boolean);
  $('#clear-filters').hidden = !active.length;
  $('#active-filter').hidden = !active.length;
  $('#active-filter').textContent = active.length ? `EXPLORING: ${active.join(' / ')}` : '';
  $('#empty-state').hidden = state.filtered.length > 0;
  $('#capsule-grid').replaceChildren(...state.filtered.map((c, i) => makeCard(c, i)));
  $('#capsule-grid').hidden = state.view !== 'table';
  $('#graph-view').hidden = state.view !== 'graph' || !state.filtered.length;
  if (state.view === 'graph' && state.filtered.length) renderGraph();
}
function generatedArt(capsule) {
  let kind = capsule.kind;
  if (kind === 'note' && /linux|slackware|server|terminal|unix|apache/i.test(`${capsule.title} ${capsule.tags.join(' ')}`)) kind = 'terminal';
  const art = el('div', `art art-${kind} variant-${hash(capsule.id || capsule.title) % 4}`);
  art.setAttribute('aria-hidden', 'true');
  art.title = 'Illustrated cover; not an original photograph';
  if (kind === 'photo') {
    art.append(el('span', 'art-sun'), el('span', 'art-land'));
  } else if (kind === 'note') {
    const paper = el('div', 'paper-note', 'a small\ndiscovery.');
    paper.append(el('div', 'note-lines'));
    art.append(paper);
  } else if (kind === 'save') {
    art.append(el('div', 'disk'));
  } else if (kind === 'web') {
    const browser = el('div', 'browser-window');
    browser.append(el('span', 'web-title', 'a little web.'), el('div', 'web-lines'));
    art.append(browser);
  } else {
    const terminal = el('div', 'terminal-window');
    terminal.append(el('div', '', 'guest@timefold:~$'), el('div', '', '$ keep what matters'), el('span', '', 'archive ready_'));
    art.append(terminal);
  }
  return art;
}
function cover(capsule, detail = false) {
  const wrap = el('div', detail ? 'detail-cover' : 'capsule-cover');
  if (capsule.has_file && capsule.is_image) {
    const image = el('img');
    image.src = fileUrl(capsule);
    image.alt = detail ? capsule.title : '';
    if (!detail) image.loading = 'lazy';
    image.addEventListener('error', () => { image.replaceWith(generatedArt(capsule)); }, { once: true });
    wrap.append(image);
  } else {
    wrap.append(generatedArt(capsule));
  }
  return wrap;
}
function makeCard(capsule, index = 0) {
  const card = el('button', `capsule-card${capsule.has_file ? ' has-file' : ''}`);
  card.type = 'button';
  card.dataset.id = capsule.id;
  card.setAttribute('aria-label', `${capsule.title}, ${formatDate(capsule.date)}, ${kindNames[capsule.kind] || 'Capsule'}. Open capsule.`);
  const artwork = cover(capsule);
  artwork.append(el('span', 'capsule-kind', kindNames[capsule.kind] || 'Capsule'));
  artwork.append(el('span', 'capsule-index', capsule.is_image && capsule.has_file ? 'ORIGINAL' : `ILLUSTRATED / ${String(index + 1).padStart(2, '0')}`));
  const body = el('div', 'capsule-body');
  body.append(el('p', 'capsule-date', formatDate(capsule.date)), el('h3', '', capsule.title), el('p', 'capsule-excerpt', capsule.note || 'A fragment worth keeping.'));
  const tags = el('div', 'capsule-tags');
  capsule.tags.slice(0, 3).forEach(tag => tags.append(el('span', 'tag', `#${tag}`)));
  if (capsule.tags.length > 3) tags.append(el('span', 'tag', `+${capsule.tags.length - 3}`));
  body.append(tags);
  if (capsule.has_file) card.append(el('span', 'card-file', '↧'));
  card.append(artwork, body);
  card.addEventListener('click', () => showDetail(capsule));
  return card;
}
function setView(view) {
  state.view = view;
  $$('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#view-crumb').textContent = view === 'graph' ? 'CONSTELLATION' : 'LIGHT TABLE';
  const heading = $('#collection-heading');
  heading.replaceChildren(document.createTextNode(view === 'graph' ? 'The constellation' : 'The light table'), el('span', 'orange-dot', '.'));
  filterAndRender();
}
function clearFilters() {
  $('#search').value = '';
  $('#tag-filter').value = '';
  state.kind = '';
  state.year = state.maxYear;
  $('#year-dial').value = state.year;
  $$('[data-kind]').forEach(button => button.classList.toggle('active', !button.dataset.kind));
  filterAndRender();
}
function showDetail(capsule) {
  const content = $('#detail-content');
  content.replaceChildren();
  content.append(cover(capsule, true));
  const body = el('div', 'detail-copy');
  const meta = el('div', 'detail-meta');
  meta.append(el('span', '', kindNames[capsule.kind] || 'Capsule'), el('span', '', '·'), el('span', '', formatDate(capsule.date)));
  body.append(meta, el('h2', '', capsule.title), el('p', 'detail-note', capsule.note || 'A fragment worth keeping.'));
  const tags = el('div', 'capsule-tags');
  capsule.tags.forEach(tag => {
    const button = el('button', 'tag', `#${tag}`);
    button.addEventListener('click', () => {
      $('#detail-dialog').close();
      $('#surprise-dialog').close();
      $('#tag-filter').value = tag;
      state.kind = '';
      $$('[data-kind]').forEach(node => node.classList.toggle('active', !node.dataset.kind));
      state.year = state.maxYear;
      $('#year-dial').value = state.year;
      $('#search').value = '';
      filterAndRender();
      $('#collection-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    tags.append(button);
  });
  body.append(tags);
  if (capsule.source) {
    const source = el('div', 'detail-source');
    source.append(el('span', '', 'SOURCE / LOCATION'));
    let isSafeLink = false;
    try { isSafeLink = ['http:', 'https:'].includes(new URL(capsule.source).protocol); } catch { /* Text sources are welcome. */ }
    if (isSafeLink) {
      const link = el('a', '', capsule.source);
      link.href = capsule.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      source.append(link);
    } else source.append(document.createTextNode(capsule.source));
    body.append(source);
  }
  if (capsule.has_file) {
    const attachment = el('div', 'detail-file');
    const description = el('div', '', capsule.file_name || 'Original attachment');
    const size = Number(capsule.file_size) || 0;
    description.append(el('small', '', `${capsule.file_mime || 'file'} · ${size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`}`));
    const link = el('a', '', 'Download original ↧');
    link.href = fileUrl(capsule, true);
    attachment.append(description, link);
    body.append(attachment);
    if (capsule.sha256) body.append(el('p', 'detail-hash', `SHA-256 · ${capsule.sha256}`));
  }
  const actions = el('div', 'detail-actions');
  const remove = el('button', 'delete-button', 'Delete capsule');
  remove.addEventListener('click', async () => {
    if (!confirm(`Delete “${capsule.title}”? This cannot be undone. Export a backup first if you want to keep a copy.`)) return;
    remove.disabled = true;
    try {
      await request('delete', { method: 'POST', json: { id: capsule.id } });
      $('#detail-dialog').close();
      await refreshArchive();
      toast('Capsule deleted.');
    } catch (error) { toast(error.message); remove.disabled = false; }
  });
  const right = el('div');
  const close = el('button', 'button secondary', 'Close');
  close.addEventListener('click', () => $('#detail-dialog').close());
  const edit = el('button', 'button primary', 'Edit capsule ↗');
  edit.addEventListener('click', () => { $('#detail-dialog').close(); openEditor(capsule); });
  right.append(close, edit);
  actions.append(remove, right);
  body.append(actions);
  content.append(body);
  if (!$('#detail-dialog').open) $('#detail-dialog').showModal();
}
function openEditor(capsule = null) {
  const form = $('#capsule-form');
  form.reset();
  $('#edit-error').textContent = '';
  $('#editor-heading').textContent = capsule ? 'Keep the story growing.' : 'Keep a capsule.';
  form.elements.id.value = capsule?.id || '';
  form.elements.title.value = capsule?.title || '';
  form.elements.date.value = capsule?.date || localDate();
  form.elements.kind.value = capsule?.kind || state.kind || 'photo';
  form.elements.note.value = capsule?.note || '';
  form.elements.tags.value = capsule?.tags.join(', ') || '';
  form.elements.source.value = capsule?.source || '';
  $('#current-file').textContent = capsule?.has_file ? `Current attachment: ${capsule.file_name}. A new file replaces it.` : '';
  $('#remove-file-label').hidden = !capsule?.has_file;
  $('#edit-dialog').showModal();
}
function surprise() {
  // Pick a distant pair with an actual shared tag; no semantic or AI claims.
  const capsules = state.capsules;
  const pairs = [];
  for (let i = 0; i < capsules.length; i++) {
    for (let j = i + 1; j < capsules.length; j++) {
      const common = capsules[i].tags.filter(tag => capsules[j].tags.includes(tag));
      if (!common.length) continue;
      const gap = Math.abs(Number(capsules[i].date.slice(0, 4)) - Number(capsules[j].date.slice(0, 4)));
      pairs.push({ a: capsules[i], b: capsules[j], common, gap, key: `${capsules[i].id}/${capsules[j].id}` });
    }
  }
  pairs.sort((a, b) => b.gap - a.gap || b.common.length - a.common.length || a.key.localeCompare(b.key));
  if (!pairs.length) {
    toast('Add the same tag to two capsules to discover a connection. Try “firsts”, “linux”, or a place.');
    return;
  }
  // Cycle through the strongest distant connections, varying the first selection.
  const shortlist = pairs.slice(0, Math.min(18, pairs.length));
  state.surpriseIndex = (state.surpriseIndex + 1) % shortlist.length;
  const pair = shortlist[state.surpriseIndex];
  const years = pair.gap ? `${pair.gap} year${pair.gap === 1 ? '' : 's'} apart` : 'From the same year';
  $('#surprise-explanation').textContent = `${years}, connected by ${pair.common.map(tag => `#${tag}`).join(' and ')}. Different moments. A familiar thread.`;
  $('#surprise-pair').replaceChildren(makeCard(pair.a, 0), makeCard(pair.b, 1));
  if (!$('#surprise-dialog').open) $('#surprise-dialog').showModal();
}
function renderGraph() {
  const svg = $('#constellation');
  svg.replaceChildren();
  svg.dataset.dense = String(state.filtered.length > 35);
  const items = state.filtered.slice(0, 120);
  const allEdges = [];
  const groups = [...new Set(items.map(c => c.tags[0] || 'unthreaded'))].sort();
  const count = items.length;
  const nodes = items.map((c, i) => {
    const group = groups.indexOf(c.tags[0] || 'unthreaded');
    const angle = (group / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const spreadAngle = (hash(c.id) % 360) * Math.PI / 180;
    const spread = 35 + hash(`${c.id}radius`) % 70;
    return { c, i, x: 500 + Math.cos(angle) * (groups.length === 1 ? 0 : 240) + Math.cos(spreadAngle) * spread,
      y: 300 + Math.sin(angle) * (groups.length === 1 ? 0 : 165) + Math.sin(spreadAngle) * spread,
      vx: 0, vy: 0, group };
  });
  for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
    const common = nodes[i].c.tags.filter(tag => nodes[j].c.tags.includes(tag));
    if (common.length) allEdges.push({ a: i, b: j, common });
  }
  // A small deterministic force layout keeps the drawing legible without a library.
  const edges = allEdges.sort((a, b) => b.common.length - a.common.length).slice(0, 250);
  for (let step = 0; step < 140; step++) {
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      if (Math.abs(dx) + Math.abs(dy) < 0.01) { dx = 0.1; dy = 0.1; }
      const dist2 = Math.max(100, dx * dx + dy * dy);
      const force = 550 / dist2;
      a.vx += dx * force; a.vy += dy * force;
      b.vx -= dx * force; b.vy -= dy * force;
    }
    edges.forEach(edge => {
      const a = nodes[edge.a], b = nodes[edge.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const force = (dist - 160) * 0.035;
      a.vx += dx / dist * force; a.vy += dy / dist * force;
      b.vx -= dx / dist * force; b.vy -= dy / dist * force;
    });
    nodes.forEach(node => {
      node.vx += (500 - node.x) * 0.0008;
      node.vy += (300 - node.y) * 0.0008;
      node.vx *= 0.72; node.vy *= 0.72;
      node.x = Math.max(85, Math.min(915, node.x + node.vx));
      node.y = Math.max(55, Math.min(555, node.y + node.vy));
    });
  }
  const links = svgEl('g');
  edges.forEach(edge => {
    const line = svgEl('line', { x1: nodes[edge.a].x, y1: nodes[edge.a].y, x2: nodes[edge.b].x, y2: nodes[edge.b].y, class: 'graph-link' });
    const title = svgEl('title');
    title.textContent = `${nodes[edge.a].c.title} ↔ ${nodes[edge.b].c.title}: ${edge.common.map(t => `#${t}`).join(', ')}`;
    line.append(title);
    edge.element = line;
    links.append(line);
  });
  svg.append(links);
  const nodeLayer = svgEl('g');
  const highlight = index => {
    const connected = new Set([index]);
    edges.forEach(edge => {
      const match = edge.a === index || edge.b === index;
      edge.element.classList.toggle('focused', match);
      if (match) { connected.add(edge.a); connected.add(edge.b); }
    });
    nodes.forEach(node => {
      node.element.classList.toggle('dim', !connected.has(node.i));
      node.element.classList.toggle('connected', connected.has(node.i) && node.i !== index);
    });
  };
  const unhighlight = () => {
    edges.forEach(edge => edge.element.classList.remove('focused'));
    nodes.forEach(node => node.element.classList.remove('dim', 'connected'));
  };
  nodes.forEach(node => {
    const capsule = node.c;
    const group = svgEl('g', { class: `graph-node ${capsule.kind}`, tabindex: '0', role: 'button', 'aria-label': `${capsule.title}, ${capsule.date}, tags ${capsule.tags.join(', ')}. Open capsule.`, transform: `translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})` });
    const linked = edges.filter(e => e.a === node.i || e.b === node.i).length;
    group.append(svgEl('circle', { r: Math.min(10, 4.5 + linked * 0.6) }));
    const labelX = node.x > 700 ? -12 : 12;
    const anchor = node.x > 700 ? 'end' : 'start';
    const label = svgEl('text', { x: labelX, y: -8, 'text-anchor': anchor });
    label.textContent = capsule.title.length > 28 ? `${capsule.title.slice(0, 25)}…` : capsule.title;
    const year = svgEl('text', { x: labelX, y: 7, opacity: '.65', 'font-size': '7', 'text-anchor': anchor });
    year.textContent = capsule.date.slice(0, 4);
    const title = svgEl('title');
    title.textContent = `${capsule.title}\n${formatDate(capsule.date)}\n${capsule.tags.map(t => `#${t}`).join(' · ')}`;
    group.append(label, year, title);
    group.addEventListener('mouseenter', () => highlight(node.i));
    group.addEventListener('mouseleave', unhighlight);
    group.addEventListener('focus', () => highlight(node.i));
    group.addEventListener('blur', unhighlight);
    group.addEventListener('click', () => showDetail(capsule));
    group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetail(capsule); } });
    node.element = group;
    nodeLayer.append(group);
  });
  svg.append(nodeLayer);
  $('#graph-note').textContent = state.filtered.length > 120 ? `Showing the first 120 of ${state.filtered.length} capsules. Filter to explore more.`
    : edges.length ? `${count} capsule${count === 1 ? '' : 's'} · ${edges.length} shared thread${edges.length === 1 ? '' : 's'}${allEdges.length > edges.length ? ' (strongest shown)' : ''}`
    : 'Add shared tags to connect these capsules.';
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('button', event.currentTarget);
  button.disabled = true;
  $('#login-error').textContent = '';
  try {
    // A fresh token also lets a tab recover cleanly after its session expires.
    await loadSession();
    await request('login', { method: 'POST', json: { password: $('#password').value } });
    await loadSession();
    await showArchive();
  } catch (error) { $('#login-error').textContent = error.message; }
  finally { button.disabled = false; }
});
async function lockArchive() {
  try {
    await request('logout', { method: 'POST', json: {} });
    state.capsules = []; state.filtered = [];
    $('#capsule-grid').replaceChildren(); $('#constellation').replaceChildren(); $('#detail-content').replaceChildren();
    await loadSession();
    showLogin();
    $('#password').focus();
  } catch (error) { toast(error.message); }
}
$('#logout-button').addEventListener('click', lockArchive);
$('#mobile-logout-button').addEventListener('click', lockArchive);
$$('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-kind]').forEach(button => button.addEventListener('click', () => {
  state.kind = button.dataset.kind;
  $$('[data-kind]').forEach(node => node.classList.toggle('active', node === button));
  filterAndRender();
}));
$('#year-dial').addEventListener('input', event => { state.year = Number(event.target.value); filterAndRender(); });
$('#reset-time').addEventListener('click', () => { state.year = state.maxYear; $('#year-dial').value = state.year; filterAndRender(); });
$('#search').addEventListener('input', filterAndRender);
$('#tag-filter').addEventListener('change', filterAndRender);
$('#kind-filter').addEventListener('change', event => { state.kind = event.target.value; filterAndRender(); });
$('#sort-order').addEventListener('change', filterAndRender);
$('#clear-filters').addEventListener('click', clearFilters);
$('#empty-reset').addEventListener('click', clearFilters);
$('#add-button').addEventListener('click', () => openEditor());
$('#surprise-button').addEventListener('click', surprise);
$('#sidebar-explore').addEventListener('click', surprise);
$('#surprise-again').addEventListener('click', surprise);
$$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));
$('#capsule-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#save-capsule');
  button.disabled = true;
  $('#edit-error').textContent = '';
  try {
    const form = new FormData(event.currentTarget);
    const encoder = new TextEncoder();
    for (const [field, limit] of [['title', 180], ['note', 16000], ['source', 2048]]) {
      if (encoder.encode(String(form.get(field) || '')).length > limit) {
        throw new Error(`${field === 'note' ? 'The story' : field[0].toUpperCase() + field.slice(1)} is too long. Keep it under ${limit.toLocaleString()} UTF-8 bytes; accented letters and emoji use more than one byte.`);
      }
    }
    const isEdit = Boolean(form.get('id'));
    if (!form.get('id')) form.delete('id');
    const attachment = form.get('attachment');
    if (attachment && !attachment.size) form.delete('attachment');
    await request('save', { method: 'POST', form });
    $('#edit-dialog').close();
    await refreshArchive();
    toast(isEdit ? 'Capsule updated. The story continues.' : 'Capsule kept. A little more past to explore.');
  } catch (error) { $('#edit-error').textContent = error.message; }
  finally { button.disabled = false; }
});
$('#backup-button').addEventListener('click', () => {
  window.location.assign('api.php?action=export');
  toast('Preparing your portable backup. Keep it somewhere safe.');
});
$('#import-button').addEventListener('click', () => $('#backup-file').click());
$('#backup-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm(`Import capsules from “${file.name}”? Timefold will merge the backup into this archive. Export a backup first if you want a copy of the current state.`)) { event.target.value = ''; return; }
  const form = new FormData();
  form.append('backup', file);
  const button = $('#import-button');
  button.disabled = true;
  try {
    const data = await request('import', { method: 'POST', form });
    await refreshArchive();
    const count = data.imported ?? data.count;
    toast(count !== undefined ? `Backup imported: ${count} capsule${count === 1 ? '' : 's'} added.` : 'Backup imported. Your capsules are ready to explore.');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; event.target.value = ''; }
});
$('#print-button').addEventListener('click', () => window.print());

start();
