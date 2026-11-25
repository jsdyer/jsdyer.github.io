# CoolCode scheduled collection audit — 24 November 2026

Baseline: 232 catalogue cards from 223 source repositories. 162 repositories declare 168 scheduled workflows; 61 explicitly have no schedules. Times in tables are UTC.

The saved GitHub observer checked every target at **2026-11-25T03:18:53.522774Z**: 158 checked, four needing attention, five workflow-only and one observer run in progress. A separate direct network pass starting **2026-11-25T03:46:43.528803+00:00** retrieved all **166 of 166 published probes with HTTP 200**, parsed their JSON, and found the timestamp at each configured path. These checks establish published availability, not independent re-download of every upstream dataset.

## Findings and disposition

| Tool | Evidence | Disposition |
|---|---|---|
| NASA Overhead | Green workflow but `sun.flares` recorded mirror HTTP 404 and retired-host timeout. NASA migrated DONKI on 30 September. The current official API returned 19 flares, 1 geomagnetic storm and 94 CMEs for 25 October–24 November. | Fixed canonical CCMC URL and fetch order; mirror remains fallback. Regression tests verify success without the old endpoints. Commit and deployment details below. |
| Census Lens | Latest GitHub collector failed retrieving the national 2021 ZIP; both urllib and curl received HTTP 403. Published snapshot still contains 5,335 geographies and records its 24 November retrieval. | Hosted-source access remains blocked. This audit network received HTTP 200 and a ZIP signature at the same official URL. A source-reachable collector host is needed; another dispatch on the same blocked runner does not change the network. |
| Lobby Trail | Latest GitHub collector received HTTP 403 from the official ZIP with both clients. Retained data covers 270,514 communication reports and its actual 24 November check date. | Hosted-source access remains blocked. This audit network received HTTP 206 and a ZIP signature at the same official URL. No timestamp advanced just to hide the failure. |
| Restroom Reach | Latest run recovered Vancouver on retry but Halifax timed out twice. The retained capture has 1,285 mapped toilets; its download date and the older OSM database edition are separate. | Existing-source Halifax POST timed out after 39 s, the documented overpass-api.de alternative after 38 s, and a much smaller Halifax-core GET after 33 s. No verified endpoint or subdivision fix was established; preserve complete regional validation and the last good capture. |
| Grid Receipt | Successful workflow plus recent published timestamp and 65 retained receipts at baseline. | No current collection defect found. |
| Status Ledger | Successful collection step and published timestamp align; a rerun does not imply the collection step re-executed. | No current collection defect found. |
| Border Pulse | Latest push collected all four configured crossing records; successful step and published timestamp align. Older failed manual run is retained in history. | No current collection defect found. |

The distinction matters: the six jobs without published probes audit or monitor existing material. The other 162 jobs publish data, and all have reviewed timestamp probes. A fresh retained dataset can coexist with a failed latest download (Census Lens, Lobby Trail, Restroom Reach). A successful publish can coexist with a failed optional subfeed (NASA before this fix).

## NASA correction

- Official migration notice: https://ccmc.gsfc.nasa.gov/news/major-updates/
- Current API: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,GST,CME}`. Input parameters and response formats are unchanged according to NASA.
- Published code commit: https://github.com/jsdyer/nasa/commit/8d412bff81a143798f24b1c4e53a2dc2f48898ce
- Verification run: https://github.com/jsdyer/nasa/actions/runs/45542557945 completed successfully, including keyed live collection and Pages deployment.
- Local validation: 19 Node tests, six Python tests and the static build passed. The regression exercises live-mode URL selection with the retired mirror unavailable. The new endpoints also returned actual JSON data independently.
- Live capture at `2026-11-25T03:49:10.170Z` reports all six sources OK, no missing Sun subfeeds, and 19 flares / 1 storms / 90 CMEs. Verified at https://coolcode.ca/nasa/data/captures/2026-11-25.json.
- Existing ID, route, schedule, watchdog probe and Worker registration are unchanged.

## Failed-run evidence

- Census Lens: https://github.com/jsdyer/census-lens/actions/runs/45497725725
- Lobby Trail: https://github.com/jsdyer/lobbytrail/actions/runs/45515135263
- Restroom Reach: https://github.com/jsdyer/restroomreach/actions/runs/45522996519
- Observer snapshot branch: https://github.com/jsdyer/jsdyer.github.io/tree/collector-outcomes-log

## Complete scheduled workflow matrix

Each row is the baseline observer result. Direct probes were then fetched independently. `checked` means the reviewed workflow and output evidence were available, not a certification that all optional upstream feeds succeeded. Workflow-only monitor jobs legitimately have no data timestamp.

| Repository / workflow | UTC cron | Baseline result | Direct published checks | Latest workflow |
|---|---|---|---|---|
| [accessreceipt](https://github.com/jsdyer/accessreceipt) / `pages.yml` | `39 7 * * 2` | checked | HTTP 200: 2026-11-24T19:03:56.867Z | [success](https://github.com/jsdyer/accessreceipt/actions/runs/45466114463) |
| [aircheckdiary](https://github.com/jsdyer/aircheckdiary) / `refresh.yml` | `23 8 19 * *` | checked | HTTP 200: 2026-11-24T16:05:25+00:00 | [success](https://github.com/jsdyer/aircheckdiary/actions/runs/45433002975) |
| [airpair](https://github.com/jsdyer/airpair) / `pages.yml` | `32 11 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/airpair/actions/runs/45491306644) |
| [algorithmwatch](https://github.com/jsdyer/algorithmwatch) / `pages.yml` | `26 14 * * 1` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/algorithmwatch/actions/runs/45325336204) |
| [anycastcompass](https://github.com/jsdyer/anycastcompass) / `pages.yml` | `47 12 * * *` | checked | HTTP 200: 2026-11-24T22:47:45Z | [success](https://github.com/jsdyer/anycastcompass/actions/runs/45504192463) |
| [apiarchaeology](https://github.com/jsdyer/apiarchaeology) / `pages.yml` | `13 7 * * 2` | checked | HTTP 200: 2026-11-24T18:52:39Z | [success](https://github.com/jsdyer/apiarchaeology/actions/runs/45464159500) |
| [asn-canada](https://github.com/jsdyer/asn-canada) / `pages.yml` | `14 7 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/asn-canada/actions/runs/45463987252) |
| [atip](https://github.com/jsdyer/atip) / `pages.yml` | `23 10 * * *` | checked | HTTP 200: 2026-11-24T20:43:34Z | [success](https://github.com/jsdyer/atip/actions/runs/45483718469) |
| [atipdecisions](https://github.com/jsdyer/atipdecisions) / `pages.yml` | `43 7 * * 2` | checked | HTTP 200: 2026-11-24T19:06:10Z | [success](https://github.com/jsdyer/atipdecisions/actions/runs/45466369926) |
| [atipmetrics](https://github.com/jsdyer/atipmetrics) / `pages.yml` | `23 12 3 * *` | checked | HTTP 200: 2026-11-24; HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/atipmetrics/actions/runs/45370657088) |
| [atippopularity](https://github.com/jsdyer/atippopularity) / `pages.yml` | `27 11 * * *` | checked | HTTP 200: 2026-11-24T21:23:32.317797+00:00 | [success](https://github.com/jsdyer/atippopularity/actions/runs/45490559674) |
| [atlanticdial](https://github.com/jsdyer/atlanticdial) / `episodes.yml` | `41 21 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/atlanticdial/actions/runs/45512674400) |
| [atlanticdial](https://github.com/jsdyer/atlanticdial) / `station-schedules.yml` | `17 15 * * 1` | workflow_only | Not a data publisher | [success](https://github.com/jsdyer/atlanticdial/actions/runs/45433078812) |
| [atlas-canada](https://github.com/jsdyer/atlas-canada) / `collect.yml` | `41 9 * * *` | checked | HTTP 200: 2026-11-24T20:20:37Z | [success](https://github.com/jsdyer/atlas-canada/actions/runs/45479784445) |
| [auroratrace](https://github.com/jsdyer/auroratrace) / `refresh.yml` | `17 7 11 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/auroratrace/actions/runs/45352249543) |
| [bankrates](https://github.com/jsdyer/bankrates) / `pages.yml` | `23 12 * * 1-5` | checked | HTTP 200: 2026-11-24T22:37:03+00:00 | [success](https://github.com/jsdyer/bankrates/actions/runs/45502413551) |
| [blockedorgone](https://github.com/jsdyer/blockedorgone) / `pages.yml` | `43 12 * * *` | checked | HTTP 200: 2026-11-24T22:44:17+00:00 | [success](https://github.com/jsdyer/blockedorgone/actions/runs/45503667646) |
| [boomerang-meter](https://github.com/jsdyer/boomerang-meter) / `pages.yml` | `47 9 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/boomerang-meter/actions/runs/45480010782) |
| [borderpulse](https://github.com/jsdyer/borderpulse) / `pages.yml` | `7,37 * * * *` | checked | HTTP 200: 2026-11-25T03:13:38Z | [success](https://github.com/jsdyer/borderpulse/actions/runs/45538467813) |
| [bridgeledger](https://github.com/jsdyer/bridgeledger) / `refresh.yml` | `24 14 6 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/bridgeledger/actions/runs/45352299603) |
| [briefings](https://github.com/jsdyer/briefings) / `pages.yml` | `37 13 * * *` | checked | HTTP 200: 2026-11-24T23:15:58.768824+00:00 | [success](https://github.com/jsdyer/briefings/actions/runs/45508399697) |
| [broadbandatlas](https://github.com/jsdyer/broadbandatlas) / `pages.yml` | `37 10 12 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/broadbandatlas/actions/runs/45352312824) |
| [buoybench](https://github.com/jsdyer/buoybench) / `pages.yml` | `17 */6 * * *` | checked | HTTP 200: 2026-11-25T02:21:35Z | [success](https://github.com/jsdyer/buoybench/actions/runs/45532340133) |
| [campcalendar](https://github.com/jsdyer/campcalendar) / `refresh.yml` | `33 10 4 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/campcalendar/actions/runs/45352352878) |
| [canadaanalytics](https://github.com/jsdyer/canadaanalytics) / `pages.yml` | `02 13 * * *` | checked | HTTP 200: 2026-11-24T22:57:55.676685+00:00 | [success](https://github.com/jsdyer/canadaanalytics/actions/runs/45505729044) |
| [cancon-atlas](https://github.com/jsdyer/cancon-atlas) / `pages.yml` | `41 10 9 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/cancon-atlas/actions/runs/45325434062) |
| [ccts-ledger](https://github.com/jsdyer/ccts-ledger) / `pages.yml` | `41 10 17 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/ccts-ledger/actions/runs/45325437847) |
| [census-lens](https://github.com/jsdyer/census-lens) / `pages.yml` | `18 9 20 2,5,8,11 *` | attention | HTTP 200: 2026-11-24 | [failure](https://github.com/jsdyer/census-lens/actions/runs/45497725725) |
| [chargegaps](https://github.com/jsdyer/chargegaps) / `pages.yml` | `37 8 * * 1` | checked | HTTP 200: 2026-11-24T08:11:22Z | [success](https://github.com/jsdyer/chargegaps/actions/runs/45353907501) |
| [charityflows](https://github.com/jsdyer/charityflows) / `pages.yml` | `43 14 13 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/charityflows/actions/runs/45353919730) |
| [chirproom](https://github.com/jsdyer/chirproom) / `refresh.yml` | `31 8 8 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/chirproom/actions/runs/45353929334) |
| [clamground](https://github.com/jsdyer/clamground) / `refresh.yml` | `31 9 5 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/clamground/actions/runs/45353938311) |
| [cloud-ledger](https://github.com/jsdyer/cloud-ledger) / `pages.yml` | `17 10 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/cloud-ledger/actions/runs/45483398804) |
| [coalbelow](https://github.com/jsdyer/coalbelow) / `refresh.yml` | `41 9 6 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/coalbelow/actions/runs/45353953759) |
| [contractpatterns](https://github.com/jsdyer/contractpatterns) / `pages.yml` | `31 8 * * 3` | checked | HTTP 200: 2026-11-22T14:04:00Z | [success](https://github.com/jsdyer/contractpatterns/actions/runs/45360217023) |
| [corporateghosts](https://github.com/jsdyer/corporateghosts) / `pages.yml` | `48 12 * * *` | checked | HTTP 200: 2026-11-24T22:48:19.897866+00:00 | [success](https://github.com/jsdyer/corporateghosts/actions/runs/45504160533) |
| [crossingrecord](https://github.com/jsdyer/crossingrecord) / `refresh.yml` | `24 14 6 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/crossingrecord/actions/runs/45353975055) |
| [datasetexplorer](https://github.com/jsdyer/datasetexplorer) / `pages.yml` | `55 13 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/datasetexplorer/actions/runs/45508755132) |
| [dawnchorus](https://github.com/jsdyer/dawnchorus) / `pages.yml` | `23 8 * * 1` | checked | HTTP 200: 2026-11-23T20:26:22Z | [success](https://github.com/jsdyer/dawnchorus/actions/runs/45325480288) |
| [dispatchledger](https://github.com/jsdyer/dispatchledger) / `refresh.yml` | `24 14 6 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/dispatchledger/actions/runs/45354012747) |
| [dockdiary](https://github.com/jsdyer/dockdiary) / `pages.yml` | `17 * * * *` | checked | HTTP 200: 2026-11-25T03:04:13Z | [success](https://github.com/jsdyer/dockdiary/actions/runs/45537325291) |
| [donairafterdark](https://github.com/jsdyer/donairafterdark) / `watch.yml` | `37 15 * * 1` | workflow_only | Not a data publisher | [success](https://github.com/jsdyer/donairafterdark/actions/runs/45313151043) |
| [donationradar](https://github.com/jsdyer/donationradar) / `pages.yml` | `37 7 * * 5` | checked | HTTP 200: 2026-11-22T14:05:39Z | [success](https://github.com/jsdyer/donationradar/actions/runs/45325495138) |
| [drivecohort](https://github.com/jsdyer/drivecohort) / `refresh.yml` | `32 9 6 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/drivecohort/actions/runs/45354081007) |
| [exploitgraveyard](https://github.com/jsdyer/exploitgraveyard) / `pages.yml` | `29 12 * * *` | checked | HTTP 200: 2026-11-24T22:39:46.350526+00:00 | [success](https://github.com/jsdyer/exploitgraveyard/actions/runs/45502994637) |
| [exportneighbours](https://github.com/jsdyer/exportneighbours) / `pages.yml` | `36 12 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/exportneighbours/actions/runs/45503620289) |
| [federal-property-atlas](https://github.com/jsdyer/federal-property-atlas) / `pages.yml` | `43 10 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/federal-property-atlas/actions/runs/45485315960) |
| [ferrycountss](https://github.com/jsdyer/ferrycountss) / `refresh-seabus.yml` | `53 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/ferrycountss/actions/runs/45356079691) |
| [ferrycountss](https://github.com/jsdyer/ferrycountss) / `refresh.yml` | `43 11 * * 3` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/ferrycountss/actions/runs/45356088899) |
| [ferryrecord](https://github.com/jsdyer/ferryrecord) / `refresh.yml` | `49 10 * * 3` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/ferryrecord/actions/runs/45356098134) |
| [filingdelta](https://github.com/jsdyer/filingdelta) / `pages.yml` | `45 8 * * *` | checked | HTTP 200: 2026-11-24T194226Z | [success](https://github.com/jsdyer/filingdelta/actions/runs/45473016064) |
| [fireballledger](https://github.com/jsdyer/fireballledger) / `pages.yml` | `23 10 * * 1` | checked | HTTP 200: 2026-11-24T08:26:28Z | [success](https://github.com/jsdyer/fireballledger/actions/runs/45356109072) |
| [flightweather](https://github.com/jsdyer/flightweather) / `refresh.yml` | `17 * * * *` | checked | HTTP 200: 2026-11-25T03:04:02Z | [success](https://github.com/jsdyer/flightweather/actions/runs/45537308466) |
| [flybyfiles](https://github.com/jsdyer/flybyfiles) / `refresh.yml` | `15 8 8 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/flybyfiles/actions/runs/45356129967) |
| [forecastreceipt](https://github.com/jsdyer/forecastreceipt) / `pages.yml` | `17 */6 * * *` | checked | HTTP 200: 2026-11-25T02:22:51Z | [success](https://github.com/jsdyer/forecastreceipt/actions/runs/45532479953) |
| [forgottenplaces](https://github.com/jsdyer/forgottenplaces) / `pages.yml` | `27 12 * * 1` | checked | HTTP 200: 2026-11-24T09:28:25.993359+00:00 | [success](https://github.com/jsdyer/forgottenplaces/actions/runs/45365369246) |
| [fossilneighbours](https://github.com/jsdyer/fossilneighbours) / `refresh.yml` | `27 7 5 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/fossilneighbours/actions/runs/45356177736) |
| [fraudpulse](https://github.com/jsdyer/fraudpulse) / `refresh-data.yml` | `23 13 * * 1` | checked | HTTP 200: 2026-11-24T00:59:17Z | [success](https://github.com/jsdyer/fraudpulse/actions/runs/45301514415) |
| [freenet-echo](https://github.com/jsdyer/freenet-echo) / `pages.yml` | `41 10 9 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/freenet-echo/actions/runs/45325092927) |
| [gc-domain-graveyard](https://github.com/jsdyer/gc-domain-graveyard) / `pages.yml` | `19 11 7 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/gc-domain-graveyard/actions/runs/45325084770) |
| [gc-subdomain-watch](https://github.com/jsdyer/gc-subdomain-watch) / `pages.yml` | `43 8 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/gc-subdomain-watch/actions/runs/45473177066) |
| [govdatagaps](https://github.com/jsdyer/govdatagaps) / `refresh.yml` | `17 7 * * 1` | checked | HTTP 200: 2026-11-23T19:12:42Z | [success](https://github.com/jsdyer/govdatagaps/actions/runs/45246524554) |
| [governmentmemory](https://github.com/jsdyer/governmentmemory) / `pages.yml` | `16 14 * * 1` | checked | HTTP 200: 2026-11-24T10:36:43Z | [success](https://github.com/jsdyer/governmentmemory/actions/runs/45376392617) |
| [govgrade](https://github.com/jsdyer/govgrade) / `pages.yml` | `43 7 * * 0` | checked | HTTP 200: 2026-11-23T00:55:54Z | [success](https://github.com/jsdyer/govgrade/actions/runs/45325118675) |
| [govtrackercensus](https://github.com/jsdyer/govtrackercensus) / `pages.yml` | `17 9 * * 2` | checked | HTTP 200: 2026-11-24T20:15:27Z | [success](https://github.com/jsdyer/govtrackercensus/actions/runs/45478352433) |
| [grid-dark](https://github.com/jsdyer/grid-dark) / `pages.yml` | `47 9 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/grid-dark/actions/runs/45480157249) |
| [gridreceipt](https://github.com/jsdyer/gridreceipt) / `pages.yml` | `41 */3 * * *` | checked | HTTP 200: 2026-11-25T02:17:46Z | [success](https://github.com/jsdyer/gridreceipt/actions/runs/45531869991) |
| [halifaxtimelens](https://github.com/jsdyer/halifaxtimelens) / `refresh.yml` | `38 9 * * 3` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/halifaxtimelens/actions/runs/45356910307) |
| [hiddenwater](https://github.com/jsdyer/hiddenwater) / `refresh.yml` | `23 8 * * 2` | checked | HTTP 200: 2026-11-24T19:33:36.014992+00:00; HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/hiddenwater/actions/runs/45471457792) |
| [highwayframe](https://github.com/jsdyer/highwayframe) / `refresh.yml` | `17 16 * * 1` | checked | HTTP 200: 2026-11-24T08:32:06Z | [success](https://github.com/jsdyer/highwayframe/actions/runs/45356927663) |
| [holidayclock](https://github.com/jsdyer/holidayclock) / `pages.yml` | `17 7 1 * *` | checked | HTTP 200: 2026-11-23T11:34:29.008194Z | [success](https://github.com/jsdyer/holidayclock/actions/runs/45325128498) |
| [hosted-where](https://github.com/jsdyer/hosted-where) / `pages.yml` | `47 10 12 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/hosted-where/actions/runs/45325162361) |
| [hotspotledger](https://github.com/jsdyer/hotspotledger) / `pages.yml` | `23 10 * * *` | checked | HTTP 200: 2026-11-24T20:43:13Z | [success](https://github.com/jsdyer/hotspotledger/actions/runs/45483675405) |
| [housing-pulse](https://github.com/jsdyer/housing-pulse) / `pages.yml` | `27 8 20 * *` | checked | HTTP 200: 2026-11-20 | [success](https://github.com/jsdyer/housing-pulse/actions/runs/45325158469) |
| [iceweeks](https://github.com/jsdyer/iceweeks) / `refresh.yml` | `41 10 * * 3` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/iceweeks/actions/runs/45356950455) |
| [inflation-basket](https://github.com/jsdyer/inflation-basket) / `pages.yml` | `27 8 20 * *` | checked | HTTP 200: 2026-11-20 | [success](https://github.com/jsdyer/inflation-basket/actions/runs/45325179600) |
| [insolvencyatlas](https://github.com/jsdyer/insolvencyatlas) / `pages.yml` | `23 13 * * 3` | checked | HTTP 200: 2026-11-24T04:16:18+00:00 | [success](https://github.com/jsdyer/insolvencyatlas/actions/runs/45325182428) |
| [ispreportcard](https://github.com/jsdyer/ispreportcard) / `pages.yml` | `19 11 * * 4` | checked | HTTP 200: 2026-11-24T08:34:28Z | [success](https://github.com/jsdyer/ispreportcard/actions/runs/45356967788) |
| [ix-ledger](https://github.com/jsdyer/ix-ledger) / `pages.yml` | `28 8 * * 3` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/ix-ledger/actions/runs/45325184869) |
| [jsdyer.github.io](https://github.com/jsdyer/jsdyer.github.io) / `canada-probes.yml` | `23 15 * * *` | workflow_only | Not a data publisher | [success](https://github.com/jsdyer/jsdyer.github.io/actions/runs/45514036273) |
| [jsdyer.github.io](https://github.com/jsdyer/jsdyer.github.io) / `catalogue-audit.yml` | `17 15 * * 1` | workflow_only | Not a data publisher | [success](https://github.com/jsdyer/jsdyer.github.io/actions/runs/45310440612) |
| [jsdyer.github.io](https://github.com/jsdyer/jsdyer.github.io) / `catalogue-freshness.yml` | `23 1,7,13,19 * * *` | workflow_only | Not a data publisher | [success](https://github.com/jsdyer/jsdyer.github.io/actions/runs/45507293136) |
| [jsdyer.github.io](https://github.com/jsdyer/jsdyer.github.io) / `service-monitor.yml` | `37 * * * *` | running | Not a data publisher | [in_progress](https://github.com/jsdyer/jsdyer.github.io/actions/runs/45539025394) |
| [lakeprofiles](https://github.com/jsdyer/lakeprofiles) / `refresh.yml` | `38 9 * * 3` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/lakeprofiles/actions/runs/45357687232) |
| [langleychanges](https://github.com/jsdyer/langleychanges) / `refresh.yml` | `47 8 * * *` | checked | HTTP 200: 2026-11-24T19:43:28+00:00 | [success](https://github.com/jsdyer/langleychanges/actions/runs/45473074696) |
| [langleytrades](https://github.com/jsdyer/langleytrades) / `refresh.yml` | `17 15 3 * *` | checked | HTTP 200: 2026-11-24T08:37:14+00:00 | [success](https://github.com/jsdyer/langleytrades/actions/runs/45357697807) |
| [lastmilepercentile](https://github.com/jsdyer/lastmilepercentile) / `pages.yml` | `23 7 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/lastmilepercentile/actions/runs/45464929840) |
| [lastrefill](https://github.com/jsdyer/lastrefill) / `refresh.yml` | `33 19 * * *` | checked | HTTP 200: 2026-11-25 | [success](https://github.com/jsdyer/lastrefill/actions/runs/45537833849) |
| [launchledger](https://github.com/jsdyer/launchledger) / `pages.yml` | `43 5 * * *` | checked | HTTP 200: 2026-11-24T16:20:48Z | [success](https://github.com/jsdyer/launchledger/actions/runs/45436023570) |
| [lawdelta](https://github.com/jsdyer/lawdelta) / `pages.yml` | `27 8 * * 1` | checked | HTTP 200: 2026-11-23T20:26:00Z | [success](https://github.com/jsdyer/lawdelta/actions/runs/45325228929) |
| [libraryworkbench](https://github.com/jsdyer/libraryworkbench) / `refresh.yml` | `23 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/libraryworkbench/actions/runs/45357727139) |
| [lightkeeper](https://github.com/jsdyer/lightkeeper) / `refresh.yml` | `31 9 5,20 * *` | checked | HTTP 200: 2026-11-20 | [success](https://github.com/jsdyer/lightkeeper/actions/runs/44788265520) |
| [lobbytrail](https://github.com/jsdyer/lobbytrail) / `refresh.yml` | `37 15 * * 2` | attention | HTTP 200: 2026-11-24T10:23:18+00:00 | [failure](https://github.com/jsdyer/lobbytrail/actions/runs/45515135263) |
| [malwarelineage](https://github.com/jsdyer/malwarelineage) / `pages.yml` | `23 7 * * *` | checked | HTTP 200: 2026-11-24T18:59:36Z | [success](https://github.com/jsdyer/malwarelineage/actions/runs/45465316049) |
| [maplehosting](https://github.com/jsdyer/maplehosting) / `pages.yml` | `23 10 3 * *` | checked | HTTP 200: 2026-11-22T14:01:28Z | [success](https://github.com/jsdyer/maplehosting/actions/runs/45325261214) |
| [maplephish](https://github.com/jsdyer/maplephish) / `pages.yml` | `23 14 * * *` | checked | HTTP 200: 2026-11-24T23:33:05Z | [success](https://github.com/jsdyer/maplephish/actions/runs/45510826268) |
| [masspeaks](https://github.com/jsdyer/masspeaks) / `refresh.yml` | `7 8 8 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/masspeaks/actions/runs/45357754210) |
| [metermath](https://github.com/jsdyer/metermath) / `refresh.yml` | `33 19 * * *` | checked | HTTP 200: 2026-11-25 | [success](https://github.com/jsdyer/metermath/actions/runs/45537859517) |
| [metroeconomy](https://github.com/jsdyer/metroeconomy) / `refresh.yml` | `17 15 * * 5` | checked | HTTP 200: 2026-11-24T10:38:13+00:00 | [success](https://github.com/jsdyer/metroeconomy/actions/runs/45376640904) |
| [ministersays](https://github.com/jsdyer/ministersays) / `pages.yml` | `20 11 * * *` | checked | HTTP 200: 2026-11-24T21:22:01.151517+00:00 | [success](https://github.com/jsdyer/ministersays/actions/runs/45490263923) |
| [museumdrawer](https://github.com/jsdyer/museumdrawer) / `pages.yml` | `43 9 5 * *` | checked | HTTP 200: 2026-11-22T15:13:12Z | [success](https://github.com/jsdyer/museumdrawer/actions/runs/45325279668) |
| [mushroomcalendar](https://github.com/jsdyer/mushroomcalendar) / `pages.yml` | `23 8 * * 0` | checked | HTTP 200: 2026-11-22T15:12:19Z | [success](https://github.com/jsdyer/mushroomcalendar/actions/runs/45325329880) |
| [namesforget](https://github.com/jsdyer/namesforget) / `pages.yml` | `09 13 * * *` | checked | HTTP 200: 2026-11-24T23:00:00.498372+00:00 | [success](https://github.com/jsdyer/namesforget/actions/runs/45505983987) |
| [nasa](https://github.com/jsdyer/nasa) / `pages.yml` | `17 13 * * *` | attention | HTTP 200: 2026-11-24T23:00:11.708Z | [success](https://github.com/jsdyer/nasa/actions/runs/45506033177) |
| [oicdiary](https://github.com/jsdyer/oicdiary) / `pages.yml` | `53 8 * * 1` | checked | HTTP 200: 2026-11-23T20:40:09Z | [success](https://github.com/jsdyer/oicdiary/actions/runs/45325304982) |
| [oldnews-oddities](https://github.com/jsdyer/oldnews-oddities) / `pages.yml` | `27 9 * * 3` | checked | HTTP 200: 2026-11-23T05:13:01Z | [success](https://github.com/jsdyer/oldnews-oddities/actions/runs/45325297302) |
| [onionpulse](https://github.com/jsdyer/onionpulse) / `pages.yml` | `14 12 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/onionpulse/actions/runs/45500136445) |
| [opendatagraveyard](https://github.com/jsdyer/opendatagraveyard) / `pages.yml` | `34 12 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/opendatagraveyard/actions/runs/45503218674) |
| [orbitalcensus](https://github.com/jsdyer/orbitalcensus) / `refresh.yml` | `17 10 * * *` | checked | HTTP 200: 2026-11-24T20:39:24Z | [success](https://github.com/jsdyer/orbitalcensus/actions/runs/45483051103) |
| [otherworldnames](https://github.com/jsdyer/otherworldnames) / `refresh.yml` | `38 7 2 * *` | checked | HTTP 200: 2026-11-24; HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/otherworldnames/actions/runs/45357813900) |
| [packagepulse](https://github.com/jsdyer/packagepulse) / `pages.yml` | `17 8 * * 2` | checked | HTTP 200: 2026-11-24T19:32:59.266Z | [success](https://github.com/jsdyer/packagepulse/actions/runs/45471362613) |
| [pantryprices](https://github.com/jsdyer/pantryprices) / `refresh.yml` | `13 9 2,23 * *` | checked | HTTP 200: 2026-11-23 | [success](https://github.com/jsdyer/pantryprices/actions/runs/45268537742) |
| [paperchequetrail](https://github.com/jsdyer/paperchequetrail) / `pages.yml` | `37 9 18 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/paperchequetrail/actions/runs/45325332555) |
| [parkvisits](https://github.com/jsdyer/parkvisits) / `refresh.yml` | `24 14 6 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/parkvisits/actions/runs/45357830081) |
| [patchsignal](https://github.com/jsdyer/patchsignal) / `pages.yml` | `31 12 * * *` | checked | HTTP 200: 2026-11-24T22:40:51.594695+00:00 | [success](https://github.com/jsdyer/patchsignal/actions/runs/45503158181) |
| [patentattic](https://github.com/jsdyer/patentattic) / `pages.yml` | `20 11 * * 6` | checked | HTTP 200: 2026-11-24T08:55:22+00:00 | [success](https://github.com/jsdyer/patentattic/actions/runs/45360312338) |
| [pipeda-findings](https://github.com/jsdyer/pipeda-findings) / `pages.yml` | `39 8 * * 5` | checked | HTTP 200: 2026-11-20 | [success](https://github.com/jsdyer/pipeda-findings/actions/runs/45325173082) |
| [planetpapers](https://github.com/jsdyer/planetpapers) / `refresh.yml` | `37 8 5 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/planetpapers/actions/runs/45358413720) |
| [plumediary](https://github.com/jsdyer/plumediary) / `refresh.yml` | `23 8 8 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/plumediary/actions/runs/45358423282) |
| [postmarkplaces](https://github.com/jsdyer/postmarkplaces) / `refresh.yml` | `23 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/postmarkplaces/actions/runs/45358432347) |
| [prefixdiary](https://github.com/jsdyer/prefixdiary) / `refresh.yml` | `22 10 * * 2-6` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/prefixdiary/actions/runs/45483443009) |
| [priceatlas](https://github.com/jsdyer/priceatlas) / `pages.yml` | `44 11 * * 3` | checked | HTTP 200: 2026-11-24T04:16:46+00:00 | [success](https://github.com/jsdyer/priceatlas/actions/runs/45325245525) |
| [quakeecho](https://github.com/jsdyer/quakeecho) / `refresh.yml` | `39 8 8 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/quakeecho/actions/runs/45358446292) |
| [rackexpiry](https://github.com/jsdyer/rackexpiry) / `pages.yml` | `43 10 * * 1` | checked | HTTP 200: 2026-11-23T22:13:47Z | [success](https://github.com/jsdyer/rackexpiry/actions/runs/45325256039) |
| [radarscope](https://github.com/jsdyer/radarscope) / `pages.yml` | `37 9 * * *` | checked | HTTP 200: 2026-11-24T20:19:33Z | [success](https://github.com/jsdyer/radarscope/actions/runs/45479540542) |
| [rangeledger](https://github.com/jsdyer/rangeledger) / `pages.yml` | `41 14 * * *` | checked | HTTP 200: 2026-11-24T23:38:20.933Z | [success](https://github.com/jsdyer/rangeledger/actions/runs/45511631733) |
| [recallradar](https://github.com/jsdyer/recallradar) / `pages.yml` | `37 12 * * *` | checked | HTTP 200: 2026-11-24T22:43:52+00:00 | [success](https://github.com/jsdyer/recallradar/actions/runs/45503622009) |
| [registrarwatch](https://github.com/jsdyer/registrarwatch) / `refresh.yml` | `17 14 7,21 * *` | checked | HTTP 200: 2026-11-24T16:34:47+00:00 | [success](https://github.com/jsdyer/registrarwatch/actions/runs/45358468861) |
| [releasereceipt](https://github.com/jsdyer/releasereceipt) / `pages.yml` | `31 17 * * 2,5` | checked | HTTP 200: 2026-11-25 | [success](https://github.com/jsdyer/releasereceipt/actions/runs/45526219589) |
| [researchledger](https://github.com/jsdyer/researchledger) / `pages.yml` | `43 5 * * 1` | checked | HTTP 200: 2026-11-23T16:29:52Z | [success](https://github.com/jsdyer/researchledger/actions/runs/45325296149) |
| [restroomreach](https://github.com/jsdyer/restroomreach) / `pages.yml` | `47 8 * * 2` | attention | HTTP 200: 2026-11-23T11:36:09Z | [failure](https://github.com/jsdyer/restroomreach/actions/runs/45522996519) |
| [rfctrail](https://github.com/jsdyer/rfctrail) / `pages.yml` | `47 11 * * 1` | checked | HTTP 200: 2026-11-24T08:42:54Z | [success](https://github.com/jsdyer/rfctrail/actions/runs/45358487934) |
| [riverpulse](https://github.com/jsdyer/riverpulse) / `refresh.yml` | `43 9 * * *` | checked | HTTP 200: 2026-11-24T20:19:56Z | [success](https://github.com/jsdyer/riverpulse/actions/runs/45479648880) |
| [roadpulse](https://github.com/jsdyer/roadpulse) / `pages.yml` | `17 */6 * * *` | checked | HTTP 200: 2026-11-25T02:27:10Z | [success](https://github.com/jsdyer/roadpulse/actions/runs/45532996881) |
| [routemirror](https://github.com/jsdyer/routemirror) / `refresh.yml` | `23 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/routemirror/actions/runs/45358507306) |
| [salmonlines](https://github.com/jsdyer/salmonlines) / `pages.yml` | `41 10 3 * *` | checked | HTTP 200: 2026-11-18 | [success](https://github.com/jsdyer/salmonlines/actions/runs/45365386174) |
| [sanctionsledger](https://github.com/jsdyer/sanctionsledger) / `pages.yml` | `11 10 * * *` | checked | HTTP 200: 2026-11-24T20:37:48Z | [success](https://github.com/jsdyer/sanctionsledger/actions/runs/45482748645) |
| [satpasses](https://github.com/jsdyer/satpasses) / `pages.yml` | `17 */4 * * *` | checked | HTTP 200: 2026-11-25T00:44:34.106717Z | [success](https://github.com/jsdyer/satpasses/actions/runs/45520421602) |
| [scanreceipt](https://github.com/jsdyer/scanreceipt) / `pages.yml` | `47 14 * * *` | checked | HTTP 200: 2026-11-24T23:40:07Z | [success](https://github.com/jsdyer/scanreceipt/actions/runs/45511808808) |
| [schoolhouseledger](https://github.com/jsdyer/schoolhouseledger) / `refresh.yml` | `23 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/schoolhouseledger/actions/runs/45358536765) |
| [scorecard](https://github.com/jsdyer/scorecard) / `refresh.yml` | `37 14 * * 4` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/scorecard/actions/runs/45359190779) |
| [seabusclock](https://github.com/jsdyer/seabusclock) / `refresh-profile.yml` | `37 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/seabusclock/actions/runs/45359199531) |
| [seabusclock](https://github.com/jsdyer/seabusclock) / `refresh.yml` | `53 8 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/seabusclock/actions/runs/45473342347) |
| [shieldcheck](https://github.com/jsdyer/shieldcheck) / `pages.yml` | `23 */6 * * *` | checked | HTTP 200: 2026-11-25T02:37:12.885Z | [success](https://github.com/jsdyer/shieldcheck/actions/runs/45534212292) |
| [shipwrecks](https://github.com/jsdyer/shipwrecks) / `pages.yml` | `17 11 * * *` | checked | HTTP 200: 2026-11-24T21:20:38.478082+00:00 | [success](https://github.com/jsdyer/shipwrecks/actions/runs/45490101048) |
| [shopfrontdiary](https://github.com/jsdyer/shopfrontdiary) / `refresh.yml` | `23 10 3 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/shopfrontdiary/actions/runs/45359225251) |
| [skyarchive](https://github.com/jsdyer/skyarchive) / `pages.yml` | `56 14 * * 5` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/skyarchive/actions/runs/45325465702) |
| [snowcourses](https://github.com/jsdyer/snowcourses) / `refresh.yml` | `33 19 * * *` | checked | HTTP 200: 2026-11-25 | [success](https://github.com/jsdyer/snowcourses/actions/runs/45537860295) |
| [spectrum-explorer](https://github.com/jsdyer/spectrum-explorer) / `pages.yml` | `41 10 9 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/spectrum-explorer/actions/runs/45325475876) |
| [spectrumatlas](https://github.com/jsdyer/spectrumatlas) / `pages.yml` | `22 13 8 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/spectrumatlas/actions/runs/45359244890) |
| [spillledger](https://github.com/jsdyer/spillledger) / `refresh.yml` | `41 10 4 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/spillledger/actions/runs/45359252705) |
| [statusledger](https://github.com/jsdyer/statusledger) / `pages.yml` | `17 13 * * *` | checked | HTTP 200: 2026-11-24T23:02:33Z | [success](https://github.com/jsdyer/statusledger/actions/runs/45506426677) |
| [stormtracks](https://github.com/jsdyer/stormtracks) / `refresh.yml` | `37 9 5 * *` | checked | HTTP 200: 2026-11-24; HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/stormtracks/actions/runs/45359262427) |
| [strangeskies](https://github.com/jsdyer/strangeskies) / `pages.yml` | `13 11 * * *` | checked | HTTP 200: 2026-11-24T21:09:35.326913+00:00 | [success](https://github.com/jsdyer/strangeskies/actions/runs/45488002223) |
| [streetworkdiary](https://github.com/jsdyer/streetworkdiary) / `refresh.yml` | `38 9 * * 3` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/streetworkdiary/actions/runs/45359274552) |
| [sunledger](https://github.com/jsdyer/sunledger) / `refresh.yml` | `36 14 7 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/sunledger/actions/runs/45359283855) |
| [surplus-crown](https://github.com/jsdyer/surplus-crown) / `pages.yml` | `45 10 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/surplus-crown/actions/runs/45485402035) |
| [takedown-watcher](https://github.com/jsdyer/takedown-watcher) / `collect.yml` | `23 */6 * * *` | checked | HTTP 200: 2026-11-25T02:38:09Z | [success](https://github.com/jsdyer/takedown-watcher/actions/runs/45534356539) |
| [telecompulse](https://github.com/jsdyer/telecompulse) / `pages.yml` | `31 11 * * 2` | checked | HTTP 200: 2026-11-24T21:24:52.193643+00:00 | [success](https://github.com/jsdyer/telecompulse/actions/runs/45490814068) |
| [tide-and-dark](https://github.com/jsdyer/tide-and-dark) / `pages.yml` | `13 10 2 * *` | checked | HTTP 200: 2026-11-19 | [success](https://github.com/jsdyer/tide-and-dark/actions/runs/45325569705) |
| [tidereceipt](https://github.com/jsdyer/tidereceipt) / `pages.yml` | `29 */6 * * *` | checked | HTTP 200: 2026-11-25T02:38:53Z | [success](https://github.com/jsdyer/tidereceipt/actions/runs/45534431526) |
| [toxic-ground](https://github.com/jsdyer/toxic-ground) / `pages.yml` | `44 10 * * 2` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/toxic-ground/actions/runs/45485420884) |
| [trailglass](https://github.com/jsdyer/trailglass) / `pages.yml` | `37 13 * * 2` | checked | HTTP 200: 2026-11-24T23:14:31+00:00 | [success](https://github.com/jsdyer/trailglass/actions/runs/45508232752) |
| [transferwindow](https://github.com/jsdyer/transferwindow) / `refresh.yml` | `39 8 * * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/transferwindow/actions/runs/45472809167) |
| [transitreceipt](https://github.com/jsdyer/transitreceipt) / `pages.yml` | `13 * * * *` | checked | HTTP 200: 2026-11-25T03:09:53Z | [success](https://github.com/jsdyer/transitreceipt/actions/runs/45536900692) |
| [translink](https://github.com/jsdyer/translink) / `refresh.yml` | `17 * * * *` | checked | HTTP 200: 2026-11-25T02:53:52Z | [success](https://github.com/jsdyer/translink/actions/runs/45536153737) |
| [welllayers](https://github.com/jsdyer/welllayers) / `refresh.yml` | `33 10 4 * *` | checked | HTTP 200: 2026-11-24 | [success](https://github.com/jsdyer/welllayers/actions/runs/45360097013) |
| [wrongdoings](https://github.com/jsdyer/wrongdoings) / `pages.yml` | `41 12 * * *` | checked | HTTP 200: 2026-11-24T22:44:59.146080+00:00 | [success](https://github.com/jsdyer/wrongdoings/actions/runs/45503787588) |

## Explicitly unscheduled source repositories

These projects remain accounted for in the operations registry; absence of a schedule is explicit. Browser-local and installable tools should not receive meaningless scheduled downloads.

`jsdyer/abuse-kit`, `jsdyer/abusepulse`, `jsdyer/arttimeline`, `jsdyer/bcplacenames`, `jsdyer/bookgraveyard`, `jsdyer/certtrail`, `jsdyer/civiclookup`, `jsdyer/colocheck`, `jsdyer/committeereceipt`, `jsdyer/commonslens`, `jsdyer/composediff`, `jsdyer/datasetdiff`, `jsdyer/dependencyxray`, `jsdyer/diagrambench`, `jsdyer/dnslens`, `jsdyer/domain-biography`, `jsdyer/edge-map`, `jsdyer/ephemeraatlas`, `jsdyer/eventradar`, `jsdyer/evidencelab`, `jsdyer/formatshift`, `jsdyer/fxreceipt`, `jsdyer/gearautopsy`, `jsdyer/ghostlinks`, `jsdyer/headerautopsy`, `jsdyer/headlinevault`, `jsdyer/ipsnapshot`, `jsdyer/labelcompare`, `jsdyer/lostcode`, `jsdyer/magneticnorth`, `jsdyer/mailpath`, `jsdyer/marinenames`, `jsdyer/marketshadows`, `jsdyer/mediaechoes`, `jsdyer/mimecabinet`, `jsdyer/nightfinder`, `jsdyer/outagescope`, `jsdyer/packetpocket`, `jsdyer/payments`, `jsdyer/pdfsigning`, `jsdyer/phishintel`, `jsdyer/photolab`, `jsdyer/platesolvelab`, `jsdyer/pwncheck-kanon`, `jsdyer/queryplan`, `jsdyer/renewalboard`, `jsdyer/routearchaeologist`, `jsdyer/rpkiguard`, `jsdyer/sameflight`, `jsdyer/scamtrace`, `jsdyer/screenradar`, `jsdyer/screensaver`, `jsdyer/signalwalk`, `jsdyer/streamatlas`, `jsdyer/tariffxray`, `jsdyer/trackerxray`, `jsdyer/translationdesk`, `jsdyer/unreleased`, `jsdyer/violationsheet`, `jsdyer/weatherarchive`, `jsdyer/wordweave`.

## Reliability improvements to prioritize

- Keep per-source results in a small published status file for every multi-source collector. NASA demonstrated why an aggregate timestamp and green workflow are insufficient. Include successful retrieval time, upstream edition, failure detail and whether the visible data was retained.
- For the two official download hosts rejecting GitHub, run the existing validated collector commands on a permitted, source-reachable host and publish the verified outputs. The watchdog currently dispatches GitHub; it does not move downloads to the Linux server. Keep this distinction explicit in setup.
- Prefer a reviewed, supported Overpass endpoint or regional extract pipeline if recurring timeouts continue. A paid provider key may improve service reliability, but does not justify silently reducing regional coverage or treating empty/error responses as current data. No registration is required for the current public endpoint.

## Limits

This pass did not install or inspect the private Linux watchdog runtime, GitHub App installation scope, credentials or its next private report. Root integration separately scans current workflow definitions/guards and reconciles generated registries. The stored observer snapshot can be superseded by newer runs; this document records its exact observation time. Full raw run logs were reviewed only for the three active collector failures, with direct official-source diagnostics for those and NASA. No private data or tokens are included.
