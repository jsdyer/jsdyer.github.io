# CoolCode usefulness and portfolio review

Reviewed November 24, 2026 (user-local date).

## What was reviewed

This is a product and source-feasibility review of all **232 catalogue entries present at the start of this work**, plus the three requested additions. The starting catalogue contained 223 browser tools and nine installable tools. Every catalogue description and source summary was reviewed; 23 current upstream READMEs were also fetched for the closest overlaps and strongest improvement candidates. Official provider documentation and selected live endpoints were checked for the new proposals below. This is not a claim that every interaction in all 232 applications received a browser test or code audit. Deployment, source-download and schedule checks are tracked separately in the integration audit.

| Category | Starting entries |
| --- | ---: |
| Maps, trails & history | 60 |
| Networks & routing | 33 |
| Government & public records | 31 |
| Security & forensics | 23 |
| Media, events & the old web | 21 |
| Homelab & archiving | 18 |
| Sky & photography | 16 |
| Money & markets | 16 |
| Public disclosures | 14 |

## Direction

CoolCode already has enough breadth. The next improvement with the greatest likely return is to turn the strongest tools into things a visitor can use with **their own place, file, device, question or purchase**, get a useful result immediately, and return to later. A map with two preset places or a chart of six selected historical examples can be interesting; it serves a smaller recurring need than a tool that accepts the visitor's location or records.

Keep the unusual historical and scientific work. Organize discovery around what the visitor is doing as well as the existing subject categories: **check something now**, **compare my own data**, **plan an outing**, **research a record**, and **explore a historical case**. This can be an additional filter, rather than a category reshuffle. A useful historical exhibit does not need an artificial weekly update or an inflated live-tool claim.

Do not use raw tool count as the main release target. A good next batch would be three new tools, six substantive upgrades, and one real consolidation. Evaluate each release with a concrete task: can a stranger complete it on a phone in a minute, without reading the repository?

## Strongest existing tools to improve first

These are proposed improvements, not statements that the current feature is broken.

| Priority | Existing tool | Useful next release | Why it matters |
| --- | --- | --- | --- |
| 1 | **Donair After Dark** | Grow from five addresses to a well-reviewed Halifax/Dartmouth/Bedford/Sackville selection; compare complete orders, portion descriptions and branch-specific pickup hours; make missing/old prices obvious. | Very personal fit and a clear search intent: “donairs open late Halifax” or “donair and extra sauce price”. The current guide already does midnight carryover, tax and exact sauce sizes correctly; expand coverage rather than rewrite those parts. |
| 2 | **Transfer Window** | Let a visitor select an interchange, incoming route, outgoing route, date and minimum walking time. Start with Carvolth/Lougheed plus useful Halifax terminals. Preserve route 555 as a preset. | Turns one commute study into a general tool for avoiding a missed connection. Static GTFS is sufficient for the first release; real-time enrichment is a later layer. |
| 3 | **Recall Radar** | Add a household product/vehicle list, matched-notice explanations, changed-notice tracking and a clear “checked when you visit” status. | It already has saved search terms. Structured model/year/brand entries would make those matches more useful without promising background alerts. |
| 4 | **ATIP Records Explorer** | Add a private request/copy ledger: reference, institution, date sent, replies, next action, received filename, export/import. Keep the existing discovery and drafting workflow. | You can use it for your own requests immediately; other requesters have the same problem. Dates should be user-recorded, with any legal deadline calculation separately sourced and qualified. |
| 5 | **Last Refill + Restroom Reach** | Shared nearby-facility data and GPX route engine, known hours/accessibility/source dates, route gaps and offline trip export. Keep two focused entry pages. | Practical walking/cycling utility. A straight-line distance to a facility must not be presented as walking access across water, fences or highways. |
| 6 | **DNS Lens** | Add a plain-language email-domain checklist: MX, SPF lookup budget, DMARC policy, user-supplied DKIM selectors, and a redacted “send to my provider” report. | Helps site owners fix real mail problems. It should explain observations rather than claim deliverability or invent DKIM selectors. |
| 7 | **Renewal Board** | Import a domain list, distinguish registry expiry from a certificate's observed validity, mark unavailable RDAP dates, export calendar reminders and save comparison history locally. | A clear recurring job for domain owners. Reuse certificates/RDAP adapters with DNS Lens and Domain Biography. |
| 8 | **Langley Changes** | Address/radius watchlists, separate City/Township filters, application timelines, and notification-ready RSS for public area searches. | Useful to residents, not just people interested in the sample projects. Keep permit/application matches evidence-based. |
| 9 | **Hotspot Ledger** | Expand beyond Iona Beach/Hartlen Point to a maintained region/hotspot picker; saved favourites and recent notable birds. | The current guide is explicitly a two-hotspot comparison. Broadening this carefully increases real usefulness while respecting eBird's key and data terms. |
| 10 | **Photo Lab** | A prominent “make a safe copy for sharing” flow, before/after metadata view, file-size target, batch image export and explicit treatment of unsupported formats. | Existing private processing is valuable. Do not promise removal of embedded data in formats the sanitizer cannot verify. |
| 11 | **Road Pulse + Highway Frame** | Favourite routes and a single trip view combining relevant incidents, camera timestamps and official source links. | A person driving Langley–Vancouver or across BC should not need to scan a province-wide dataset. Keep incident and camera capture ages separate. |
| 12 | **Library Workbench** | Search by desired task and municipality: 3D print, digitize tape, large-format print, audio recording; show eligibility, booking link and dated policy. | Distinctive local utility, suitable for Vancouver/Langley/Halifax expansion. It needs reviewed library facts more than a new API account. |

## Consolidation decisions

**Delete no repositories now.** Public repository history and existing URLs are assets. First move the useful behavior, preserve the original links with a redirect or a functioning compatibility page, verify bookmarks and search canonical URLs, update the catalogue and monitoring, and only then consider archiving a redundant source repository. Cloudflare routing must preserve redirects even if an old Pages deployment is retired.

| Tools | Recommendation | What must survive |
| --- | --- | --- |
| **Colo Check / Edge Map** | Highest-confidence merger: one maintained connection-check engine and one primary page. Choose the canonical URL using existing traffic/search evidence. The other route becomes a redirect after validation. | IPv4/IPv6 tests, multiple endpoints, approximate map, dynamic location names, opt-in history, exports, readable CORS errors. Prefer history without full IPs or prefixes by default. |
| **Price Atlas / Pantry Prices** | One shared retail-price importer/model. Keep a simple modern-price entry view and a historical/commodity view until both are clearly usable in one app. | Price Atlas's product/geography/unit comparison; Pantry Prices's historical series, basket rules and coffee comparison. Never splice incompatible survey methods into one continuous series. |
| **Headline Vault / Old News Oddities** | One newspaper search engine with curated discovery shelves. Separate landing URLs may remain for different search intent. | Date/place/full-text search, original page links, saved research trail, and the unusual phrase presets. |
| **Cloud Ledger / Contract Patterns** | Share the federal contract ingestion and identity rules. Make cloud/IT suppliers a curated lens; retain the broader historical window if moving into Contract Patterns. | Original versus amendment amounts, source identifiers, vendor alias explanations and history. Current Contract Patterns has a rolling-year scope; merging without extending that would lose material. |
| **Ferry Counts / SeaBus Clock / Route Mirror** | Share TransLink passenger-count and timetable transforms. Keep focused pages for cross-coast ferry comparison and practical SeaBus planning. | Survey year/season and timetable edition; do not infer today's crowding from historic averages. |
| **Contaminated Places / Toxic Ground / Federal Property Atlas** | Connected tools, not an immediate merger. Contaminated Places is national discovery; Toxic Ground is annual site-management/spending history; Property Atlas adds land/buildings/custodians. | Stable federal site/property identifiers, cross-links, years, missing-coordinate records, and distinct inventory/cleanup status meanings. |
| **Scan Receipt / Gov Grade / Gov Tracker Census / Access Receipt** | Reuse capture scheduling, source receipts and owned-site configuration. Keep separate analyses because screenshots, headers, network contacts and accessibility answer different questions. | Different evidence limits and permissions. One top-level score should not conceal them. |
| **ATIP Explorer / Government Memory / ATIP Metrics / ATIP Decisions** | Link one research/request workflow across pages; share institutional identifiers. | Released-record search, record-class discovery, institutional statistics and complaint decisions remain distinct. |
| **Names That Time Forgot / BC Place Names** | Shared name lookup interface with a richer BC-specific history tab, if source identifiers permit. | BC naming decisions and national coverage. A current name match is not proof of historical identity. |
| **Archive recovery tools** | Cross-link Ghost Links, GC Domain Graveyard, Domain Biography and Lost Code; share archive adapters. | Their targets differ: arbitrary URLs, government domains, domain chronology and software repositories. No deletion justified by theme alone. |

## New repositories worth creating

All names below are proposed and not created by this review. Start with **parkready**, **tariffbench**, and **clamcounter**; **basketmath** is the easiest low-maintenance alternative. These ideas fill a different job from the current catalogue.

| Proposed repo | Immediate visitor job | First useful version | Data/access and ongoing work |
| --- | --- | --- | --- |
| **parkready** | “Is this BC park usable for the visit I am planning?” | Search a park; see official closures/advisories, affected facilities, gate/season dates, source time and map; save favourites. Add weather-alert context with its own timestamp. | BC Parks documents an open REST/GraphQL API. Anonymous test requests to `protected-areas` and `public-advisories` returned HTTP 200. No key needed in those tests. Hourly cache, pagination, expiry handling and official links; NS park coverage is a later separately verified source adapter. |
| **tariffbench** | “What does my NAS/PC/heating/EV use cost, and would a different plan help?” | Manual watts/hours and monthly kWh; compare dated BC Hydro and NS Power plans; optional private interval CSV; show annual cost, fixed charges and break-even assumptions. | Official tariff pages/PDFs; no API registration. Rate editions require reviewed updates. NS equipment-specific Time-of-Day and newer pilots must not be treated as universally available plans. Do not require utility account credentials. |
| **clamcounter** | “Where can I buy clams and chips, what portion is listed, and what will my order cost?” | Halifax-area menu comparison with address, whole clams/strips only where expressly stated, portions, sides, pickup hours and seasonal/unknown availability. | Reuse Donair After Dark's integer-price, hours and reviewed-source machinery. Official restaurant menus exist; no key. Manual source review is the ongoing cost. Do not conflate delivery-app prices with counter prices or a listed dish with today's stock. |
| **basketmath** | “Which pack or promotion is the better buy for the amount I need?” | Compare weights/volumes/counts, unit prices, multi-buy rules, coupons, required quantity, wastage and optional user-entered tax. Private saved baskets. | Pure browser arithmetic, no API. Distinct from Price Atlas's statistical averages and Label Compare's nutrition. Start with manual entries; receipt OCR can wait. |
| **calendarrepair** | “Why did my calendar import duplicate events or shift the times?” | Open ICS locally; preview time zones, duplicates, all-day dates, recurrence exceptions and alarms; choose repairs; export a new file with a change report. | RFC 5545 and related updates; IANA time-zone data. No key. Never fetch event attachments or send invitations automatically. Keep unknown properties and distinguish floating times from UTC. |
| **returnledger** | “What am I still waiting for, and when should I act?” | Private purchase/return/warranty tracker with user-entered dates and policy links, receipts stored locally, status notes and calendar export. | No API. Promised dates and seller policy dates are user records, not inferred legal entitlements. No background reminder claim unless an actual reminder system exists. Backups/export matter because browser storage can be cleared. |
| **beachcheck** | “What does the authority currently say about this beach, and when was it sampled?” | Halifax and Lower Mainland directory with official advisory status, latest laboratory samples, units, season status and authority links. | HRM public ArcGIS service returned HTTP 200 and 2,966 records; it has a 2,000-row service limit, so pagination is mandatory. Fraser Health and Metro Vancouver publish separate information. No single cross-province API was established. Never infer “safe/open now” from an old passing sample. |
| **alertlocal** | “Which official weather alerts apply to my places or planned route?” | Saved places, map/route intersections, issue/effective/expiry times, source text and changes between alert editions. | ECCC documents weather alerts through GeoMet OGC API; an anonymous request returned HTTP 200. No key. On-demand or short cached reads; a daily static snapshot is inadequate. This could initially be a module in Park Ready rather than another repo. |

Why not make another shellfish-closure map first? DFO's SHELLI already provides contamination-area information, species selection and notification functions. Its public documentation also distinguishes contamination restrictions from other seasonal/opening rules. A simplistic duplicate adds maintenance and could lose important qualifiers. The current **Clam Grounds** is useful historical/habitat research; link it clearly to the official harvest map and use **Clam Counter** for your separate interest in eating clams.

## Keys and registrations

There is no need to create a broad set of new accounts before choosing the next batch.

| Service | Relevant work | Required action |
| --- | --- | --- |
| BC Parks REST; ECCC GeoMet; HRM public ArcGIS | Park Ready, local weather alerts, Halifax beach sample history | No key was required for the tested endpoints. Implement reasonable caching, pagination and source-status checks. |
| BC Hydro / NS Power tariffs; local-only calculators/ICS | Tariff Bench, Basket Math, Calendar Repair, Return Ledger | No registration. Rate/policy reference material needs versioned review where applicable. |
| TransLink GTFS-Realtime | Transit Receipt's Langley side and further live transit features | A developer key is required. Existing Transit Receipt names the Actions secret `TRANSLINK_API_KEY`. Check whether the existing key already covers the relevant repos; do not put it in public variables or browser JS. The current published terms state 1,000 requests/day; share a collector/cache across tools instead of spending the same key's budget independently. |
| eBird | Broader Hotspot Ledger | A personal API key is required; reuse the existing authorized server-side setup. The API is for recent/summary data, not an unlimited historical archive. Review scope and noncommercial terms before expanding public redistribution. |
| Restaurant menus | Donair After Dark and Clam Counter | No paid Places or menu API needed for a small reviewed collection. Branch coverage and maintenance are the constraint. Optional owner submissions should require review before publication. |
| Paid search/geocoding, map or LLM APIs | None of the first proposed batch | Not needed for these first releases. Avoid a new subscription until a specific missing capability requires it. |

Secrets belong in GitHub Actions secrets or a private server/Worker binding. Public configuration variables are appropriate for nonsecret region lists, polling intervals and feature options.

## Product defects and evidence traps to prioritize

The following are verification targets raised by the review. They are not unverified claims of newly reproduced bugs.

1. **Template-success false positives.** A published page or successful action is insufficient: require nonempty records, expected source/schema, expected routes and useful first input. New tools must have their own task/title, not the template's.
2. **Coverage disguised as breadth.** Put “two hotspots”, “six asteroids”, “four privacy laws”, “selected departures”, or other limits beside the first interaction. Accept arbitrary input when the provider permits it; otherwise treat the app as a bounded exhibit. Broad title search in Law Delta does not create full-text history for every result.
3. **Freshness conflation.** Keep source edition, last successful retrieval, and deployment separate. A successful unchanged check advances check time; an offline rebuild does not. Historical publications can remain useful indefinitely without pretending their observation period is current.
4. **Partial downloads.** Check pagination/record counts and archive content, not HTTP 200 alone. A 200 HTML block page is not CSV. HRM's beach service visibly demonstrates why this matters: 2,966 records versus a 2,000-row page limit.
5. **Replaying historical data as live advice.** Ferry averages are not present crowding, archived camera stills are not current road conditions, habitat is not harvest permission, and a forecast archive is not the present forecast.
6. **Private inputs escaping.** Central visitor/report code must not collect uploaded filenames, DNS queries, domains in private files, request text, coordinates or filter values. API-dependent queries should say which provider receives the query at the action that sends it.
7. **Broad schedule prose that has gone stale.** This review found 20 tool READMEs describing the independent scheduler as “planned”; two also instructed maintainers to edit a manual Worker tool list. Those observed paragraphs were corrected during this integration, linking the maintained watchdog and generated registration procedure. The changes preserve each tool's cadence and guide excerpt, and explicitly separate a generated target from verified adoption by an installed private service. Keep future operating guidance centralized.
8. **Unit and amount semantics.** Preserve missing values; never sum cumulative contract values as new spending, compare an unknown portion as if sizes match, or treat a zero-rows response as “no incidents” after a parser failure.
9. **Collection quota across repos.** Reusing one key in many independently scheduled tools can exceed the provider's budget despite each repo looking modest. TransLink is a concrete case for a shared capture service.
10. **Mobile and low-bandwidth use.** Every map needs a useful list. Load large images/tiles on request; offer compact CSV/JSON exports. This also makes the site more useful on your dial-up and mobile experiments.

## Search and discovery changes worth doing

The repository already has useful search-metadata and lifecycle guidance. Enforce it, then improve the visible task framing. Keep creative names, but pair them with precise titles such as “Halifax donair prices and pickup hours · Donair After Dark” and “Compare BC Hydro and Nova Scotia electricity costs · Tariff Bench”.

For each priority tool, show one plain-language input, one working example, useful results, actual coverage and source time on the first screen. Put sources and explanations beside results where a visitor needs them. Add related-tool links for the next action, not a wall of every loosely related tool.

Keep the “Live tools” / “Install yourself” distinction explicit. A public demo of a private dashboard should be labelled as sample data and link to installation. Do not let a self-hosted DNS or backup dashboard look like a service that uploads a visitor's private data to CoolCode.

Create substantive Field Notes for real problems you solved: comparing your two Wi-Fi/network routes, ordering donairs with a specific sauce size, a 555 transfer under a late-arrival scenario, or following a federal site's cleanup history. Link directly to populated tool states. This gives search visitors both a useful answer and a way to ask their own question.

## Suggested implementation order

1. Finish and validate the three requested integrations and resolve the factual source/schedule failures recorded in the integration audit.
2. Upgrade Donair After Dark, Transfer Window and Recall Radar; add task-based discovery and stronger scope/freshness display.
3. Build Park Ready, Tariff Bench and Clam Counter (or replace one with the lower-maintenance Basket Math).
4. Consolidate Colo Check/Edge Map with preserved routes, then share newspaper and grocery-price engines.
5. Expand ATIP request tracking, nearby facilities and local watchlists. Add Beach Check only once current advisory ingestion is reliable and its seasonal behavior is explicit.

The per-tool appendix below accounts for every starting catalogue entry. It identifies a useful next direction; it is a backlog, not a request to add all features at once. Existing implementations should be checked before each item is selected, because the catalogue and tools continue to evolve.

## Primary source references

Sources were checked during this review. Live endpoint successes establish feasibility at review time, not permanent availability.

- BC Parks API catalogue: https://open.canada.ca/data/en/dataset/fb1c834b-5a59-44f4-8ed9-6585e826f88d ; official OpenAPI: https://raw.githubusercontent.com/bcgov/bcparks.ca/main/infrastructure/kong/public-documentation.json . Read-only test endpoints: https://bcparks.api.gov.bc.ca/api/protected-areas?pagination[pageSize]=1 and https://bcparks.api.gov.bc.ca/api/public-advisories?pagination[pageSize]=1 .
- BC Parks advisories: https://bcparks.ca/active-advisories/ .
- ECCC alert documentation: https://eccc-msc.github.io/open-data/msc-data/alerts/readme_alerts-geomet_en/ ; tested API: https://api.weather.gc.ca/collections/weather-alerts/items?limit=1&f=json .
- BC Hydro plan description and tariff links: https://app.bchydro.com/accounts-billing/rates-energy-use/electricity-rates/residential-rates/time-of-day.html .
- Nova Scotia Power rate eligibility and tariff links: https://www.nspower.ca/your-home/residential-rates .
- HRM Beach Water Quality public service: https://services2.arcgis.com/11XBiaBYA9Ep0yNJ/arcgis/rest/services/Beach_Water_Quality/FeatureServer/1 ; item: https://www.arcgis.com/home/item.html?id=68567ac8da7f49eea4af051d23ce18d7 .
- Fraser Health current beach status: https://www.fraserhealth.ca/health-topics-a-to-z/recreational-water/beach-conditions ; Metro Vancouver samples: https://metrovancouver.org/services/liquid-waste/beaches-and-recreational-water-quality-monitoring .
- DFO SHELLI and scope: https://www.dfo-mpo.gc.ca/shellfish-mollusques/cssp-map-eng.htm ; guide: https://www.dfo-mpo.gc.ca/shellfish-mollusques/guide-eng.htm ; regional rules: https://www.dfo-mpo.gc.ca/fisheries-peches/recreational-recreative/maritimes/faq-eng.html .
- Restaurant source example explicitly listing clams and conditional availability: https://www.unclebuckspizza.com/seafood/ . It is evidence of a source suitable for review, not a claim of current stock or a newly verified counter price.
- Health Canada daily recall data: https://open.canada.ca/data/dataset/d38de914-c94c-429b-8ab1-8776c31643e3 .
- TransLink current GTFS-Realtime endpoint documentation: https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources/gtfs/gtfs-realtime ; terms: https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources/terms-of-use .
- eBird access: https://support.ebird.org/en/support/solutions/articles/48000838205-download-ebird-data ; terms: https://www.birds.cornell.edu/home/ebird-api-terms-of-use/ .
- Calendar format: https://www.rfc-editor.org/info/rfc5545/ ; time-zone maintenance: https://www.iana.org/time-zones/tz-link .

## Appendix: every catalogue entry

### Homelab & archiving

| Tool | Next useful direction |
| --- | --- |
| [Rack Recipes](https://coolcode.ca/rack-recipes/) (`rack-recipes`) | Add user-defined services and validate port/storage collisions; connect the export to Switchboard. |
| [Switchboard](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/switchboard) (`switchboard`) | Import selected Compose service ports and let owners choose local hostnames before saving. |
| [Vhost Logbook](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/logbook) (`logbook`) | Compare matched periods and explain skipped records, bots, status changes and bytes by vhost. |
| [LANWatch](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/lanwatch) (`lanwatch`) | Show outage intervals and distinguish a device failure from a collector gap. |
| [Archive Shelf](https://coolcode.ca/archive-shelf/) (`archive-shelf`) | Improve importing arbitrary searchable collections and source-page citations; keep the historical starter collection. |
| [Waystation](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation) (`waystation`) | Add reproducible crawl scope, retry/revisit controls and an offline completeness report. |
| [Timefold](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold) (`timefold`) | Make importing, backing up and reopening a private evidence timeline easy for nontechnical users. |
| [Tape Index](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index) (`tape-index`) | Detect possible moves by digest and report ambiguities; connect integrity records to Backup Ledger. |
| [Drive Cohort](https://coolcode.ca/drivecohort/) (`drivecohort`) | Save private drive inventories and flag sample-size limits beside fleet comparisons. |
| [Rack Expiry](https://coolcode.ca/rackexpiry/) (`rackexpiry`) | Add upgrade calendar/export and aliases for inventory matching; keep unsupported versions explicitly unknown. |
| [API Archaeology](https://coolcode.ca/apiarchaeology/) (`apiarchaeology`) | Compare a visitor's own OpenAPI files and explain breaking changes with path-level evidence. |
| [Query Plan Lab](https://coolcode.ca/queryplan/) (`queryplan`) | Add guided examples for common slow-query patterns and before/after summaries without pretending to measure runtime. |
| [Package Pulse](https://coolcode.ca/packagepulse/) (`packagepulse`) | Provide a package shortlist comparison and explicit release/maintainer-change dates. |
| [RFC Trail](https://coolcode.ca/rfctrail/) (`rfctrail`) | Let readers save a standards reading list and trace the exact update/obsoletes chain. |
| [Translation Desk](https://coolcode.ca/translationdesk/) (`translationdesk`) | Make offline capability and unavailable language pairs clear before users paste long text. |
| [Diagram Bench](https://coolcode.ca/diagrambench/) (`diagrambench`) | Improve export sizing, accessibility descriptions and reopening editable diagram source. |
| [Compose Diff](https://coolcode.ca/composediff/) (`composediff`) | Flag port exposure, volume and secret-reference changes while keeping all environment values local. |
| [MIME Cabinet](https://coolcode.ca/mimecabinet/) (`mimecabinet`) | Add a batch mismatch report and distinguish a recognized header signature from full file validation. |

### Networks & routing

| Tool | Next useful direction |
| --- | --- |
| [DNS Lens](https://coolcode.ca/dnslens/) (`dnslens`) | Add an email-domain setup checklist and a source-linked provider troubleshooting export. |
| [IP Snapshot](https://coolcode.ca/ipsnapshot/) (`ipsnapshot`) | Add private asset notes and distinguish observed ports from current reachability. |
| [Certificate Trail](https://coolcode.ca/certtrail/) (`certtrail`) | Share certificate parsing with Renewal Board and compare supplied captures without unnecessary live requests. |
| [Domain Biography](https://coolcode.ca/domain-biography/) (`domain-biography`) | Make timeline evidence coverage explicit and connect current renewal/DNS tasks to the other domain tools. |
| [Renewal Board](https://coolcode.ca/renewalboard/) (`renewalboard`) | Prioritize robust domain-list import, unavailable-date handling and calendar reminders. |
| [Route Archaeologist](https://coolcode.ca/routearchaeologist/) (`routearchaeologist`) | Save prefix/ASN presets and show observation gaps around a provider migration. |
| [RPKI Guard](https://coolcode.ca/rpkiguard/) (`rpkiguard`) | Add batch owned-prefix checks and export exact covering-ROA evidence. |
| [Outage Scope](https://coolcode.ca/outagescope/) (`outagescope`) | Let users compare their ASN/location with the region and inspect signal coverage. |
| [Broadband Atlas](https://coolcode.ca/broadbandatlas/) (`broadbandatlas`) | Add address-area edition comparisons; keep reported coverage distinct from service actually orderable at a home. |
| [Telecom Pulse](https://coolcode.ca/telecompulse/) (`telecompulse`) | Link comparable communities and source offers; share coverage ingestion with Broadband Atlas. |
| [Onion Pulse](https://coolcode.ca/onionpulse/) (`onionpulse`) | Improve country/time-window comparisons and show uncertainty and missing-report periods prominently. |
| [Blocked or Gone?](https://coolcode.ca/blockedorgone/) (`blockedorgone`) | Allow a chosen domain/country measurement view with a coverage calendar and explicit no-evidence states. |
| [Packet Detour](https://coolcode.ca/packet-detour/) (`packet-detour`) | Emphasize importing a visitor's own route; link richer current examples to Atlas Canada. |
| [Protocol Cabinet](https://coolcode.ca/protocol-cabinet/) (`protocol-cabinet`) | Use focused entry tasks for HAR, DNS and mail, reusing the specialist parsers rather than duplicating them. |
| [Prefix Diary](https://coolcode.ca/prefixdiary/) (`prefixdiary`) | Add saved exchange/prefix watchlists, change summaries and exact assignment-edition comparisons. |
| [Signal Walk](https://coolcode.ca/signalwalk/) (`signalwalk`) | Make checkpoint alignment/editing easier and provide a redacted shareable comparison report. |
| [Last-Mile Percentile](https://coolcode.ca/lastmilepercentile/) (`lastmilepercentile`) | Add connection/test context and minimum-sample warnings; do not frame percentile as a service guarantee. |
| [Spectrum Explorer](https://coolcode.ca/spectrum-explorer/) (`spectrum-explorer`) | Share frequency/licence ingestion with Spectrum Atlas; preserve the allocation-table explanation. |
| [ASN Canada](https://coolcode.ca/asn-canada/) (`asn-canada`) | Add favourite networks and joined routing/IPv6 visibility history with clear observation dates. |
| [Range Ledger](https://coolcode.ca/rangeledger/) (`rangeledger`) | Offer a saved-IP/prefix watchlist and machine-readable diffs for firewall maintenance. |
| [Grid Dark](https://coolcode.ca/grid-dark/) (`grid-dark`) | Keep as a documented storm case study, with a reusable import workflow if expansion is worthwhile. |
| [GC Subdomain Watch](https://coolcode.ca/gc-subdomain-watch/) (`gc-subdomain-watch`) | Record verified institutional redirects and directory changes without inferring ownership solely from certificates. |
| [IX Ledger](https://coolcode.ca/ix-ledger/) (`ix-ledger`) | Add network watchlists and source-edition comparisons; keep listed interface speed separate from measured capacity. |
| [Boomerang Meter](https://coolcode.ca/boomerang-meter/) (`boomerang-meter`) | Explain confidence for each inferred border crossing and link every hop to the underlying evidence. |
| [Colo Check](https://coolcode.ca/colocheck/) (`colocheck`) | Merge with Edge Map's map/history using one maintained connection-check engine and preserved routes. |
| [Hosted Where](https://coolcode.ca/hosted-where/) (`hosted-where`) | Add source freshness and uncertainty for storage-location claims; distinguish MX gateway from data residency. |
| [Maple Hosting Index](https://coolcode.ca/maplehosting/) (`maplehosting`) | Allow configurable reproducible samples and prevent the 100-domain sample being read as all Canadian hosting. |
| [ISP Report Card](https://coolcode.ca/ispreportcard/) (`ispreportcard`) | Support a user-chosen ASN and show each indicator's sample/date rather than one unexplained grade. |
| [Anycast Compass](https://coolcode.ca/anycastcompass/) (`anycastcompass`) | Add probe/ASN favourites and compare IPv4/IPv6 where source measurements support it. |
| [Radar Scope](https://coolcode.ca/radarscope/) (`radarscope`) | Connect national incidents to relevant network/region detail with clear data aggregation windows. |
| [Status Ledger](https://coolcode.ca/statusledger/) (`statusledger`) | Make provider lists configurable and add a visitor's saved service shortlist with incident change feeds. |
| [Atlas Canada](https://coolcode.ca/atlas-canada/) (`atlas-canada`) | Make traceroute confidence, probe selection and country uncertainty easy to inspect; cross-link Packet Detour. |
| [Edge Map](https://coolcode.ca/edge-map/) (`edge-map`) | Merge into the chosen canonical Colo Check/Edge Map route after retaining maps and opt-in history. |

### Security & forensics

| Tool | Next useful direction |
| --- | --- |
| [Tracker X-Ray](https://coolcode.ca/trackerxray/) (`trackerxray`) | Guide ordinary users from browser HAR export to a private third-party-request comparison. |
| [Header Autopsy](https://coolcode.ca/headerautopsy/) (`headerautopsy`) | Provide a clear compare-two-responses flow and explain policy consequences without an oversimplified safety score. |
| [Mail Path](https://coolcode.ca/mailpath/) (`mailpath`) | Add stable pseudonyms in exported relay timelines and show where authentication results were asserted. |
| [Packet Pocket](https://coolcode.ca/packetpocket/) (`packetpocket`) | Improve private capture redaction/export and warn about metadata that remains in the result. |
| [Dependency X-Ray](https://coolcode.ca/dependencyxray/) (`dependencyxray`) | Prioritize lockfile diffs and exact dependency paths leading to an advisory. |
| [Exploit Graveyard](https://coolcode.ca/exploitgraveyard/) (`exploitgraveyard`) | Share CVE metadata with Patch Signal while retaining the Canadian-notice research view. |
| [Patch Signal](https://coolcode.ca/patchsignal/) (`patchsignal`) | Let users maintain a private remediation queue with evidence and source-change notifications on revisits. |
| [FraudPulse Canada](https://coolcode.ca/fraudpulse/) (`fraudpulse`) | Add scenario-oriented explanations and distinguish reports, victims, losses and police incidents in comparisons. |
| [RegistrarWatch](https://coolcode.ca/registrarwatch/) (`registrarwatch`) | Make denominators and reporting period coverage prominent; allow full-source local imports. |
| [ScamTrace](https://coolcode.ca/scamtrace/) (`scamtrace`) | Offer a personal evidence timeline and report-drafting handoff into Abuse Kit. |
| [AbusePulse](https://coolcode.ca/abusepulse/) (`abusepulse`) | Improve period comparisons without treating changes in reporting volume as measured prevalence. |
| [PhishIntel](https://coolcode.ca/phishintel/) (`phishintel`) | Connect advisory search to the user task of checking a claim or finding the official reporting channel. |
| [Gov Tracker Census](https://coolcode.ca/govtrackercensus/) (`govtrackercensus`) | Share capture infrastructure with Scan Receipt; show request evidence without inferring undisclosed tracking purposes. |
| [Maple Phish](https://coolcode.ca/maplephish/) (`maplephish`) | Keep feed definitions separate and make evidence age/false-positive limitations visible at individual results. |
| [Shield Check](https://coolcode.ca/shieldcheck/) (`shieldcheck`) | Add stable saved test sets and protocol/family context; distinguish blocking from DNS transport failure. |
| [Scan Receipt](https://coolcode.ca/scanreceipt/) (`scanreceipt`) | Make owned-site comparison and public/private export choices easier; reuse capture config across the audit suite. |
| [Gov Grade](https://coolcode.ca/govgrade/) (`govgrade`) | Explain what each header/TLS observation establishes and retain explicit government coverage notes. |
| [Password Exposure Check](https://coolcode.ca/pwncheck-kanon/) (`pwncheck-kanon`) | Keep the one-task flow small; improve offline/error explanation and ensure no local password persistence. |
| [Malware Lineage](https://coolcode.ca/malwarelineage/) (`malwarelineage`) | Improve provider-evidence comparison and hashes/URL redaction without serving malware samples. |
| [Access Receipt](https://coolcode.ca/accessreceipt/) (`accessreceipt`) | Add a concise fix-priority view and demonstrate keyboard checks that automated scans do not cover. |
| [PDF Signing Lab](https://github.com/jsdyer/pdfsigning) (`pdfsigning`) | Offer a clearly labelled browser guide/demo and explain integrity versus trusted identity before installation. |
| [Takedown Watcher](https://coolcode.ca/takedown-watcher/) (`takedown-watcher`) | Add saved-case comparisons and distinguish disappearance, transient failure and verified enforcement. |
| [Abuse Kit](https://coolcode.ca/abuse-kit/) (`abuse-kit`) | Make evidence attachments/redaction and recipient provenance easy; never auto-send a report. |

### Government & public records

| Tool | Next useful direction |
| --- | --- |
| [ATIP Records Explorer](https://coolcode.ca/atip/) (`atip`) | Add a private copy-request ledger and source-linked follow-up list alongside discovery. |
| [Government Memory Map](https://coolcode.ca/governmentmemory/) (`governmentmemory`) | Save record classes across institutions into one request-drafting notebook. |
| [The Briefing Room](https://coolcode.ca/briefings/) (`briefings`) | Add topic/department watchlists and links from matching released-record summaries. |
| [Evidence Lab](https://coolcode.ca/evidencelab/) (`evidencelab`) | Prioritize larger local PDFs, useful page citations and exportable research notes; show scanned-text limitations. |
| [The ATIP Popularity Index](https://coolcode.ca/atippopularity/) (`atippopularity`) | Connect high-interest package rows directly to available copy-request steps. |
| [ATIP Metrics](https://coolcode.ca/atipmetrics/) (`atipmetrics`) | Show reconciled workload changes and comparable reporting coverage rather than a simplistic department ranking. |
| [What the Minister Was Prepared to Say](https://coolcode.ca/ministersays/) (`ministersays`) | Add topic histories and exact text changes across prepared responses with matched source dates. |
| [The Government’s Wrongdoing Files](https://coolcode.ca/wrongdoings/) (`wrongdoings`) | Trace recommendations to dated corrective-action evidence, preserving unknown follow-up states. |
| [Algorithm Watch](https://coolcode.ca/algorithmwatch/) (`algorithmwatch`) | Track registry entry changes and whether a linked assessment is actually matched to the same system. |
| [The Government Dataset Explorer](https://coolcode.ca/datasetexplorer/) (`datasetexplorer`) | Add local resource watchlists, licence/format filters and visible recent download-check results. |
| [The Open Data Graveyard](https://coolcode.ca/opendatagraveyard/) (`opendatagraveyard`) | Allow documented successor links and evidence notes rather than treating every removed entry as lost data. |
| [Canada.ca Pulse](https://coolcode.ca/canadaanalytics/) (`canadaanalytics`) | Add per-series explanatory context and common-period comparisons for changes in usage. |
| [Salmon Lines](https://coolcode.ca/salmonlines/) (`salmonlines`) | Support waterbody favourites and method-consistent comparisons; avoid treating all estimates as interchangeable counts. |
| [Dataset Diff](https://coolcode.ca/datasetdiff/) (`datasetdiff`) | Add reusable column/ID mappings, duplicate-key review and a human-readable change export. |
| [Crossing Record](https://coolcode.ca/crossingrecord/) (`crossingrecord`) | Expose before/after period choice and road-work evidence without causal accident-reduction claims. |
| [Park Visits](https://coolcode.ca/parkvisits/) (`parkvisits`) | Add favourite parks and compare only matched reporting cohorts when calculating aggregate change. |
| [Aurora Trace](https://coolcode.ca/auroratrace/) (`auroratrace`) | Keep the two-storm teaching case clear; offer own-event/station input only with a reliable data adapter. |
| [Mass Peaks](https://coolcode.ca/masspeaks/) (`masspeaks`) | Improve the guided statistical exercise and export; keep it labelled as an educational sample. |
| [Committee Receipt](https://coolcode.ca/committeereceipt/) (`committeereceipt`) | Expand configurable hearing/question collections and preserve question-to-answer citations. |
| [Paper Cheque Trail](https://coolcode.ca/paperchequetrail/) (`paperchequetrail`) | Add program favourites and explain counts versus values and changing program definitions. |
| [Same Flight](https://coolcode.ca/sameflight/) (`sameflight`) | Make importing a filtered CTA export the main expansion path; retain departure and decision identifiers. |
| [Census Lens](https://coolcode.ca/census-lens/) (`census-lens`) | Prioritize reliable source editions and comparisons with denominators, geography type and suppression labels. |
| [CCTS Ledger](https://coolcode.ca/ccts-ledger/) (`ccts-ledger`) | Add provider-name continuity and reporting-period notes; link a complaint-preparation checklist to official guidance. |
| [PIPEDA Findings](https://coolcode.ca/pipeda-findings/) (`pipeda-findings`) | Add issue/institution research collections with citations, preserving decision and publication dates separately. |
| [Grid Receipt](https://coolcode.ca/gridreceipt/) (`gridreceipt`) | Show forecast-error coverage and matching hours; retain it as an Ontario specialist tool. |
| [ATIP Decision Lens](https://coolcode.ca/atipdecisions/) (`atipdecisions`) | Join institution identifiers to the ATIP workflow and provide source-cited saved research collections. |
| [Order in Council Diary](https://coolcode.ca/oicdiary/) (`oicdiary`) | Add saved departments/topics and explicit new/changed-document views. |
| [Law Delta](https://coolcode.ca/lawdelta/) (`lawdelta`) | Expand the watched full-text law list deliberately; separate title catalogue reach from comparison coverage. |
| [Government Data Gap Detector](https://coolcode.ca/govdatagaps/) (`govdatagaps`) | Let researchers maintain their own explicit dataset watchlists and inspect download/provenance failures. |
| [Research Ledger](https://coolcode.ca/researchledger/) (`researchledger`) | Add saved topic queries and bibliographic exports; distinguish research metadata from full-text availability. |
| [Civic Lookup](https://coolcode.ca/civiclookup/) (`civiclookup`) | Make address/postal uncertainty and boundary dates clear; provide printable representative contact results. |

### Public disclosures

| Tool | Next useful direction |
| --- | --- |
| [Corporate Ghosts](https://coolcode.ca/corporateghosts/) (`corporateghosts`) | Show jurisdiction/scope beside each result and preserve registration-number identity in saved comparisons. |
| [Lobby Trail](https://coolcode.ca/lobbytrail/) (`lobbytrail`) | Prioritize reliable ingestion and search by organization/institution over broad unsupported completeness claims. |
| [Charity Flows](https://coolcode.ca/charityflows/) (`charityflows`) | Add charity-number watchlists and compare source-consistent years and recipient identifiers. |
| [Tariff X-Ray](https://coolcode.ca/tariffxray/) (`tariffxray`) | Add a dated wholesale cost scenario calculator; do not market wholesale rates as retail offers. |
| [Gear Autopsy](https://coolcode.ca/gearautopsy/) (`gearautopsy`) | Allow exact FCC-ID lookup/import beyond reviewed examples and explain which exhibits are withheld. |
| [Recall Radar](https://coolcode.ca/recallradar/) (`recallradar`) | Build structured household product/vehicle lists and changed-notice matching on top of saved search terms. |
| [Patent Attic](https://coolcode.ca/patentattic/) (`patentattic`) | Improve arbitrary identifier/title research and original-page navigation, retaining sample coverage labels. |
| [Spill Ledger](https://coolcode.ca/spillledger/) (`spillledger`) | Expand annual editions and reconcile recurring case IDs and cumulative recoveries. |
| [Bridge Ledger](https://coolcode.ca/bridgeledger/) (`bridgeledger`) | Make inspection age and historical coverage central; do not imply current structural safety. |
| [Dispatch Ledger](https://coolcode.ca/dispatchledger/) (`dispatchledger`) | Improve comparable agency/time-period views and distinguish requests, incidents and reported offences. |
| [Cloud Ledger](https://coolcode.ca/cloud-ledger/) (`cloud-ledger`) | Share contract ingestion with Contract Patterns and retain its longer vendor-focused historical view. |
| [Contract Patterns](https://coolcode.ca/contractpatterns/) (`contractpatterns`) | Add a vendor/lens system and broader retained history while preserving amendment/award semantics. |
| [Donation Radar](https://coolcode.ca/donationradar/) (`donationradar`) | Improve return-version diffs and source identity evidence; do not merge donors by name alone. |
| [Sanctions Ledger](https://coolcode.ca/sanctionsledger/) (`sanctionsledger`) | Add exact source-entry watches and change exports; keep this a research aid rather than an identity clearance service. |

### Maps, trails & history

| Tool | Next useful direction |
| --- | --- |
| [Trailglass](https://coolcode.ca/trailglass/) (`trailglass`) | Prioritize route import usability, elevation gaps and clearly optional terrain lookups. |
| [Weather Archive](https://coolcode.ca/weatherarchive/) (`weatherarchive`) | Add station-quality/continuity context and save common comparisons with exact source coverage. |
| [Spectrum Atlas](https://coolcode.ca/spectrumatlas/) (`spectrumatlas`) | Improve nearby-site/frequency workflows and share technical extracts with Spectrum Explorer. |
| [Shipwreck Explorer](https://coolcode.ca/shipwrecks/) (`shipwrecks`) | Expand original records by region and give users a useful location/date research path. |
| [Forgotten Places](https://coolcode.ca/forgottenplaces/) (`forgottenplaces`) | Add nearby walking collections and distinguish designation dates from construction/occupation dates. |
| [Names That Time Forgot](https://coolcode.ca/namesforget/) (`namesforget`) | Share place-name lookup with BC Place Names while keeping national and underwater coverage. |
| [BC Place Names Explorer](https://coolcode.ca/bcplacenames/) (`bcplacenames`) | Build a naming-history timeline from linked provincial records and map nearby related names. |
| [Hidden Water](https://coolcode.ca/hiddenwater/) (`hiddenwater`) | Expand beyond one documented repair case with linked culvert/assessment records and visible coverage. |
| [Halifax Time Lens](https://coolcode.ca/halifaxtimelens/) (`halifaxtimelens`) | Add more verified dates, place search, a strong compare slider and source-resolution labels. |
| [Langley Changes](https://coolcode.ca/langleychanges/) (`langleychanges`) | Add neighbourhood/radius watchlists and public application timelines with explicit City/Township scope. |
| [Langley Trades](https://coolcode.ca/langleytrades/) (`langleytrades`) | Improve practical trade/location search and licence status; do not treat an appearance as a quality recommendation. |
| [Highway Frame](https://coolcode.ca/highwayframe/) (`highwayframe`) | Add favourite highway camera groups and source-age visibility; integrate relevant Road Pulse incidents. |
| [Violation Sheet](https://coolcode.ca/violationsheet/) (`violationsheet`) | Show rate denominators and reporting changes clearly; avoid neighbourhood risk inference from broad police-service data. |
| [Strange Skies Canada](https://coolcode.ca/strangeskies/) (`strangeskies`) | Improve location/date search and connect related occurrences only through recorded identifiers. |
| [Lightkeeper](https://coolcode.ca/lightkeeper/) (`lightkeeper`) | Add nearby-light search and recorded-signal matching, preserving published navigation-source warnings. |
| [Storm Tracks](https://coolcode.ca/stormtracks/) (`stormtracks`) | Let users select gauges/storms where reliable data exists and inspect tide/surge alignment. |
| [Clam Grounds](https://coolcode.ca/clamground/) (`clamground`) | Keep habitat/history as research; prominently link official closures and add Clam Counter as a separate food task. |
| [Ferry Counts](https://coolcode.ca/ferrycountss/) (`ferrycountss`) | Share ferry passenger transforms with SeaBus Clock; retain the cross-coast comparison and matched hours. |
| [Well Layers](https://coolcode.ca/welllayers/) (`welllayers`) | Expand exact well-location/log search and source datum/coverage details without claiming drinking-water suitability. |
| [Camp Calendar](https://coolcode.ca/campcalendar/) (`campcalendar`) | Expose park/year/equipment comparisons and distinguish past booking behaviour from current availability. |
| [Snow Courses](https://coolcode.ca/snowcourses/) (`snowcourses`) | Add station favourites and seasonal percentile views with completeness thresholds. |
| [Coal Below](https://coolcode.ca/coalbelow/) (`coalbelow`) | Improve source-plan access and uncertainty of historic workings; avoid parcel-specific stability conclusions. |
| [Ice Weeks](https://coolcode.ca/iceweeks/) (`iceweeks`) | Add date comparison presets and explain concentration legend/source scale beside the map. |
| [Ferry Record](https://coolcode.ca/ferryrecord/) (`ferryrecord`) | Prioritize route-specific service history and distinguish published quarterly operations from live sailing status. |
| [Schoolhouse Ledger](https://coolcode.ca/schoolhouseledger/) (`schoolhouseledger`) | Keep as a strong historical exhibit with more original-page comparisons and locality search. |
| [Library Workbench](https://coolcode.ca/libraryworkbench/) (`libraryworkbench`) | Expand task-first equipment/eligibility search across Halifax, Vancouver, Richmond and Langley. |
| [Shopfront Diary](https://coolcode.ca/shopfrontdiary/) (`shopfrontdiary`) | Add address normalization review and more matched directory years without inventing business continuity. |
| [Transfer Window](https://coolcode.ca/transferwindow/) (`transferwindow`) | Generalize route/interchange/date/walk-time selection; retain route 555 as an immediate preset. |
| [SeaBus Clock](https://coolcode.ca/seabusclock/) (`seabusclock`) | Share passenger ingestion with Ferry Counts and separate survey patterns from today's timetable. |
| [Streetwork Diary](https://coolcode.ca/streetworkdiary/) (`streetworkdiary`) | Track request cohorts through closure with age/censoring shown; expand neighbourhood queries. |
| [Route Mirror](https://coolcode.ca/routemirror/) (`routemirror`) | Improve arbitrary route selection and service-year comparisons; avoid representing historic loads as live occupancy. |
| [Postmark Places](https://coolcode.ca/postmarkplaces/) (`postmarkplaces`) | Expand searchable original post-office records and dated route evidence. |
| [Lake Profiles](https://coolcode.ca/lakeprofiles/) (`lakeprofiles`) | Make station/depth/time comparisons easy and distinguish sampled profiles from swimming advisories. |
| [Forecast Receipt](https://coolcode.ca/forecastreceipt/) (`forecastreceipt`) | Expand user-selected places/providers only after reliable matched forecast/observation capture is established. |
| [Fossil Neighbours](https://coolcode.ca/fossilneighbours/) (`fossilneighbours`) | Add formation/locality input and explain locality precision and collection-level evidence. |
| [Air Pair](https://coolcode.ca/airpair/) (`airpair`) | Provide a simple local-station view before model comparisons; keep model and observation times unmistakable. |
| [Plume Diary](https://coolcode.ca/plumediary/) (`plumediary`) | Offer more paired satellite dates with cloud/flow-quality filters and user-controlled comparison. |
| [Quake Echo](https://coolcode.ca/quakeecho/) (`quakeecho`) | Allow current or user-selected events where source links can be matched, keeping agency differences visible. |
| [Donair After Dark](https://coolcode.ca/donairafterdark/) (`donairafterdark`) | Expand reviewed branches, hours and portion descriptions; reuse the engine for Clam Counter. |
| [Last Refill](https://coolcode.ca/lastrefill/) (`lastrefill`) | Share nearby-facility/GPX components with Restroom Reach and report access-aware route gaps. |
| [Federal Property Atlas](https://coolcode.ca/federal-property-atlas/) (`federal-property-atlas`) | Cross-link exact property/site identifiers to Contaminated Places, Toxic Ground and Surplus Crown. |
| [Toxic Ground](https://coolcode.ca/toxic-ground/) (`toxic-ground`) | Retain annual cleanup/spending drilldowns behind national Contaminated Places search results. |
| [Surplus Crown](https://coolcode.ca/surplus-crown/) (`surplus-crown`) | Make active listing versus historic disposal explicit and show source-review dates prominently. |
| [Transit Receipt](https://coolcode.ca/transitreceipt/) (`transitreceipt`) | Generalize stop selection and share real-time captures across tools within provider quotas. |
| [Tide Receipt](https://coolcode.ca/tidereceipt/) (`tidereceipt`) | Expand configurable stations and show matched reading coverage and official prediction provenance. |
| [Border Pulse](https://coolcode.ca/borderpulse/) (`borderpulse`) | Keep source age and direction prominent; allow crossing favourites and unknown-delay states. |
| [Mushroom Calendar](https://coolcode.ca/mushroomcalendar/) (`mushroomcalendar`) | Expand user-selected regions/species with observation-quality and sensitive-location protections. |
| [Dawn Chorus](https://coolcode.ca/dawnchorus/) (`dawnchorus`) | Expand selectable species/regions while preserving each recording's licence and exact provenance. |
| [Museum Drawer](https://coolcode.ca/museumdrawer/) (`museumdrawer`) | Allow locality/collection search and make historical versus modern sampling effort visible. |
| [Hotspot Ledger](https://coolcode.ca/hotspotledger/) (`hotspotledger`) | Add a maintained region/hotspot picker and saved favourites while retaining recent-data scope. |
| [Marine Names](https://coolcode.ca/marinenames/) (`marinenames`) | Improve common/scientific name resolution and ambiguity display; connect relevant clam species records. |
| [Road Pulse](https://coolcode.ca/roadpulse/) (`roadpulse`) | Add route/favourite filters and camera links; never infer reopening solely from a vanished incident. |
| [River Pulse](https://coolcode.ca/riverpulse/) (`riverpulse`) | Add gauge favourites and threshold annotations with source units, gaps and uncertainty. |
| [Dock Diary](https://coolcode.ca/dockdiary/) (`dockdiary`) | Add favourite networks/stations and useful nearby availability views with distinct live versus captured status. |
| [Buoy Bench](https://coolcode.ca/buoybench/) (`buoybench`) | Add station favourites and observation/forecast comparison without implying navigational certification. |
| [Charge Gaps](https://coolcode.ca/chargegaps/) (`chargegaps`) | Add connector/access/power filters and route-distance support; straight-line gaps are only a first approximation. |
| [Magnetic North](https://coolcode.ca/magneticnorth/) (`magneticnorth`) | Keep a focused bearing converter with model validity/date warnings and printable results. |
| [Restroom Reach](https://coolcode.ca/restroomreach/) (`restroomreach`) | Prioritize source reliability, known hours/access fields and shared GPX support with Last Refill. |
| [Holiday Clock](https://coolcode.ca/holidayclock/) (`holidayclock`) | Add user-defined calendars and exportable assumptions; avoid conflating holidays with individual employment entitlement. |
| [Fleet Sheet](https://coolcode.ca/translink/) (`translink`) | Make route/stop favourites and stale-feed handling practical; reuse one collector with Transit Receipt. |

### Sky & photography

| Tool | Next useful direction |
| --- | --- |
| [Nightfinder](https://coolcode.ca/nightfinder/) (`nightfinder`) | Improve saved places, target presets and mobile planning; combine weather only when its timestamp is clear. |
| [Satellite Pass](https://coolcode.ca/satpasses/) (`satpasses`) | Add element-age warnings and distinguish geometrical from likely visible passes. |
| [Sky Archive Explorer](https://coolcode.ca/skyarchive/) (`skyarchive`) | Expand beyond five targets with direct MAST search and clear image rights/provenance. |
| [NASA Overhead](https://coolcode.ca/nasa/) (`nasa`) | Make place/date customization easy and keep each NASA/NOAA source's refresh and validity separate. |
| [Photo Lab](https://coolcode.ca/photolab/) (`photolab`) | Prioritize a guided sanitized-copy workflow, target file size and verifiable batch exports. |
| [Otherworld Names](https://coolcode.ca/otherworldnames/) (`otherworldnames`) | Improve arbitrary feature/name search and retain ephemeris/source precision limits for observing plans. |
| [Sun Ledger](https://coolcode.ca/sunledger/) (`sunledger`) | Add a location picker and export; do not equate gridded solar energy with roof-specific generation. |
| [Planet Papers](https://coolcode.ca/planetpapers/) (`planetpapers`) | Improve planet selection and side-by-side measurement provenance and uncertainty. |
| [Flyby Files](https://coolcode.ca/flybyfiles/) (`flybyfiles`) | Turn the selected six encounters into expandable search if reliable discovery-history fields support it. |
| [Chirp Room](https://coolcode.ca/chirproom/) (`chirproom`) | Keep the educational detector exercise clear and add controlled parameters with transparent filtering. |
| [Tide & Dark](https://coolcode.ca/tide-and-dark/) (`tide-and-dark`) | Add more validated station constants and conspicuous modeled-versus-official tide labels. |
| [Launch Ledger](https://coolcode.ca/launchledger/) (`launchledger`) | Add saved provider/site watchlists and calendar exports that update without duplicating launches. |
| [Plate Solve Lab](https://coolcode.ca/platesolvelab/) (`platesolvelab`) | Make local receipt import primary and clearly require an explicit action before photo submission. |
| [Orbital Census](https://coolcode.ca/orbitalcensus/) (`orbitalcensus`) | Add object watchlists and source-edition comparisons; link pass planning to Satellite Pass. |
| [Flight Weather](https://coolcode.ca/flightweather/) (`flightweather`) | Add airport/route favourites and forecast-validity matching; keep it clearly a weather evidence tool. |
| [Fireball Ledger](https://coolcode.ca/fireballledger/) (`fireballledger`) | Improve arbitrary location/date filters and reporting-bias explanations. |

### Money & markets

| Tool | Next useful direction |
| --- | --- |
| [BankRate Lab](https://coolcode.ca/bankrates/) (`bankrates`) | Add saved series combinations and transparent percent/basis-point change calculations. |
| [Canadian Price Atlas](https://coolcode.ca/priceatlas/) (`priceatlas`) | Share modern retail-price ingestion with Pantry Prices; retain broad product and unit comparison. |
| [Insolvency Atlas](https://coolcode.ca/insolvencyatlas/) (`insolvencyatlas`) | Improve province/period comparison and show denominators and source revisions. |
| [Market Shadows](https://coolcode.ca/marketshadows/) (`marketshadows`) | Guide users through accepted CIRO file formats and distinguish short trades from outstanding short positions. |
| [Pantry Prices](https://coolcode.ca/pantryprices/) (`pantryprices`) | Share modern data with Price Atlas and preserve historical-method boundaries and basket completeness. |
| [Meter Math](https://coolcode.ca/metermath/) (`metermath`) | Add arrival/departure scenarios and walking radius; explain posted restrictions and source review dates. |
| [Inflation Basket](https://coolcode.ca/inflation-basket/) (`inflation-basket`) | Add reusable local spending profiles and explain fixed-weight comparisons and missing category coverage. |
| [Housing Pulse](https://coolcode.ca/housing-pulse/) (`housing-pulse`) | Make asking versus paid rent and vacancy/construction series distinct; add saved communities. |
| [Release Receipt](https://coolcode.ca/releasereceipt/) (`releasereceipt`) | Keep the revision-history focus and allow series expansion only with authentic archived editions. |
| [Policy Rate Scorecard](https://coolcode.ca/scorecard/) (`scorecard`) | Add forecast distribution/range context and keep survey publication dates separate from decision dates. |
| [Export Neighbours](https://coolcode.ca/exportneighbours/) (`exportneighbours`) | Add product/province favourites and clear nominal-value versus volume distinctions. |
| [Metro Economy](https://coolcode.ca/metroeconomy/) (`metroeconomy`) | Add saved metro comparisons and show rolling-average, seasonal adjustment and revision limits. |
| [Filing Delta](https://coolcode.ca/filingdelta/) (`filingdelta`) | Let users configure company watchlists and compare matched fiscal periods with original filing links. |
| [FX Receipt](https://coolcode.ca/fxreceipt/) (`fxreceipt`) | Add explicit issuer fee/markup inputs and distinguish reference-rate comparisons from settlement amounts. |
| [Label Compare](https://coolcode.ca/labelcompare/) (`labelcompare`) | Support manual labels when barcodes are missing and make unknown allergen information unambiguous. |
| [RTR Sandbox Explorer](https://github.com/jsdyer/payments) (`payments`) | Keep clearly installable sandbox education; add redacted replay fixtures and provider-specific validation. |

### Media, events & the old web

| Tool | Next useful direction |
| --- | --- |
| [Event Radar](https://coolcode.ca/eventradar/) (`eventradar`) | Expand reliable Langley sources and favourites; validate cancellation/timezone/calendar-update behavior. |
| [Atlantic Dial](https://coolcode.ca/atlanticdial/) (`atlanticdial`) | Add favourite shows/stations and recurring schedule exceptions without claiming every listed stream is live. |
| [Screen Radar](https://coolcode.ca/screenradar/) (`screenradar`) | Improve regional availability links and avoid suggesting catalogue metadata proves a title can be streamed. |
| [Media Echoes](https://coolcode.ca/mediaechoes/) (`mediaechoes`) | Improve arbitrary query refinement, playable-format filters and source rights/availability signals. |
| [Ghost Links](https://coolcode.ca/ghostlinks/) (`ghostlinks`) | Share archive lookup with Domain Biography and GC Domain Graveyard while retaining arbitrary URL recovery. |
| [Lost Code](https://coolcode.ca/lostcode/) (`lostcode`) | Improve exact repository-origin lookup and explain archive coverage versus a complete working checkout. |
| [The Unreleased Worlds Index](https://coolcode.ca/unreleased/) (`unreleased`) | Make local-export import frictionless and show funding records separately from confirmed release outcomes. |
| [Aircheck Diary](https://coolcode.ca/aircheckdiary/) (`aircheckdiary`) | Expand station/date coverage and keep broadcast records distinct from legal online viewing availability. |
| [CanCon Atlas](https://coolcode.ca/cancon-atlas/) (`cancon-atlas`) | Improve arbitrary recording/artist search and compare source decisions without conflating similarly named releases. |
| [FreeNet Echo](https://coolcode.ca/freenet-echo/) (`freenet-echo`) | Keep the community-network historical exhibit; link current service instructions only after review. |
| [GC Domain Graveyard](https://coolcode.ca/gc-domain-graveyard/) (`gc-domain-graveyard`) | Expand verified former-domain aliases and preserve original archive timestamps and successor evidence. |
| [Art Timeline](https://coolcode.ca/arttimeline/) (`arttimeline`) | Add reusable saved collections and rights-aware exports; preserve both museums' source identifiers. |
| [Headline Vault](https://coolcode.ca/headlinevault/) (`headlinevault`) | Share one newspaper search engine with Old News Oddities and retain robust source-linked research trails. |
| [Old News Oddities](https://coolcode.ca/oldnews-oddities/) (`oldnews-oddities`) | Become curated search shelves in the shared newspaper engine while preserving indexed landing routes. |
| [Stream Atlas](https://coolcode.ca/streamatlas/) (`streamatlas`) | Add saved station lists, explicit broken-stream reporting and original stream attribution. |
| [Book Graveyard](https://coolcode.ca/bookgraveyard/) (`bookgraveyard`) | Improve edition matching and readable-copy links; distinguish metadata availability from full-text access. |
| [Format Shift](https://coolcode.ca/formatshift/) (`formatshift`) | Make release-group versus release distinctions explicit and allow user-saved edition comparisons. |
| [Ephemera Atlas](https://coolcode.ca/ephemeraatlas/) (`ephemeraatlas`) | Expand well-licensed archives and date/place search; label the age and scope of the NYPL seed metadata. |
| [Commons Lens](https://coolcode.ca/commonslens/) (`commonslens`) | Make attribution copying and licence-version checks prominent; respect original file and creator links. |
| [Word Weave](https://coolcode.ca/wordweave/) (`wordweave`) | Keep text cleanup private and add clear copy/export flows; separate live word queries from local processing. |
| [Retro Screensavers](https://github.com/jsdyer/screensaver) (`screensaver`) | Keep install instructions, signed/reproducible-build status and uninstall steps easy to find. |

### Three additions requested in this task

| Tool | Product direction after integration |
| --- | --- |
| Contaminated Places | National search/filter/map entry point; stable site links into Toxic Ground fiscal history and Federal Property Atlas. |
| Query Confessional | Private dnsmasq device/domain troubleshooting, explicit log coverage and trustworthy counts; public sample data only for any demo. |
| Backup Ledger | Private restic snapshot inventory with age thresholds and separately recorded integrity-check outcomes; useful unknown/not-checked states. |
