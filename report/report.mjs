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
  try {
    const response = await fetch('../assets/tool-catalog.json');
    if (!response.ok) throw new Error('Catalogue unavailable');
    const catalogue = await response.json();
    const sorted = catalogue.filter(entry => entry?.id !== site && slug.test(entry?.id || '') &&
      typeof entry?.title === 'string').sort((a, b) => a.title.localeCompare(b.title, 'en-CA'));
    const original = tool.value;
    tool.replaceChildren(new Option('CoolCode website or catalogue', site));
    for (const entry of sorted) tool.add(new Option(entry.title, entry.id));
    if ([...tool.options].some(option => option.value === original)) tool.value = original;
    updateGithub();
  } catch {
    // Reporting from a tool still works when the full catalogue is temporarily unavailable.
    const note = document.getElementById('catalogue-note');
    note.textContent = 'The full tool list could not load. You can name the tool in your description.';
    note.hidden = false;
  }
}

tool.add(new Option('CoolCode website or catalogue', site));
if (requested && requested.length <= 80 && slug.test(requested) && requested !== site) {
  tool.add(new Option(requested, requested));
  tool.value = requested;
}
for (const [value, label] of categories) category.add(new Option(label, value));
document.getElementById('tool-picker').hidden = false;
tool.addEventListener('change', updateGithub);
updateGithub();
void showTools();
void enableReports();

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || !endpoint) return;
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
