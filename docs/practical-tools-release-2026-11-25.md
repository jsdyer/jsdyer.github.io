# Practical tools, historical data and monitoring corrections

Owner release review, November 25, 2026. Source/check timestamps below use UTC.
The public catalogue has 279 tools; aggregate measurement covers those plus the
intentionally unlisted Town Heritage prototype. The paginated repository audit
accounts for 283 public repositories, with 13 documented exclusions and none
awaiting classification. The generated watchdog registry contains 195 scheduled
workflows across 270 catalogue source repositories.

## New public applications

| Application | Delivered behaviour | Source and maintenance |
| --- | --- | --- |
| [Browser Receipt](https://coolcode.ca/browserreceipt/) | Local browser measurements, baseline comparisons, redacted exports and explicit connection/DNS checks | Local features need no service. Optional IP/ASN route is deployed and verified; DNS observer is an optional separate VPS project. |
| [Session Harbour](https://coolcode.ca/sessionharbour/) | Private session/bookmark/URL imports, supported unencrypted SNSS parsing, grouping, deduplication and export | Files remain local; unsupported encrypted formats give export instructions. No collector. |
| [Car Bench](https://coolcode.ca/carbench/) | Fuel, electric and plug-in-hybrid comparisons with editable driving/ownership assumptions | 13,033 NRCan variants in the verified capture; monthly refresh. |
| [Canada Board](https://coolcode.ca/canadaboard/) | Six dated economic indicators, trends, official next releases, calendar export, saved pins and CSV | Statistics Canada and Bank of Canada; weekday checks. |
| [Signal Relics](https://coolcode.ca/signalrelics/) | Search historic computers, communications equipment and related objects; compare, save and export | 1,970 real Science Museum Group objects; source-edition dates and individual image rights; monthly checks. |
| [Selfhost Finder](https://coolcode.ca/selfhostfinder/) | Search/filter self-hostable software, compare and save a shortlist | 1,361 community catalogue entries with licence attribution; weekly checks. |
| [Heat Bench](https://coolcode.ca/heatbench/) | Consumption/bill inputs, heating-load calculations, heat-pump savings/payback ranges and backup-heat scenarios | Local calculations and stated assumptions; no collector or API key. |
| [DIN Compare](https://coolcode.ca/dincompare/) | Search DIN/brand and compare recorded ingredient, strength, form, route, status and manufacturer | Live keyless Health Canada data. It does not claim price coverage or automatic clinical interchangeability. |

## Existing applications improved

| Applications | Change |
| --- | --- |
| Town Heritage | Standard aggregate visit counter, admin name mapping and correctly attributed issue reports, while remaining outside homepage/search/sitemap. Fake-key tests exercise collection and build output, including source responses that echo credentials. |
| Canada Pulse | Retained monthly history backfilled to July 1, 2015 for the configured topics; Canadian readership rankings backfilled from January 2021. Date browsing, lazy-loaded months and exports retain source distinctions. |
| Charge Gaps | A separate AFDC/NRCan Canadian station directory using the owner's DATA.GOV key; 15,295 verified station records in this capture, with connector/access filtering and CSV. It is not added to Open Charge Map counts. |
| Trailglass | ECCC daily precipitation and forecasts, DriveBC information and click-loaded official Trailforks widgets. Measurement dates and missing observations are explicit. |
| Nightfinder / Tide & Dark | Peggy's Cove and Stanley Park photography presets, cloud limits, saved locations and cross-links. A saved photo coordinate is not presented as an official tide station. |
| Art Timeline | Five-museum opening collection, Cleveland lookup and image comparison/print sizing. Print estimates use verified served-image dimensions where available. |
| Book Graveyard | Identifier-based HathiTrust lookups and access links; catalogue presence is not a promise of full-text access. |
| Research Ledger | Dalhousie, Saint Mary's Halifax, UBC and SFU affiliation filters, saved research and institutional RSS. These are selected Crossref records, not an exhaustive university bibliography. |
| Inflation Basket | Dollar comparisons using complete annual averages: Canada 1914–2025 and ten provinces 1979–2025. October 2026 is offered separately as a monthly observation; existing basket data retains its own freshness date. |
| Move Bench | Vancouver/Halifax/Langley place presets that preserve financial inputs, five evidence-source cards and a temporary planning checklist. Provincial spending context is not represented as a city price quote. |
| BankRate Lab / Renewal Bench | Official policy decision calendar and observed changes, plus explicitly hypothetical payment scenarios. |
| Tariff Bench | 4,353 Canadian-market ENERGY STAR refrigeration models and rated annual kWh inputs. The monthly appliance refresh does not change manually reviewed electricity tariffs. |
| Label Compare / Basket Math | Private receipt-backed package/price history, compatible-unit comparisons, explicit local saving and interchangeable JSON backups. |
| Rack Expiry / Package Pulse | Installed-version watchlists, supported-branch comparisons, backups and release RSS. Rack adds six configured self-hosted GitHub projects. |
| Feed Harbour | Reviewed CoolCode research/software feeds load directly from this site with omitted credentials, rejected redirects and a streamed size bound. External feeds retain the shared gateway. |
| Headline Vault / Old News Oddities | Secret-only LOC exemption header support, fixed HTTPS destinations, rejected redirects and fake-secret leakage tests. No new LOC source capture is claimed merely because a code build passes. |

## Backfill evidence

Canada Pulse's latest verified normal collection is November 25, 2026. Its archive
contains 4,166 dates across 137 monthly files, 116,648 topic measurements and
2,141 Canadian-reader ranking days. Fourteen country-ranking dates are genuine
upstream gaps. One additional endpoint now returns 404 but its earlier successful
capture was retained. Missing days were not replaced with zeroes and historical
downloads did not impersonate a new live check.

See the published [coverage manifest](https://coolcode.ca/canadapulse/data/history/manifest.json),
[backfill provenance](https://coolcode.ca/canadapulse/data/backfill.json) and
[current status](https://coolcode.ca/canadapulse/data/status.json).

## Watchdog behaviour and owner installation

The attached report itself showed a healthy pass and a delivered heartbeat. It did
not contain the earlier failing passes, so their exact causes cannot be proven
from that file. Review nevertheless found remaining paths that treated handled
per-repository GitHub failures, rate-limit backoff and history limits as service
failures. These are now target findings. A bounded request budget defers unfinished
targets without marking them checked or letting a remote outage consume the
systemd execution window.

The expected runtime is `2026-11-26-service-health-v2`. Actual service faults,
including invalid global credentials/configuration, inability to save state and
unexpected execution errors, still fail the service heartbeat. Individual
download/workflow/staleness findings remain visible in admin.

The program update is published. Its installation on the private VPS must be
confirmed from the server report; an acknowledgement is not runtime verification.
Follow [Install this runtime update](../services/refresh-watchdog/README.md#install-this-runtime-update).
Ordinary target/probe updates still arrive automatically. The existing
all-repositories GitHub App setting covers the new collector repositories.

## Owner-controlled setup and verified Worker

1. The complete [Worker](https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/dfbb6509ac9801604f0b7b5ab95299b0026f41ff/services/cloudflare-visitor/worker.js)
   is now deployed and verified by downloading the actual module. It matches the
   generated 280-ID source; Browser Receipt's opt-in connection route returns 200
   with `private, no-store`. No further Worker paste or binding change is needed.
   The checked source hash is recorded in `data/operations/cloudflare-deployment.json`.
2. Add `LOC_USER_AGENT` as an **Actions secret** in both `headlinevault` and
   `oldnews-oddities`. The value is the exact single line LOC issued: email,
   one space, issued token. Do not include quotes, `User-Agent:` or
   `LOC_USER_AGENT=`. Old News's published build had no value for this secret.
   Run each repository's existing manual refresh after adding it. No credential
   value belongs in source, generated data or this report.
3. Browser Receipt's [optional DNS observer](https://github.com/jsdyer/browserreceipt/tree/main/optional-dns)
   includes delegated-subzone, reverse-proxy and systemd instructions. Nothing
   was installed on a VPS. It observes resolver egress contacting that subzone,
   not a visitor's complete DNS resolver chain. Observations expire from RAM.
   Session Harbour's [optional local exporter](https://github.com/jsdyer/sessionharbour/tree/main/optional-exporter)
   is independent of that service.

## Verification and limits

Application releases run their own model/collector/build tests and GitHub-hosted
Chromium interaction/mobile checks before Pages publication. The hub checks
catalogue/README agreement, repository coverage, Worker registration, watchdog
targets, unlisted exclusions and the generated sitemap. The Worker passes pinned
Cloudflare type checks and the full gateway/admin runtime suite. No fake visitor
events or private issue reports were submitted to inflate production statistics.

The existing Air Pair and Shipwreck Explorer SODA3 migrations were rechecked:
both replacement CSV URLs returned 200 and post-fix workflow runs passed. Old
upstream source dates remain visible separately from new download checks.

Trailforks automated widget requests can receive 403; the tool retains its
official embed and direct region fallback rather than bypassing the provider.
Historical/country coverage and clinical, financial, geographic and image-rights
limits are explained inside the affected applications.
