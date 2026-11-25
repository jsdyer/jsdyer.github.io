# Three tool releases and catalogue integration

Reviewed 24 November 2026 (user-local date; automated evidence uses UTC).

## Implemented releases

| Tool | Working scope | Verification |
| --- | --- | --- |
| [Contaminated Places](https://github.com/jsdyer/contaminatedplaces) | Searchable current federal site map; province, contaminant/medium pairs, status and cleanup steps; radius search, full-result CSV, shared records and Toxic Ground history links. 24,433 federal records, 23,509 mapped; Canada plus 156 overseas records. | 5 JavaScript and 8 Python tests; actual official ZIP downloaded locally and on GitHub Actions; Chrome desktop/mobile browser smoke and Pages deployment passed in [run 45543665594](https://github.com/jsdyer/contaminatedplaces/actions/runs/45543665594); [live app](https://coolcode.ca/contaminatedplaces/) and all tested assets return HTTP 200. |
| [Query Confessional](https://github.com/jsdyer/queryconfessional) | Private Python/SQLite dnsmasq import and dashboard; devices/domains/query types/date filters, daily counts, CSV. | 11 tests; wheel/static-assets validation; Python 3.11 and 3.13 CI. DNS queries are not proof of connections or human intent. |
| [Backup Ledger](https://github.com/jsdyer/backupledger) | Private Linux restic inventory; per-host/path ages and expected missing groups, failed/stale inventory, explicit metadata/full/subset check history, export and localhost dashboard. | 14 tests plus real-restic integration on Python 3.10, 3.12 and 3.14 CI. Nanosecond timestamp compatibility fixed after the first matrix run. |

The private tools require installation; they do not upload private data, run public
data collectors, or need API keys. Query Confessional requires explicit log year
and timezone; repeated imports at the same path deduplicate, but overlapping
rotated/copied files are separate sources. Backup Ledger does not infer successful
restores from recent snapshots or integrity-check results.

## Integration evidence

- All 238 public repositories are accounted for: 226 listed tool source repositories
  and 12 reviewed non-tool exclusions (ten other sites, the template, and the
  public-apis reference fork). No unreviewed or missing source repositories remain.
- Catalogue: 235 tools, comprising 224 browser tools and 11 installable tools.
  README tables, homepage/search metadata and sitemap are generated from that catalogue.
- Every existing source repository's current workflow directory was inspected;
  378 unique workflow blobs were verified against their Git object hashes.
  The three additions were inspected from their published source and local release.
- Operations registry: 226 repositories, with 169 scheduled workflows. The two
  private tools explicitly have no public schedule. Contaminated Places runs weekly
  Wednesday 11:23 UTC, on main pushes, and on manual dispatch; its separate guard
  includes the collector and itself. Its watchdog probe reads successful `checked_at`,
  with a 14-day maximum age. The registry passes the actual watchdog validator.
- The generated watchdog targets and service remain maintained in GitHub. An installed
  server downloads updated targets automatically; runtime code is not replaced by
  a target update. No runtime upgrade is needed for these three additions.
- The watchdog App must have access to `contaminatedplaces`. If it already covers
  all repositories, no selection change is needed. The private server report and
  App installation permissions were not accessible here, so adoption is not claimed.
- The generated Cloudflare Worker includes all 235 IDs. Deployment is blocked by
  the connector's missing **Workers Scripts Write** scope (HTTP 403). The owner
  chose to paste the supplied generated `worker.js` manually; the existing
  verified receipt intentionally remains unchanged. The live Worker still has 232 IDs.
  See [deployment state](../services/cloudflare-visitor/README.md).

Hub verification: 67 Python tests, 47 Node tests, 99 watchdog tests, generated-registry
validation, static build and pre/post-build integration checks passed. Deployment
receipt checks remain intentionally failing until the new Worker is actually deployed.

## Existing-tool repairs and review

NASA's retired DONKI URL was replaced with the current official CCMC API. Its
successful [deployment](https://github.com/jsdyer/nasa/actions/runs/45542557945)
published a capture with all six sources OK and no missing Sun subfeeds. All 166
baseline published timestamp probes returned HTTP 200 and valid timestamps.
That is availability evidence, not a claim that every upstream download succeeded.

Census Lens and Lobby Trail still receive source HTTP 403s from GitHub runners,
although the same official archives were reachable from this audit environment.
Restroom Reach's Halifax Overpass queries timed out on both tested providers, even
for a smaller area. Retained data and its true dates remain visible. Grid Receipt,
Status Ledger and Border Pulse had current successful collection evidence.

Twenty existing READMEs were updated to remove obsolete planned-watchdog wording;
two also had manual Worker-list advice replaced with the current generated lifecycle.
Guide excerpts and cadence were unchanged. Exact commits are recorded in
[readme-maintenance-2026-11-24.json](../data/operations/readme-maintenance-2026-11-24.json).

The [schedule audit](schedule-audit-2026-11-24.md) includes the full baseline workflow
matrix and evidence. The [usefulness review](usefulness-review-2026-11-24.md) covers
all 232 starting entries plus the three additions, with proposed upgrades and new
repositories. It distinguishes a catalogue/product review from exhaustive browser
or source-code testing. No repositories were deleted or archived.
