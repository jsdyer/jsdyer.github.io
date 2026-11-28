const choice = 'coolcode:diagnostics-consent';
const controls = document.getElementById('diagnostics-controls');
const button = document.getElementById('diagnostics-change');
const status = document.getElementById('diagnostics-status');
const optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';

function render() {
  try {
    const enabled = sessionStorage.getItem(choice) === 'enabled';
    button.textContent = enabled ? 'Disable for this tab' : 'Enable for this tab';
    button.disabled = optedOut && !enabled;
    status.textContent = optedOut ? 'Disabled by your browser’s privacy signal.'
      : enabled ? 'Enabled on supported pages you open in this tab.' : 'Off for this tab.';
  } catch {
    button.disabled = true;
    status.textContent = 'Off. This browser does not allow a tab preference.';
  }
  controls.hidden = false;
}

button.addEventListener('click', () => {
  try {
    if (sessionStorage.getItem(choice) === 'enabled') sessionStorage.removeItem(choice);
    else if (!optedOut) sessionStorage.setItem(choice, 'enabled');
  } catch {
    status.textContent = 'The tab preference could not be saved.';
    return;
  }
  render();
});
render();
