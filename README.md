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

106 browser tools, grouped as on the homepage.

#### Homelab &amp; archiving

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Rack Recipes](<https://coolcode.ca/rack-recipes/>) | Plan a homelab from 12 self-hosted services, choose ports and storage, and export or reopen the Compose file. <br> Local inputs · Upstream container guides supply the images, ports and data paths. The planner estimates memory for your selections. Plan a media server or monitoring stack from 12 services, change ports and storage, and reopen the exported Compose file later. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/rack-recipes>) |
| [Archive Shelf](<https://coolcode.ca/archive-shelf/>) | Find early Canadian internet survey results by page or search your own collection. <br> Reference collection · Nine complete issues of Statistics Canada’s The Daily provide 75 searchable pages published from July 2001 to September 2010. Search “dial-up” to compare page 2 of the July 26, 2001 issue with page 5 of the September 23, 2003 issue. Open the PDF at either page or download the matching citations. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/archive-shelf>) |

#### Networks &amp; routing

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [DNS Lens](<https://coolcode.ca/dnslens/>) | Look up website, mail and exact-name DNS records, compare resolvers and compare saved reports. <br> On-demand lookup · Choose Google or Cloudflare for current DNS replies. Full reports include registration data, and saved JSON comparisons run in your browser. Download a DNS report before changing a domain, repeat the lookup afterwards and open the earlier JSON to see which answers changed at the same resolver. | [Source &amp; docs](<https://github.com/jsdyer/dnslens>) |
| [IP Snapshot](<https://coolcode.ca/ipsnapshot/>) | See ports, hostnames and vulnerability identifiers from passive InternetDB observations. <br> On-demand lookup · Shodan InternetDB returns observations for one public IP without observation dates. Ports, fingerprints and CVEs describe source observations and associations, with coverage and freshness varying by address. | [Source &amp; docs](<https://github.com/jsdyer/ipsnapshot>) |
| [Certificate Trail](<https://coolcode.ca/certtrail/>) | Trace issued certificates, names, issuers and dates across certificate transparency logs. <br> Multiple data sources · Certificate records come from a live crt.sh search or a JSON file you import. A validity-start-year timeline, name and issuer filters, deduplicated certificate records, name counts and a filtered CSV export help make historical results readable. | [Source &amp; docs](<https://github.com/jsdyer/certtrail>) |
| [Route Archaeologist](<https://coolcode.ca/routearchaeologist/>) | Trace observed BGP origins by IP prefix or ASN. <br> On-demand lookup · RIPEstat supplies historical route observations for your selected dates. The app compares observed origins and visibility and exports the selected prefix's intervals as CSV. | [Source &amp; docs](<https://github.com/jsdyer/routearchaeologist>) |
| [RPKI Guard](<https://coolcode.ca/rpkiguard/>) | Check whether a route origin ASN and prefix are authorized by published ROAs. <br> On-demand lookup · RIPEstat checks the submitted prefix and origin ASN on demand. Shared links populate the query without transmitting it until the user selects Validate. | [Source &amp; docs](<https://github.com/jsdyer/rpkiguard>) |
| [Outage Scope](<https://coolcode.ca/outagescope/>) | Explore network disruptions and compare the measurement signals behind them. <br> On-demand lookup · Georgia Tech IODA supplies outage signals for a window of up to 30 days. One disruption can affect several signals, and there can be gaps and uneven coverage. | [Source &amp; docs](<https://github.com/jsdyer/outagescope>) |
| [Broadband Atlas](<https://coolcode.ca/broadbandatlas/>) | Explore reported coverage, funding and nearby radio licences, with provincial plan prices. <br> Saved dataset · ISED maps broadband coverage and funded projects across Canada’s provinces and territories. Search by community, coordinates or hexagon ID, inspect individual cells, combine filters, and export matching records. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · Coverage file date: 2026-05-05 · 13 provinces and territories | [Source &amp; docs](<https://github.com/jsdyer/broadbandatlas>) |
| [Telecom Pulse](<https://coolcode.ca/telecompulse/>) | Compare the CRTC’s published telecommunications indicators over time. <br> Saved dataset · CRTC survey data show coverage by census area and prices by province and survey market. Broadband uses usual resident dwellings and mobile uses population. <br> Scheduled checks: weekly · Snapshot generated: 2026-11-17 · 6,634 coverage areas | [Source &amp; docs](<https://github.com/jsdyer/telecompulse>) |
| [Onion Pulse](<https://coolcode.ca/onionpulse/>) | Compare Tor user, relay, bridge and onion-service measurements. <br> Saved dataset · Tor Project measurements show daily network activity from January 2021 onward. Directory counts, measurement coverage, and client behaviour can affect the series. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · 2,146 calendar days | [Source &amp; docs](<https://github.com/jsdyer/onionpulse>) |
| [Blocked or Gone?](<https://coolcode.ca/blockedorgone/>) | Investigate interference and test coverage in public OONI measurements. <br> Saved dataset · OONI case studies supply the historical measurements, and a daily check updates the Canadian Discord example. The lookup form opens a source search for any domain and an optional country or UTC date range. <br> Scheduled checks: daily · Canadian sample retrieved: 2026-11-18 · 5 case studies | [Source &amp; docs](<https://github.com/jsdyer/blockedorgone>) |
| [Packet Detour](<https://coolcode.ca/packet-detour/>) | Inspect Canadian traceroute measurements and annotate the hops in your own route. <br> Multiple data sources · RIPE Atlas recorded the Vancouver and Montréal routes to K-root on October 1, 2025. You can also enter your own hop notes. Compare measured hop timings from Vancouver and Montréal, open the exact RIPE Atlas result, then annotate known countries and see where a route’s evidence runs out. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/packet-detour>) |
| [Protocol Cabinet](<https://coolcode.ca/protocol-cabinet/>) | Find slow HTTP requests, read DNS answers and follow recorded email delivery hops. <br> Multiple data sources · Inspect a local HAR, DNS JSON or email header, or request a live HTTP or DNS response. Open a browser HAR and sort by slowest request, inspect the answer rows in a DNS Lens export, or open an email’s original headers to read its recorded handoffs in delivery order. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/protocol-cabinet>) |
| [Prefix Diary](<https://coolcode.ca/prefixdiary/>) | Look up Canadian telephone assignments and trace IPv4 or IPv6 registration blocks across ARIN reports. <br> Saved dataset · The Canadian Numbering Administrator supplies telephone assignments. ARIN publishes dated IPv4 and IPv6 delegations by registration economy. Search 902 and Halifax for telephone assignments. In Canadian IP registrations, compare UBC’s IPv4 block or BCNET’s IPv6 block in the 2016, 2020 and latest ARIN editions, then open its observed routing history. <br> Scheduled checks: weekdays · Data retrieved: 2026-11-19 · Latest source date: 2026-11-18 · IP report date: 2026-11-18 · 46,400 prefixes · 10,276 IP registration records | [Source &amp; docs](<https://github.com/jsdyer/prefixdiary>) |

#### Security &amp; forensics

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Tracker X-Ray](<https://coolcode.ca/trackerxray/>) | Inspect a browser HAR or the requests recorded while this page loaded. <br> Local inputs · A local HAR supplies request details. The live page view uses same-origin timing entries observed by your own browser. Inspect this page’s load to see the requests your browser measured for Tracker X-Ray itself. To compare another site before and after a consent choice, export two sanitized HAR files from the same starting page and open them under Compare two HAR captures. | [Source &amp; docs](<https://github.com/jsdyer/trackerxray>) |
| [Header Autopsy](<https://coolcode.ca/headerautopsy/>) | Read HTTP header values and inspect security policy, cookies and cache signals. <br> Local inputs · Inspect pasted headers, a local HAR or a dated HTTP redirect and its final response. Choose Compare two responses and open the captured redirect and page. The path without a final slash returned 301. The destination returned 200 and a max-age of 600 seconds. | [Source &amp; docs](<https://github.com/jsdyer/headerautopsy>) |
| [Mail Path](<https://coolcode.ca/mailpath/>) | Trace the relay hops and authentication results recorded in the headers of an email you received. <br> Local inputs · Open an email or paste its original headers. Relay times and reported authentication results are read locally. Copy the Received and Authentication-Results fields from a message you received, including indented continuation lines. The timeline shows which servers recorded each hop and the delay between their timestamps. | [Source &amp; docs](<https://github.com/jsdyer/mailpath>) |
| [Packet Pocket](<https://coolcode.ca/packetpocket/>) | Compare capture traffic, inspect both directions of a conversation and export filtered packet or aggregate reports. <br> Local inputs · Your browser reads local PCAP and PCAPNG files. A second capture supplies aggregate rates and protocol shares for comparison. Compare two captures by protocol share and traffic rate, then select a conversation in the first capture to see its two directions. Export a filtered aggregate report to share counts and relative time bins without addresses or hostnames. | [Source &amp; docs](<https://github.com/jsdyer/packetpocket>) |
| [Dependency X-Ray](<https://coolcode.ca/dependencyxray/>) | Inspect dependency lockfiles and query advisories for selected packages. <br> Multiple data sources · Inspect your lockfile or compare two published project manifests. Optional OSV lookups send only the packages and versions you select. Compare pip 25.3 and 26.3, then filter for unchanged versions or inspect earlier versions no longer present. The package lists record what pip bundled in each release. | [Source &amp; docs](<https://github.com/jsdyer/dependencyxray>) |
| [Exploit Graveyard](<https://coolcode.ca/exploitgraveyard/>) | Search Canadian Cyber Centre notices and see which cited vulnerabilities also appear in CISA KEV. <br> Saved dataset · Cyber Centre alerts and advisories are matched to CISA’s known-exploited catalogue by the CVE identifiers printed in each Canadian notice. Open AV25-769 to see the Cyber Centre’s November 18, 2025 Fortinet notice. Expand its cited identifier, CVE-2025-58034, to see CISA’s listing date and the Canadian notices that name the same CVE. <br> Scheduled checks: daily · Canadian notices checked: 2026-11-19 · CISA catalogue released: 2026-11-18 · 6,536 Canadian notices · 1,786 KEV entries | [Source &amp; docs](<https://github.com/jsdyer/exploitgraveyard>) |
| [Patch Signal](<https://coolcode.ca/patchsignal/>) | Look up CVEs and compare reported exploitation, EPSS estimates and advisories. <br> Multiple data sources · The tool combines CISA’s exploited-vulnerability list with FIRST’s exploit-probability scores and supports individual lookups. A standalone lookup works for a CVE outside that catalogue. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source published: 2026-11-17 · EPSS score date: 2026-11-18 · 1,782 KEV entries | [Source &amp; docs](<https://github.com/jsdyer/patchsignal>) |

#### Government &amp; public records

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [ATIP Records Explorer](<https://coolcode.ca/atip/>) | Find released records, request copies, or draft an access request. <br> Saved dataset · Federal departments publish summaries of completed access-to-information requests in English and French. The last unquoted word matches prefixes as you type. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Request months: 2011-01–2026-11 · 206,151 summaries | [Source &amp; docs](<https://github.com/jsdyer/atip>) |
| [Government Memory Map](<https://coolcode.ca/governmentmemory/>) | Find record classes and personal information banks to reference in an access request. <br> Saved dataset · Six federal Info Source inventories describe the records and personal information banks each institution holds. Each result links to its source and offers a browser-local outline for a request, plus a topic link into the CoolCode ATIP Records Explorer. <br> Scheduled checks: weekly · Data retrieved: 2026-11-18 · 306 records | [Source &amp; docs](<https://github.com/jsdyer/governmentmemory>) |
| [The Briefing Room](<https://coolcode.ca/briefings/>) | Search briefing note titles and reference numbers. <br> Saved dataset · Federal departments publish briefing note titles, reference numbers and the institutions that prepared them. Select an institution to draft a request containing only its saved notes. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-11-18 · 161,747 briefing notes | [Source &amp; docs](<https://github.com/jsdyer/briefings>) |
| [Evidence Lab](<https://coolcode.ca/evidencelab/>) | Search disclosure PDFs, find dates and section references, and save page citations. <br> Local inputs · Read a local PDF or investigate the 230-page Nova Scotia bridge-inspection disclosure 2020-00906-TIR. Your annotations stay in this tab. Open the 2020 Nova Scotia bridge release and search Allain Creek. Physical PDF page 2 lists both a Level 1 and a Level 2 inspection. Pin the page to keep the citation in your evidence brief. | [Source &amp; docs](<https://github.com/jsdyer/evidencelab>) |
| [The ATIP Popularity Index](<https://coolcode.ca/atippopularity/>) | See which released records received the most informal copy requests. <br> Saved dataset · Treasury Board records how often people request copies of previously released access-to-information packages. The reporting periods are the months when copies of completed records were requested. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-10-07 · Reported months: 2019-09–2026-09 · 58,806 release and month combinations | [Source &amp; docs](<https://github.com/jsdyer/atippopularity>) |
| [ATIP Metrics](<https://coolcode.ca/atipmetrics/>) | Compare institutional workloads, find related records and briefing notes, and build a request draft. <br> Saved dataset · Treasury Board workbooks report access and privacy requests by institution and fiscal year. The table is searchable, sortable, linkable, and exportable as CSV. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · 4 fiscal years | [Source &amp; docs](<https://github.com/jsdyer/atipmetrics>) |
| [What the Minister Was Prepared to Say](<https://coolcode.ca/ministersays/>) | Compare Question Period notes and the issues they address. <br> Saved dataset · Federal departments publish bilingual Question Period notes with prepared ministerial responses. The published dates and ministry codes are source fields, and the interface preserves missing values. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-11-18 · 7,676 notes | [Source &amp; docs](<https://github.com/jsdyer/ministersays>) |
| [The Government’s Wrongdoing Files](<https://coolcode.ca/wrongdoings/>) | Read published findings, recommendations and corrective actions. <br> Saved dataset · Federal disclosures describe founded wrongdoing and the department’s response. Dates are file dates from the source. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-11-18 · 73 disclosures | [Source &amp; docs](<https://github.com/jsdyer/wrongdoings>) |
| [Algorithm Watch](<https://coolcode.ca/algorithmwatch/>) | Explore the federal AI register and find matched impact assessments. <br> Saved dataset · Entries from Canada’s AI Register link to verified impact assessments where available. The source supplies status dates and personal-information fields, with blanks left as unreported. <br> Scheduled checks: weekly · Snapshot generated: 2026-11-16 · Source updated: 2026-04-28 · 412 AI register entries | [Source &amp; docs](<https://github.com/jsdyer/algorithmwatch>) |
| [The Government Dataset Explorer](<https://coolcode.ca/datasetexplorer/>) | Find federal datasets and their downloadable files. <br> Saved dataset · Canada’s Open Government Portal lists each dataset’s publisher and available file formats. Filter by format, organization and modified year. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-11-18 · 48,327 catalogue entries | [Source &amp; docs](<https://github.com/jsdyer/datasetexplorer>) |
| [The Open Data Graveyard](<https://coolcode.ca/opendatagraveyard/>) | Investigate datasets removed from the federal catalogue. <br> Saved dataset · Treasury Board lists records removed from the federal open-data portal. Each entry offers links to check its original URL, archived captures and related current releases. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-05-09 · 3,934 removed entries | [Source &amp; docs](<https://github.com/jsdyer/opendatagraveyard>) |
| [Canada.ca Pulse](<https://coolcode.ca/canadaanalytics/>) | Explore recent patterns in federal government website usage. <br> Saved dataset · Employment and Social Development Canada publishes monthly measures of Canada.ca usage and services. Compare published numeric series over any portion of the rolling window, inspect the exact source values for each month, or export the comparison as a CSV. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source updated: 2026-11-03 · Reporting months: 2023-11–2026-10 · 539 metric series | [Source &amp; docs](<https://github.com/jsdyer/canadaanalytics>) |
| [Salmon Lines](<https://coolcode.ca/salmonlines/>) | Compare historical Pacific salmon spawning estimates and explore the Chilliwack River records behind a fish-passage case study. <br> Saved dataset · DFO’s NuSEDS records spawning estimates by population, waterbody and year, with separate fields for adult spawners and total returns. Select Chilliwack River coho to see which survey years precede the Bench Road repair, then open the provincial crossing records. <br> Scheduled checks: monthly · Source published: 2026-06-01 · Analysis years: 1920–2025 · 421,001 annual records <br> [![Salmon Lines data retrieved 2026-11-18](<https://coolcode.ca/salmonlines/data-date.svg>)](<https://coolcode.ca/salmonlines/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/salmonlines>) |
| [Dataset Diff](<https://coolcode.ca/datasetdiff/>) | Compare CSV or GeoJSON snapshots by record ID and inspect changes to fields and geometry. <br> Local inputs · Both CSV or GeoJSON files stay in your browser while it matches records by the ID you choose. Compare the 2020 and 2023 Nova Scotia bridge releases by record\_id. Four of the nine Annapolis County bridges changed Level 1 rating. Open ANN002 to see Anderson Brook Bridge move from 3 to 2. | [Source &amp; docs](<https://github.com/jsdyer/datasetdiff>) |
| [Crossing Record](<https://coolcode.ca/crossingrecord/>) | Compare ICBC crash counts at Langley intersections before and after documented road work. <br> Saved dataset · ICBC crash records are grouped by named junction and year, with Langley City project records for selected locations. Choose a Langley junction and compare annual averages on either side of a reference year. Douglas Crescent at 203 Street and 56 Avenue at 201A Street have linked, completed city projects. The project year is excluded from both periods. Counts represent crashes reported to ICBC, and the view shows how many years support each average. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Coverage: 2021–2025 · 1,245 junctions | [Source &amp; docs](<https://github.com/jsdyer/crossingrecord>) |
| [Park Visits](<https://coolcode.ca/parkvisits/>) | Compare annual attendance at Fort Langley, Halifax Citadel and ten other Parks Canada places. <br> Saved dataset · Parks Canada publishes fiscal-year visits for each place, including reporting gaps and temporary closures. Start with Fort Langley and Halifax Citadel, pick a fiscal year, then compare both places across the full table. Counts represent visits and can include repeat visitors. The twelve-place selection also covers BC, Nova Scotia, New Brunswick, PEI and Alberta. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Coverage: 2001-04-01–2026-03-31 · 12 places | [Source &amp; docs](<https://github.com/jsdyer/parkvisits>) |
| [Aurora Trace](<https://coolcode.ca/auroratrace/>) | Pick a May or October 2024 storm night and trace its solar eruptions and magnetic signals across Canada. <br> Saved dataset · NASA DONKI links solar eruptions to two 2024 storms, with Canadian ground measurements from INTERMAGNET. Choose May 10 or October 10, then select the first peak Kp interval to read both observatories at the same time. At 21:00 UTC on May 10, Victoria’s northward field was 160 nT below its reference while St. John’s was 354 nT above its own. <br> Scheduled checks: monthly archive check · Data retrieved: 2026-11-19 · 2,016 station averages | [Source &amp; docs](<https://github.com/jsdyer/auroratrace>) |
| [Mass Peaks](<https://coolcode.ca/masspeaks/>) | Find particle peaks by comparing pairs of muons with opposite and matching charges. <br> Saved dataset · CERN’s CMS outreach sample supplies the reconstructed mass and charges of two muons in 100,000 collision events. Select the J/ψ window, 0.10 GeV/c² bins and both charge selections. In the 3.00 to under 3.10 interval there are 4,512 opposite-charge and 558 same-charge pairs. Switch to percentages to compare each bin with its full charge sample. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 100,000 collision events | [Source &amp; docs](<https://github.com/jsdyer/masspeaks>) |

#### Public disclosures

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Corporate Ghosts](<https://coolcode.ca/corporateghosts/>) | Search Canada’s federal corporate register and compare legal statuses. <br> Saved dataset · Four federal registry exports from ISED cover active and inactive corporations. The CSV does not provide a complete history of legal names. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · 1,580,735 corporate records | [Source &amp; docs](<https://github.com/jsdyer/corporateghosts>) |
| [Lobby Trail](<https://coolcode.ca/lobbytrail/>) | Explore reported federal lobbying communications by organization, subject and institution. <br> Saved dataset · Federal lobbying reports identify the organizations reporting in-house communications with public office holders. Each report counts once even when it names multiple institutions or subjects. <br> Scheduled checks: weekly · Data retrieved: 2026-11-18 · Source export: 2026-11-16 · Data through: 2026-11-13 · 269,615 communication reports · Verified saved export | [Source &amp; docs](<https://github.com/jsdyer/lobbytrail>) |
| [Charity Flows](<https://coolcode.ca/charityflows/>) | Compare Canadian charity filings and explore grants to reported recipients. <br> Saved dataset · CRA charity filings report finances and gifts to qualified donees. Compare available fiscal periods, inspect qualified-donee gift values, and follow recipients where their reported charity business number exactly matches the index. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · Filing years: 2022–2024 · 87,802 charities | [Source &amp; docs](<https://github.com/jsdyer/charityflows>) |
| [Tariff X-Ray](<https://coolcode.ca/tariffxray/>) | Find Canadian telecom tariff items and the regulatory decisions behind them. <br> Reference collection · The listed Bell and TELUS wholesale fibre rates come from two CRTC orders. Comparable entries in a details panel have the same published speed tier or charge category across orders. <br> Source reviewed: 2026-11-16 · 28 rate entries | [Source &amp; docs](<https://github.com/jsdyer/tariffxray>) |
| [Gear Autopsy](<https://coolcode.ca/gearautopsy/>) | Find device filings and public FCC exhibits by model or FCC ID. <br> Reference collection · The tool links selected devices to their reviewed FCC equipment exhibits. Review a device record or export visible exhibit links as CSV. <br> Source reviewed: 2026-11-16 · 14 devices | [Source &amp; docs](<https://github.com/jsdyer/gearautopsy>) |
| [Recall Radar](<https://coolcode.ca/recallradar/>) | Search Canadian safety alerts and check affected vehicle makes, models and years. <br> Saved dataset · Health Canada recall notices appear alongside Transport Canada’s 60-day vehicle recall file. The watchlist runs on visits and has no background notifications. <br> Scheduled checks: daily · Data retrieved: 2026-11-18 · 34,389 notices | [Source &amp; docs](<https://github.com/jsdyer/recallradar>) |
| [Patent Attic](<https://coolcode.ca/patentattic/>) | Search Canadian technology patents and open original CIPO records. <br> Reference collection · Each selected Canadian patent publication has been checked against its original record. Each result links to the publication copy, its drawings where available, and the CIPO record or search. <br> Source reviewed: 2026-11-16 · 22 selected patent publications | [Source &amp; docs](<https://github.com/jsdyer/patentattic>) |
| [Spill Ledger](<https://coolcode.ca/spillledger/>) | Follow marine pollution incidents in BC and Nova Scotia through claims, offers and recoveries. <br> Saved dataset · A federal compensation fund’s 2023–24 report lists incidents and financial decisions, including preventive responses and cases with several claimants. The June 2015 Farley Mowat incident in Shelburne has separate claims by the town and the Canadian Coast Guard. Select the incident to compare the amounts submitted and offered, alongside the shared recovery entry. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Report fiscal year ending: 2024 · 81 incidents | [Source &amp; docs](<https://github.com/jsdyer/spillledger>) |
| [Bridge Ledger](<https://coolcode.ca/bridgeledger/>) | Look up historical Nova Scotia bridge inspections and compare dated ratings on the same scale. <br> Saved dataset · Two provincial information releases record bridge inspection dates, types and ratings. The NS Structures Database supplies locations by structure ID. Anderson Brook Bridge in Annapolis County received a general rating of Good on April 22, 2020 and Fair on April 26, 2023. Its detailed inspections use a separate scale. The place link comes from a unique match on the provincial structure ID. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Release years: 2020–2023 · 1,619 inspection records | [Source &amp; docs](<https://github.com/jsdyer/bridgeledger>) |
| [Dispatch Ledger](<https://coolcode.ca/dispatchledger/>) | Compare Halifax police service demand by agency, reporting channel and period. <br> Saved dataset · Halifax Board of Police Commissioners reports provide service counts by agency and separate district crime totals. Compare public-generated calls, proactive calls and online reports from January through June in two years. Switch between regional police, the RCMP Halifax Regional Detachment and the published combined figures. The district table counts recorded crime in 2025 and uses a different unit from the service table. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Coverage: 2024-01–2025-06 · 9 patrol divisions | [Source &amp; docs](<https://github.com/jsdyer/dispatchledger>) |

#### Maps, trails &amp; history

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Trailglass](<https://coolcode.ca/trailglass/>) | Explore municipal trails, download mapped segments as GPX and inspect your own recorded rides. <br> Multiple data sources · Vancouver, Langley and Halifax publish the mapped segments. Activity times and elevations come from GPX files you open. Select a map segment to download its GPX with the municipality, source record and licence. The inspector also reads local GPX activities with recorded times and elevations. <br> Scheduled checks: weekly · Oldest source retrieved: 2026-11-19 · 6,236 mapped trail segments | [Source &amp; docs](<https://github.com/jsdyer/trailglass>) |
| [Weather Archive](<https://coolcode.ca/weatherarchive/>) | Compare up to 30 years of daily Canadian station weather, inspect monthly tables and export measurements with their flags. <br> On-demand lookup · ECCC supplies daily records and available monthly normals. The tool follows every results page for the selected stations and dates. Compare all of 2024 at Langley and Halifax, inspect the daily table one month at a time and download both stations in a single CSV. Blank measurements keep their place in the record. | [Source &amp; docs](<https://github.com/jsdyer/weatherarchive>) |
| [Spectrum Atlas](<https://coolcode.ca/spectrumatlas/>) | Map published spectrum authorizations and inspect bands and frequencies. <br> Saved dataset · ISED records identify fixed-service and terrestrial radio assignments in BC and Nova Scotia. CSV exports include the search centre, radius and each exported match's distance while the radius filter is active. <br> Scheduled checks: monthly · Snapshot generated: 2026-11-16 · 298,391 published spectrum records | [Source &amp; docs](<https://github.com/jsdyer/spectrumatlas>) |
| [Shipwreck Explorer](<https://coolcode.ca/shipwrecks/>) | Search Nova Scotia wrecks by area, vessel and date. <br> Saved dataset · Nova Scotia’s Marine Heritage database documents wrecks and gives map positions where known. Choose a 25-year interval in the timeline or filter by era and event. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Source published: 2024-07-05 · 4,939 shipwreck records | [Source &amp; docs](<https://github.com/jsdyer/shipwrecks>) |
| [Forgotten Places](<https://coolcode.ca/forgottenplaces/>) | Explore sites in Canada’s historic places register. <br> Saved dataset · Parks Canada’s register supplies the records of federally designated heritage places. A record's map-search link uses the address or locality reported by the register. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Data through: 2025-12-12 · 2,527 heritage records | [Source &amp; docs](<https://github.com/jsdyer/forgottenplaces>) |
| [Names That Time Forgot](<https://coolcode.ca/namesforget/>) | Trace Canadian place names, features and their locations. <br> Saved dataset · The Canadian Geographical Names Database supplies names for land and underwater features. Filter by province, territory or undersea area, and open a record for source coordinates and naming information. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · 369,896 place-name records | [Source &amp; docs](<https://github.com/jsdyer/namesforget>) |
| [BC Place Names Explorer](<https://coolcode.ca/bcplacenames/>) | Explore nearby BC place names, official and recorded names, and naming decisions. <br> On-demand lookup · The BC Geographical Names service returns matches for the name or location you choose. Distances are straight-line distances to reference points. | [Source &amp; docs](<https://github.com/jsdyer/bcplacenames>) |
| [Hidden Water](<https://coolcode.ca/hiddenwater/>) | Explore mapped Langley waterways and follow a Fraser Valley fish crossing from barrier assessment to completed repair. <br> Saved dataset · Langley maps trace channels and culverts. BC fish-passage records document the assessment, habitat and repair of crossing 1474. At Chilliwack Bench, compare the verified habitat length in the database with the length of habitat the project report says became accessible. <br> Scheduled checks: weekly · Waterways retrieved: 2026-11-18 · Fish passage retrieved: 2026-11-19 · 28,921 mapped segments | [Source &amp; docs](<https://github.com/jsdyer/hiddenwater>) |
| [Halifax Time Lens](<https://coolcode.ca/halifaxtimelens/>) | Compare Halifax in 1947 and 1977, trace four places through archival photographs, and save nearby photo references to a map-ready notebook. <br> Multiple data sources · NRCan aerial mosaics, digitized Halifax Municipal Archives photographs and a weekly municipal photo index anchor each comparison. Start with Cogswell and Scotia Square to compare the blocks before clearance with the 1977 mosaic, then open the 1961 photograph and the later demolition view. At the ferry terminal, see the closest 1955 and 2001 archive references within one kilometre, show the indexed points on both maps, and save references to a downloadable GeoJSON notebook. <br> Scheduled checks: weekly · Photo index retrieved: 2026-11-19 · 340 photographs | [Source &amp; docs](<https://github.com/jsdyer/halifaxtimelens>) |
| [Langley Changes](<https://coolcode.ca/langleychanges/>) | Follow Langley development applications and see when Township building permits appeared or left the active list. <br> Saved dataset · City and Township planning records include application status and original documents. The Township active permit list provides folder numbers, issue dates, project descriptions and civic addresses. Search a street to see which permit folders were listed there, then open a folder to compare its issue date with the first and last times CoolCode saw it. <br> Scheduled checks: daily · Planning records retrieved: 2026-11-18 · Permit list checked: 2026-11-19 · 644 planning records · 2,091 listed permit folders | [Source &amp; docs](<https://github.com/jsdyer/langleychanges>) |
| [Strange Skies Canada](<https://coolcode.ca/strangeskies/>) | Search aviation occurrence reports by location, year and event. <br> Saved dataset · Transport Canada’s CADORS reports describe aviation occurrences, events and the aircraft involved. The source category “Weather balloon, meteor, rocket, CIRVIS/UFO” combines several possible observations. <br> Scheduled checks: daily · Snapshot generated: 2026-11-18 · Data through: 2026-11-12 · 408,725 aviation occurrences | [Source &amp; docs](<https://github.com/jsdyer/strangeskies>) |
| [Lightkeeper](<https://coolcode.ca/lightkeeper/>) | Explore Canadian coastal lights, play their published signals and compare nearby aids. <br> Saved dataset · The Coast Guard’s List of Lights gives each light’s position, colour and flash pattern. When source remarks give a complete sequence, the app displays the flash and eclipse durations. <br> Scheduled checks: twice monthly · 6,494 positioned lights <br> [![Lightkeeper data retrieved 2026-11-18](<https://coolcode.ca/lightkeeper/data-date.svg>)](<https://coolcode.ca/lightkeeper/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/lightkeeper>) |
| [Storm Tracks](<https://coolcode.ca/stormtracks/>) | Replay Atlantic storm tracks and compare how high the water rose above predicted tides during Fiona and Dorian. <br> Saved dataset · NOAA tracks describe storm positions and winds. Canadian Hydrographic Service gauges show measured water levels alongside tide predictions. Move through a 48-hour storm window to compare the same quarter hour at each gauge and see how many readings support each peak. <br> Scheduled checks: monthly · Tracks retrieved: 2026-11-18 · Seasons: 1851–2025 · Harbour data retrieved: 2026-11-19 · 2,275 storm tracks · 2 storm windows <br> [![Read the dataset retrieval date for Storm Tracks](<https://coolcode.ca/stormtracks/data-date.svg>)](<https://coolcode.ca/stormtracks/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/stormtracks>) |
| [Clam Grounds](<https://coolcode.ca/clamground/>) | Explore Maritime soft-shell clam habitat, compare provincial landing histories and read Nova Scotia’s 1931 district returns. <br> Saved dataset · DFO reports habitat and annual commercial landings. The 1931 fisheries return gives clam barrels and canned cases for ten Nova Scotia counties. Compare Nova Scotia and New Brunswick over the same years to see where DFO published landings or withheld them. For a local historical view, choose a county in the 1931 returns and check its barrels or canned cases against the linked scan of page 84. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Landings coverage: 1990–2024 · 280 landings records | [Source &amp; docs](<https://github.com/jsdyer/clamground>) |
| [Ferry Counts](<https://coolcode.ca/ferrycountss/>) | Compare hourly passenger patterns on Halifax harbour ferries and Vancouver’s SeaBus. <br> Saved dataset · Halifax Transit supplies dated boarding counts and TransLink publishes seasonal SeaBus averages by hour and direction. Compare Halifax to Alderney against the return direction on weekdays. Expand the hourly figures to see how many dates contributed to each average, or download the comparison as CSV. Switch to Vancouver Harbour to compare SeaBus volumes by direction, season and day type. <br> Scheduled checks: weekly halifax · monthly seabus edition check · Halifax retrieved: 2026-11-18 · Observation period: 2025-11-01–2026-10-31 · SeaBus retrieved: 2026-11-19 · SeaBus coverage: 2023–2025 · 52,238 boarding records | [Source &amp; docs](<https://github.com/jsdyer/ferrycountss>) |
| [Well Layers](<https://coolcode.ca/welllayers/>) | Pick a depth to read every sampled Langley and rural Halifax well log, or compare two drillers’ exact intervals side by side. <br> Saved dataset · B.C. GWELLS descriptions and Nova Scotia well-log material codes supply source intervals, gaps and drilling observations. At 20 m, Langley 30145 records “coarse sand” and Hammonds Plains 000119 records “shale / unknown”. Use the paired example to read both intervals, then open the all-logs table to see what every sampled well records at that same depth. Switch units without moving the selected physical depth. The table distinguishes explicit unknown terms, an empty material field, overlapping intervals, gaps and the end of a log. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 66 well logs | [Source &amp; docs](<https://github.com/jsdyer/welllayers>) |
| [Camp Calendar](<https://coolcode.ca/campcalendar/>) | Compare how far ahead campers booked at Nova Scotia provincial parks, two parks at a time. <br> Saved dataset · Overnight reservations from Nova Scotia’s provincial parks show how far ahead campers booked their trips. Select July, RV and Friday or Saturday to compare the booking lead time at Rissers Beach with Graves Island. The percentile range covers the middle half of successful bookings. <br> Scheduled checks: monthly · Data retrieved: 2026-11-18 · Arrival years: 2011–2024 · 506,927 reservations | [Source &amp; docs](<https://github.com/jsdyer/campcalendar>) |
| [Snow Courses](<https://coolcode.ca/snowcourses/>) | Compare snow depth and water content across years at British Columbia snow stations. <br> Saved dataset · Provincial surveyors measure snow courses and automated instruments report readings from Fraser basin stations. Try Grouse Mountain’s April survey, then select Barkerville under Automated station to compare the same date across earlier winters. The table separates missing readings, reported zeros and source flags. <br> Scheduled checks: daily · Data retrieved: 2026-11-18 · Latest source date: 2026-11-18 · 394 stations | [Source &amp; docs](<https://github.com/jsdyer/snowcourses>) |
| [Coal Below](<https://coolcode.ca/coalbelow/>) | Explore Nova Scotia’s mapped underground coal workings alongside coal seams and present-day streets. <br> Saved dataset · Nova Scotia Geological Survey lines trace coal seams and polygons outline recorded underground workings. In Springhill, toggle the seam lines and shaded workings separately, then select a workings outline to read its mapped area and mine-plan note. The three Sydney Mines, Florence and Point Aconi workings areas share a seam layer and appear together in the area selector. <br> Scheduled checks: monthly · Data retrieved: 2026-11-18 · Provincial edition: 2026-10 · 366 mapped features | [Source &amp; docs](<https://github.com/jsdyer/coalbelow>) |
| [Ice Weeks](<https://coolcode.ca/iceweeks/>) | Compare the same winter week on Canadian Ice Service concentration charts for the East Coast, including the Gulf of St. Lawrence. <br> Saved dataset · Canadian Ice Service charts show weekly East Coast ice concentration across winters. Choose winters 2025–2026 and 2024–2025 and move to week 12 to compare the charts issued February 16, 2026 and February 17, 2025. An empty panel means the archive index has no chart in that week. <br> Scheduled checks: weekly · Data retrieved: 2026-11-18 · Chart issue dates: 2024-02-12–2026-04-27 · 55 chart dates | [Source &amp; docs](<https://github.com/jsdyer/iceweeks>) |
| [Ferry Record](<https://coolcode.ca/ferryrecord/>) | Trace service on a BC ferry route, compare quarters and read the original operations reports. <br> Saved dataset · BC Ferries reports actual round trips and vehicle capacity by route. A 2013 provincial briefing documents passenger-only services to Bowen Island. On Route 08, compare the quarters ending June 2025 and June 2026. The operator recorded 1,386 and 1,384 round trips respectively, while passenger totals rose from 374,200 to 387,857. <br> Scheduled checks: weekly · Data retrieved: 2026-11-19 · Report quarters: 2024-06-30–2026-06-30 · 225 route-quarter records | [Source &amp; docs](<https://github.com/jsdyer/ferryrecord>) |
| [Schoolhouse Ledger](<https://coolcode.ca/schoolhouseledger/>) | Compare enrolment, daily attendance and spending in historic Lower Mainland schools. <br> Saved dataset · BC’s 1894–95 schools report records enrolment and average attendance across school years, alongside each school’s expenditure in the report year. In 1894–95 Langley enrolled 32 pupils and averaged 19.79 present each day. Langley East enrolled 23 and averaged 12.85. Earlier attendance tables and the report-year financial figures cover different periods. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · School years ending: 1890–1895 · 38 school-year records | [Source &amp; docs](<https://github.com/jsdyer/schoolhouseledger>) |
| [Library Workbench](<https://coolcode.ca/libraryworkbench/>) | Match a tape to a Vancouver lab station, estimate transfer time and storage, and compare library use in Vancouver and Nova Scotia. <br> Saved dataset · Library equipment and transfer guides, Vancouver lab activity and Nova Scotia’s regional library survey supply the estimates and comparisons. Try a PAL Hi8 cassette in the Vancouver transfer planner. Enter 60, 90, 45 for three tapes to see 3 h 15 min of real-time copying and roughly 13 GB of storage before setup and saving. Explore Regular 8 film, quarter-inch audio reels or floppy disks in the equipment directory. In the activity table, minutes per session relates reported hours to sessions. Select Halifax in 2024–25 to compare its survey and annual-report figures. <br> Scheduled checks: monthly · Survey retrieved: 2026-11-19 · 54 library-region years | [Source &amp; docs](<https://github.com/jsdyer/libraryworkbench>) |
| [Shopfront Diary](<https://coolcode.ca/shopfrontdiary/>) | Compare two historic directories address by address to trace shops, neighbours and recorded vacancies in Halifax and Vancouver. <br> Saved dataset · Digitized Halifax and Vancouver directories supply selected shop listings and their printed source pages from 1890–1909. Compare Halifax’s 1890–91 and 1899–1900 directories to find the explicit vacancies at 80 and 100–102 Upper Water. On the same street, see both listed occupants at number 54, alongside the earlier 54–56 range. Compare Vancouver in 1901 and 1903 to see John Oben listed at 413 Hastings W in both, alongside different second shop addresses. Each entry links to its source page. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 49 directory listings | [Source &amp; docs](<https://github.com/jsdyer/shopfrontdiary>) |
| [Transfer Window](<https://coolcode.ca/transferwindow/>) | See how many scheduled 555 transfers survive a delay at Carvolth or Lougheed and how much time a missed connection adds. <br> Saved dataset · TransLink’s static GTFS timetable supplies scheduled 555 arrivals, onward departures, bays and service-date exceptions. Choose a morning or evening arrival window at Carvolth or Lougheed. Compare two- to twenty-minute delays to see how many connections hold and which arrivals face the longest added wait. <br> Scheduled checks: daily · Data retrieved: 2026-11-19 · Coverage: 2026-09-07–2027-01-03 · 8 transit routes | [Source &amp; docs](<https://github.com/jsdyer/transferwindow>) |
| [SeaBus Clock](<https://coolcode.ca/seabusclock/>) | Find the busiest SeaBus hours by direction and see the scheduled gap between sailings. <br> Saved dataset · TransLink publishes seasonal hourly SeaBus volumes and a separate timetable for Waterfront and Lonsdale Quay. Compare fall weekday volumes in each direction, then select a terminal and service date to see the scheduled wait after a missed sailing. <br> Scheduled checks: daily timetable · monthly performance check · Data retrieved: 2026-11-19 · Coverage: 2023–2025 · Timetable retrieved: 2026-11-19 · 697 hourly volume records | [Source &amp; docs](<https://github.com/jsdyer/seabusclock>) |
| [Streetwork Diary](<https://coolcode.ca/streetworkdiary/>) | Compare Halifax street-service requests, closures and published resolution fields by community and week. <br> Saved dataset · Halifax Cityworks intake records joined to published custom-field names for two reporting weeks. Start with street-surface requests for April 1–7, 2025. Compare closed counts, published resolution coverage and custom-field coverage, then switch to another request type. <br> Scheduled checks: weekly · Cityworks data retrieved: 2026-11-19 · 276 requests | [Source &amp; docs](<https://github.com/jsdyer/streetworkdiary>) |
| [Route Mirror](<https://coolcode.ca/routemirror/>) | See which Metro Vancouver bus routes switch their busier direction between peaks and which repeat the pattern every year. <br> Saved dataset · TransLink publishes average peak passenger loads by route, direction, time band, season, day type and year. Start with route 555 on fall weekdays to see how its westbound morning lead and eastbound afternoon lead change across years. Open the repeat-reversal ranking to compare its smallest lead with other routes. <br> Scheduled checks: monthly edition check · Data retrieved: 2026-11-19 · Coverage: 2023–2025 · 12,901 peak-load records | [Source &amp; docs](<https://github.com/jsdyer/routemirror>) |
| [Postmark Places](<https://coolcode.ca/postmarkplaces/>) | Read a historic postmark by matching its name and date to documented post-office openings, renamings and closures. <br> Saved dataset · Langley and Dartmouth heritage reports document office names, openings, closures and moves. Compare the “Langley Prairie” postmark in 1910 and 1912. The earlier office became Murrayville on May 16, 1911, the day a different office took the Langley Prairie name. Browse Dartmouth’s history to see how its post office moved between a general store and a purpose-built building. Approximate openings and undocumented closures are labelled on the cards. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 12 post offices | [Source &amp; docs](<https://github.com/jsdyer/postmarkplaces>) |
| [Lake Profiles](<https://coolcode.ca/lakeprofiles/>) | Compare dissolved oxygen and temperature at measured depths on different Halifax lake visits. <br> Saved dataset · Municipal LakeWatchers depth readings for Dartmouth’s Banook and Albro monitoring stations. Choose Lake Banook, compare April 18 and August 14, 2023 at 10 metres, and switch between oxygen and temperature. The plot and table include only measured depths. <br> Scheduled checks: weekly · Municipal profiles retrieved: 2026-11-19 · Sample dates: 2022-04-27–2024-09-03 · 184 readings | [Source &amp; docs](<https://github.com/jsdyer/lakeprofiles>) |
| [Forecast Receipt](<https://coolcode.ca/forecastreceipt/>) | See how a five-day temperature forecast holds up against hourly readings at Langley Regional and Halifax Stanfield. <br> Saved dataset · Six-hourly forecast receipts are matched to hourly temperatures from Environment and Climate Change Canada at two airports. Choose an airport and compare the 0–24-hour and 96–120-hour results for one provider. Check each matched count and inspect the largest revision to see two predictions for the same local weather hour. <br> Scheduled checks: every six hours · Latest capture: 2026-11-19 04:43 UTC · Archive began: 2026-11-19 · 2 station forecasts · 80 forecast points | [Source &amp; docs](<https://github.com/jsdyer/forecastreceipt>) |
| [Fossil Neighbours](<https://coolcode.ca/fossilneighbours/>) | Explore the fossils recorded at Joggins and Haslam, then compare Canadian collections whose ages overlap. <br> Saved dataset · Paleobiology Database collections, occurrence identifications and references document the Joggins and Haslam formations and selected age peers. Start at Coal Mine Point in the Joggins Formation and search for Hylonomus to see how several reported names resolve to one accepted taxon. Switch to Haslam on Vancouver Island to compare its much younger collections with Canadian collections whose age ranges overlap. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 509 occurrence records | [Source &amp; docs](<https://github.com/jsdyer/fossilneighbours>) |
| [Air Pair](<https://coolcode.ca/airpair/>) | Compare hourly fine-particle measurements with air-quality model estimates at Langley Central and Lake Major. <br> Saved dataset · Daily checks pair B.C. and Nova Scotia station measurements with Copernicus CAMS Global estimates from Open-Meteo. Each station shows its own source dates. Choose Lake Major and May–June 2023 to inspect the hour of the measured particle peak and compare it with the CAMS estimate at the same UTC hour. Langley refreshes from preliminary readings, while Lake Major’s latest validated week follows the provincial annual release. The count includes each paired station-hour once across all displayed weeks. <br> Scheduled checks: daily; nova scotia releases validated data annually · Data retrieved: 2026-11-19 · Latest Langley reading: 2026-11-19 · Latest Lake Major reading: 2026-01-01 · 503 paired station-hours | [Source &amp; docs](<https://github.com/jsdyer/airpair>) |
| [Plume Diary](<https://coolcode.ca/plumediary/>) | Compare satellite views of the Fraser River mouth with daily flow measured upstream at Hope. <br> Saved dataset · NASA Terra/MODIS true-colour images show the delta at the same scale. Water Survey of Canada supplies daily mean discharge upstream. Compare June 21 and June 28, 2021 at the same image scale. Hope measured 6,970 and 7,650 m³/s on those dates. Try the earlier-flow selector to see how an assumed travel time changes the comparison. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 4 satellite scenes | [Source &amp; docs](<https://github.com/jsdyer/plumediary>) |
| [Quake Echo](<https://coolcode.ca/quakeecho/>) | Compare agency estimates of the same Sunshine Coast earthquake and explore where people reported feeling it. <br> Saved dataset · Earthquakes Canada publishes a reviewed event bulletin. USGS supplies its preferred estimate, dated products and public intensity reports. Search for Sechelt, then compare its community intensity with the preferred Canadian and US magnitudes. Change the minimum response count to see which places are supported by many independent submissions. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 144 reported areas | [Source &amp; docs](<https://github.com/jsdyer/quakeecho>) |

#### Sky &amp; photography

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Nightfinder](<https://coolcode.ca/nightfinder/>) | Plan a night shoot around darkness, target positions and lens framing. <br> Local inputs · Sun, Moon and target positions are calculated on your device for your time and location. The display covers local noon to the following noon, including daylight saving changes. | [Source &amp; docs](<https://github.com/jsdyer/nightfinder>) |
| [Satellite Pass](<https://coolcode.ca/satpasses/>) | Calculate passes for the ISS and other satellites from your location. <br> Saved dataset · Your browser uses orbital elements from CelesTrak to calculate satellite passes for your location. Read the dated orbit epoch as well as the snapshot retrieval date, especially after maneuvers. <br> Scheduled checks: every 4 hours · Data retrieved: 2026-11-18 22:56 UTC · 6 satellites | [Source &amp; docs](<https://github.com/jsdyer/satpasses>) |
| [Sky Archive Explorer](<https://coolcode.ca/skyarchive/>) | Find selected Hubble and Webb observations and open the original archive records. <br> Saved dataset · The MAST archive supplies selected Hubble and Webb observations of five targets. Inspect dates, coordinates, exposure and wavelength fields, preview source imagery, and export filtered metadata to CSV. <br> Scheduled checks: weekly · Data retrieved: 2026-11-19 · 30 selected observations | [Source &amp; docs](<https://github.com/jsdyer/skyarchive>) |
| [Photo Lab](<https://coolcode.ca/photolab/>) | Compare photo metadata across a collection, crop individual images and export clean copies. <br> Local inputs · Your JPEG and PNG files stay on this device. The included Apollo 8 photograph comes from NASA. Open a group of photos to compare camera names, capture times and GPS presence. Download the inventory as CSV or select a filename to crop and export a clean copy. | [Source &amp; docs](<https://github.com/jsdyer/photolab>) |
| [Otherworld Names](<https://coolcode.ca/otherworldnames/>) | Explore named features on the Moon and Mars, and find low-angle sunlight at lunar craters from Langley or Halifax. <br> Saved dataset · USGS/IAU feature centres and JPL Horizons ephemerides support the lunar observing planner. Hourly ECCC cloud forecasts are available on demand. The name origins and source country/cultural group labels come directly from the Gazetteer. <br> Scheduled checks: monthly · Horizons retrieved: 2026-11-19 · 11,141 named features · 284 site-evenings <br> [![Otherworld Names data retrieved 2026-11-18](<https://coolcode.ca/otherworldnames/data-date.svg>)](<https://coolcode.ca/otherworldnames/data-date.svg>) | [Source &amp; docs](<https://github.com/jsdyer/otherworldnames>) |
| [Sun Ledger](<https://coolcode.ca/sunledger/>) | Compare the solar energy reaching Langley and Halifax by month and year, alongside NASA’s clear-sky estimate. <br> Saved dataset · NASA POWER supplies monthly all-sky and clear-sky solar energy for grid areas around Langley, BC, and Halifax, NS. In the 2001–2020 average, December brings 0.68 kWh/m²/day to Langley and 1.14 to Halifax. Select June to see the two sites nearly coincide, then open the monthly ledger to inspect the individual years. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · Solar record: 2001-01-01–2026-07-31 · 307 paired months | [Source &amp; docs](<https://github.com/jsdyer/sunledger>) |
| [Planet Papers](<https://coolcode.ca/planetpapers/>) | Compare published measurements of the same exoplanet, with uncertainties and links to the original papers. <br> Saved dataset · NASA Exoplanet Archive Planetary Systems rows preserve separately cited measurements, uncertainties and limits for each planet. Select TRAPPIST-1 e and compare the mass estimates from Gillon (2017), Grimm (2018) and Agol (2021). The plot and table preserve each paper’s uncertainties, while the other solutions remain visible when that paper has no mass estimate. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 38,804 published solutions | [Source &amp; docs](<https://github.com/jsdyer/planetpapers>) |
| [Flyby Files](<https://coolcode.ca/flybyfiles/>) | Check which asteroids were observed before their closest approach to Earth. <br> Saved dataset · JPL’s encounter and orbit records give passage times, distances and first observation dates for selected near-Earth asteroids. Choose 2020 QG and compare the date-only orbit record with JPL’s account of the discovery image. Then select After to find 2020 VT4, whose first observation in the present orbit is dated the following day. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 6 encounters | [Source &amp; docs](<https://github.com/jsdyer/flybyfiles>) |
| [Chirp Room](<https://coolcode.ca/chirproom/>) | Align the Hanford and Livingston gravitational-wave traces and listen to the final moment of GW150914. <br> Saved dataset · GWOSC supplies calibrated strain from the two LIGO detectors. Each displayed trace is filtered from its own 32-second record. Use Apply published alignment to move Livingston seven milliseconds later and reverse its polarity. Compare the waveform correlation around merger, then play the one-second stereo extract. Audio starts only when you press Play. <br> Scheduled checks: monthly · Data retrieved: 2026-11-19 · 2 detector records | [Source &amp; docs](<https://github.com/jsdyer/chirproom>) |

#### Money &amp; markets

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [BankRate Lab](<https://coolcode.ca/bankrates/>) | Chart Bank of Canada rates, exchange rates and yields. <br> Saved dataset · The Bank of Canada publishes the interest rates, bond yields and Canadian-dollar exchange rates shown here. Indexed FX rebases each series to its first available observation within the chosen date range. <br> Scheduled checks: weekdays · Snapshot generated: 2026-11-18 · Observation dates: 2017-01-02–2026-11-17 · 9 rate series | [Source &amp; docs](<https://github.com/jsdyer/bankrates>) |
| [Canadian Price Atlas](<https://coolcode.ca/priceatlas/>) | Compare historical grocery prices across Canadian regions. <br> Saved dataset · Statistics Canada publishes monthly retail prices for Canada, BC and Nova Scotia. The site labels missing observations, retains published package prices in exports and distinguishes the chart’s units from source units. <br> Scheduled checks: weekly · Snapshot generated: 2026-11-18 · Price observations: 2017-01–2026-09 · 110 products | [Source &amp; docs](<https://github.com/jsdyer/priceatlas>) |
| [Insolvency Atlas](<https://coolcode.ca/insolvencyatlas/>) | Explore insolvency counts and rates, or compare filings with grocery prices and policy rates. <br> Saved dataset · The Office of the Superintendent of Bankruptcy publishes monthly filing counts and annual insolvency rates. Incomplete years and missing observations appear as gaps. <br> Scheduled checks: weekly · Oldest source retrieved: 2026-11-18 · Monthly filings through: 2026-09 · Annual rates through: 2025 · 2 source workbooks | [Source &amp; docs](<https://github.com/jsdyer/insolvencyatlas>) |
| [Market Shadows](<https://coolcode.ca/marketshadows/>) | Compare CIRO short-sale and short-position reports by security, market and reporting period. <br> Local inputs · Open CIRO short-sale and short-position files or paste rows from an original report. Open the same CIRO report type for two dates, then choose a baseline under Changes between reports. Trading volume shows shares sold short during a period. A consolidated position shows shares held short at the reporting date. | [Source &amp; docs](<https://github.com/jsdyer/marketshadows>) |
| [Pantry Prices](<https://coolcode.ca/pantryprices/>) | Compare Canadian grocery baskets across historical years, recent months and provincial retail prices. <br> Saved dataset · Published urban annual prices and two distinct Statistics Canada monthly grocery price tables retain their own package sizes and methods. One 454 g butter, one 675 g white bread and a dozen eggs totalled $9.69 in September 2017 and $13.99 in September 2026 at Canadian scanner averages. Choose a province to compare its prices, or select an earlier price series to explore the published urban and national records back to 1914. <br> Scheduled checks: monthly · Monthly tables retrieved: 2026-11-19 · Retail scanner months: 2017-01–2026-09 · 19,733 published prices | [Source &amp; docs](<https://github.com/jsdyer/pantryprices>) |

#### Media, events &amp; the old web

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Event Radar](<https://coolcode.ca/eventradar/>) | Browse local listings and keep selected events on your calendar. <br> On-demand lookup · Has Things supplies Vancouver and Halifax event feeds, and Langley entries link to venue calendars. Import an .ics file to search events locally. | [Source &amp; docs](<https://github.com/jsdyer/eventradar>) |
| [Atlantic Dial](<https://coolcode.ca/atlanticdial/>) | Find Atlantic Canadian radio shows on your clock and listen to recent episodes from local stations. <br> Multiple data sources · Stations publish the broadcast times and episode feeds. Choose your time zone or search recent recordings by title. Search Nain for Labrador broadcasts, or open Field recordings and search William Riley to hear him sing in Cherry Brook. Each recording opens at its original tape cue. On demand includes two programmes about Halifax donairs. <br> Scheduled checks: daily episode imports and weekly schedule checks · Schedules reviewed: 2026-11-18 · Episode feeds retrieved: 2026-11-19 · Field recordings indexed: 2026-11-19 · 25 programmes · 45 episodes · 117 recordings | [Source &amp; docs](<https://github.com/jsdyer/atlanticdial>) |
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
| [Archive Shelf](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/archive-shelf>) | Find early Canadian internet survey results by page or search your own collection. <br> Self-hosted data · The Linux edition indexes your own PDF newsletters in a local SQLite database. Search “dial-up” to compare page 2 of the July 26, 2001 issue with page 5 of the September 23, 2003 issue. Open the PDF at either page or download the matching citations. | Python 3, SQLite FTS5 and Poppler for PDFs | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/archive-shelf>) |
| [Waystation](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation>) | Capture websites into portable archives, map links and browse offline. <br> Self-hosted data · Website captures and their timestamps live in your local archive. Capture a site before and after a change, then compare the two snapshot IDs to see which URLs appeared, disappeared or changed content. | Downloadable executable for Linux, macOS or Windows | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation>) |
| [Timefold](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold>) | Import a personal timeline, connect dated records and browse the files attached to each event. <br> Self-hosted data · Your records and timeline spreadsheets populate the archive. An optional collection links seven dated W3C recommendations. Import a timeline CSV with dates and titles. Reopening the same file skips existing records, including capsules you have since edited. | PHP 8.2+ with SQLite or MySQL/MariaDB | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold>) |
| [Tape Index](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index>) | Fingerprint and verify scans, web archives and game saves from the terminal. <br> Self-hosted data · The index records a SHA-256 checksum for each file you choose so you can verify it later. A moved file appears as MISSING under its old name and ADDED under its new one. | Python 3 | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index>) |
| [Dataset Diff](<https://github.com/jsdyer/datasetdiff#linux-companion>) | Compare CSV or GeoJSON snapshots by record ID and inspect changes to fields and geometry. <br> Self-hosted data · Your collector stores dated copies of a file or HTTPS feed in SQLite. Compare the 2020 and 2023 Nova Scotia bridge releases by record\_id. Four of the nine Annapolis County bridges changed Level 1 rating. Open ANN002 to see Anderson Brook Bridge move from 3 to 2. | Linux and Node.js 24+ | [Source &amp; docs](<https://github.com/jsdyer/datasetdiff>) |

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

[November 2026 tool audit](docs/november-tool-audit.md) · [Planned investigations for existing tools](docs/next-investigations.md)
