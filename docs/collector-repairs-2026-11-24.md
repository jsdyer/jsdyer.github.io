# Collector repairs — 24 November 2026

This pass investigated ten failed workflows. Eight completed their source or
regression checks successfully in GitHub after repair. Census Lens and Lobby Trail
were refreshed using official data successfully acquired and validated from a
separate network; their automatic downloads from GitHub remain blocked by HTTP 403.
These were collection, validation, test and Git staging failures, not evidence that
all ten workflows had been disabled for repository inactivity.

## Verified repairs

| Tool | Cause and change | Successful verification |
| --- | --- | --- |
| Air Check Diary | The collector guessed October's ZIP URL before CRTC listed that archive. It now checks the official catalogue first and records `awaiting_publication` when the next month is absent. September remains the latest available archive, with its original retrieval date. Listed archives still have to download and validate. | [Source check](https://github.com/jsdyer/aircheckdiary/actions/runs/45374666998), [publication](https://github.com/jsdyer/aircheckdiary/actions/runs/45374698734) |
| API Archaeology | The browser regression assumed one capture and fixed comparison selections. It now derives expected captures and versions from the manifest and explicitly selects the cases it tests. | [Live capture, browser checks and publication](https://github.com/jsdyer/apiarchaeology/actions/runs/45374677439) |
| Atlantic Dial | CFCY's Maritime Centre Stage page returned 404 and the current On-Air index no longer listed it. The unconfirmed programme is retained separately, without generating upcoming airings from its old timetable. This does not claim the programme was cancelled. All 24 active listings passed source checks. | [Station sources](https://github.com/jsdyer/atlanticdial/actions/runs/45374685081), [publication](https://github.com/jsdyer/atlanticdial/actions/runs/45375269478) |
| Border Pulse | The national CBSA feed omitted Aldergrove. Requiring all four tracked crossings discarded the other three valid reports. The collector now validates the national feed, retains available reports and explicitly identifies missing crossings; historical records remain available and no current wait is invented. | [Collection, tests and publication](https://github.com/jsdyer/borderpulse/actions/runs/45375204154) |
| GC Subdomain Watch | Government directory retrieval timed out. Added bounded retries and an alternative HTTPS client, retaining source validation and previous data on failure. | [Collection and publication](https://github.com/jsdyer/gc-subdomain-watch/actions/runs/45375753094) |
| Government Memory | The SSC source timed out. Improved bounded retrieval and verified a full online build, including 306 labelled records across six sources. | [Collection and publication](https://github.com/jsdyer/governmentmemory/actions/runs/45375771463) |
| Metro Economy | The source rejected the original download request. Added an identified HTTP client and a same-URL curl fallback. The official data validated for 41 metropolitan areas. | [Collection](https://github.com/jsdyer/metroeconomy/actions/runs/45374803684), [publication](https://github.com/jsdyer/metroeconomy/actions/runs/45374832779) |
| Takedown Watcher | Collection changed both history and status metadata, but Git staged only history. Rebase then refused the unstaged status file. Both outputs are now committed together. Collector and configuration edits also trigger collection. | [Collection](https://github.com/jsdyer/takedown-watcher/actions/runs/45375245108), [publication](https://github.com/jsdyer/takedown-watcher/actions/runs/45375270006) |

## Recovered data, automatic source access still blocked

Both download clients received HTTP 403 on GitHub Linux and macOS runners for
Census Lens and Lobby Trail. The macOS experiment did not resolve access and was
reverted. TLS checks, source validation and failure reporting remain enabled.
A successful offline Pages build does not prove the online collector recovered.

| Tool | Validated recovery | Remaining restriction |
| --- | --- | --- |
| Census Lens | Retrieved all 15 official Census Profile archives on 24 November; validated 5,335 geographies and published the snapshot and acquisition metadata together in [bc524c2](https://github.com/jsdyer/census-lens/commit/bc524c21fa7fb5a623ac7ab8f0404efc2e4e3c55); [browser checks and publication passed](https://github.com/jsdyer/census-lens/actions/runs/45376571895). Observation periods remain 2016 and 2021. | Statistics Canada's download endpoint still rejects GitHub requests. |
| Lobby Trail | Retrieved the official export dated 23 November on 24 November; validated 270,514 in-house communication reports across 2,338 organizations and published the verified archive and manifest together in [4d3ff32](https://github.com/jsdyer/lobbytrail/commit/4d3ff323590432e14471383e3c1e3f9ac1c4dad4); [publication passed](https://github.com/jsdyer/lobbytrail/actions/runs/45376581067). | The Registry's download endpoint still rejects GitHub requests. |

Each README documents the existing recovery command for a machine with public
source access. The Linux watchdog dispatches GitHub jobs; it does not relocate
the collectors onto the server, so another dispatch cannot by itself fix these
source refusals. No server collector or new timer was installed in this pass.

## Validation and dependent files

- Ran the affected Python and Node tests and application builds. Added regressions
  for unpublished months, partial crossing coverage, invalid feeds and download
  failure paths. GitHub completed the applicable browser checks.
- Verified live published metadata for the eight repaired tools; Atlantic Dial's
  published schedule contains 24 active and one unconfirmed listing.
- Updated affected project READMEs and synchronized the Air Check Diary, Atlantic
  Dial and Border Pulse guide excerpts into the hub catalogue and generated README.
- Changed Air Check Diary's reviewed watchdog probe to the real official-catalogue
  check timestamp. Regenerated `services/refresh-watchdog/targets.json`; the server
  adopts it on a subsequent registry refresh without reinstalling the runtime.
- Kept the existing schedules, workflow IDs, dispatch inputs, repository identities
  and public routes. The generated inventory still contains 168 workflows. No new
  repository access or Cloudflare Worker registration is required.
- Hub verification passed: 53 watchdog tests, 67 Python tests, 37 Node tests,
  integration checks before and after the static build, and generated sitemap
  validation. Repository accounting remains complete for 223 source repositories.

Old failed Actions runs remain in the history. Fresh published metadata is useful
evidence of recovery, but a green aggregate heartbeat is not proof that every
upstream source can be downloaded successfully.

## Follow-up: saved admin reports and collector repairs

The Census Lens report dated 15:21 UTC could not include run 45430866729, which
started at 15:54 UTC. Loading the saved report did not perform a new check.
The admin now labels this distinction and offers an explicit fresh observer run.
Failed collection remains visible after a successful build that skips downloading.
Reviewed collection-step evidence, permitted short caches and NASA per-source
results prevent green build status from being mistaken for a successful download.

| Tool | Follow-up change | Verification |
| --- | --- | --- |
| Gov Tracker Census | Fixed the Python fingerprint syntax error; isolated normalization for tests and added compilation before collection. Collector changes on push perform real source checks. | [Collection, tests and deployment](https://github.com/jsdyer/govtrackercensus/actions/runs/45436104059) |
| Export Neighbours | Validate ZIP structure and CRC before replacing an archive; stream to a temporary file, retry one temporary/invalid response, preserve existing data and report HTTP/content-type diagnostics. | [Collection, tests and deployment](https://github.com/jsdyer/exportneighbours/actions/runs/45436117302) |
| NASA Overhead | Moved APOD to the official APOD Basic JSON endpoint. Article and optional image are separate; direct MP4 and iframe video are extracted safely. Live JPEG, MP4 and YouTube entries were checked. Per-source failures remain visible in the public index. | [Collection, browser tests and deployment](https://github.com/jsdyer/nasa/actions/runs/45437809361) |
| Restroom Reach | Split Overpass collection into sequential regional POSTs with one bounded retry for temporary network/5xx errors. Every region must validate before publication. | [Live collection](https://github.com/jsdyer/restroomreach/actions/runs/45438033472) still timed out twice at the configured provider on Metro Vancouver. The prior capture was preserved; recovery is not yet confirmed. |
| RegistrarWatch | Ran the corrected collector against all six official quarters and validated 48 registrar observations. Measurements were unchanged; the actual check timestamp advanced. This was a local source collection published by commit, not a new scheduled/manual GitHub collection. | [Validated metadata publication](https://github.com/jsdyer/registrarwatch/commit/7985b8611327154bf6be8f31ed3787df9e8de54d) |

NASA's [retirement notice](https://api.nasa.gov/assets/html/header.html) specifies
1 December 2026. The [replacement documentation](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf)
identifies `url` as the article and `hdurl` as an optional full-size image. The
live validation used 24 November's image, 28 October's MP4 and 18 October's YouTube
entry; missing media falls back to the article without treating HTML as an image.

No tool identities, routes, schedules, dispatch inputs or accepted Worker IDs
changed. Guide notes, generated README, operations targets and the site build
were reconciled; sitemap generation and Worker registrations remain covered by
integration checks. This observer/UI update requires no server runtime reinstall.
Census Lens and Lobby Trail's hosted HTTP 403s remain external download failures;
the six-hour recovery policy is unchanged.

The migrated NASA capture at 16:30 UTC confirms APOD, asteroids, geomagnetic Kp,
Earth imagery and events. Its solar-flare subfeed remained unavailable: the API
mirror returned 404 and the direct CCMC endpoint timed out; a separate direct
check returned HTTP 503. Other Sun feeds remained available. This is now visible
as a partial source failure instead of being hidden behind overall workflow success.
