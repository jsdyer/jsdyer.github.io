import { getMetrics } from './stats.mjs';

const gate = document.getElementById('gate');
const form = document.getElementById('sign-in');
const tokenInput = document.getElementById('owner-token');
const unlock = document.getElementById('unlock');
const status = document.getElementById('sign-in-status');
const dashboard = document.getElementById('dashboard');
let current;

function lock(message = 'Admin locked.') {
  if (current) {
    current.token = '';
    current.controller.abort();
    current = undefined;
  }
  dashboard.hidden = true;
  dashboard.replaceChildren();
  gate.hidden = false;
  tokenInput.value = '';
  unlock.disabled = false;
  status.textContent = message;
}

window.addEventListener('pagehide', () => lock());
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (current || !tokenInput.value.trim()) return;
  const controller = new AbortController();
  const session = {
    token: tokenInput.value.trim(), signal: controller.signal, controller,
    lock() {
      if (current === session) {
        lock('Please sign in again.');
        tokenInput.focus();
      }
    },
  };
  current = session;
  tokenInput.value = '';
  unlock.disabled = true;
  status.textContent = 'Checking owner access…';
  try {
    // The collector checks the GitHub identity before returning any statistics.
    const metrics = await getMetrics(session, 7);
    const { openDashboard } = await import('./admin.mjs');
    if (current !== session) return;
    dashboard.replaceChildren(document.getElementById('dashboard-layout').content.cloneNode(true));
    await openDashboard(session, metrics);
    if (current !== session) return;
    const signOut = document.getElementById('sign-out');
    signOut.addEventListener('click', () => { lock(); tokenInput.focus(); });
    gate.hidden = true;
    dashboard.hidden = false;
    signOut.focus();
  } catch (error) {
    if (current !== session) return;
    lock(error.message || 'Sign-in failed. Try again.');
    tokenInput.focus();
  }
});
unlock.disabled = false;
