(() => {
  const grid = document.querySelector('[data-featured-grid]');
  if (!grid) return;

  if (grid.dataset.mode === 'ab') {
    const key = 'coolcode:featured:' + grid.dataset.experiment;
    let variant;
    try {
      variant = sessionStorage.getItem(key);
      if (variant !== 'a' && variant !== 'b') {
        variant = Math.random() < 0.5 ? 'a' : 'b';
        sessionStorage.setItem(key, variant);
      }
    } catch {
      // Keep the static lineup when the browser cannot retain an assignment.
      variant = 'a';
    }
    if (variant === 'b') {
      const alternative = document.getElementById('featured-lineup-b');
      grid.replaceChildren(alternative.content.cloneNode(true));
      grid.dataset.variant = variant;
    }
  }

  grid.dataset.featuredReady = 'true';
  grid.dispatchEvent(new CustomEvent('coolcode:featured-ready', { bubbles: true }));
})();
