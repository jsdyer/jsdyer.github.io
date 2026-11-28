/* Only tool IDs and the public homepage lineup are eligible for counting. */
(function start() {
  if (location.origin !== 'https://coolcode.ca' || window.top !== window) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
    return;
  }
  const home = location.pathname === '/' || location.pathname === '/index.html';
  const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/.exec(location.pathname);
  if (!home && !match) return;

  // The catalogue build supplies these public tool IDs. Showing the notice
  // only changes the DOM and works even when the visitor disables statistics.
  if (match && '{{PUBLIC_BROWSER_TOOL_IDS}}'.split(' ').includes(match[1]) &&
      !document.querySelector('[data-coolcode-commitments]')) {
    const heading = document.querySelector('h1');
    if (heading) {
      const intro = heading.nextElementSibling;
      const notice = document.createElement('p');
      notice.setAttribute('data-coolcode-commitments', '');
      const wording = document.createElement('small');
      const link = document.createElement('a');
      link.href = '/about/#our-commitments';
      link.textContent = 'How CoolCode works';
      wording.append('No CoolCode account · No ads · ', link);
      notice.append(wording);
      (intro?.tagName === 'P' ? intro : heading).after(notice);
    }
  }

  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  // Diagnostics are an explicit, per-tab choice on the About page.
  try {
    if (window.sessionStorage.getItem('coolcode:diagnostics-consent') === 'enabled') monitorPublicErrors();
  } catch { /* A storage-restricted tab keeps diagnostics disabled. */ }

  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.title = 'Anonymous site counter';
  frame.referrerPolicy = 'no-referrer';
  let queue = [];
  function send(event) {
    try {
      if (typeof frame.contentWindow?.countToolEvent === 'function') {
        frame.contentWindow.countToolEvent(event);
      } else if (queue.length < 12) queue.push(event);
    } catch { /* Browser privacy controls can prevent measurement. */ }
  }
  frame.addEventListener('load', () => {
    const pending = queue;
    queue = [];
    for (const event of pending) send(event);
  });
  frame.src = '/metrics/bridge.html';
  document.body.appendChild(frame);
  if (!home) {
    send({type:'pageview',tool:match[1]});
    return;
  }

  function measureFeatured(grid) {
    if (grid.dataset.metricsBound) return;
    grid.dataset.metricsBound = 'true';
    const {experiment, variant} = grid.dataset;
    const viewed = new Set(), clicked = new Set();
    const record = (type, tool) => send({type, tool, experiment, variant});
    function impression(tool) {
      if (!viewed.has(tool)) { viewed.add(tool); record('impression', tool); }
    }
    const cards = grid.querySelectorAll('[data-featured-card]');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          impression(entry.target.dataset.featuredCard); observer.unobserve(entry.target);
        }
      });
      for (const card of cards) observer.observe(card);
    } else for (const card of cards) impression(card.dataset.featuredCard);
    function activate(e) {
      if (e.type === 'auxclick' && e.button !== 1) return;
      const link = e.target.closest?.('a[data-featured-tool]');
      if (!link || !grid.contains(link)) return;
      const tool = link.dataset.featuredTool;
      impression(tool);
      if (!clicked.has(tool)) { clicked.add(tool); record('click', tool); }
    }
    grid.addEventListener('click',activate);
    grid.addEventListener('auxclick',activate);
  }
  const grid = document.querySelector('[data-featured-grid]');
  if (!grid) return;
  if (grid.dataset.featuredReady === 'true') measureFeatured(grid);
  else grid.addEventListener('coolcode:featured-ready', () => measureFeatured(grid), {once:true});

  // Only these public data tools participate in error reporting. Map locations back to
  // published source files; never forward exception messages, arbitrary paths or stacks.
  function monitorPublicErrors() {
    const economicFiles = ['app.mjs', 'model.mjs'];
    const tools = new Map([
      ['/', ['/assets/featured.js', '/assets/tool-index.js']],
      ['releasereceipt', economicFiles], ['scorecard', economicFiles],
      ['exportneighbours', economicFiles], ['metroeconomy', economicFiles],
      ['pantryprices', [...economicFiles, 'ui.mjs', 'coffee.mjs', 'coffee-ui.mjs']],
      ['welllayers', [...economicFiles, 'columns.mjs', 'probe.mjs', 'shared.mjs']],
      ['halifaxtimelens', [...economicFiles, 'common.mjs', 'photo-research.mjs', 'stories.mjs']],
    ]);
    const tool = home ? 'catalogue' : match[1];
    const sources = tools.get(home ? '/' : tool);
    if (!sources || (!home && !['/' + tool + '/', '/' + tool + '/index.html'].includes(location.pathname))) return;
    const files = new Set(sources.map(file => home ? file : '/' + tool + '/' + file));
    const kinds = new Set(['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError']);
    const sent = new Set();
    const dsn = 'https://fc9499331a6d1c0fda7173f61dcc88c4@o4512474869202944.ingest.de.sentry.io/4512474872610896';
    const envelopeURL = 'https://o4512474869202944.ingest.de.sentry.io/api/4512474872610896/envelope/';

    function sourceFile(url) {
      try {
        const file = new URL(url);
        return file.origin === location.origin && files.has(file.pathname) ? file.pathname : null;
      } catch { return null; }
    }
    function report(file, line, column, error, via) {
      if (!file || !Number.isSafeInteger(line) || line < 1 || line > 1000000 || sent.size >= 3) return;
      const name = error?.name;
      const type = kinds.has(name) ? name : 'Error';
      const fingerprint = ['coolcode-browser', tool, type, file, String(line)];
      const key = fingerprint.join('|');
      if (sent.has(key)) return;
      sent.add(key);
      const eventID = crypto.randomUUID().replaceAll('-', '');
      const frame = {filename:file, lineno:line, in_app:true};
      if (Number.isSafeInteger(column) && column > 0 && column <= 1000000) frame.colno = column;
      const event = {event_id:eventID, timestamp:Date.now() / 1000, platform:'javascript', level:'error',
        environment:'production', logger:'coolcode.browser', tags:{tool}, fingerprint,
        exception:{values:[{type, value:'Unhandled browser error in ' + tool,
          mechanism:{type:via, handled:false}, stacktrace:{frames:[frame]}}]}};
      const body = [JSON.stringify({event_id:eventID, dsn}), '{"type":"event"}', JSON.stringify(event)].join('\n');
      fetch(envelopeURL, {method:'POST', headers:{'Content-Type':'text/plain;charset=UTF-8'}, body,
        credentials:'omit', referrerPolicy:'no-referrer', redirect:'error', keepalive:true}).catch(() => {});
    }

    window.addEventListener('error', event => {
      if (typeof event.filename === 'string') report(sourceFile(event.filename), event.lineno, event.colno, event.error, 'onerror');
    });
    window.addEventListener('unhandledrejection', event => {
      const stack = event.reason instanceof Error && event.reason.stack;
      if (typeof stack !== 'string') return;
      // Inspect browser stack frames locally, skipping the message and outer frames.
      for (const row of stack.slice(0, 16384).split('\n')) {
        const frame = /(?:^\s*at\s+(?:.+?\s+\()?|^[^@]*@)(https?:\/\/[^\s()]+):(\d+):(\d+)\)?$/.exec(row);
        if (!frame) continue;
        const file = sourceFile(frame[1]);
        if (file) report(file, Number(frame[2]), Number(frame[3]), event.reason, 'onunhandledrejection');
        break;
      }
    });
  }
})();
