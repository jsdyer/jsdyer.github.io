'use strict';

const form = document.querySelector('#search-form');
const query = document.querySelector('#query');
const results = document.querySelector('#results');
const summary = document.querySelector('#summary');
const clear = document.querySelector('#clear');
const pdf = 'sample/rainline-bulletin.pdf';

// Match whole words even if a PDF line break or punctuation separates them.
function phrasePattern(term) {
  const words = term.match(/[\p{L}\p{N}]+/gu);
  if (!words) return null;
  return new RegExp('(?<![\\p{L}\\p{N}])' + words.join('[^\\p{L}\\p{N}]+') + '(?![\\p{L}\\p{N}])', 'iu');
}

function appendExcerpt(element, text, match) {
  if (!match) {
    element.textContent = text;
    return;
  }
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  let start = Math.max(0, before.length - 62);
  let stop = Math.min(after.length, 114);
  if (start > 0) start = before.indexOf(' ', start) + 1 || start;
  const lastStop = before.lastIndexOf('. ');
  if (lastStop >= start) start = lastStop + 2;
  const nextStop = after.indexOf('. ');
  if (nextStop >= 0 && nextStop < stop) stop = nextStop + 1;
  else if (stop < after.length) {
    const space = after.lastIndexOf(' ', stop);
    if (space > 0) stop = space;
  }
  const highlight = document.createElement('mark');
  highlight.textContent = match[0];
  element.append(
    (start && start !== lastStop + 2 ? '…' : '') + before.slice(start),
    highlight,
    after.slice(0, stop) + (stop < after.length && stop !== nextStop + 1 ? '…' : '')
  );
}

function show(term) {
  const pattern = phrasePattern(term);
  const pages = term ? bulletinPages.filter(page => pattern && pattern.test(page.text)) : bulletinPages;
  const rows = document.createDocumentFragment();
  for (const page of pages) {
    const row = document.createElement('li');
    const folio = document.createElement('span');
    folio.className = 'folio';
    folio.textContent = 'Page ' + page.page;
    const body = document.createElement('div');
    const title = document.createElement('h4');
    const link = document.createElement('a');
    link.href = pdf + '#page=' + page.page;
    link.textContent = page.title;
    title.append(link);
    const excerpt = document.createElement('p');
    const source = !pattern || pattern.test(page.lead) ? page.lead : page.text;
    appendExcerpt(excerpt, source, pattern && pattern.exec(source));
    body.append(title, excerpt);
    row.append(folio, body);
    rows.append(row);
  }
  if (!pages.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Try a shorter phrase or clear the search to browse the issue.';
    rows.append(empty);
  }
  results.replaceChildren(rows);
  summary.textContent = term
    ? pages.length + (pages.length === 1 ? ' page' : ' pages') + ' matching “' + term + '”'
    : 'All ' + pages.length + ' pages';
  clear.hidden = !term;
}

function runSearch(text, updateURL) {
  const term = text.trim().slice(0, 200);
  query.value = term;
  show(term);
  if (updateURL) {
    const url = new URL(location.href);
    if (term) url.searchParams.set('q', term);
    else url.searchParams.delete('q');
    if (url.href !== location.href) history.pushState(null, '', url);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  runSearch(query.value, true);
});
for (const button of form.querySelectorAll('[data-term]')) {
  button.addEventListener('click', () => runSearch(button.dataset.term, true));
}
clear.addEventListener('click', () => {
  runSearch('', true);
  query.focus();
});
function readAddress() {
  runSearch(new URLSearchParams(location.search).get('q') || '', false);
}
window.addEventListener('popstate', readAddress);
readAddress();
form.hidden = false;
