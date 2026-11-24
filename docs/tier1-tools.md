# Ten public-data explorers

All ten tools are standalone GitHub Pages applications. Their workflows collect public sources, validate records, exercise the desktop and mobile application, commit retained data, and deploy only after successful checks. No paid API key is required for the implemented sources.

| Tool | Collection | Starting coverage |
| --- | --- | --- |
| [Gov Tracker Census](https://coolcode.ca/govtrackercensus/) | Weekly | 15 curated federal, BC and Nova Scotia homepages; blocked scans remain unavailable. |
| [Contract Patterns](https://coolcode.ca/contractpatterns/) | Weekly | Rolling 365-day contract-date cohort; awards and reported amendments remain separate. |
| [Maple Hosting Index](https://coolcode.ca/maplehosting/) | Monthly | First 100 .ca domains in a dated Tranco ranking; DNS, ASN and DB-IP country observations. |
| [ATIP Decision Lens](https://coolcode.ca/atipdecisions/) | Weekly | 1,344 distinct published decisions at launch; the source reports 1,346 and the gap is visible. |
| [ISP Report Card](https://coolcode.ca/ispreportcard/) | Weekly | Seven provider ASNs; dated APNIC IPv6/DNSSEC experiments and full visible-prefix RPKI checks. |
| [Donation Radar](https://coolcode.ca/donationradar/) | Weekly | Submitted and reviewed 2023 registered-party annual returns, split into province/version files. Newer reviewed cohorts were incomplete at launch. |
| [Anycast Compass](https://coolcode.ca/anycastcompass/) | Daily | One completed hour from 50 selected Canadian volunteer probes across all 13 IPv4 root servers. |
| [Sanctions Ledger](https://coolcode.ca/sanctionsledger/) | Daily | Official consolidated XML entries, with links to the controlling regulations. |
| [Border Pulse](https://coolcode.ca/borderpulse/) | Every 30 minutes | Four Canada-bound crossings; 2019 Q4 hourly history, later monthly service-standard percentages, and accumulating live reports. |
| [Order in Council Diary](https://coolcode.ca/oicdiary/) | Weekly | Orders returned for approval dates in the current calendar year. Numbered tail pages are followed even when the source's Next link disappears. |

Each repository's README gives the exact UTC cron expression. GitHub schedules are best effort. A manual **Actions → Data · Collect, check and publish → Run workflow** collects immediately; ordinary code changes rebuild saved data offline unless a documented data migration is needed.

## Retained evidence

Use **Snapshot** to reopen a capture. **Download filtered CSV** exports the visible selection. The **Snapshot diary** provides immutable compressed captures and an RSS change feed at each tool's `feed.xml`.

The initial capture is a baseline, not a list of events that happened that day. A subsequent addition means newly observed by the collector; an absent record need not mean deletion from the original source. Corrections to extraction methods can also change coverage. Read the source dates and method alongside the capture date.

The data archives are committed to Git and persist independently of temporary Actions artifacts. Full-page desktop/mobile screenshots are retained as the `browser-checks` Actions artifact for seven days. The screenshots are QA evidence; no Percy project or token is assumed.

Donation Radar preserves each province/version shard by content hash. Its diary's record count refers to aggregate cohorts; the explorer and catalogue also report contribution-record counts. Submitted and reviewed versions must not be summed, and repeated names are not resolved as one donor. Border Pulse separately retains its historical baseline and distinct live source timestamps.

## Shared Cloudflare counter and private reports

The shared counter and private report form are registered from `data/tools.json`. Their Worker source and deployment instructions are now [in GitHub](../services/cloudflare-visitor/README.md). Follow the [complete lifecycle](tool-lifecycle.md); do not maintain the original launch-time addition list separately. Verification uses the read-only `/registry` endpoint and does not insert fake reports.

## Optional missed-run email alerts

Each repository supports an optional GitHub Actions secret named `HEALTHCHECKS_PING_URL`. Add that repository's check URL and configure the corresponding schedule and email integration in Healthchecks. The workflow sends start, success or failure pings only when collection runs.

A grace period gives a scheduled check extra time to arrive before an overdue alert. It does not trigger collection. Successful pings normally keep the check healthy without sending a routine email. These checks monitor collection execution, not data correctness, forecast accuracy, or the entire website. No Healthchecks account, secret or email subscription was created as part of these ten tools.
