#!/usr/bin/env bash
set -euo pipefail
umask 077

# Run from the reviewed Git checkout: sudo bash ./install.sh
package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
start_service=yes
if [[ ${1:-} == --no-start ]]; then start_service=no; shift; fi
if (($#)); then echo 'Usage: sudo bash install.sh [--no-start]' >&2; exit 2; fi
if ((EUID != 0)); then echo 'Run this installer with sudo.' >&2; exit 1; fi
for command in python3 systemctl install; do
  command -v "$command" >/dev/null || { echo "Missing prerequisite: $command" >&2; exit 1; }
done
python3 -c 'import sys; assert sys.version_info >= (3,10), "Python 3.10 or newer is required"'
systemd_version=$(systemctl --version | head -n 1 | awk '{print $2}')
if [[ ! $systemd_version =~ ^[0-9]+$ ]] || ((systemd_version < 247)); then
  echo 'systemd 247 or newer is required for secure service credentials.' >&2; exit 1
fi
for file in watchdog.py sync_targets.py requirements.txt targets.json run-service.py systemd/coolcode-watchdog.service systemd/coolcode-watchdog.timer; do
  [[ -f "$package_dir/$file" ]] || { echo "Package is incomplete: $file" >&2; exit 1; }
done

install -d -m 755 /opt/coolcode-watchdog
install -d -m 700 /etc/coolcode-watchdog
install -m 644 "$package_dir/watchdog.py" "$package_dir/sync_targets.py" "$package_dir/run-service.py" "$package_dir/requirements.txt" /opt/coolcode-watchdog/
# The service's DynamicUser must be able to read the non-secret runtime.
umask 022
if [[ ! -x /opt/coolcode-watchdog/venv/bin/python ]]; then
  python3 -m venv /opt/coolcode-watchdog/venv || {
    echo 'Install Python venv support first (Ubuntu: apt install python3-venv; AlmaLinux: dnf install python3-pip).' >&2
    exit 1
  }
fi
/opt/coolcode-watchdog/venv/bin/python -m pip install --disable-pip-version-check -r /opt/coolcode-watchdog/requirements.txt
chmod -R a+rX /opt/coolcode-watchdog/venv
umask 077
if [[ -f /etc/coolcode-watchdog/targets.json ]]; then
  install -m 600 "$package_dir/targets.json" /etc/coolcode-watchdog/targets.json.dist
  echo 'Kept existing targets.json; new audited defaults are in targets.json.dist.'
else
  install -m 600 "$package_dir/targets.json" /etc/coolcode-watchdog/targets.json
fi

if [[ ! -f /etc/coolcode-watchdog/auth.json ]]; then
  [[ -r /dev/tty ]] || { echo 'Authentication must be configured interactively; see README.md.' >&2; exit 1; }
  echo 'Authentication: GitHub App (recommended, automatic token renewal) or a fine-grained personal access token.'
  read -r -p 'Choose app or token [app]: ' auth_method </dev/tty
  auth_method=${auth_method:-app}
  case "$auth_method" in
    app)
      read -r -p 'GitHub App ID: ' app_id </dev/tty
      read -r -p 'Installation ID for jsdyer: ' installation_id </dev/tty
      [[ $app_id =~ ^[0-9]+$ && $installation_id =~ ^[0-9]+$ ]] || { echo 'IDs must be numbers.' >&2; exit 1; }
      read -r -p 'Local path to the downloaded App private key (.pem): ' key_path </dev/tty
      [[ -f "$key_path" ]] || { echo 'Private key file does not exist.' >&2; exit 1; }
      install -m 600 "$key_path" /etc/coolcode-watchdog/credential
      printf '{"method":"app","app_id":"%s","installation_id":"%s"}\n' "$app_id" "$installation_id" > /etc/coolcode-watchdog/auth.json
      ;;
    token)
      read -r -s -p 'Fine-grained token (hidden; Actions read/write only): ' github_credential </dev/tty
      printf '\n' >/dev/tty
      [[ -n "$github_credential" ]] || { echo 'Token cannot be empty.' >&2; exit 1; }
      printf '%s\n' "$github_credential" > /etc/coolcode-watchdog/credential
      unset github_credential
      printf '{"method":"token"}\n' > /etc/coolcode-watchdog/auth.json
      ;;
    *) echo 'Choose app or token.' >&2; exit 1 ;;
  esac
fi
chmod 600 /etc/coolcode-watchdog/{auth.json,credential,targets.json}
if [[ ! -f /etc/coolcode-watchdog/heartbeat-url ]]; then
  heartbeat_url=''
  if [[ -r /dev/tty ]]; then
    read -r -s -p 'Optional Healthchecks-compatible ping URL (hidden; blank for local reports only): ' heartbeat_url </dev/tty
    printf '\n' >/dev/tty
  fi
  printf '%s\n' "$heartbeat_url" > /etc/coolcode-watchdog/heartbeat-url
  unset heartbeat_url
fi
chmod 600 /etc/coolcode-watchdog/heartbeat-url
/opt/coolcode-watchdog/venv/bin/python /opt/coolcode-watchdog/watchdog.py --config /etc/coolcode-watchdog/targets.json --check-config
install -m 644 "$package_dir/systemd/coolcode-watchdog.service" "$package_dir/systemd/coolcode-watchdog.timer" /etc/systemd/system/
systemctl daemon-reload
if [[ $start_service == yes ]]; then
  systemctl enable --now coolcode-watchdog.timer
  systemctl start --no-block coolcode-watchdog.service
  echo 'Installed and started. The first pass may take several minutes.'
else
  echo 'Installed without starting. Start with: systemctl enable --now coolcode-watchdog.timer'
fi
echo 'Inspect: journalctl -u coolcode-watchdog.service -n 60 --no-pager'
echo 'Report:  /var/lib/coolcode-watchdog/report.json'
