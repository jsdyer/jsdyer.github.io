/* Only tool IDs and the public homepage lineup are eligible for counting. */
(() => {
  if (location.origin !== 'https://coolcode.ca' || window.top !== window ||
      navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  const home = location.pathname === '/' || location.pathname === '/index.html';
  const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/.exec(location.pathname);
  if (!home && !match) return;

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
})();
