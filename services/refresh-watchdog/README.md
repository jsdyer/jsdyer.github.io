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

## Do tool updates require a server update?

| Change | What the server owner needs to do |
| --- | --- |
| A tool's interface, parser, tests or README changes | Nothing to the watchdog. That tool's GitHub workflow runs the updated code. |
| A tool's schedule, dispatch inputs or freshness probe changes | Nothing after the reviewed registry is published here. The next watchdog pass downloads the new targets automatically. |
| A new scheduled repository is added | If the GitHub App covers all repositories, nothing. If it uses selected repositories, grant the new repository access. A target entry alone cannot grant that access. |
| A browser-only calculator or private installable tool is added | No target or server change; there is no public collector to dispatch. |
| The watchdog program, dependencies or systemd service changes | Pull the reviewed update and rerun the installer using the runtime-upgrade instructions below. Automatic target updates do not install new program code. |

Park Ready and Clam Counter add scheduled work: park/advisory collection and menu
source-change checks respectively. Tariff Bench uses reviewed rate editions and
Basket Math is a local calculator; neither needs a public watchdog target. This
release changes the registry, not the installed watchdog program. Confirm the next
server report sees any newly granted repositories; a public GitHub deployment
cannot confirm the private server's credentials or running version.

The earlier eleven-app release added five collector targets: `tripbrief` (hourly),
`portwindow`, `distropilot` and `backbonecompare` (daily), and `recipemath`
(monthly). Their
published `data/status.json` files supply actual `checked_at` timestamps; alert
ages are six hours, 72 hours for the daily jobs, and 45 days for Recipe Math.
The other six new apps fetch data on demand or calculate locally and need no
collector target. This release requires no watchdog runtime reinstall. If its
GitHub App uses selected repositories, grant those five repositories access and
confirm the next private server report sees them.

The seven practical apps add six scheduled repositories: `halifaxnext`,
`inspectiontrail`, `carecompass` and `weatherwindow` (daily), `fuelwindow`
(twice daily) and `wagewindow` (weekly). `parcelbench` uses on-demand Canada Post
requests and needs no scheduled collector. The existing `tide-and-dark` repository
also adds a daily official CHS daylight collector beside its monthly modeled
night-tide workflow. The registry contains reviewed successful-check probes and
exact collection step names; source edition dates remain separate from successful
download dates. Failed imports retain the earlier good data and its check time.

These additions do not change the installed watchdog program. Its next pass
downloads the generated targets from GitHub. An installation restricted to selected
repositories needs access to the six new scheduled repositories listed above.
The private server report must confirm that access; passing public GitHub CI does
not prove the server's credentials or installed runtime version.

## November 25 discovery batch

The generated registry adds the previously published collectors for Address Chronicle,
Budget Mirror, Canada Pulse, Move Bench and Screen Places, plus Civic Revision and
Open Seed. Civic Revision checks every six hours; Open Seed checks daily. Wage
Window, Housing Pulse and Release Receipt keep their existing schedules and gain
explicit probes for their additional CPI, compatible-series and watchlist datasets.
The registry now accounts for 190 scheduled workflows across the full catalogue.

This batch changes targets and documentation only. **No watchdog runtime reinstall
is needed.** The existing all-repositories GitHub App installation covers the added
repositories; the next pass downloads their targets automatically. The private
server report remains the place to confirm dispatch access and actual collection
outcomes. Notice Guide and Measure Bench have no scheduled collection.

## What changes

- GitHub's existing schedules continue running. The Linux server checks for a successful refresh covering the most recent due occurrence, allowing a grace period for normal queueing.
- It recovers workflows disabled specifically for inactivity. Manually disabled workflows stay disabled.
- It dispatches missed or failed refreshes, avoiding jobs already queued or running. It attempts at most ten dispatches per pass. Unresolved refreshes keep receiving recovery attempts at least six hours apart by default (up to four per day), without a lifetime attempt limit.
- A successful dispatch request is **not** reported as a successful refresh. Later passes check the completed run and, where configured, the actual published data timestamp.
- Published freshness checks use reviewed collection/check timestamps from `data/operations/freshness.json` in the hub. Old upstream observations and intentionally retained captures are not silently treated as fresh. Every scheduled data-publishing workflow has a reviewed probe; the six workflow-only exceptions are listed below. The generated `targets.json` is the current inventory.
- An optional Healthchecks-compatible heartbeat monitors watchdog execution: completing checks, requesting eligible recovery and saving the report. Collector failures and stale data stay in reports without failing this heartbeat. Without that URL, reporting is local through the JSON report and systemd journal.

The separate weekly GitHub schedule guards are an immediate mitigation, not a documented exemption from GitHub's inactivity policy. This server provides the independent scheduling backstop. **Execution and publication still depend on GitHub Actions**; migrating the collectors themselves to your server would be a separate step.

## Published timestamp coverage

Every scheduled data-publishing workflow has a published timestamp check.
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

The heartbeat answers **“Is the watchdog service executing and saving its results?”**
It does not measure whether individual collectors, downloads, GitHub workflow reads,
or recovery requests succeed. Handled external errors remain visible in the report
and the admin's independent **Tool outcomes** observation. They do not send `/fail`
or make a completed `--apply` pass exit unsuccessfully.

| Situation | Healthchecks | Report/admin finding |
| --- | --- | --- |
| Collector fails, source returns 403/410, data is stale, public metadata is unreadable | Success after a completed pass | Collector problem stays visible; normal recovery continues |
| One repository's GitHub API read or dispatch returns 403/404/5xx, times out or supplies malformed data | Success after recording the result | Target error; the next target is still checked |
| Remote requests consume the ten-minute pass budget | Success after saving explicit deferred targets | Unchecked targets keep their old check time and are prioritized next pass |
| GitHub rate-limits requests | Success after recording a safe deferral | Current error and unchecked targets stay visible; requests resume after the saved retry time |
| Workflow history exceeds the safety cap | Success after recording the result | Target needs review; no uncertain duplicate dispatch |
| Registry download fails but validated cached targets are available | Success after a completed pass | Cached registry and warning remain visible |
| Shared GitHub credential is rejected (401), credentials/configuration are missing or invalid, local state is corrupt, or state/report storage fails | Failure | Actual service setup/execution problem |
| Unexpected runtime exception or heartbeat delivery fails | Failure | Sanitized service failure; no exception bodies or credentials are logged |
| Process crashes, exceeds systemd's timeout, server stops, or timer stops | Missing heartbeat (or failure if caught) | Investigate the service/journal |

This narrows the earlier policy: handled per-target GitHub errors, rate-limit
backoff and history limits previously counted as watchdog execution errors. A
successful pass now means that these outcomes were safely handled and persisted,
not that the external services cooperated. API rate limits still pause requests;
dispatch timeouts still retain the retry cooldown so a possibly accepted dispatch
is never immediately repeated. Remote requests share a ten-minute time budget,
including retries and bounded response reads, leaving time to save results and
ping before systemd's fifteen-minute limit. Budget-deferred targets are marked
`not_checked` with reason `pass_time_budget`; their `last_checked` does not advance.
The next pass prioritizes the oldest targets. Successful timestamps are never fabricated.

| Report field | Meaning |
| --- | --- |
| `runtime_version` | Installed program identifier; this edition is `2026-11-26-service-health-v2` (UTC release date). |
| `completed` | Whether the main target-processing pass completed. A completed pass can still detect rejected shared credentials. |
| `watchdog_health`, `watchdog_errors` | Service health. Controls Healthchecks and the exit status in `--apply` mode. |
| `collector_errors` | Error-level collector/output findings. |
| `target_errors` | Handled target API/recovery/history errors. These do not control the heartbeat. |
| `health`, `errors`, `attention` | Overall findings, retained for compatibility. **Not the heartbeat decision.** |
| `targets[].error_scope` | `watchdog`, `collector` or `target` for error-level findings; also included in the journal. |
| `heartbeat_scope` | `watchdog_execution`; use `runtime_version` to distinguish this narrower policy from the earlier edition. |

The admin's Tool outcomes report observes workflow execution, source-step results,
and published data independently, even while the service heartbeat is green. It
does not read your private VPS report or retry history. A dry run never sends the
production heartbeat and retains its nonzero exit for findings.

The supplied report at `2026-11-26T04:04:29Z` already records
`watchdog_health: healthy`, `watchdog_errors: 0`, and `heartbeat: delivered`.
Its five attention rows are four recovery cooldowns and one accepted dispatch,
not a service failure. That latest snapshot does not identify earlier failed
pings; use journal entries from those timestamps for that diagnosis.

### Install this runtime update

Automatic target updates **do not install program changes**. From your existing
`services/refresh-watchdog` checkout on the VPS:

```bash
git pull --ff-only
sudo systemctl stop coolcode-watchdog.timer coolcode-watchdog.service
sudo bash ./install.sh
sudo journalctl -u coolcode-watchdog.service -n 60 --no-pager
```

The installer preserves credentials, heartbeat URL and retry history. It restarts
the timer and starts a pass. After that pass completes, verify the installed policy:

```bash
sudo python3 -c 'import json; r=json.load(open("/var/lib/coolcode-watchdog/report.json")); print({k:r.get(k) for k in ("runtime_version","checked_at","completed","watchdog_health","watchdog_errors","collector_errors","target_errors","attention","heartbeat")})'
```

Expect `runtime_version: 2026-11-26-service-health-v2` and a newer `checked_at`.
Keep the existing five-minute Healthchecks period and twenty-minute grace.
No new key, port, monitor, database or Cloudflare deployment is required.
If installation fails, correct it and rerun the installer; do not leave the timer
stopped. Committing this code to GitHub does not update the VPS by itself.

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

Contaminated Places checks the official Federal Contaminated Sites Inventory weekly
and publishes its successful `checked_at` timestamp in `data/status.json`. Its
generated target is adopted on the next registry refresh. Query Confessional and
Backup Ledger are private installable tools, so neither receives a public refresh
target. If the watchdog App uses selected repositories, grant it access to
`contaminatedplaces`; a catalogue update cannot change App installation permissions.

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
not dispatch collectors or send another heartbeat. The admin can explicitly request
a fresh observer run with its existing GitHub session (Actions write access required).
The page labels its saved snapshot age and waits for a newly completed report.
No installed-service update is needed
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
