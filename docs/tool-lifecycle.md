# Complete a CoolCode change

A repository is only one part of a tool release. **Do not call an addition, rename,
removal or update complete until its affected registrations, documentation,
generated files and deployed services agree.** Record any actual blocker precisely.
This applies to installable tools as well as browser tools.

## Sources of truth

| Concern | Maintained source | Derived output or verification |
| --- | --- | --- |
| Discovery, IDs, destinations, categories, access and data meanings | `data/tools.json`; opted-in project `tool.json` | Homepage, search, dataset directory, README tables, report-form choices |
| Explanations, configuration, versions and limitations | Project README, marked guide excerpt and relevant hub notes | `scripts/sync_guides.py`, then `scripts/sync_readme.py` |
| Complete repository accounting | Full public GitHub inventory plus `data/repository-audit-exclusions.json` | `data/repository-audit.json`; no unreviewed repos |
| Actual schedules and dispatch inputs, including explicit absence of schedules | Each source repo's `.github/workflows/`, scanned into `data/operations/repositories.json` | Generated watchdog targets; guard coverage checks |
| Published freshness fields and tolerances | Reviewed `data/operations/freshness.json` | Generated watchdog probes; never infer check dates from source editions |
| Visitor counts, issue acceptance and public tool APIs | `services/cloudflare-visitor/worker.template.js`, inlined API modules and public/unlisted measurement IDs | Generated `worker.js`, deployed Worker and verified deployment receipt |
| Independent scheduling | `services/refresh-watchdog/` in this repository | Server timer downloads validated `targets.json` from GitHub every pass |
| Admin outcome reporting | The same generated watchdog registry and reviewed catalogue count definitions | Hourly or explicitly requested service observer saves workflow/output results on `collector-outcomes-log`; reviewed collection step names and cache allowances live in the same freshness registry |
| Search indexing | Catalogue routes and `scripts/build.py` | Generated `dist/sitemap.xml` and `robots.txt`; do not hand-edit them |
| GitHub inactivity protection | Each scheduled repo's separate schedule guard | Explicit allowlist includes all scheduled workflows and itself |

The watchdog is operational infrastructure for the catalogue. It lives beside the
other services here, not as a separately maintained ZIP or a public tool card.
Application source imports still belong in the individual tool repositories.

## Required procedure

1. **Review the change.** Read the project's instructions and this document. Decide
   whether identity, URL, data fields, refresh cadence, dependencies, API key names,
   install commands or visible behaviour changed. Update the project's README,
   `tool.json`, tests and applicable notes accordingly. Remove obsolete instructions.
2. **Verify the actual tool.** Run its required tests and build; exercise the main
   user task on the published page or documented installation path. Check real source
   dates and data, not merely HTTP 200. Never list a starter, fixture or unfinished
   repository as a finished tool.
3. **Register or reconcile.** Add/update the hub catalogue, guide excerpt, probes,
   dataset metadata, category and browser/install classification. Remove a prior
   exclusion when a starter becomes a tool. Review the full repository inventory;
   document non-tool sites, forks, starters or retired projects with a reason/date.
   Private identities stay out of the public report. Do not silently ignore an unknown repo.
4. **Reconcile scheduling.** Retain `workflow_dispatch`; provide reviewed defaults
   for required inputs. Some refresh switches default false and must be sent true.
   Update the separate guard on schedule additions, removals or workflow renames.
   Refresh the operations inventory and review the diff. Static/install-only repos
   remain explicitly recorded with no schedules. Freshness probes need small public
   check metadata; observation dates and retained captures may not mean a new check.
5. **Generate dependent outputs.** Synchronize guides/manifests and README, regenerate
   operations files and audit, then build the site. Review all diffs together.
   For search changes, follow `docs/search-discovery.md`: descriptive titles, truthful
   build-time structured data, crawlable guide links, feed and sitemap consistency.
6. **Deploy affected services.** Deploy a changed visitor Worker preserving its existing
   bindings and data; verify `/registry` and record the downloaded-code hash. Grant
   the watchdog's existing GitHub App access to a newly added repo if its installation
   uses selected repositories. A committed target does not grant that permission.
7. **Publish and verify.** Commit the related source and metadata. Verify required CI,
   Pages deployment, the live tool, homepage/search, sitemap, Worker registration and
   watchdog registry. On an installed server, confirm the next report sees the new
   target and its permissions. A successful code push is not necessarily a data refresh.

Typical hub commands, after changing the catalogue:

```sh
python3 scripts/sync_guides.py --with-manifests --tool TOOL_ID
python3 scripts/sync_readme.py
python3 scripts/audit_repositories.py
python3 -m pip install -r scripts/requirements-maintenance.txt
python3 scripts/sync_operations.py --refresh
# If worker.js changed: deploy it and verify the receipt before publishing the hub.
python3 services/cloudflare-visitor/deploy.py
python3 scripts/check_live_registry.py
python3 scripts/check_integration.py --deployment
python3 -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 scripts/build.py
python3 scripts/check_integration.py --built
```

The catalogue build and its integration checks are offline. The separate network
audit discovers new public repositories, changed schedules/inputs, missing guards
and live Worker drift, including a missing or mismatched deployment receipt. It reports source/network failures without replacing good
data or blocking an otherwise valid offline homepage build. `--refresh --check`
reads current workflow sources but does not write. `--refresh` writes only after
the complete source scan and validation succeed.

For an existing app-only change, steps with no impact can be recorded as unchanged;
they must still be considered. Ordinary code changes do not require a Worker redeploy
when the accepted IDs and Worker source are identical. Local semantic/behaviour checks
remain necessary where descriptions or data meanings could have become inaccurate.

## Renames, removals and failures

A rename affects source links, canonical/public URLs, routes, manifest identity,
metrics IDs, storage namespaces, guards, watchdog entries and potentially redirects.
Preserve historical data and deliberately decide what happens to the old route.
For retirement, remove the listing and relevant schedules/guard entries, remove stale
freshness overrides, document the repository's reviewed status, and regenerate the
Worker, watchdog, README and sitemap. Do not delete archives as a registration step.

If a provider is down, keep the last successful publication and its real date. Record
the failure separately from integration status. Never update a timestamp, suppress a
failed check or call an uninstalled service active just to make the checklist green.

Current machine-readable accounting is in [repository-audit.json](../data/repository-audit.json).
The previous standalone watchdog ZIP is superseded by the [GitHub-managed service](../services/refresh-watchdog/README.md).

## Unlisted tools with statistics

An unlisted prototype may use the shared aggregate counter when requested by the owner. Register its ID/title/source in `data/unlisted-tools.json`, instrument its page, regenerate the Worker and verify the admin measurement metadata. Keep the prototype in the repository audit exclusions with an accurate reason. Do not add it to `data/tools.json`, homepage/search/sitemap, featured choices or scheduled watchdog targets merely to collect visit statistics.
