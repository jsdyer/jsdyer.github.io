# CoolCode.ca

[CoolCode.ca](https://coolcode.ca/) is a collection of browser tools and installable
projects for networking, public-data research, archiving and home labs.
This repository contains the homepage, several browser tools, and the installable
projects under `tools/`. Most other tools have their own repositories.

The **catalogue** is simply the homepage's directory of tools: their names,
descriptions, categories, requirements and links. The complete list lives in
[data/tools.json](data/tools.json) and is displayed on [the website](https://coolcode.ca/).
Adding a listing does not copy, install or run that tool in this repository.

Jump to: [Tools](#find-a-tool) · [Repository map](#where-the-code-lives) ·
[Publishing](#how-the-homepage-is-built-and-published) · [Checks](#what-the-checks-mean) ·
[Dependabot](#dependabot-proposed-updates-and-what-to-do-with-them) ·
[Development container](#what-the-development-container-is-for) · [Adding tools](#add-or-maintain-a-tool)

## Find a tool

The [homepage](https://coolcode.ca/) shows what each tool does, where its data comes
from and any published dates or counts. This directory adds a practical detail from
each tool’s own README. Follow **Source & docs** or the installation guide for the
full instructions. A scheduled check imports updated guide notes every six hours.
The [adding and updating guide](docs/adding-tools.md) covers changes to either listing.

### Use in your browser

These tools open immediately without installing a server or command-line program.
A tool that asks you to select a local file is still a browser tool.

<!-- BEGIN BROWSER_TOOLS -->

71 browser tools, grouped as on the homepage.

#### Homelab &amp; archiving

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Rack Recipes](<https://coolcode.ca/rack-recipes/>) | Plan a home server stack and export a Docker Compose starter. <br> Local inputs · Compose recipes are generated in your browser from your selected services. RAM figures are planning allowances for light use. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/rack-recipes>) |
| [Archive Shelf](<https://coolcode.ca/archive-shelf/>) | Search historical newsletters by page or index a private collection on Linux. <br> Reference collection · The browser edition uses a three-page fictional newsletter to demonstrate the archive. Try “dial-up” to find the matching newsletter page. The Linux edition can build the same kind of searchable shelf from your own PDFs and text files. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/archive-shelf>) |

#### Networks &amp; routing

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [DNS Lens](<https://coolcode.ca/dnslens/>) | Compare public resolvers and inspect DNS records, mail policies and registration. <br> On-demand lookup · Each lookup requests current DNS records and domain registration data from public services. The DNSSEC AD flag represents what the selected validating resolver reported. | [Source &amp; docs](<https://github.com/jsdyer/dnslens>) |
| [IP Snapshot](<https://coolcode.ca/ipsnapshot/>) | See ports, hostnames and vulnerability identifiers from passive InternetDB observations. <br> On-demand lookup · Shodan InternetDB returns observations for one public IP without observation dates. Ports, fingerprints and CVEs describe source observations and associations, with coverage and freshness varying by address. | [Source &amp; docs](<https://github.com/jsdyer/ipsnapshot>) |
| [Certificate Trail](<https://coolcode.ca/certtrail/>) | Trace issued certificates, names, issuers and dates across certificate transparency logs. <br> Multiple data sources · Certificate records come from a live crt.sh search or a JSON file you import. A validity-start-year timeline, name and issuer filters, deduplicated certificate records, name counts and a filtered CSV export help make historical results readable. | [Source &amp; docs](<https://github.com/jsdyer/certtrail>) |
| [Route Archaeologist](<https://coolcode.ca/routearchaeologist/>) | Trace observed BGP origins by IP prefix or ASN. <br> On-demand lookup · RIPEstat supplies historical route observations for your selected dates. The app compares observed origins and visibility and exports the selected prefix's intervals as CSV. | [Source &amp; docs](<https://github.com/jsdyer/routearchaeologist>) |
| [RPKI Guard](<https://coolcode.ca/rpkiguard/>) | Check whether a route origin ASN and prefix are authorized by published ROAs. <br> On-demand lookup · RIPEstat checks the submitted prefix and origin ASN on demand. Shared links populate the query without transmitting it until the user selects Validate. | [Source &amp; docs](<https://github.com/jsdyer/rpkiguard>) |
| [Outage Scope](<https://coolcode.ca/outagescope/>) | Explore network disruptions and compare the measurement signals behind them. <br> On-demand lookup · Georgia Tech IODA supplies outage signals for a window of up to 30 days. One disruption can affect several signals, and there can be gaps and uneven coverage. | [Source &amp; docs](<https://github.com/jsdyer/outagescope>) |
| [Broadband Atlas](<https://coolcode.ca/broadbandatlas/>) | Explore reported coverage, funding and nearby radio licences, with provincial plan prices. <br> Saved dataset · ISED maps broadband coverage and funded projects across Canada’s provinces and territories. Search by community, coordinates or hexagon ID, inspect individual cells, combine filters, and export matching records. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · Coverage file date: 2026-05-05 · 13 provinces and territories | [Source &amp; docs](<https://github.com/jsdyer/broadbandatlas>) |
| [Telecom Pulse](<https://coolcode.ca/telecompulse/>) | Compare the CRTC’s published telecommunications indicators over time. <br> Saved dataset · CRTC survey data show coverage by census area and prices by province and survey market. Broadband uses usual resident dwellings and mobile uses population. <br> Scheduled checks: weekly · Snapshot generated: 2026-11-17 · 6,634 coverage areas | [Source &amp; docs](<https://github.com/jsdyer/telecompulse>) |
| [Onion Pulse](<https://coolcode.ca/onionpulse/>) | Compare Tor user, relay, bridge and onion-service measurements. <br> Saved dataset · Tor Project measurements show daily network activity from January 2021 onward. Directory counts, measurement coverage, and client behaviour can affect the series. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · 2,144 calendar days | [Source &amp; docs](<https://github.com/jsdyer/onionpulse>) |
| [Blocked or Gone?](<https://coolcode.ca/blockedorgone/>) | Investigate interference and test coverage in public OONI measurements. <br> Saved dataset · OONI case studies supply the historical measurements, and a daily check updates the Canadian Discord example. The lookup form opens a source search for any domain and an optional country or UTC date range. <br> Scheduled checks: daily · Canadian sample retrieved: 2026-11-17 · 5 case studies | [Source &amp; docs](<https://github.com/jsdyer/blockedorgone>) |
| [Packet Detour](<https://coolcode.ca/packet-detour/>) | Follow a Canadian route through Seattle or paste your own annotated hops. <br> Local inputs · Compare three fictional routing examples or paste your own annotated hops. Paste your own rows to compare the sequence of country labels and each hop’s RTT. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/packet-detour>) |
| [Protocol Cabinet](<https://coolcode.ca/protocol-cabinet/>) | Read the messages sent in a DNS lookup, HTTP request, or SMTP conversation. <br> Reference collection · Built-in DNS, HTTP and SMTP exchanges run offline. Compare a successful DNS lookup with a missing name, fetch an HTTP document and revalidate a cached copy, or follow SMTP through mail delivery and a rejected recipient. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/protocol-cabinet>) |

#### Security &amp; forensics

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Tracker X-Ray](<https://coolcode.ca/trackerxray/>) | Inspect HAR captures for third-party requests, cookies and analytics hosts. <br> Local inputs · The browser reads requests from the HAR file you select. Use the filters to find new domains, missing domains, request-count changes or host changes within the same domain. | [Source &amp; docs](<https://github.com/jsdyer/trackerxray>) |
| [Header Autopsy](<https://coolcode.ca/headerautopsy/>) | Read HTTP header values and inspect security policy, cookies and cache signals. <br> Local inputs · The tool reads the headers you paste or extracts them from a local HAR file. It compares cookie flag profiles without linking individual cookies. | [Source &amp; docs](<https://github.com/jsdyer/headerautopsy>) |
| [Mail Path](<https://coolcode.ca/mailpath/>) | Reconstruct received-email hops and the authentication results each server reported. <br> Local inputs · Your browser reads the email headers you paste or the .eml file you open. The route and JSON export show reported relay addresses, timestamps, delays and recognized authentication claims. | [Source &amp; docs](<https://github.com/jsdyer/mailpath>) |
| [Packet Pocket](<https://coolcode.ca/packetpocket/>) | Examine local packet captures for conversations, DNS, HTTP and observable TLS data. <br> Local inputs · Your browser reads packets from the PCAP or PCAPNG capture you select. Browse IP conversations, filter packet metadata by protocol, text and elapsed time, and export matching metadata as JSON. | [Source &amp; docs](<https://github.com/jsdyer/packetpocket>) |
| [Dependency X-Ray](<https://coolcode.ca/dependencyxray/>) | Inspect dependency lockfiles and query advisories for selected packages. <br> Multiple data sources · Your lockfile stays in the browser, and optional OSV lookups send the package names and versions you select. Version ranges, local paths and unsupported tags are skipped. | [Source &amp; docs](<https://github.com/jsdyer/dependencyxray>) |
| [Exploit Graveyard](<https://coolcode.ca/exploitgraveyard/>) | Search CISA’s catalogue of known exploited vulnerabilities by product or CVE. <br> Saved dataset · CISA’s catalogue lists vulnerabilities that have been exploited in the wild. Open any result for the agency’s required action and source links, or export the filtered records as CSV. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source published: 2026-11-13 · 1,781 catalogued vulnerabilities | [Source &amp; docs](<https://github.com/jsdyer/exploitgraveyard>) |
| [Patch Signal](<https://coolcode.ca/patchsignal/>) | Look up CVEs and compare reported exploitation, EPSS estimates and advisories. <br> Multiple data sources · The tool combines CISA’s exploited-vulnerability list with FIRST’s exploit-probability scores and supports individual lookups. A standalone lookup works for a CVE outside that catalogue. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source published: 2026-11-13 · EPSS score date: 2026-11-17 · 1,781 KEV entries | [Source &amp; docs](<https://github.com/jsdyer/patchsignal>) |

#### Government &amp; public records

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [ATIP Records Explorer](<https://coolcode.ca/atip/>) | Find released records, request copies, or draft an access request. <br> Saved dataset · Federal departments publish summaries of completed access-to-information requests in English and French. The last unquoted word matches prefixes as you type. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Request months: 2011-01–2026-11 · 206,151 summaries | [Source &amp; docs](<https://github.com/jsdyer/atip>) |
| [Government Memory Map](<https://coolcode.ca/governmentmemory/>) | Find record classes and personal information banks to reference in an access request. <br> Saved dataset · Six federal Info Source inventories describe the records and personal information banks each institution holds. Each result links to its source and offers a browser-local outline for a request, plus a topic link into the CoolCode ATIP Records Explorer. <br> Scheduled checks: weekly · Data retrieved: 2026-11-18 · 306 records | [Source &amp; docs](<https://github.com/jsdyer/governmentmemory>) |
| [The Briefing Room](<https://coolcode.ca/briefings/>) | Search briefing note titles and reference numbers. <br> Saved dataset · Federal departments publish briefing note titles, reference numbers and the institutions that prepared them. Select an institution to draft a request containing only its saved notes. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-11-17 · 161,739 briefing notes | [Source &amp; docs](<https://github.com/jsdyer/briefings>) |
| [Evidence Lab](<https://coolcode.ca/evidencelab/>) | Search disclosure PDFs, find dates and section references, and save page citations. <br> Local inputs · Searchable PDF text and notes stay in this browser tab. Select text in the detail and choose Pin highlighted text to attach an excerpt. | [Source &amp; docs](<https://github.com/jsdyer/evidencelab>) |
| [The ATIP Popularity Index](<https://coolcode.ca/atippopularity/>) | See which released records received the most informal copy requests. <br> Saved dataset · Treasury Board records how often people request copies of previously released access-to-information packages. The reporting periods are the months when copies of completed records were requested. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-10-07 · Reported months: 2019-09–2026-09 · 58,806 release and month combinations | [Source &amp; docs](<https://github.com/jsdyer/atippopularity>) |
| [ATIP Metrics](<https://coolcode.ca/atipmetrics/>) | Compare institutional workloads, find related records and briefing notes, and build a request draft. <br> Saved dataset · Treasury Board workbooks report access and privacy requests by institution and fiscal year. The table is searchable, sortable, linkable, and exportable as CSV. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · 4 fiscal years | [Source &amp; docs](<https://github.com/jsdyer/atipmetrics>) |
| [What the Minister Was Prepared to Say](<https://coolcode.ca/ministersays/>) | Compare Question Period notes and the issues they address. <br> Saved dataset · Federal departments publish bilingual Question Period notes with prepared ministerial responses. The published dates and ministry codes are source fields, and the interface preserves missing values. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-11-17 · 7,676 notes | [Source &amp; docs](<https://github.com/jsdyer/ministersays>) |
| [The Government’s Wrongdoing Files](<https://coolcode.ca/wrongdoings/>) | Read published findings, recommendations and corrective actions. <br> Saved dataset · Federal disclosures describe founded wrongdoing and the department’s response. Dates are file dates from the source. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-11-17 · 73 disclosures | [Source &amp; docs](<https://github.com/jsdyer/wrongdoings>) |
| [Algorithm Watch](<https://coolcode.ca/algorithmwatch/>) | Explore the federal AI register and find matched impact assessments. <br> Saved dataset · Entries from Canada’s AI Register link to verified impact assessments where available. The source supplies status dates and personal-information fields, with blanks left as unreported. <br> Scheduled checks: weekly · Snapshot generated: 2026-11-16 · Source updated: 2026-04-28 · 412 AI register entries | [Source &amp; docs](<https://github.com/jsdyer/algorithmwatch>) |
| [The Government Dataset Explorer](<https://coolcode.ca/datasetexplorer/>) | Find federal datasets and their downloadable files. <br> Saved dataset · Canada’s Open Government Portal lists each dataset’s publisher and available file formats. Filter by format, organization and modified year. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-11-17 · 48,313 catalogue entries | [Source &amp; docs](<https://github.com/jsdyer/datasetexplorer>) |
| [The Open Data Graveyard](<https://coolcode.ca/opendatagraveyard/>) | Investigate datasets removed from the federal catalogue. <br> Saved dataset · Treasury Board lists records removed from the federal open-data portal. Each entry offers links to check its original URL, archived captures and related current releases. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-05-09 · 3,934 removed entries | [Source &amp; docs](<https://github.com/jsdyer/opendatagraveyard>) |
| [Canada.ca Pulse](<https://coolcode.ca/canadaanalytics/>) | Explore recent patterns in federal government website usage. <br> Saved dataset · Employment and Social Development Canada publishes monthly measures of Canada.ca usage and services. Compare published numeric series over any portion of the rolling window, inspect the exact source values for each month, or export the comparison as a CSV. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source updated: 2026-11-03 · Reporting months: 2023-11–2026-10 · 539 metric series | [Source &amp; docs](<https://github.com/jsdyer/canadaanalytics>) |
| [Salmon Lines](<https://coolcode.ca/salmonlines/>) | Compare historical salmon spawning estimates by river, species and run in DFO’s Pacific region. <br> Saved dataset · Fisheries and Oceans Canada records Pacific salmon spawning estimates by population, waterbody and year. Blank source values, missing years and reported numeric zeros are distinct in the table and export. <br> Scheduled checks: monthly · Source published: 2026-06-01 · Analysis years: 1920–2025 · 421,001 annual records <br> [![Salmon Lines data retrieved 2026-11-18](<https://coolcode.ca/salmonlines/data-date.svg>)](<https://coolcode.ca/salmonlines/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/salmonlines>) |
| [Dataset Diff](<https://coolcode.ca/datasetdiff/>) | Compare CSV or GeoJSON snapshots by record ID and inspect changes to fields and geometry. <br> Local inputs · Both CSV or GeoJSON files stay in your browser while it matches records by the ID you choose. The report distinguishes missing properties from JSON null, and compares nested fields and geometry exactly. | [Source &amp; docs](<https://github.com/jsdyer/datasetdiff>) |

#### Public disclosures

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Corporate Ghosts](<https://coolcode.ca/corporateghosts/>) | Search Canada’s federal corporate register and compare legal statuses. <br> Saved dataset · Four federal registry exports from ISED cover active and inactive corporations. The CSV does not provide a complete history of legal names. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · 1,580,390 corporate records | [Source &amp; docs](<https://github.com/jsdyer/corporateghosts>) |
| [Lobby Trail](<https://coolcode.ca/lobbytrail/>) | Explore reported federal lobbying communications by organization, subject and institution. <br> Saved dataset · Federal lobbying reports identify the organizations reporting in-house communications with public office holders. Each report counts once even when it names multiple institutions or subjects. <br> Scheduled checks: weekly · Data retrieved: 2026-11-18 · Source export: 2026-11-16 · Data through: 2026-11-13 · 269,615 communication reports · Verified saved export | [Source &amp; docs](<https://github.com/jsdyer/lobbytrail>) |
| [Charity Flows](<https://coolcode.ca/charityflows/>) | Compare Canadian charity filings and explore grants to reported recipients. <br> Saved dataset · CRA charity filings report finances and gifts to qualified donees. Compare available fiscal periods, inspect qualified-donee gift values, and follow recipients where their reported charity business number exactly matches the index. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · Filing years: 2022–2024 · 87,802 charities | [Source &amp; docs](<https://github.com/jsdyer/charityflows>) |
| [Tariff X-Ray](<https://coolcode.ca/tariffxray/>) | Find Canadian telecom tariff items and the regulatory decisions behind them. <br> Reference collection · The listed Bell and TELUS wholesale fibre rates come from two CRTC orders. Comparable entries in a details panel have the same published speed tier or charge category across orders. <br> Source reviewed: 2026-11-16 · 28 rate entries | [Source &amp; docs](<https://github.com/jsdyer/tariffxray>) |
| [Gear Autopsy](<https://coolcode.ca/gearautopsy/>) | Find device filings and public FCC exhibits by model or FCC ID. <br> Reference collection · The tool links selected devices to their reviewed FCC equipment exhibits. Review a device record or export visible exhibit links as CSV. <br> Source reviewed: 2026-11-16 · 14 devices | [Source &amp; docs](<https://github.com/jsdyer/gearautopsy>) |
| [Recall Radar](<https://coolcode.ca/recallradar/>) | Search Canadian safety alerts and check affected vehicle makes, models and years. <br> Saved dataset · Health Canada recall notices appear alongside Transport Canada’s 60-day vehicle recall file. The watchlist runs on visits and has no background notifications. <br> Scheduled checks: daily · Data retrieved: 2026-11-18 · 34,389 notices | [Source &amp; docs](<https://github.com/jsdyer/recallradar>) |
| [Patent Attic](<https://coolcode.ca/patentattic/>) | Search Canadian technology patents and open original CIPO records. <br> Reference collection · Each selected Canadian patent publication has been checked against its original record. Each result links to the publication copy, its drawings where available, and the CIPO record or search. <br> Source reviewed: 2026-11-16 · 22 selected patent publications | [Source &amp; docs](<https://github.com/jsdyer/patentattic>) |

#### Maps, trails &amp; history

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Trailglass](<https://coolcode.ca/trailglass/>) | Explore cycling and trail layers and inspect a Garmin GPX ride. <br> Multiple data sources · Routes come from Vancouver, Langley and Halifax map data or a GPX file you import. Elapsed time sums intervals within timed segments, excluding gaps between segments. <br> Scheduled checks: weekly · Oldest source retrieved: 2026-11-18 · 6,236 mapped trail segments | [Source &amp; docs](<https://github.com/jsdyer/trailglass>) |
| [Weather Archive](<https://coolcode.ca/weatherarchive/>) | Compare daily Canadian weather station records and monthly climate normals. <br> On-demand lookup · The tool requests up to 92 days of observations from Canadian weather stations for the period you choose. The CSV includes ECCC flags for the measurements displayed in the tool. | [Source &amp; docs](<https://github.com/jsdyer/weatherarchive>) |
| [Spectrum Atlas](<https://coolcode.ca/spectrumatlas/>) | Map published spectrum authorizations and inspect bands and frequencies. <br> Saved dataset · ISED records identify fixed-service and terrestrial radio assignments in BC and Nova Scotia. CSV exports include the search centre, radius and each exported match's distance while the radius filter is active. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · 298,391 published spectrum records | [Source &amp; docs](<https://github.com/jsdyer/spectrumatlas>) |
| [Shipwreck Explorer](<https://coolcode.ca/shipwrecks/>) | Search Nova Scotia wrecks by area, vessel and date. <br> Saved dataset · Nova Scotia’s Marine Heritage database documents wrecks and gives map positions where known. Choose a 25-year interval in the timeline or filter by era and event. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Source published: 2024-07-05 · 4,939 shipwreck records | [Source &amp; docs](<https://github.com/jsdyer/shipwrecks>) |
| [Forgotten Places](<https://coolcode.ca/forgottenplaces/>) | Explore sites in Canada’s historic places register. <br> Saved dataset · Parks Canada’s register supplies the records of federally designated heritage places. A record's map-search link uses the address or locality reported by the register. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Data through: 2025-12-12 · 2,527 heritage records | [Source &amp; docs](<https://github.com/jsdyer/forgottenplaces>) |
| [Names That Time Forgot](<https://coolcode.ca/namesforget/>) | Trace Canadian place names, features and their locations. <br> Saved dataset · The Canadian Geographical Names Database supplies names for land and underwater features. Filter by province, territory or undersea area, and open a record for source coordinates and naming information. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · 369,888 place-name records | [Source &amp; docs](<https://github.com/jsdyer/namesforget>) |
| [BC Place Names Explorer](<https://coolcode.ca/bcplacenames/>) | Explore nearby BC place names, official and recorded names, and naming decisions. <br> On-demand lookup · The BC Geographical Names service returns matches for the name or location you choose. Distances are straight-line distances to reference points. | [Source &amp; docs](<https://github.com/jsdyer/bcplacenames>) |
| [Hidden Water](<https://coolcode.ca/hiddenwater/>) | Explore Langley creeks, drainage channels and mapped culverts. <br> Saved dataset · Township maps show drainage channels and culverts, and City of Langley maps show watercourses. Export matching records as CSV or GeoJSON with source IDs and retrieval time. <br> Scheduled checks: weekly · Data retrieved: 2026-11-18 · 28,921 mapped segments | [Source &amp; docs](<https://github.com/jsdyer/hiddenwater>) |
| [Halifax Time Lens](<https://coolcode.ca/halifaxtimelens/>) | Compare Halifax aerial photographs from 1947 and 1977 with a modern street map. <br> On-demand lookup · Natural Resources Canada’s 1947 and 1977 aerial images load alongside modern street tiles as you explore. Jump to the waterfront, North End, Dartmouth, Northwest Arm or Bedford Basin. | [Source &amp; docs](<https://github.com/jsdyer/halifaxtimelens>) |
| [Langley Changes](<https://coolcode.ca/langleychanges/>) | Explore City and Township development applications, documents and changes over time. <br> Saved dataset · Township applications and selected City records provide a local history of changes observed since November 2026. Save application IDs in your browser, share a record, or export filtered results as CSV. <br> Scheduled checks: daily · Data retrieved: 2026-11-18 · 644 planning records | [Source &amp; docs](<https://github.com/jsdyer/langleychanges>) |
| [Strange Skies Canada](<https://coolcode.ca/strangeskies/>) | Search aviation occurrence reports by location, year and event. <br> Saved dataset · Transport Canada’s CADORS reports describe aviation occurrences, events and the aircraft involved. The source category “Weather balloon, meteor, rocket, CIRVIS/UFO” combines several possible observations. <br> Scheduled checks: daily · Snapshot generated: 2026-11-17 · Data through: 2026-11-12 · 408,710 aviation occurrences | [Source &amp; docs](<https://github.com/jsdyer/strangeskies>) |
| [Lightkeeper](<https://coolcode.ca/lightkeeper/>) | Explore Canadian coastal lights, play their published signals and compare nearby aids. <br> Saved dataset · The Coast Guard’s List of Lights gives each light’s position, colour and flash pattern. When source remarks give a complete sequence, the app displays the flash and eclipse durations. <br> Scheduled checks: twice monthly · 6,494 positioned lights <br> [![Lightkeeper data retrieved 2026-11-18](<https://coolcode.ca/lightkeeper/data-date.svg>)](<https://coolcode.ca/lightkeeper/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/lightkeeper>) |
| [Storm Tracks](<https://coolcode.ca/stormtracks/>) | Replay Atlantic storms, compare their winds and find historical tracks near a coastal community. <br> Saved dataset · NOAA’s North Atlantic storm records give each storm’s track and its recorded strength along the way. Historical coverage is incomplete, particularly at sea during early decades. <br> Scheduled checks: monthly · Seasons: 1851–2025 · 2,275 storm tracks <br> [![Storm Tracks data retrieved 2026-11-18](<https://coolcode.ca/stormtracks/data-date.svg>)](<https://coolcode.ca/stormtracks/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/stormtracks>) |

#### Sky &amp; photography

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Nightfinder](<https://coolcode.ca/nightfinder/>) | Plan a night shoot around darkness, target positions and lens framing. <br> Local inputs · Sun, Moon and target positions are calculated on your device for your time and location. The display covers local noon to the following noon, including daylight saving changes. | [Source &amp; docs](<https://github.com/jsdyer/nightfinder>) |
| [Satellite Pass](<https://coolcode.ca/satpasses/>) | Calculate passes for the ISS and other satellites from your location. <br> Saved dataset · Your browser uses orbital elements from CelesTrak to calculate satellite passes for your location. Read the dated orbit epoch as well as the snapshot retrieval date, especially after maneuvers. <br> Scheduled checks: every 4 hours · Data retrieved: 2026-11-18 13:02 UTC · 6 satellites | [Source &amp; docs](<https://github.com/jsdyer/satpasses>) |
| [Sky Archive Explorer](<https://coolcode.ca/skyarchive/>) | Find selected Hubble and Webb observations and open the original archive records. <br> Saved dataset · The MAST archive supplies selected Hubble and Webb observations of five targets. Inspect dates, coordinates, exposure and wavelength fields, preview source imagery, and export filtered metadata to CSV. <br> Scheduled checks: weekly · Data retrieved: 2026-11-16 · 30 selected observations | [Source &amp; docs](<https://github.com/jsdyer/skyarchive>) |
| [Photo Lab](<https://coolcode.ca/photolab/>) | Inspect metadata, edit photos and export cleaned copies on your device. <br> Local inputs · JPEG and PNG files stay in your browser for metadata analysis and editing. Use the synthetic coast example to try the crop drag, compare the original and export preview, read sample GPS and camera tags, and inspect luminance or RGB histograms. | [Source &amp; docs](<https://github.com/jsdyer/photolab>) |
| [Otherworld Names](<https://coolcode.ca/otherworldnames/>) | Explore the origins and locations of officially named features on the Moon and Mars. <br> Saved dataset · The USGS gazetteer records the origins of IAU-approved names for features on the Moon and Mars. The name origins and source country/cultural group labels come directly from the Gazetteer. <br> Scheduled checks: monthly · 11,141 named features <br> [![Otherworld Names data retrieved 2026-11-18](<https://coolcode.ca/otherworldnames/data-date.svg>)](<https://coolcode.ca/otherworldnames/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/otherworldnames>) |

#### Money &amp; markets

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [BankRate Lab](<https://coolcode.ca/bankrates/>) | Chart Bank of Canada rates, exchange rates and yields. <br> Saved dataset · The Bank of Canada publishes the interest rates, bond yields and Canadian-dollar exchange rates shown here. Indexed FX rebases each series to its first available observation within the chosen date range. <br> Scheduled checks: weekdays · Snapshot generated: 2026-11-17 · Observation dates: 2017-01-02–2026-11-16 · 9 rate series | [Source &amp; docs](<https://github.com/jsdyer/bankrates>) |
| [Canadian Price Atlas](<https://coolcode.ca/priceatlas/>) | Compare historical grocery prices across Canadian regions. <br> Saved dataset · Statistics Canada publishes monthly retail prices for Canada, BC and Nova Scotia. The site labels missing observations, retains published package prices in exports and distinguishes the chart’s units from source units. <br> Scheduled checks: weekly · Snapshot generated: 2026-11-16 · Price observations: 2017-01–2026-09 · 110 products | [Source &amp; docs](<https://github.com/jsdyer/priceatlas>) |
| [Insolvency Atlas](<https://coolcode.ca/insolvencyatlas/>) | Explore insolvency counts and rates, or compare filings with grocery prices and policy rates. <br> Saved dataset · The Office of the Superintendent of Bankruptcy publishes monthly filing counts and annual insolvency rates. Incomplete years and missing observations appear as gaps. <br> Scheduled checks: weekly · Oldest source retrieved: 2026-11-18 · Monthly filings through: 2026-09 · Annual rates through: 2025 · 2 source workbooks | [Source &amp; docs](<https://github.com/jsdyer/insolvencyatlas>) |
| [Market Shadows](<https://coolcode.ca/marketshadows/>) | Compare CIRO trading and short positions and rank changes between reports. <br> Local inputs · The tool reads your CIRO short-sale and short-position reports or a fictional sample. Search by security symbol or company name, filter by listing market, and select a row to compare dates. | [Source &amp; docs](<https://github.com/jsdyer/marketshadows>) |

#### Media, events &amp; the old web

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Event Radar](<https://coolcode.ca/eventradar/>) | Browse local listings and keep selected events on your calendar. <br> On-demand lookup · Has Things supplies Vancouver and Halifax event feeds, and Langley entries link to venue calendars. Import an .ics file to search events locally. | [Source &amp; docs](<https://github.com/jsdyer/eventradar>) |
| [Atlantic Dial](<https://coolcode.ca/atlanticdial/>) | Find Atlantic Canadian radio shows on your clock and listen to recent episodes from local stations. <br> Multiple data sources · Stations publish the broadcast times and episode feeds. Choose your time zone or search recent recordings by title. Search Nain for Labrador oral histories or Inuktitut lessons, then switch to On demand to find recent local radio and two archived programmes about Halifax donairs. <br> Scheduled checks: daily episode imports and weekly schedule checks · Schedules reviewed: 2026-11-18 · Episode feeds retrieved: 2026-11-18 · 25 programmes · 45 episodes | [Source &amp; docs](<https://github.com/jsdyer/atlanticdial>) |
| [Screen Radar](<https://coolcode.ca/screenradar/>) | Find television and Canadian films, and keep a watchlist in this browser. <br> Multiple data sources · TV searches use TVmaze, and the selected Canadian films come from Wikidata. Coverage is selective and year labels refer to initial or festival releases where known. | [Source &amp; docs](<https://github.com/jsdyer/screenradar>) |
| [Media Echoes](<https://coolcode.ca/mediaechoes/>) | Search the Internet Archive for old games, Flash projects and media. <br> On-demand lookup · Internet Archive returns catalogue records, previews and file lists when you search. View original catalogue information, previews, and file names, then open the source item to see what can be viewed or downloaded. | [Source &amp; docs](<https://github.com/jsdyer/mediaechoes>) |
| [Ghost Links](<https://coolcode.ca/ghostlinks/>) | Follow dead URLs through web archives and dated captures. <br> Multiple data sources · Reviewed Canadian web-address histories can be explored alongside optional Wayback checks or local imports. Missing captures indicate gaps in the evidence. <br> Source reviewed: 2026-11-16 · 8 address histories | [Source &amp; docs](<https://github.com/jsdyer/ghostlinks>) |
| [Lost Code](<https://coolcode.ca/lostcode/>) | Look up archived repository visits, branches and tags. <br> On-demand lookup · Software Heritage supplies archived origins, crawl visits and branches for each lookup. Try MintChip by name, or open the archive history of Linux, PHP or DOOM directly. | [Source &amp; docs](<https://github.com/jsdyer/lostcode>) |
| [The Unreleased Worlds Index](<https://coolcode.ca/unreleased/>) | Search a Canada Media Fund export for funded games, films and digital projects. <br> Local inputs · The tool reads the Canada Media Fund project export you select on your device. Your export, searches, filters, and pinned items remain in the current tab. | [Source &amp; docs](<https://github.com/jsdyer/unreleased>) |

<!-- END BROWSER_TOOLS -->

### Install yourself

These projects need software on your computer, NAS or server. Their names below
open installation instructions. A web interface does not necessarily mean a
publicly hosted tool: Timefold and Switchboard run on the machine where you install them.

<!-- BEGIN INSTALL_TOOLS -->

8 installation options. Tools with both versions also appear above.

| Project / installation guide | What it does | Requirements | Code / documentation |
| --- | --- | --- | --- |
| [Switchboard](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/switchboard>) | Build a local front door for your NAS, DNS console and other services. <br> Self-hosted data · Your local JSON service directory supplies the links. Each entry has a group, name, an absolute HTTP or HTTPS url, and an optional note. | PHP 8+ | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/switchboard>) |
| [Vhost Logbook](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/logbook>) | Summarize requests, status codes and traffic from Apache access logs. <br> Self-hosted data · Your Apache access log supplies the dates and request counts. Each row gives request volume, counts by HTTP status family, and response-body bytes. | PHP CLI 8+ | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/logbook>) |
| [LANWatch](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/lanwatch>) | Ping your devices and keep a local history of when they were reachable. <br> Self-hosted data · Your own host probes are timestamped in a local SQLite database. Probes hosts concurrently, records each sample, and logs first observations plus UP/DOWN transitions. | Python 3, SQLite and Linux ping | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/lanwatch>) |
| [Archive Shelf](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/archive-shelf>) | Search historical newsletters by page or index a private collection on Linux. <br> Self-hosted data · The Linux edition indexes your own PDF newsletters in a local SQLite database. Try “dial-up” to find the matching newsletter page. The Linux edition can build the same kind of searchable shelf from your own PDFs and text files. | Python 3, SQLite FTS5 and Poppler for PDFs | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/archive-shelf>) |
| [Waystation](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation>) | Capture websites into portable archives, map links and browse offline. <br> Self-hosted data · Website captures and their timestamps live in your local archive. Replaying an uncaptured destination shows a local missing-page notice. | Downloadable executable for Linux, macOS or Windows | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation>) |
| [Timefold](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold>) | Build a personal timeline of photos, game saves and web fragments. <br> Self-hosted data · The timeline uses your own collection or the fictional collection included with the tool. Export includes only attachments referenced by current capsules. | PHP 8.2+ and MySQL/MariaDB; optional SQLite demo | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold>) |
| [Tape Index](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index>) | Fingerprint and verify scans, web archives and game saves from the terminal. <br> Self-hosted data · The index records a SHA-256 checksum for each file you choose so you can verify it later. A moved file appears as MISSING under its old name and ADDED under its new one. | Python 3 | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index>) |
| [Dataset Diff](<https://github.com/jsdyer/datasetdiff#linux-companion>) | Compare CSV or GeoJSON snapshots by record ID and inspect changes to fields and geometry. <br> Self-hosted data · Your collector stores dated copies of a file or HTTPS feed in SQLite. The report distinguishes missing properties from JSON null, and compares nested fields and geometry exactly. | Linux and Node.js 24+ | [Source &amp; docs](<https://github.com/jsdyer/datasetdiff>) |

<!-- END INSTALL_TOOLS -->

GitHub Pages serves static files; it does not execute these PHP, Python or Go apps.
Downloading their source is separate from installing and starting them.
For available packaged downloads, see [Releases](https://github.com/jsdyer/jsdyer.github.io/releases)
and each project's guide.

For a small first run, install Git and the PHP CLI, then try the included sample log:

```sh
git clone https://github.com/jsdyer/jsdyer.github.io.git
cd jsdyer.github.io
php tools/logbook/logbook.php tools/logbook/example.log
```

If you already have a checkout, use that directory instead of cloning again.
For a fuller demo, try [Waystation](tools/waystation/README.md) or
[Timefold](tools/timefold/README.md). [Field Notes](https://coolcode.ca/field-notes/)
provides walkthroughs, including [Finding the dial-up page](https://coolcode.ca/field-notes/finding-the-dial-up-page/),
and has an [RSS feed](https://coolcode.ca/field-notes/feed.xml).

## Where the code lives

| Location | Purpose |
| --- | --- |
| [data/tools.json](data/tools.json) | Tool listings, links, search tags and browser/install access labels |
| [data/categories.json](data/categories.json) | Category names, icons and order |
| [templates/index.html](templates/index.html) | Homepage layout and featured editorial cards |
| [assets/](assets/) | Shared site styles, icons and browser scripts |
| [scripts/build.py](scripts/build.py) | Validates the listings and generates the static site |
| [scripts/sync_readme.py](scripts/sync_readme.py) | Regenerates the README tool tables from the same catalogue; `--check` detects drift |
| `dist/` | Generated site output; do not edit or commit it |
| `packet-detour/`, `protocol-cabinet/`, `rack-recipes/`, `archive-shelf/` | Browser tools included in this repository |
| [tools/](tools/) | Installable projects, their source, examples and guides |
| [.github/workflows/](.github/workflows/) | GitHub Actions instructions for testing, publishing and packaging |
| [.github/dependabot.yml](.github/dependabot.yml) | Scheduled dependency-update proposals |
| [.devcontainer/](.devcontainer/) | Optional Timefold development workspace for Codespaces / VS Code |
| [CNAME](CNAME) | The `coolcode.ca` custom-domain name |

The split between repositories follows a project's size and maintenance needs,
not whether it runs in a browser. Small static utilities can live here. Substantial
apps with their own dependencies, releases or data refreshes belong in their own
repositories, including new installable apps. Existing projects keep their homes.

For example, DNS Lens is maintained in `jsdyer/dnslens` and published separately at
`coolcode.ca/dnslens/`. Updating this homepage does not rebuild DNS Lens or fetch
every linked repository. A local preview of this repository cannot serve those
separate project sites.

## How the homepage is built and published

**GitHub stores the code; GitHub Actions runs the build; GitHub Pages serves the website.**

For example, editing the Rack Recipes description in `data/tools.json` changes its
homepage listing after the next successful publication. The Python build combines
the listings with `templates/index.html` and writes the finished page to
`dist/index.html`, alongside the included public files. Browser tools appear first;
installation-required projects have their own section.

The homepage and these tables show how each tool gets its data. Every six hours
the catalogue reads dates and counts from the tools' published metadata. Each tool
keeps its own update schedule. A failed check keeps the last verified value and
labels it. Tools that use local files or live lookups describe those inputs.

From the repository root, with Git and Python 3 available:

```sh
python3 scripts/sync_readme.py
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open `http://localhost:8000/`. The server is a local preview; it does not publish
anything. Open separate project tools at their `https://coolcode.ca/` addresses.
PHP and Docker are not needed to build this static homepage.

When a pull request (PR) is opened or updated, [pages.yml](.github/workflows/pages.yml)
checks that this README matches the listings, builds the site and checks it in a browser.
A PR is a proposed
change on a separate branch; it does not change the live homepage. Its `deploy` job
is deliberately **skipped**. The run saves `catalogue-preview` (the generated files)
and `catalogue-browser-checks` (screenshots) as downloadable Actions artifacts.

After a merge into `main`, GitHub shows the new README immediately. The workflow
then runs again and publishes `dist/` to GitHub Pages if the build and checks succeed.
The homepage can therefore appear later than the README; it may also need a browser
refresh after publication. Follow progress in the
[Actions tab](https://github.com/jsdyer/jsdyer.github.io/actions).
The [Pages rollout guide](docs/pages-rollout.md) records the publishing setup.

### Netlify is unlinked

The former Netlify project, `flourishing-naiad-659496`, has been unlinked from this
repository. GitHub Pages is the publishing path for CoolCode. Netlify is not needed
for the homepage, Dependabot, GitHub Actions tests or the installable tools.

Previously, the connection let Netlify fetch this repository and publish an extra
copy or PR preview. Old PRs may still show Netlify checks such as **Header rules**,
**Pages changed** and **Redirect rules**. Those are historical deployment results,
not PHP compatibility tests. Unlinking stops automatic Git-triggered Netlify
deployments; it does not delete the old Netlify project or its published files.

## What the checks mean

GitHub Actions reads the YAML files in `.github/workflows/` and runs their commands
on temporary runner machines. A green result means the listed checks passed for
that commit. A **smoke test** exercises basic working behavior, such as starting
an app and making requests to it.

| Workflow | When it runs / what it does |
| --- | --- |
| [Catalogue · Check and publish](.github/workflows/pages.yml) | PRs and changes on `main`: checks README/catalogue agreement, validates metadata, builds the homepage and tests search/access filters in a browser. Publishes only from `main`. |
| [Timefold · Check the archive](.github/workflows/checks.yml) | Changes to Timefold, `.devcontainer/` or this workflow: PHP 8.2/8.3/8.5 with SQLite, PHP 8.3/8.5 with MariaDB 11, and Docker build-and-smoke tests for both the Apache app and development images. |
| [Waystation · Test and package](.github/workflows/waystation.yml) | Relevant Waystation changes: tests on Linux and Windows and builds portable downloads. Eligible main/tag pushes publish a release when its version is not already released. |
| [Pack a Timefold release](.github/workflows/release.yml) | A `timefold-v*` tag or manual run: tests and packages source with a checksum. A matching tag publishes a GitHub release. |
| [Catalogue · Link audit](.github/workflows/catalogue-audit.yml) | Weekly or manual: checks catalogue destinations and saves a report. Network failures are separate from homepage publishing. |

In the Timefold checks, **Docker · current PHP images** tests the Dockerfile versions
in the branch being checked. **Docker · 8.5 PHP images** explicitly tests both images
with PHP 8.5. Once both Dockerfiles specify 8.5, both jobs exercise that PHP series.
The older PHP matrix entries test application compatibility; they do not select
the PHP version installed on your own server.

## Dependabot: proposed updates and what to do with them

Dependabot is GitHub's dependency-update service. Committing
[.github/dependabot.yml](.github/dependabot.yml) to the default branch enables the
configured version checks. This file was added with Timefold; it is independent of
Netlify. Its current configuration checks monthly, with up to two open version-update
PRs per entry:

| Configuration entry | What it watches |
| --- | --- |
| `github-actions`, directory `/` | Action versions used in GitHub workflows, such as `actions/checkout` |
| `docker`, directory `/tools/timefold` | Timefold's Apache/PHP base image |
| `docker`, directory `/.devcontainer` | The optional development workspace's PHP base image |

Dependabot prepares an actual code change on a separate branch and opens a PR.
For example, it proposed replacing `FROM php:8.3-cli-bookworm` with
`FROM php:8.5-cli-bookworm`. The change reaches `main` only when the PR is merged.
These settings cover this repository; separate tool repositories need their own
Dependabot configuration.

For an update PR:

1. Read **Files changed** to see what version or file is changing.
2. Check the results for the **latest PR commit**, including tests of the proposed
   version. Old PHP 8.2/8.3-only checks or neutral Netlify checks do not validate PHP 8.5.
3. If the branch needs newer changes from `main`, use **Update branch** when offered,
   or comment `@dependabot rebase` on the Dependabot PR. A thumbs-up acknowledges the
   command; wait for the branch update and its new tests to finish.
4. Review any failures or conflicts. When the change and relevant checks are satisfactory,
   merge the PR and check the resulting run on `main`.

Merging updates the repository's recipe. It does **not** upgrade PHP on an existing
Linux server or replace a running container. An installed copy needs its own update
and, for Docker, an image rebuild and container recreation following the tool's guide.

## What the development container is for

The `.devcontainer/` directory defines an optional **Timefold development workspace**,
named "Timefold · private archive playground". It is a prepared Linux environment
for editing and trying Timefold, not the server hosting `coolcode.ca`.

When someone creates a GitHub Codespace for this repository, or opens it with VS Code's
Dev Containers support, [devcontainer.json](.devcontainer/devcontainer.json) points the
container builder to [Dockerfile](.devcontainer/Dockerfile). The current starting line is:

```dockerfile
FROM php:8.5-cli-bookworm
```

This tells Docker to start from a prepared image containing PHP 8.5's command-line
runtime on Debian Bookworm. The remaining instructions add Git and an SSH client
and verify SQLite support. An **image** is the prepared package; a **container** is
a running instance created from it.

The workspace configuration initializes Timefold with SQLite demo data, starts PHP's
development server on port 8000 and configures private port forwarding in Codespaces.
The Docker CI jobs also build this recipe for tests. Merely storing these files
does not start a workspace. Codespaces is optional and has its own usage allowance.

Timefold's separate [application Dockerfile](tools/timefold/Dockerfile) uses
`php:8.5-apache-bookworm` for the app's Docker Compose installation. Neither recipe
is required for browsing CoolCode or building its homepage. See the
[Timefold guide](tools/timefold/README.md) for running it and the
[GitHub workshop](tools/timefold/docs/github-guide.md) for more background.

## Add or maintain a tool

1. Choose its home using the repository guidance above. Start a new standalone browser
   app from [coolcode-tool-template](https://github.com/jsdyer/coolcode-tool-template).
2. Implement and test the tool in its own location. Verify the live destination or
   installation instructions before adding it to the homepage.
3. Add one record to `data/tools.json`. Set `access: "browser"` for immediate use or
   `access: "install"` with `requirements` for installation. Archive Shelf demonstrates
   a browser tool with an additional `install_url` for its installable version.
4. Run `python3 scripts/sync_readme.py`, then the homepage tests and build above.
   Review and commit the regenerated `README.md` alongside the catalogue changes
   in the same PR. Do not edit the generated tool tables by hand.

`hosting` describes the destination: `local` means files included in this repository,
`project` means a separate GitHub Pages project, and `external` means an explicit HTTPS
destination such as an installation guide. It is separate from the browser/install label.

Follow [Adding tools](docs/adding-tools.md) for the full record format, Pages setup,
URL rules, privacy/storage conventions and data-refresh guidance. Edit an existing
app in its source repository; change the homepage record only when its listing changes.
Do not edit generated HTML or commit `dist/`, and do not copy another project's
published files into this repository just to link to it.
