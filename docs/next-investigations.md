# Next investigations for CoolCode

Each proposal starts from the tool’s public guide. The rows below track future investigations for existing tools. Historical comparisons that need a new source or another edition identify what to collect.

## Where to go deeper

| Tool | Proposed investigation |
| --- | --- |
| [BC Place Names Explorer](https://coolcode.ca/bcplacenames/) | Build a naming history for a single Fraser Valley feature from the province’s linked name records. Put each dated decision on one timeline and group undated names separately. |
| [Well Layers](https://coolcode.ca/welllayers/) | For a chosen depth in Fall River or Langley, show the original material descriptions across every sampled log reaching that depth. Count gaps, overlapping intervals and shallow holes separately. |
| [ATIP Records Explorer](https://coolcode.ca/atip/) | Give saved requests a local copy-request ledger with request date, reply date and package filename. Export outstanding requests by institution with their original reference numbers. |
| [Schoolhouse Ledger](https://coolcode.ca/schoolhouseledger/) | Pair two Langley school entries with both scanned report pages. Calculate the change in average attendance divided by enrolment across years where both figures exist. |
| [Postmark Places](https://coolcode.ca/postmarkplaces/) | Transcribe an archival mail-route timetable for a route serving Langley or Dartmouth. Place its stops and travel times alongside the office names used that year. |

## Homelab & archiving

| Tool | Proposed investigation |
| --- | --- |
| [Switchboard](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/switchboard) | Import the services and loopback port mappings from a Rack Recipes export, then let the owner name the host and choose which links to add. |
| [Vhost Logbook](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/logbook) | Compare equal-length windows in two of the owner’s log files, showing which local virtual hosts contributed most to the change in response bytes. |
| [LANWatch](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/lanwatch) | Turn recorded state transitions into outage intervals per device, distinguishing known probe failures from hours when the collector itself recorded nothing. |
| [Tape Index](https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index) | Pair missing and added paths by exact digest and size to suggest file moves. List duplicate-content ambiguities before a user accepts a match. |

## Networks & routing

| Tool | Proposed investigation |
| --- | --- |
| [IP Snapshot](https://coolcode.ca/ipsnapshot/) | Let owners annotate saved observations for their own addresses with the expected service and owner. Export the dated inventory with its source timestamp. |
| [Certificate Trail](https://coolcode.ca/certtrail/) | For an owned domain, lay out validity periods from two saved certificate exports and flag observed overlaps and intervals without coverage. |
| [Route Archaeologist](https://coolcode.ca/routearchaeologist/) | Save dated origin snapshots for a user’s prefix and annotate a planned provider change. Show the time bracket between the last old and first new observation. |
| [RPKI Guard](https://coolcode.ca/rpkiguard/) | Save validation receipts for an owned prefix before and after a routing change, preserving the covering authorization and its permitted prefix length in each receipt. |
| [Outage Scope](https://coolcode.ca/outagescope/) | Compare the observation gaps between two incidents and count intervals in which each public signal actually reported. |
| [Broadband Atlas](https://coolcode.ca/broadbandatlas/) | Save the same Langley grid cell from two coverage editions and show which technologies or funded-project references changed, with an edition date on each side. |
| [Telecom Pulse](https://coolcode.ca/telecompulse/) | Compare two census subdivisions within the same provincial pricing market and show the first common year each crossed a chosen availability threshold. |
| [Onion Pulse](https://coolcode.ca/onionpulse/) | For two selected countries, compare the same weekday against its previous four observations, marking reporting gaps beside the resulting differences. |
| [Blocked or Gone?](https://coolcode.ca/blockedorgone/) | Give each existing case a coverage calendar showing how many distinct measurement dates and contributing networks support each apparent change. |
| [Prefix Diary](https://coolcode.ca/prefixdiary/) | Follow a single exchange across saved assignment editions and summarize exactly which prefix blocks changed carrier, status or both on each comparison date. |

## Security & forensics

| Tool | Proposed investigation |
| --- | --- |
| [Tracker X-Ray](https://coolcode.ca/trackerxray/) | Let a site owner group two locally saved HARs by the page navigation that initiated the requests and compare third-party bytes for each group. |
| [Header Autopsy](https://coolcode.ca/headerautopsy/) | Build a local policy changelog for an owned site from dated header captures, preserving the exact prior and replacement directive for each change. |
| [Mail Path](https://coolcode.ca/mailpath/) | Add a privacy-preserving export of a user’s mail chronology that replaces mailbox and host identifiers consistently while preserving reported hop delays. |
| [Packet Pocket](https://coolcode.ca/packetpocket/) | Produce a disclosure copy of local capture metadata with stable per-file aliases for endpoints and an explicit list of fields included in the export. |
| [Dependency X-Ray](https://coolcode.ca/dependencyxray/) | Compare two of the owner’s lockfiles and report which exact package versions appeared or disappeared, including packages still installed at another version. |
| [Exploit Graveyard](https://coolcode.ca/exploitgraveyard/) | Attach the owner’s remediation notes and completion evidence to catalogue entries and export a patch-review register keyed by CVE. |
| [Patch Signal](https://coolcode.ca/patchsignal/) | Save time-stamped advisory receipts for the owner’s patch queue and show which source changed its assessment since the previous review. |

## Government & public records

| Tool | Proposed investigation |
| --- | --- |
| [Government Memory Map](https://coolcode.ca/governmentmemory/) | Save record classes and personal information banks from several searches into one source-cited institutional inventory for drafting a single request. |
| [The Briefing Room](https://coolcode.ca/briefings/) | Track one topic through successive briefing-note titles and references within a ministry, separating identical titles from researcher-confirmed follow-ups. |
| [The ATIP Popularity Index](https://coolcode.ca/atippopularity/) | Show when one released package first attracted repeat copy requests and how concentrated those requests were in its busiest reported month. |
| [ATIP Metrics](https://coolcode.ca/atipmetrics/) | Reconcile each institution’s opening carryover, incoming requests, closures and ending carryover for one law and fiscal year. Expose any unexplained balance. |
| [What the Minister Was Prepared to Say](https://coolcode.ca/ministersays/) | Track a single prepared response across three or more sitting dates and identify the first date each cited figure or commitment appeared in the selected notes. |
| [The Government’s Wrongdoing Files](https://coolcode.ca/wrongdoings/) | Pair each published recommendation with the institution’s response wording and any dated follow-up, leaving unpaired recommendations visible. |
| [Algorithm Watch](https://coolcode.ca/algorithmwatch/) | Keep dated register editions and show exactly when a system’s reported status, personal-information field or linked assessment changed. |
| [The Government Dataset Explorer](https://coolcode.ca/datasetexplorer/) | Build a local resource watchlist keyed by catalogue and resource IDs. Compare editions for new file formats, replaced download links and removed resources. |
| [The Open Data Graveyard](https://coolcode.ca/opendatagraveyard/) | Let researchers document a verified successor dataset, recording which identifiers, fields and years carried over from the removed record. |
| [Canada.ca Pulse](https://coolcode.ca/canadaanalytics/) | Find the largest month-to-month movement for one published series, with both source values, their units and the count of complete adjacent months. |
| [Salmon Lines](https://coolcode.ca/salmonlines/) | Compare estimates for the same population using only years with the same enumeration method, showing how many years each method change removes. |
| [Crossing Record](https://coolcode.ca/crossingrecord/) | Show how a before-and-after comparison changes as the reader varies the number of complete years on each side of a documented road project. |
| [Park Visits](https://coolcode.ca/parkvisits/) | Recalculate year-over-year changes for a fixed cohort of parks reporting in both years and show which sites account for the combined change. |
| [Aurora Trace](https://coolcode.ca/auroratrace/) | Measure the lag between the largest field departures at two observatories within a chosen storm window, retaining ties and missing-minute counts. |
| [Mass Peaks](https://coolcode.ca/masspeaks/) | Let learners define two mass sidebands, estimate the background under a chosen peak and see how its apparent excess changes with the sideband widths. |

## Public disclosures

| Tool | Proposed investigation |
| --- | --- |
| [Corporate Ghosts](https://coolcode.ca/corporateghosts/) | Retain daily status observations for saved corporation numbers and show the last observed old status and first observed new status. |
| [Lobby Trail](https://coolcode.ca/lobbytrail/) | For one institution, compare two equally long periods and show organizations newly appearing, returning or absent in the reported communications. |
| [Charity Flows](https://coolcode.ca/charityflows/) | For one charity, decompose the annual change in reported gifts into returning, newly reported and absent recipient business numbers. |
| [Tariff X-Ray](https://coolcode.ca/tariffxray/) | Price a specified mix of wholesale access lines and capacity under two cited orders, marking unmatched charge categories and one-time fees separately. |
| [Gear Autopsy](https://coolcode.ca/gearautopsy/) | Compare two related FCC filings by exhibit category and show which manuals, photographs and test reports have matching titles or different publication dates. |
| [Recall Radar](https://coolcode.ca/recallradar/) | Group notices by their published recall or campaign identifier and show which model years or products a later update added. |
| [Patent Attic](https://coolcode.ca/patentattic/) | Place a patent’s illustrated components beside the numbered claims that reference them, beginning with one hand-checked Canadian patent and original pages. |
| [Spill Ledger](https://coolcode.ca/spillledger/) | Trace one incident’s recoveries across annual reports and reconcile changes against the prior reported amount without double-counting a repeated cumulative total. |
| [Bridge Ledger](https://coolcode.ca/bridgeledger/) | For a selected county, count bridges with comparable repeat inspections and show how many improved, worsened or retained the same general rating. |
| [Dispatch Ledger](https://coolcode.ca/dispatchledger/) | Break down the change in reported demand between two periods into agency and reporting-channel contributions, checking each subtotal against the published combined figure. |

## Maps, trails & history

| Tool | Proposed investigation |
| --- | --- |
| [Spectrum Atlas](https://coolcode.ca/spectrumatlas/) | Compare two editions around the same radio site and list added, removed or changed frequency assignments keyed by licence and station identifiers. |
| [Shipwreck Explorer](https://coolcode.ca/shipwrecks/) | For a historical storm date, build a cited list of nearby wreck records and identify which original entries explicitly name the storm. |
| [Forgotten Places](https://coolcode.ca/forgottenplaces/) | Build a walking itinerary of registered sites around one archival address and compare the construction dates and designation dates named in each record. |
| [Names That Time Forgot](https://coolcode.ca/namesforget/) | Find exact place names reused in more than one province and compare their source feature types and coordinates without treating them as the same place. |
| [Hidden Water](https://coolcode.ca/hiddenwater/) | For one mapped Langley creek, list inventoried road crossings along its course and show which have a dated assessment or a documented follow-up. |
| [Langley Changes](https://coolcode.ca/langleychanges/) | Reconcile development application IDs with building-permit folders for one block, distinguishing explicit municipal references from address-only candidate matches. |
| [Strange Skies Canada](https://coolcode.ca/strangeskies/) | Compare two CADORS records referring to the same documented occurrence and show which dates, event labels or aircraft details each report supplies. |
| [Lightkeeper](https://coolcode.ca/lightkeeper/) | Take a timed flash sequence recorded by the user and compare it with published characteristics near a chosen harbour, retaining all plausible ties. |
| [Storm Tracks](https://coolcode.ca/stormtracks/) | At one harbour gauge, compare the time of the storm’s closest recorded approach with the time of its largest measured surge and show both sampling intervals. |
| [Ferry Counts](https://coolcode.ca/ferrycountss/) | Compare the two directions only on dates when both reported the selected hour and show how that changes the apparent Halifax passenger imbalance. |
| [Camp Calendar](https://coolcode.ca/campcalendar/) | Separate the pooled booking records by arrival year. Compare how far ahead Rissers Beach campers booked the same month, equipment and day type across summers. |
| [Snow Courses](https://coolcode.ca/snowcourses/) | For each winter at one automated station, find the observed date of maximum snow water equivalent and give the observation coverage around the peak. |
| [Coal Below](https://coolcode.ca/coalbelow/) | Create a source-cited historical cross-section for one Springhill mine plan and label the seams, plan date and any depth datum given on the original. |
| [Ice Weeks](https://coolcode.ca/iceweeks/) | Let readers trace the ice edge on two same-week charts using matched reference points, saving both outlines with chart dates and scale. |
| [Ferry Record](https://coolcode.ca/ferryrecord/) | Decompose the change in passengers on one BC route into the change in round trips and the change in passengers per trip for matched quarters. |
| [SeaBus Clock](https://coolcode.ca/seabusclock/) | Bring in an archived timetable matching the boarding survey’s year and season. Divide hourly directional boardings by the matched scheduled sailings and show the dates used. |
| [Streetwork Diary](https://coolcode.ca/streetworkdiary/) | Follow requests opened in one Halifax week and report how many close within 7, 30 or 90 days, keeping requests too recent for each cutoff separate. |
| [Lake Profiles](https://coolcode.ca/lakeprofiles/) | Find the measured depth interval with the largest temperature drop per metre on each Banook visit, retaining both recorded depths and their spacing. |
| [Forecast Receipt](https://coolcode.ca/forecastreceipt/) | For two forecast providers, compare absolute temperature errors only on the same station hours and lead-time band, and show which hours drop out. |
| [Fossil Neighbours](https://coolcode.ca/fossilneighbours/) | For a selected formation, count how many distinct collections support each accepted taxon and let the reader inspect the historical names behind the count. |
| [Air Pair](https://coolcode.ca/airpair/) | Split the measured-minus-modelled particle difference into daytime and overnight hours at one station, using paired observations and local clock time. |
| [Plume Diary](https://coolcode.ca/plumediary/) | Mark the visible plume edge on two clear satellite scenes and compare its distance from the same river-mouth reference point with the paired flow readings. |
| [Quake Echo](https://coolcode.ca/quakeecho/) | Group felt reports by distance from the preferred epicentre and show how median reported intensity changes when the response threshold changes. |

## Sky & photography

| Tool | Proposed investigation |
| --- | --- |
| [Nightfinder](https://coolcode.ca/nightfinder/) | Add an editable local horizon mask by compass bearing so a photographer can see when a target clears a familiar treeline during darkness. |
| [Satellite Pass](https://coolcode.ca/satpasses/) | Find overlaps between two satellites’ predicted visible passes from one location and list the minutes when both clear a chosen elevation. |
| [Sky Archive Explorer](https://coolcode.ca/skyarchive/) | Pair observations of one target at different wavelengths and open the two source products at the same sky centre and angular scale when metadata permits. |
| [Otherworld Names](https://coolcode.ca/otherworldnames/) | Make a route from Canso, Nova Scotia, to its namesake Martian crater. Extend it only to planetary features whose official naming notes identify a specific Canadian place. |
| [Sun Ledger](https://coolcode.ca/sunledger/) | Rank months by the gap between NASA’s all-sky and clear-sky estimates for one year. Show the two energy values and each month’s share of the annual gap. |
| [Planet Papers](https://coolcode.ca/planetpapers/) | For measurements of one planet parameter, compare each pair’s difference with their reported uncertainty intervals and flag missing or asymmetric uncertainties. |
| [Flyby Files](https://coolcode.ca/flybyfiles/) | Compare the discovery lead times of approaches in a chosen distance band, treating date-only observations as ranges and retaining ambiguous same-day cases. |
| [Chirp Room](https://coolcode.ca/chirproom/) | Repeat the detector-alignment comparison in several equal-length off-merger windows to show how the measured correlation varies away from the event. |

## Money & markets

| Tool | Proposed investigation |
| --- | --- |
| [BankRate Lab](https://coolcode.ca/bankrates/) | Around each policy rate change, compare the two- and ten-year benchmark yields on the last common observation before and first common observation after. |
| [Canadian Price Atlas](https://coolcode.ca/priceatlas/) | For a fixed basket, rank the products that explain the BC–Nova Scotia price gap month by month and show when the largest contributor changes. |
| [Insolvency Atlas](https://coolcode.ca/insolvencyatlas/) | Compare the same quarter across multiple years in one province, separating consumer and business filings and excluding partial quarters from growth rates. |
| [Pantry Prices](https://coolcode.ca/pantryprices/) | Display historical basket totals as hours of work using a separately cited wage series matched to place, occupation and period. |

## Media, events & the old web

| Tool | Proposed investigation |
| --- | --- |
| [Event Radar](https://coolcode.ca/eventradar/) | On a saved calendar, flag overlapping selected events and group same-venue candidates whose listings disagree about start time or cancellation. |
| [Screen Radar](https://coolcode.ca/screenradar/) | Build a watchlist calendar from published television episode dates, with a separate shelf for films or shows whose next date is unknown. |
| [Media Echoes](https://coolcode.ca/mediaechoes/) | Compare two archived editions of an item by file inventory and source checksums, identifying missing manuals, alternate encodings and byte-identical files. |
| [Ghost Links](https://coolcode.ca/ghostlinks/) | For a dead URL, compare two dated captures and list the navigation links added, removed or redirected between those snapshots. |
| [Lost Code](https://coolcode.ca/lostcode/) | Compare the file trees of two archived revisions and export a list of changed source paths with their persistent Software Heritage identifiers. |
| [The Unreleased Worlds Index](https://coolcode.ca/unreleased/) | Join two dated CMF exports by project identifier where supplied and show changes in reported funding or title, flagging ambiguous names for manual review. |
