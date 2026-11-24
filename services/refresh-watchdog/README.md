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
- It dispatches missed or failed refreshes, avoiding jobs already queued or running. It attempts at most ten dispatches per pass. Unresolved refreshes keep receiving recovery attempts at least six hours apart by default (up to four per day), without a lifetime attempt limit.
- A successful dispatch request is **not** reported as a successful refresh. Later passes check the completed run and, where configured, the actual published data timestamp.
- Published freshness checks use reviewed collection/check timestamps from `data/operations/freshness.json` in the hub. Old upstream observations and intentionally retained captures are not silently treated as fresh. The 162 data-publishing workflows have 166 reviewed probes; the six workflow-only exceptions are listed below.
- An optional Healthchecks-compatible heartbeat monitors watchdog execution: completing checks, requesting eligible recovery and saving the report. Collector failures and stale data stay in reports without failing this heartbeat. Without that URL, reporting is local through the JSON report and systemd journal.

The separate weekly GitHub schedule guards are an immediate mitigation, not a documented exemption from GitHub's inactivity policy. This server provides the independent scheduling backstop. **Execution and publication still depend on GitHub Actions**; migrating the collectors themselves to your server would be a separate step.

## Published timestamp coverage

All 162 scheduled data-publishing workflows have a published timestamp check.
The remaining six jobs monitor or audit existing material and do not publish a
source-data snapshot:

| Repository | Workflow | Purpose |
| --- | --- | --- |
| `atlanticdial` | `station-schedules.yml` | Check station schedule pages for changes |
| `donairafterdark` | `watch.yml` | Check menu sources for editorial review |
| `jsdyer.github.io` | `canada-probes.yml` | Check Canadian source access |
| `jsdyer.github.io` | `catalogue-audit.yml` | Audit repository and deployment integration |
| `jsdyer.github.io` | `catalogue-freshness.yml` | Check the catalogue's published metadata |
| `jsdyer.github.io` | `service-monitor.yml` | Monitor services |

Checks use the date of a successful source retrieval or validation, including an
unchanged response. Source edition dates, historical observations and manual
review dates are not refresh dates. Existing date-only fields retain their
one-day precision allowance. A retained fallback keeps its original date.

Prefix Diary publishes a date-only successful-retrieval field and refreshes
Tuesday–Saturday at 10:22 UTC. Its reviewed maximum age is four days (345600
seconds): the three-day Saturday-to-Tuesday gap plus one day for date precision.
The generic daily limit incorrectly flagged Saturday's snapshot on Tuesday morning,
before another run was due. This tolerance does not delay recovery of a missed
scheduled workflow; the due-run check remains separate and unchanged.

## What Healthchecks monitors

The heartbeat answers **“Did the watchdog complete its own checks and recovery work?”**
It does not require every collector to download successfully or every dataset to be
recent. A source HTTP 403, failed collector, stalled GitHub run, stale timestamp or
unreadable published status remains visible in the per-tool report and journal. A
completed watchdog pass can send a success ping with those findings still present.
Waiting for an active job, the six-hour retry window or the dispatch budget is normal.
Recovery continues according to the same rules; timestamps and validation results are
never changed just to make the heartbeat green.

The heartbeat fails when the watchdog cannot complete its own work: invalid credentials
or configuration, failure to inspect GitHub workflows or request recovery, an incomplete
history that prevents a safe recovery decision, or inability to save its state/report.
A crash or stopped timer also leaves missing pings for Healthchecks to detect. GitHub
API authentication/permission errors are operational failures; an upstream source 403
inside a collector, or a 403 reading public data metadata, is a reported collector issue.
A registry fetch warning does not fail a pass that successfully uses validated cached
targets; the warning stays in the report.

| Report field | Meaning |
| --- | --- |
| `watchdog_health`, `watchdog_errors` | Execution health. Controls Healthchecks and the exit status in `--apply` mode. |
| `collector_errors` | Targets with error-level collector/output findings. Ordinary warnings remain in `attention`. |
| `health`, `errors` | Existing overall findings, including collector data problems and registry warnings. Kept for compatibility; **not the heartbeat decision**. |
| `targets[].error_scope` | `watchdog` or `collector` for each error-level target; also included in the journal. |
| `heartbeat_scope` | `watchdog_execution`, identifying the new policy. |

For example, Lobby Trail may repeatedly receive 403s and exceed its data-age limit.
Its report still shows the stale data and recovery attempts, while Healthchecks stays
green if the watchdog keeps completing its work. The final journal summary prints
`watchdog_health`, `watchdog_errors` and `collector_errors` separately. The admin's
Tool outcomes report independently continues to show failed runs and overdue data.
The overall JSON `health` can therefore remain `unhealthy` while `watchdog_health`
and Healthchecks are healthy. A dry run never sends the production heartbeat and
retains its existing nonzero exit for findings; `watchdog_health` is `dry_run` when
its read-only checks complete.

This replaces the older combined heartbeat policy. Install the runtime update below;
keep the existing Healthchecks URL, five-minute period and twenty-minute grace.

## Continuing recovery attempts

A collector that exits unsuccessfully, including an HTTP 403 or timeout, does not
satisfy its due refresh. After the first recovery dispatch, the watchdog waits six
hours before dispatching again, and continues at that interval until it observes a
successful scheduled/manual refresh covering the latest due occurrence. This replaces
the old three-attempt cutoff and exponential cooldown. The first overdue recovery
still happens on an eligible pass after the normal schedule grace period.

The retry window survives service restarts and new cron occurrences; it is not reset
just because another scheduled time passed. A successful refresh clears the retry
counter and cooldown so that a later missed refresh can be recovered promptly.
Existing GitHub schedules continue independently. Queued/running jobs, intentional
manual disables, API rate limits, and the ten-dispatch pass budget still take priority.
Successful runs with failed published checks continue to require review rather than
causing redundant dispatches. No snapshot or source timestamp is advanced by retrying.

The report includes `recovery_attempts` and `retry_after` for recovery dispatches and
cooldowns. Previously exhausted targets resume under the six-hour policy using their
saved last-dispatch time; do not delete `state.json` to upgrade.

This is a **runtime update**: the automatically downloaded target list alone does not
install it. From your existing `services/refresh-watchdog` checkout on the server, run:

```bash
git pull --ff-only
sudo systemctl stop coolcode-watchdog.timer coolcode-watchdog.service
sudo bash ./install.sh
```

The installer preserves your GitHub App credentials, heartbeat URL and retry history,
then re-enables the timer and starts a pass. Inspect the next report for
`heartbeat_scope: watchdog_execution` and `watchdog_health`, and recovery rows for
`dispatch_requested` or `cooldown` with their next eligible retry time. If installation
fails, correct that error and rerun it; the stopped timer must be re-enabled before
monitoring resumes.

Seven apps needed small published metadata additions: Blocked or Gone, Contract
Patterns, Langley Trades, Lobby Trail, Metro Economy, Patent Attic and RegistrarWatch.
The other additions reuse existing fields after reviewing their collectors.
Contract Patterns exposes a small status file instead of requiring a 47 MB data
download. The probe label names the checked feed: for example, Patch Signal checks
KEV retrieval, while optional EPSS enrichment is reported by the app separately.
A fresh capture timestamp does not certify every optional feed or the accuracy of
the upstream data.

Air Check Diary uses `data/check.json.checked_at`, the time its collector successfully
checked the official CRTC archive catalogue. `awaiting_publication` means the next
monthly archive is not listed yet; it does not advance the retained archive's
retrieval date. A listed archive that fails to download still fails the collector.
See the [24 November collector repairs](../../docs/collector-repairs-2026-11-24.md)
for verified recoveries and the two remaining hosted-download restrictions.

Keep the probe mapping in `data/operations/freshness.json` current when adding or
changing a workflow. The operations test requires a probe for every scheduled job
except these six documented non-data jobs. This update changes probe configuration;
the installed service loads it automatically without a runtime reinstall.

The admin's [Tool outcomes report](../../docs/site-administration.md#tool-outcomes)
uses this same registry and timestamp-checking code in a read-only hourly GitHub
job. It displays workflow execution separately from published evidence and retains
recent result/count changes on the `collector-outcomes-log` branch. It is an
independent observation, not a copy of the Linux server's private report, and does
not dispatch jobs or send another heartbeat. No installed-service update is needed
to use the admin report. Keep the observer's schema tests with this service.

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

The report distinguishes `current`, `pending`, `dispatch_requested`, `cooldown`, `disabled_manually`, `published_stale` and authentication errors. Read `watchdog_health` for execution health and each target's status, severity and `error_scope` for findings; the overall `health` is not the Healthchecks result. Recovery no longer stops with `retry_exhausted`; retries continue at the configured interval. `verified_refresh: false` with `assurance: workflow_only` means the workflow succeeded but that target has no independent published-timestamp check. An accepted dispatch remains pending verification.

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

`grace_minutes`, `cooldown_minutes` and `max_run_minutes` can be set globally or per target. The default stalled-run threshold is 180 minutes; pending runs with already stale published data report an error immediately. The default schedule grace is half the schedule interval, capped at two hours. The default recovery cooldown is a fixed 360 minutes (six hours), independent of the schedule interval and number of attempts. A configured `cooldown_minutes` overrides that interval. `freshness[].max_age_seconds` can override the published-age threshold. The default threshold is twice the workflow interval, with an extra day for explicitly date-only timestamps. Upstream publication cadence may justify a different limit.

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
