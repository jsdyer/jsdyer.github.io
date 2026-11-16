(() => {
  const form = document.getElementById('tool-search-form');
  const input = document.getElementById('tool-search');
  const clear = document.getElementById('clear-tools');
  const status = document.getElementById('tool-count');
  const empty = document.getElementById('tool-empty');

  const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('en-CA');
  const groups = [...document.querySelectorAll('[data-tool-group]')].map(section => {
    const heading = section.querySelector('h3').textContent;
    const entries = [...section.querySelectorAll('[data-tool]')].map(element => ({
      element,
      searchable: normalize([heading, element.textContent, element.dataset.keywords].join(' ')),
    }));
    return {
      section, entries,
      jump: document.querySelector(`[data-group-link="${section.id}"]`).closest('li'),
    };
  });

  function filterTools() {
    const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    let total = 0;
    for (const { section, entries, jump } of groups) {
      let visible = 0;
      for (const { element, searchable } of entries) {
        const match = terms.every(term => searchable.includes(term));
        element.hidden = !match;
        if (match) visible++;
      }
      section.hidden = visible === 0;
      jump.hidden = visible === 0;
      total += visible;
    }
    empty.hidden = total > 0;
    clear.disabled = !input.value;
    status.textContent = terms.length ? `${total} ${total === 1 ? 'tool' : 'tools'} found` : '';
  }

  input.addEventListener('input', filterTools);
  form.addEventListener('submit', event => {
    event.preventDefault();
    filterTools();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    input.focus();
    filterTools();
  });
  window.addEventListener('pageshow', filterTools);
  form.hidden = false;
  filterTools();
})();
