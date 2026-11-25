# Seven practical tools and four expanded tools

This release adds seven browser applications and expands Price Atlas, Corporate
Ghosts, Border Pulse and Tide & Dark. The architecture remains independent GitHub
Pages repositories with a shared Cloudflare Worker for the APIs that need it.

| Tool | Useful task and coverage |
| --- | --- |
| Halifax Next | Search all 2,347 passenger stops and 81 routes in the current Halifax GTFS edition; compare next departures, last service, ferry timetables, alerts and available live updates. |
| Parcel Bench | Compare eligible Canada Post counter services and two packed box sizes, expected arrival dates and nearby post office hours. |
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
private server report has not been inspected from this workspace.

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
CPU cost. Existing bindings and APIs are retained. The API Key is the Canada Post client ID;
the matching API Secret is the client secret. Consumer quotes omit customer number.

The screenshot's three editor diagnostics are fixed. Pinned Cloudflare type checks
run in CI; runtime tests cover malformed encoding, source parsing, route validation,
rate budgets, no-store parcel responses, credentials, cache separation and previous
API behavior. The live Worker health check passed before this update.

Post-deployment provider verification and the downloaded-code receipt are pending
the owner's manual Worker update. The prior receipt remains untouched until the
deployed bytes have actually been retrieved and compared. Follow
[the concrete Worker instructions](../services/cloudflare-visitor/seven-tools-setup.md).
