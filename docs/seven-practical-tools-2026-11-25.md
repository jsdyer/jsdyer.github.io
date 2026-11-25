# Seven practical tools and four expanded tools

This release adds seven browser applications and expands Price Atlas, Corporate
Ghosts, Border Pulse and Tide & Dark. The architecture remains independent GitHub
Pages repositories with a shared Cloudflare Worker for the APIs that need it.

| Tool | Useful task and coverage |
| --- | --- |
| Halifax Next | Search all 2,347 passenger stops and 81 routes in the current Halifax GTFS edition; compare next departures, last service, ferry timetables, alerts and available live updates. |
| Parcel Bench | Compare eligible Canada Post counter services and two packed box sizes, expected arrival dates and nearby post offices; hours display when usable source data are available. |
| Inspection Trail | Search arbitrary Nova Scotia establishments and read dated inspections, findings, remedies and separate advisory issue/removal dates; eight real starter histories are included. |
| Weather Window | Search 844 official Canadian forecast places or coordinates, set personal weather preferences and read separately dated ECCC forecasts, AQHI and alert polygons. |
| Fuel Window | Compare all six NS regulated zones and PEI prices, including PEI heating oil; calculate fill/trip budgets and retain private plans. |
| Wage Window | Compare all 516 published occupations and 86 regions from the 2026 ESDC edition, retaining unavailable estimates and annual/hourly distinctions. |
| Care Compass | Search 6,459 published BC/NS child-care records, inspect explicit age/program/vacancy fields and keep a private contact shortlist. |
| Corporate Ghosts | Add current ISED federal details, public directors, filings, control-statement lifecycle, saved captures and comparisons alongside the existing federal/BC/NS searches. |
| Border Pulse | Include every crossing currently present in the national CBSA feed, both traveller and commercial fields, with source time zones and preserved original historical data. |
| Tide & Dark | Add official CHS daylight high/low tide planning, current ECCC weather and a Weather Window link while retaining the independent modeled night-photography mode. |
| Canadian Price Atlas | Compare Canada and all ten provinces, plus the published Whitehorse and Yellowknife city series. All thirteen jurisdictions appear in the coverage explanation. |

## Coverage decisions

- Price Atlas's monthly StatCan table has no Nunavut series. The UI links its
  separate territorial survey and explains the gap. Whitehorse and Yellowknife
  are city observations beginning September 2025, not territorial averages.
  Products and observation months differ by area; absent values are not filled.
- Halifax's static edition expires November 29, 2026. The daily collector and UI
  retain its real service dates and expose expiry. Empty live vehicle feeds are
  valid, and ferry departures remain scheduled unless an actual update exists.
- Care Compass's BC layer covers ministry-funded licensed facilities. NS's
  directory is biannual; it does not publish live vacancies. Licence capacity is
  not availability. Contact notes and shortlists stay in the browser.
- Wage Window preserves the official PEI NOC31101 median/high inconsistency and
  labels it, disabling the derived offer comparison for that row. A new edition
  can contain estimates based on older reference periods; both dates remain.
- CBSA reports Canada-bound traffic. A crossing absent from today's feed is
  unavailable, not zero delay. Its existing historical data remain accessible.
- Inspection findings are historical source records, not a current safety score.
  The province's Current Warnings search returned its own Unknown Error page
  during verification; that failure is shown rather than converted to zero results.
- Canada Post live rates, nearby outlet locations and opening hours were verified.
  The provider returned day numbers as canonical strings; the adapter now accepts
  both those and numeric values. Halifax Central returned Monday–Friday hours,
  and Lawtons #114 rendered all seven days. If a future outlet lacks usable hours,
  the UI explicitly says they are unavailable and links the official finder.
- CHS predictions are planning information with source attribution and the
  prescribed notices; they are not navigation or safe-access advice.

## Integration

The complete public inventory contains 260 repositories: 248 catalogue source
repositories and 12 explained non-tool exclusions. All are accounted for. The
catalogue has 257 tools, with browser/install classification retained. The homepage,
search, report choices, README directory and sitemap are generated from that single
catalogue. All seven new IDs are in the generated Worker.

The operations registry contains 183 scheduled workflows, including explicit
absence of a collector for Parcel Bench. New successful-check probes, collection
step names and schedule guards are registered. The watchdog runtime is unchanged;
its existing timer downloads the updated targets automatically. A restricted
GitHub App installation must include the six new scheduled repositories. The
private server report has not been inspected from this workspace. The first
public outcome report finds current published data for all affected tools, but
Halifax, Fuel, Wage and Weather are still awaiting a successful collection run of
their final workflow. Their local source refreshes and hosted builds passed; this
is recorded separately from scheduled-run proof. The watchdog bot automatically
dispatched Tide & Dark’s newly registered daylight workflow at 08:58 UTC; run
45580971022 succeeded and published fresh predictions. This verifies automatic
target adoption for that existing repository without claiming access to new repos.

Application builds version their HTML/module/style/data asset graph so a newly
deployed page does not reuse incompatible cached JavaScript or data. Actual source
downloads are validated before publication; failed refreshes retain earlier good
captures and their original timestamps.

## Worker deployment and verification

The generated Worker is provided for the owner's manual deployment. It adds
fixed-host adapters for Halifax protobuf feeds, Nova Scotia's anonymous inspection
session, Canada Post production OAuth/JSON and the current ISED corporation API.
The Halifax adapter streams bounded public protobuf bytes through the edge cache;
its browser performs decoding/filtering, avoiding the original server decoder's
CPU cost. Native fixed-length streaming also avoids a JavaScript callback for
every network chunk, while rejecting missing, invalid or oversized declared
lengths and short/excess bodies. Existing bindings and APIs are retained. The API Key is the Canada Post client ID;
the matching API Secret is the client secret. Consumer quotes omit customer number.

The screenshot's three editor diagnostics are fixed. Pinned Cloudflare type checks
run in CI; runtime tests cover malformed encoding, source parsing, route validation,
rate budgets, no-store parcel responses, credentials, cache separation and previous
API behavior. The deployed `/health` check passed and `/registry` contains all
257 catalogue IDs. `/api/status` reports the new handlers configured.

Production checks on November 25 verified:

- Canada Post: Halifax-to-Ottawa quotes for two box sizes returned Regular Parcel,
  Xpresspost and Priority prices and expected arrival dates; the outlet search
  returned ten locations. Live opening hours were verified for Halifax Central
  and Lawtons #114 after correcting the day-value parser.
- ISED: corporation 7672233 returned Wikimedia Canada’s active record, eight
  directors and dated filings.
- Nova Scotia: a live Donair/Halifax search returned six establishments; King of
  Donair’s report opened with nine dated inspections and source remedies.
- All eleven app repositories passed their hosted build/browser checks and Pages
  deployments; generated data and referenced assets were checked on the live sites.

Local release validation passed 76 catalogue Python tests, 92 Node tests, 99
watchdog tests, pinned Cloudflare type checks and the 257-tool build/integration
checks. Hosted catalogue browser/build checks, watchdog checks and Pages
deployment passed in run 45579978178. The live homepage and search catalogue
contain 257 tools, and the live sitemap includes all seven new routes.

The final owner-deployed module was downloaded and verified at 09:11 UTC on
November 25; its receipt records the actual bytes. Live verification identified
and fixed two Halifax relay issues: Workers does not support fetch redirect mode
`error`, and Halifax's IIS server requires its `application/protocol-buffer` MIME
type in `Accept`. Both are corrected and regression-tested. The production page
then showed fresh live predictions at stop 8330, current route detours and six
vehicle positions. Timetable-only departures remain explicitly labelled. Follow
[the concrete Worker instructions](../services/cloudflare-visitor/seven-tools-setup.md).

The native streaming path passed a separate actual-workerd correctness check.
A real 1.318 MB feed benchmark including cache writes measured 2.98 ms median
CPU for native streaming versus 9.83 ms for JavaScript chunk handling. That
benchmark excludes production D1 calls. After owner deployment, actual uncached
trip-feed CPU fell from 51–62 ms to 8 ms. The vehicle and alert requests used
10 ms and 6 ms respectively, and all three returned 200 with outcome `ok`. These
are measured requests, not a guarantee for every future load or source size.
