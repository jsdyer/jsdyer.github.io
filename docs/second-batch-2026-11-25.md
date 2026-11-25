# Discovery and practical tools — November 25, 2026

## New applications

| Repository | Published capability | Collection |
| --- | --- | --- |
| civicrevision | Wikipedia revision comparisons, citation changes, reversion signals, monthly archives and five topic RSS feeds | Every six hours; initial real capture contains 132 revisions across 12 configured articles |
| openseed | Official Linux torrents, openly licensed archive films and research files with source links, licence evidence and availability checks | Daily; initial catalogue contains 26 checked downloads |
| noticeguide | Local Canadian ISP-notice field extraction and dated Justice Canada/ISED references | No network calls, analytics, browser storage or scheduled collection |
| measurebench | Local transfer, SI/IEC storage, dimensional, temperature and energy calculations; explicit optional Wolfram question | No scheduled collection; optional provider quota is shared and enforced in D1 |

The starting sources and watchlists are documented configuration, not hard-coded
capacity limits. Download checks establish availability at the displayed time;
they do not verify a visitor's downloaded payload or imply live seed counts.

## Existing application improvements

- Screen Radar: recorded actor birthplaces near a town or coordinate, notable credits and saved watchlists. Birthplace is not current residence.
- Domain Biography: Wayback homepage counts by year, observed first/last captures, contact/about pages, .ca context and links to the investigation tools. Capture dates are not registration dates; partial results are lower bounds.
- Freenet Echo: seven Canadian networks, including VCN, Chebucto, Sympatico and Shaw, with actual indexed captures and historical context. Existing capture dates remain intact.
- Headline Vault: date and town/paper browsing, this day 100 years ago, OCR search and shareable page citations. Old News Oddities consumes its published newspaper manifest and retained captures.
- Book Graveyard: Canadian-author shelves, BC/NS subjects, EPUB links, estimated reading length, local saved lists and 96 retained source passages.
- Media Echoes: Public Reels with 14 rights-labelled archive films, four categories, shuffle and local playlists.
- Manual Shelf: model aliases, edition comparison, PDF text-layer page search, exact-page citations and explicit download checks. Browser-blocked source fetches can use a downloaded PDF locally; local citations identify their origin. Scanned pages without text require OCR outside this tool.
- Commons Lens: media near a selected place with attribution preserved; reciprocal coordinate links in Wiki Trails and Screen Places.
- Night Finder: saved horizon profiles, Moon separation and observing windows that respect obstructions. Geometric visibility does not predict cloud, transparency or seeing; camera framing remains in the same tool.
- Wage Window: old/new pay normalized for hours and weeks, matched-month provincial CPI, purchasing-power comparison and break-even pay. Territorial entries identify the actual capital-city CPI series.
- Housing Pulse: rent CPI, earnings and completions use compatible province and annual periods. Current annual completions end in 2022; later years remain unavailable rather than substituted.
- Release Receipt: 25 configured StatCan vectors, retained observed vintages/revisions, local follows and custom vectors, RSS/OPML and official calendar export. First observed values are not represented as first published values.

Feed Harbour adds twelve verified feed presets (five Civic Revision topics, the
Release Receipt aggregate and six CPI/earnings series). The public GitHub raw
mirrors are verified through the current production gateway and link to the
canonical CoolCode app pages; subscriptions remain explicit and user-controlled.

## Catalogue and scheduling

The hub now accounts for 271 tools and 262 source repositories. Its complete
274-public-repository audit has no unreviewed repositories; non-tool repositories
retain documented exclusions. The previously verified ten-app batch is reconciled
into the same homepage, guide, Worker ID and sitemap generation path.

There are 190 generated scheduled workflow targets. Civic Revision and Open Seed
have reviewed collection-step names, freshness probes and inactivity guards.
Wage Window, Housing Pulse and Release Receipt gain probes for their new datasets.
No watchdog runtime change is included. Existing installations download the new
registry automatically; an all-repositories GitHub App already covers these repos.
Actual private-server dispatch permissions and outcomes must be read from its report.

## Worker deployment boundary

The complete generated Worker preserves existing providers and all 271 tool IDs.
It adds Screen Radar credits, Domain Biography CDX queries, optional Measure Bench
Wolfram answers and a narrow canonical RSS allowlist. Existing TMDb/Wolfram Secrets
and the existing DB binding are reused; no new key or binding is needed.

The owner requested manual Worker deployment. The reviewed immutable source is:

https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/bf2cf51461dc1c5cab8902d67ec10590fa08adb1/services/cloudflare-visitor/worker.js

Until the deployed module is downloaded and verified, the new API handlers remain
pending. Publishing the homepage or passing fixture tests does not prove production
provider availability. The saved Cloudflare deployment receipt is retained as the
last verified receipt, not rewritten to imply an unperformed deployment.

See the [API setup and quotas](../services/cloudflare-visitor/second-batch-setup.md).
The apps retain their local functions and existing source fallbacks during that step.

## Verification

Each changed application has its own application/build tests and deployed Pages
checks. Browser review exercised the new filters, local calculations, saved state,
source lookups and archive views. The new gateway has nineteen focused tests,
including real SQLite budget boundaries and credential isolation; a separate
workerd/D1 concurrency check permits exactly one of eight requests competing for
the last daily Wolfram slot. Cloudflare type checks pass.

The hub's offline integration checks, 76 catalogue Python tests, 111 Node tests,
99 watchdog tests and built sitemap checks
validate the combined release. Public source failures remain visible; collected
records retain their actual source/check times.
