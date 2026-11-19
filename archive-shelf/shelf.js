'use strict';

const byId = id => document.getElementById(id);
const form = byId('search-form');
const query = byId('query');
const collection = byId('collection');
const issue = byId('issue');
const results = byId('results');
const pageSize = 12;
const byteLimit = 12 * 1024 * 1024;
const publicPages = archiveIssues.flatMap(record => {
  issue.add(new Option(record.label, record.date));
  return record.pages.map((body, index) => ({
    title: 'The Daily · ' + record.label,
    date: record.date,
    number: index + 1,
    body,
    pdf: record.file + '#page=' + (index + 1),
    original: record.original
  }));
});
let localPages = [];
let localFiles = 0;
let localBytes = 0;
let importGeneration = 0;
let hits = [];
let displayed = 0;
let term = '';
let pattern = null;

function phrasePattern(value) {
  const words = value.match(/[\p{L}\p{N}]+/gu);
  if (!words) return null;
  return new RegExp('(?<![\\p{L}\\p{N}])' + words.join('[^\\p{L}\\p{N}]+') + '(?![\\p{L}\\p{N}])', 'iu');
}

function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function excerpt(body, match) {
  if (!match) return ['', '', body.slice(0, 220).trimEnd() + (body.length > 220 ? '…' : '')];
  const start = Math.max(0, match.index - 80);
  const end = Math.min(body.length, match.index + match[0].length + 115);
  const before = body.slice(start, match.index);
  const after = body.slice(match.index + match[0].length, end);
  return [
    start ? '…' + before.replace(/^\S*\s/, '') : before,
    match[0],
    end < body.length ? after.replace(/\s\S*$/, '') + '…' : after
  ];
}

function rowFor(page) {
  const row = el('li');
  const body = el('div');
  const heading = el('h4');
  if (page.pdf) {
    const link = el('a', page.title);
    link.href = page.pdf;
    link.setAttribute('aria-label', page.title + ', page ' + page.number + ' (PDF)');
    heading.append(link);
  } else {
    heading.textContent = page.title;
  }
  const passage = el('p');
  const [before, match, after] = excerpt(page.body, pattern && pattern.exec(page.body));
  passage.append(before);
  if (match) passage.append(el('mark', match));
  passage.append(after);
  body.append(heading, passage);
  const details = el('details');
  details.append(el('summary', 'Read page text'));
  details.addEventListener('toggle', () => {
    if (details.open && !details.querySelector('.transcript')) {
      details.append(el('p', page.body || 'This page has no text.', 'transcript'));
    }
  });
  body.append(details);
  row.append(el('span', 'Page ' + page.number, 'folio'), body);
  return row;
}

function showMore() {
  const next = hits.slice(displayed, displayed + pageSize);
  results.append(...next.map(rowFor));
  displayed += next.length;
  byId('more').hidden = displayed >= hits.length;
}

function render() {
  const local = collection.value === 'local';
  term = query.value.trim().slice(0, 200);
  pattern = phrasePattern(term);
  const browse = !local && !term && !issue.value;
  byId('issue-filter').hidden = local;
  byId('import-panel').hidden = !local;
  byId('examples').hidden = local;
  byId('issues').hidden = !browse;
  byId('result-panel').hidden = browse;
  byId('clear').hidden = !term;
  const pages = local ? localPages : publicPages;
  hits = pages.filter(page =>
    (local || !issue.value || page.date === issue.value)
    && (!term || (pattern && pattern.test(page.body)))
  );
  results.replaceChildren();
  displayed = 0;
  const count = hits.length + (hits.length === 1 ? ' page' : ' pages');
  byId('summary').textContent = term ? count + ' matching “' + term + '”' : count;
  byId('export').hidden = !hits.length;
  byId('more').hidden = true;
  if (browse) return;
  if (hits.length) {
    showMore();
  } else {
    const hint = local && !localPages.length ? 'Choose files above to search this tab’s collection.'
      : 'Try a shorter phrase or clear the search to browse pages.';
    results.append(el('li', hint, 'empty'));
  }
}

function updateAddress() {
  const url = new URL(location.href);
  const isPublic = collection.value === 'public';
  for (const [name, value] of [['q', term], ['issue', issue.value]]) {
    if (isPublic && value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  }
  if (url.href !== location.href) history.pushState(null, '', url);
}

function search(value) {
  query.value = value.trim().slice(0, 200);
  render();
  updateAddress();
}

function readAddress() {
  const params = new URLSearchParams(location.search);
  collection.value = 'public';
  const date = params.get('issue');
  issue.value = archiveIssues.some(record => record.date === date) ? date : '';
  query.value = (params.get('q') || '').trim().slice(0, 200);
  render();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  search(query.value);
});
for (const button of form.querySelectorAll('[data-term]')) {
  button.addEventListener('click', () => search(button.dataset.term));
}
byId('clear').addEventListener('click', () => {
  search('');
  query.focus();
});
byId('browse').addEventListener('click', () => {
  collection.value = 'public';
  issue.value = '';
  search('');
});
byId('more').addEventListener('click', () => {
  const firstNew = displayed;
  showMore();
  const target = results.children[firstNew]?.querySelector('a, summary');
  if (target) target.focus();
});
collection.addEventListener('change', () => {
  issue.value = '';
  search('');
});
issue.addEventListener('change', () => search(query.value));
byId('files').addEventListener('change', async event => {
  const input = event.target;
  const files = Array.from(input.files);
  if (!files.length) return;
  const generation = importGeneration;
  const errors = [];
  input.disabled = true;
  try {
    for (const file of files) {
      if (generation !== importGeneration) break;
      if (!/\.(txt|md|markdown)$/i.test(file.name)) {
        errors.push(file.name + ' needs to be text or Markdown.');
        continue;
      }
      if (localBytes + file.size > byteLimit) {
        errors.push(file.name + ' exceeds the 12 MiB total for this tab.');
        continue;
      }
      let body;
      try {
        body = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer());
      } catch {
        errors.push(file.name + ' could not be read as UTF-8.');
        continue;
      }
      if (generation !== importGeneration) break;
      const remainingPages = 2500 - localPages.length;
      const pages = body.split('\f', remainingPages + 1);
      if (pages.length > remainingPages) {
        errors.push(file.name + ' exceeds the 2,500 pages allowed in this tab.');
        continue;
      }
      for (const [index, content] of pages.entries()) {
        localPages.push({title: file.name, number: index + 1, body: content});
      }
      localFiles++;
      localBytes += file.size;
    }
    if (generation === importGeneration) {
      byId('import-status').textContent = localFiles + (localFiles === 1 ? ' file, ' : ' files, ')
        + localPages.length + (localPages.length === 1 ? ' page. ' : ' pages. ') + errors.join(' ');
      byId('forget').hidden = !localFiles;
      render();
    }
  } finally {
    input.value = '';
    input.disabled = false;
  }
});

byId('forget').addEventListener('click', () => {
  importGeneration++;
  localPages = [];
  localFiles = 0;
  localBytes = 0;
  byId('forget').hidden = true;
  byId('import-status').textContent = 'Files removed from this tab.';
  search('');
});

byId('export').addEventListener('click', () => {
  const records = hits.map(page => {
    const record = {document: page.title, page: page.number, excerpt: excerpt(page.body, pattern && pattern.exec(page.body)).join('')};
    if (page.pdf) Object.assign(record, {publisher: 'Statistics Canada', issue_date: page.date,
      page_url: new URL(page.pdf, location.href).href, original_pdf: page.original});
    return record;
  });
  const output = {query: term, results: records};
  if (collection.value === 'public') {
    output.attribution = 'Adapted from Statistics Canada, The Daily, issue dates cited in each result. This does not constitute an endorsement by Statistics Canada of this product.';
    output.licence = 'https://www.statcan.gc.ca/en/terms-conditions/open-licence';
  }
  const file = new Blob([JSON.stringify(output, null, 2) + '\n'], {type: 'application/json'});
  const url = URL.createObjectURL(file);
  const download = el('a');
  download.href = url;
  download.download = 'archive-shelf-results.json';
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener('popstate', readAddress);
readAddress();
form.hidden = false;
