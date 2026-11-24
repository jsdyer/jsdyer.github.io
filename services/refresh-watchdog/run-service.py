#!/usr/bin/env python3
"""Pass systemd credentials to the watchdog without shell interpolation."""
import json
import os
from pathlib import Path
from sync_targets import update

credential_dir = Path(os.environ["CREDENTIALS_DIRECTORY"])
auth = json.loads((credential_dir / "auth.json").read_text())
current_targets = update('/var/lib/coolcode-watchdog/targets.json', credential_dir / 'targets.json')
args = ["/opt/coolcode-watchdog/venv/bin/python", "/opt/coolcode-watchdog/watchdog.py",
        "--config", str(current_targets),
        "--state", "/var/lib/coolcode-watchdog/state.json",
        "--report", "/var/lib/coolcode-watchdog/report.json", "--apply",
        "--heartbeat-url-file", str(credential_dir / "heartbeat-url")]
if auth["method"] == "app":
    args += ["--app-id", str(auth["app_id"]), "--installation-id", str(auth["installation_id"]),
             "--private-key-file", str(credential_dir / "github-credential")]
elif auth["method"] == "token":
    args += ["--token-file", str(credential_dir / "github-credential")]
else:
    raise SystemExit("Unsupported authentication method in auth.json")
os.execv(args[0], args)
