const form = document.getElementById('report-form');
const tool = document.getElementById('tool');
const category = document.getElementById('category');
const message = document.getElementById('message');
const submit = document.getElementById('send-report');
const status = document.getElementById('report-status');
const requested = new URLSearchParams(location.search).get('tool');
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const categories = [
  ['bug', 'Something is broken'],
  ['data', 'Data or source correction'],
  ['accessibility', 'Accessibility problem'],
  ['other', 'Other problem'],
];
const site = 'site';
let sending = false;
let loadingTools = true;
let endpoint;

function announce(text) {
  status.textContent = text;
  status.focus();
}

function updateGithub() {
  const github = document.getElementById('github');
  const name = tool.selectedOptions[0]?.text || 'CoolCode';
  const destination = new URL('https://github.com/jsdyer/jsdyer.github.io/issues/new');
  destination.searchParams.set('title', tool.value === site ? 'CoolCode website feedback' : name + ' feedback');
  destination.searchParams.set('body', (tool.value === site ? 'Website' : 'Tool') + ': ' + name + '\n\nWhat happened?\n');
  github.href = destination.href;
}

async function enableReports() {
  try {
    const { SERVICE } = await import('../assets/service.mjs');
    const api = new URL(SERVICE);
    if (api.protocol !== 'https:' || api.username || api.password) throw new Error('No private endpoint');
    endpoint = new URL(api.href.replace(/\/?$/, '/') + 'report');
    document.getElementById('public-fallback').open = false;
    form.hidden = false;
  } catch {
    status.textContent = 'Private reporting is currently unavailable. You can open a public issue below.';
  }
}

async function showTools() {
  const note = document.getElementById('catalogue-note');
  try {
    const response = await fetch('../assets/tool-catalog.json', {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Catalogue unavailable');
    const catalogue = await response.json();
    const sorted = catalogue.filter(entry => entry?.id !== site && slug.test(entry?.id || '') &&
      typeof entry?.title === 'string').sort((a, b) => a.title.localeCompare(b.title, 'en-CA'));
    // An unlisted tool belongs here only when its own report link was followed.
    // Confirm it against the measured registry without exposing every prototype.
    if (requested && requested.length <= 80 && slug.test(requested) && requested !== site &&
        !sorted.some(entry => entry.id === requested)) {
      try {
        const measuredResponse = await fetch('../admin/measurement-tools.json', {
          credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache',
          signal: AbortSignal.timeout(10000),
        });
        if (!measuredResponse.ok) throw new Error('Measurement registry unavailable');
        const measured = await measuredResponse.json();
        const entry = Array.isArray(measured) && measured.find(row => row?.id === requested &&
          typeof row.title === 'string' && row.title.trim() &&
          row.source === 'https://github.com/jsdyer/' + requested);
        if (!entry) throw new Error('Requested tool is not registered');
        sorted.push(entry);
      } catch {
        note.textContent = 'The requested tool could not be verified. Choose a listed tool or name it in your description.';
        note.hidden = false;
      }
    }
    const original = tool.value;
    tool.replaceChildren(new Option('CoolCode website or catalogue', site));
    for (const entry of sorted) tool.add(new Option(entry.title, entry.id));
    if (sorted.some(entry => entry.id === requested)) tool.value = requested;
    else if ([...tool.options].some(option => option.value === original)) tool.value = original;
    updateGithub();
  } catch {
    note.textContent = 'The full tool list could not load. You can name the tool in your description.';
    note.hidden = false;
  } finally {
    loadingTools = false;
    tool.disabled = false;
    submit.disabled = false;
  }
}

tool.add(new Option('CoolCode website or catalogue', site));
tool.disabled = true;
submit.disabled = true;
for (const [value, label] of categories) category.add(new Option(label, value));
document.getElementById('tool-picker').hidden = false;
tool.addEventListener('change', updateGithub);
updateGithub();
void showTools();
void enableReports();

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || loadingTools || !endpoint) return;
  message.setCustomValidity(message.value.trim() ? '' : 'Describe the problem.');
  if (!form.reportValidity()) return;
  sending = true;
  submit.disabled = true;
  status.textContent = 'Sending your report…';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: tool.value,
        category: category.value,
        description: message.value.trim(),
        website: document.getElementById('website').value,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (response.status === 429) {
        announce('Too many reports were sent recently. Please wait a few minutes and try again.');
      } else {
        announce('Your report could not be confirmed. Your description is still here so you can try again.');
      }
      return;
    }
    const receipt = await response.json();
    if (receipt?.ok !== true) throw new Error('Unconfirmed report');
    const reference = typeof receipt.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(receipt.id)
      ? ' Reference ' + receipt.id + '.' : '';
    form.hidden = true;
    document.getElementById('tool-picker').hidden = true;
    announce('Thank you. Your private report has been sent to the CoolCode maintainer.' + reference);
  } catch {
    announce('Your report could not be confirmed. Your description is still here so you can try again.');
  } finally {
    sending = false;
    submit.disabled = false;
  }
});
message.addEventListener('input', () => message.setCustomValidity(''));
