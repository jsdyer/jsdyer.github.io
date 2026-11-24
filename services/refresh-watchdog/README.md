# CoolCode refresh watchdog — maintained in GitHub

This service is maintained in `jsdyer/jsdyer.github.io/services/refresh-watchdog/`. It supersedes the standalone ZIP. The catalogue and audited workflow registry generate `targets.json` and `repositories.txt`; do not maintain a separate repository list here.

```bash
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io/services/refresh-watchdog
sudo bash ./install.sh
```

The installer prompts locally for GitHub authentication, installs a restricted systemd service, and starts a five-minute timer. No web server, open port, database or container is required. Existing collectors, validation and GitHub Pages publication remain in their own repositories.

**Automatic target updates:** before each pass, the service downloads the current generated `targets.json` from this GitHub repository, validates it and atomically replaces its local cache. It retains validated last-good targets during a fetch failure and reports an error if the registry cannot be refreshed for more than a day (or has never been fetched). Runtime Python code is not downloaded or executed automatically.

A newly added repository must also be accessible to the existing GitHub App installation. If the App uses selected repositories, add that repository to its installation; the watchdog cannot grant itself access. Missing access is reported, not silently ignored.

## What changes

- GitHub's existing schedules continue running. The Linux server checks for a successful refresh covering the most recent due occurrence, allowing a grace period for normal queueing.
- It recovers workflows disabled specifically for inactivity. Manually disabled workflows stay disabled.
- It dispatches missed refreshes, avoiding jobs already queued or running. It attempts at most ten dispatches per pass, uses persisted cooldowns, and limits recovery attempts for each due occurrence.
- A successful dispatch request is **not** reported as a successful refresh. Later passes check the completed run and, where configured, the actual published data timestamp.
- Published freshness checks use reviewed collection/check timestamps from `data/operations/freshness.json` in the hub. Old upstream observations and intentionally retained captures are not silently treated as fresh. Only reviewed probes are enabled; the generated targets show their current coverage.
- An optional Healthchecks-compatible heartbeat can notify you if a pass fails or the server stops checking. Without that URL, reporting is local through the JSON report and systemd journal.

The separate weekly GitHub schedule guards are an immediate mitigation, not a documented exemption from GitHub's inactivity policy. This server provides the independent scheduling backstop. **Execution and publication still depend on GitHub Actions**; migrating the collectors themselves to your server would be a separate step.

## 1. Prerequisites

Use a Linux server with Python 3.10+, systemd 247+ and outbound HTTPS. Ubuntu 22.04+ and AlmaLinux 10 meet those version requirements with Python installed.

Ubuntu:

```bash
sudo apt install python3 python3-venv
```

AlmaLinux:

```bash
sudo dnf install python3 python3-pip
```

The installer creates an isolated Python environment with pinned direct dependencies. The service runs as an unprivileged temporary system user; credentials remain root-readable files and are handed to the service through systemd's credential mechanism.

## 2. Create GitHub authentication

**Recommended: a private GitHub App**, so the server can mint short-lived access tokens automatically without a periodically expiring personal token.

1. Open [GitHub App settings](https://github.com/settings/apps/new).
2. Give the app a unique name, such as `CoolCode refresh watchdog jsdyer`, and use `https://coolcode.ca/` as its homepage. Disable the webhook; no callback or public server endpoint is needed.
3. Under repository permissions, grant **Actions: Read and write**. Metadata read access is automatic. No code-write or account permissions are needed.
4. Make the app available only on your account. Create it, note its **App ID**, and generate/download a private key.
5. Install it on `jsdyer`, selecting the repositories in `repositories.txt`. Note the installation ID from the installation settings URL (`.../settings/installations/NUMBER`).
6. Copy the downloaded `.pem` file to the server through your normal secure file-transfer method. During installation, enter the two IDs and the local key filename. Do not paste the key into chat.

The installer copies that key to `/etc/coolcode-watchdog/credential` with mode 0600. Keep your original key in your normal secure backup; remove an unnecessary temporary transfer copy yourself after installation.

**Quick alternative:** create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) owned by `jsdyer`, with access to the managed repositories and **Actions: Read and write**. Enter `token` at the installer prompt. If GitHub's repository-selection limits prevent covering the full list, use the GitHub App. A personal token's expiry or revocation will stop recovery; the report records authentication failure. The App option avoids routine personal-token renewal.

## 3. Install and start

From this service directory in a current Git checkout, run:

```bash
sudo bash ./install.sh
```

The installer starts a first pass immediately and enables the five-minute timer. The first pass can take several minutes. A backlog is processed gradually rather than launching every collector at once.

To install without starting, use `sudo bash ./install.sh --no-start`, then start when ready:

```bash
sudo systemctl enable --now coolcode-watchdog.timer
sudo systemctl start --no-block coolcode-watchdog.service
```

For the optional heartbeat, create a check with a five-minute expected period and at least twenty minutes' grace, then enter its private ping URL at the installer prompt. Configure its notification destination in that monitoring service. A blank answer leaves external notifications disabled. No external monitor is created by this package.

## 4. Verify the installation

```bash
systemctl list-timers coolcode-watchdog.timer
sudo journalctl -u coolcode-watchdog.service -n 60 --no-pager
sudo python3 -m json.tool /var/lib/coolcode-watchdog/report.json
```

The report distinguishes `current`, `pending`, `dispatch_requested`, `cooldown`, `disabled_manually`, `published_stale`, authentication errors and exhausted retries. `verified_refresh: false` with `assurance: workflow_only` means the workflow succeeded but that target has no independent published-timestamp check. An accepted dispatch remains pending verification.

The journal immediately shows registry refresh, authentication, each target's
start and result, elapsed seconds, and final heartbeat/report stages. Watch with
`sudo journalctl -u coolcode-watchdog.service -f`. Progress lines are flushed
immediately and contain no credentials, request URLs or workflow inputs. During
a oneshot pass systemd displays `activating (start)`; use these progress lines to
see what it is doing. Completed targets are checkpointed so an interrupted pass
does not forget which repositories it already checked.

If an older installation reports `credential_file_must_be_private_0600_or_0400`
under systemd, update this checkout and rerun `sudo bash ./install.sh`. Newer
systemd releases can expose `LoadCredential` files as root-owned `0440` with an
ACL granting read access only to the service user. The watchdog now validates
that exact ACL and the read-only credential location. Ordinary credential files
still require owner-only permissions. Keep the original `/etc/coolcode-watchdog/`
files at `0600`; do not try to chmod systemd's temporary credential mounts.
The installer preserves the existing App configuration, private key and ping URL.

An overdue source after a successful run is reported for investigation, rather than repeatedly redispatching the same apparently successful workflow. A source outage, changed data format or publication failure may still need an actual collector fix.

## Configuration and maintenance

| Path | Purpose |
| --- | --- |
| `/etc/coolcode-watchdog/targets.json` | Installed fallback registry for first startup |
| `/var/lib/coolcode-watchdog/targets.json` | Automatically refreshed, validated GitHub registry; do not hand-edit |
| `/etc/coolcode-watchdog/auth.json` | Authentication method and nonsecret App IDs |
| `/etc/coolcode-watchdog/credential` | Private key or token; root-only |
| `/etc/coolcode-watchdog/heartbeat-url` | Optional private monitor URL; blank disables it |
| `/var/lib/coolcode-watchdog/state.json` | Retry history, state cache and rate-limit backoff |
| `/var/lib/coolcode-watchdog/report.json` | Latest results; not served publicly |
| `/opt/coolcode-watchdog/` | Runtime and Python environment |

Published metadata reads are cached for up to half the schedule interval, capped at six hours. A new successful run, changed schedule occurrence or changed probe forces a fresh read; timestamp age is recalculated every pass. GitHub run checks still occur every five minutes.

The GitHub `targets.json` is generated from the catalogue and `data/operations/repositories.json`. Follow [the lifecycle checklist](../../docs/tool-lifecycle.md): refresh the workflow inventory, update reviewed freshness fields, generate files and commit them. The server adopts the committed targets automatically. New workflows also belong in their repository schedule guard, and new repositories may need App installation access.

`grace_minutes`, `cooldown_minutes` and `max_run_minutes` can be set globally or per target. The default stalled-run threshold is 180 minutes; pending runs with already stale published data report an error immediately. Defaults allow half the schedule interval, capped at two hours, with a minimum fifteen-minute dispatch cooldown. `freshness[].max_age_seconds` can override the published-age threshold. The default threshold is twice the workflow interval, with an extra day for explicitly date-only timestamps. Upstream publication cadence may justify a different limit.

After changing configuration in GitHub, inspect the next server pass. To validate the installed cache manually:

```bash
sudo /opt/coolcode-watchdog/venv/bin/python /opt/coolcode-watchdog/watchdog.py \
  --config /var/lib/coolcode-watchdog/targets.json --check-config
sudo systemctl start --no-block coolcode-watchdog.service
```

For runtime upgrades, pull the reviewed GitHub changes and rerun `sudo bash ./install.sh` from this directory. The installer preserves authentication and the fallback configuration. The live target cache updates independently from GitHub on the next pass. There is no unattended code update mechanism.

To pause recovery:

```bash
sudo systemctl disable --now coolcode-watchdog.timer
sudo systemctl stop coolcode-watchdog.service
```

For read-only diagnostics, run `watchdog.py` without `--apply`, using its documented `--token-file` or App credential arguments and separate state/report paths. Dry runs may save read caches and reports but do not enable or dispatch workflows.

## Validation and limits

The service includes fake-API and registry-update tests for due schedules, permissions, manual disables, retries, rate limits, credentials and published freshness. Run `python -m unittest discover -p 'test_*.py' -v` in this directory after installing its requirements. The full generated configuration is validated offline.

GitHub CI tests this service and its generated configuration. Deployment to your Linux server is a separate step; committing the service does **not** install it on your server. Its first authenticated server pass is the end-to-end deployment check. Keep your normal server monitoring and backups: neither a stopped server nor an unavailable GitHub Actions service can be repaired by a process that is not running.

Sources: [GitHub scheduled workflow policy](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [workflow enable/dispatch API](https://docs.github.com/en/rest/actions/workflows), [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [systemd credentials](https://systemd.io/CREDENTIALS/).
