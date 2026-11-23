# Ten API-powered CoolCode tools

These standalone browser applications keep private inputs in the browser and collect provider data in GitHub Actions. API credentials remain repository secrets; they are never bundled into the public site. Scheduled jobs validate their data, exercise browser flows and preserve evidence before publication. GitHub's schedules are best effort; each repository also supports **Actions → its publish workflow → Run workflow**.

| Tool | Automatic collection | What the first version does |
| --- | --- | --- |
| [Maple Phish](https://coolcode.ca/maplephish/) | Daily 14:23 UTC | Six Canadian-brand token queries in PhishStats, published as derived aggregates; URLhaus malware signals remain separate. Detailed imports stay local. Brand matches are investigation leads, not confirmed impersonation or Canadian victim counts. |
| [Scan Receipt](https://coolcode.ca/scanreceipt/) | Daily 14:47 UTC | Captures three CoolCode pages directly with Chromium, retaining screenshots and sanitized network receipts. An owner-only urlscan workflow uses the saved key to submit an owned homepage and return provider links. Local imports and comparisons remain available. |
| [Gov Grade](https://coolcode.ca/govgrade/) | Sundays 07:43 UTC | Retains the owned CoolCode MDN assessment and compares locally imported reports. An owner-only SSL Labs workflow uses the registered email for coolcode.ca and returns the provider report link. Government collection and public API report republication remain separate, unavailable scopes. |
| [Rack Expiry](https://coolcode.ca/rackexpiry/) | Mondays 10:43 UTC | Matches private software inventory to 25 endoflife.date products, separates active/standard/extended support and preserves catalogue revisions. Save is explicit; JSON inventory exports are lossless. |
| [Mushroom Calendar](https://coolcode.ca/mushroomcalendar/) | Sundays 08:23 UTC | Complete selected licensed iNaturalist queries for fungi in fixed Langley and Halifax rectangles, observation years 2023–2025. Monthly/ISO-week charts, quality filters and coarse maps; not an abundance or edibility guide. |
| [Law Delta](https://coolcode.ca/lawdelta/) | Mondays 08:27 UTC | Four BC privacy Acts/regulations, compared by section and schedule. First capture is a baseline; future text changes accumulate. Official effective-date metadata stays separate from capture dates. |
| [Dawn Chorus](https://coolcode.ca/dawnchorus/) | Mondays 08:23 UTC | Six shared bird species across BC and four Atlantic provinces, with original source audio, recording dates, recordists and individual licences. A bounded listening collection, not proof of regional dialect. |
| [Radar Scope](https://coolcode.ca/radarscope/) | Daily 09:37 UTC | Seven-day hourly Cloudflare HTTP observations for Canada/US/UK, IPv4/IPv6 shares and Canadian 30-day outage annotations. Each traffic curve has its own normalized scale; it cannot compare absolute country traffic volume. |
| [Museum Drawer](https://coolcode.ca/museumdrawer/) | Monthly, 5th at 09:43 UTC | Dated, capped GBIF samples of historical specimens and modern observations around Langley/Halifax, with exact source cohort totals, dataset attribution and sampling limitations. |
| [Hotspot Ledger](https://coolcode.ca/hotspotledger/) | Daily 10:23 UTC | Latest reports within 30 days at the specific Iona Island beach hotspot and Hartlen Point, plus separately sourced notable flags. Iona's broader parent hotspot group is excluded; repeated daily captures are not independent bird counts. |

## Credentials

Saved under each repository's **Settings → Secrets and variables → Actions → Repository secrets**:

| Repository | Secret | Value |
| --- | --- | --- |
| `maplephish` | `URLHAUS_AUTH_KEY` | abuse.ch/URLhaus Auth-Key |
| `scanreceipt` | `URLSCAN_API_KEY` | urlscan.io API key |
| `govgrade` | `SSLLABS_EMAIL` | Registered SSL Labs organizational email; it does not itself authorize third-party testing or public redistribution |
| `dawnchorus` | `XENO_CANTO_API_KEY` | xeno-canto API v3 key |
| `radarscope` | `CLOUDFLARE_RADAR_API_TOKEN` | Cloudflare token with Radar Read scope |
| `hotspotledger` | `EBIRD_API_KEY` | eBird personal API key |

Rack Expiry, Mushroom Calendar, Law Delta and Museum Drawer need no API key. PhishStats's optional key is not required for the implemented small query budget. Credentials are sent only to the corresponding provider by its collector or owner-run client. Visitors are never asked for them.

## Run your personal API checks

- **urlscan:** Open [Personal urlscan · Scan an owned homepage](https://github.com/jsdyer/scanreceipt/actions/workflows/urlscan-check.yml), choose **Run workflow**, select your owned homepage, and open the run **Summary** for its report, JSON and screenshot links. Import the public Result JSON into Scan Receipt to inspect and compare it locally.
- **SSL Labs:** Open [Personal TLS · Check CoolCode](https://github.com/jsdyer/govgrade/actions/workflows/personal-tls.yml), choose **Run workflow**, and open the completed **Summary** for the provider report. It uses the registered `SSLLABS_EMAIL`.

These owner-only clients have no recurring schedule. Installation or changes to their workflow definitions also verify the default owned homepage once. Public visitors cannot use your secret or trigger these GitHub workflows without repository access. Scan Receipt’s separate direct browser collector remains daily.

## What history means

Retained JSON captures and source manifests are committed to Git and remain after Actions artifacts expire. Scan Receipt also retains its own dated screenshots in Git. Separate desktop/mobile QA screenshots are retained as the `browser-checks` artifact for seven days; they are not Percy baselines. No new Percy or Zenodo integration is assumed here.

An initial capture does not invent a previous version. Later captures show what the collector observed, including corrections, changed scope and source revisions. Weather-style prediction scoring is not being inferred from these datasets: these tools compare recorded evidence. Read the capture date, source date and collection method together. Failures do not replace the last successful Pages deployment.

## Provider permissions and reuse

- PhishStats URL-level raw feed republication is restricted. The public app uses derived aggregates and local detailed imports.
- Scan Receipt’s public evidence is collected directly by our own Chromium browser. Its owner-only urlscan client submits one authorized public homepage and returns provider links without compiling a public provider database. Local public-result imports remain supported; private/unlisted imports are rejected.
- SSL Labs' terms require express permission for public-site API use/publication, as well as target authorization. The registered email now powers the owner-only personal TLS client. Full reports remain at SSL Labs; the public app does not proxy that API. Government MDN targets remain paused after automatic approval review blocked requests that could create fresh assessments. Owned-site evidence and local reports remain available.
- xeno-canto audio retains each recordist's attribution and licence; audio is streamed unchanged only on playback.
- Cloudflare Radar data is attributed under CC BY-NC 4.0. The page identifies the source view and derived normalization.
- eBird's terms restrict use to noncommercial purposes, require attribution and require the publisher to supply eBird an electronic copy/link of a published derived product. After publication, provide the [Hotspot Ledger link](https://coolcode.ca/hotspotledger/) using the contact route in the [eBird data-access terms](https://www.birds.cornell.edu/home/ebird-data-access-terms-of-use/). No message has been sent on your behalf.
- iNaturalist and GBIF record licences and attributions remain visible; precise coordinates and sensitive location details are not retained. BC Laws includes the required King's Printer attribution and unofficial-version notice. endoflife.date source data uses MIT with its notice included in Rack Expiry.

## Shared CoolCode counter and private issue reports

The tools' data collection uses GitHub Actions. The existing `coolcode-visitor-api` Cloudflare Worker separately needs these IDs in its existing `const toolList` for the shared counter and private issue form:

```js
"maplephish",
"scanreceipt",
"govgrade",
"rackexpiry",
"mushroomcalendar",
"lawdelta",
"dawnchorus",
"radarscope",
"museumdrawer",
"hotspotledger"
```

In **Workers & Pages → coolcode-visitor-api → Edit code**, add missing IDs to the existing array, preserve existing entries/bindings, and deploy. That Worker was not changed or inspected in this task. Do not replace the complete array with this short addition list. See [Adding tools](adding-tools.md#enable-usage-counts-and-private-issue-reports).
