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

Every catalogue tool is listed briefly below. These tables are generated from the
same names, descriptions, categories, links and requirements as the polished
[homepage](https://coolcode.ca/). Follow **Source & docs** or an installation guide
for each project's detailed instructions. Update the catalogue once, then regenerate
these tables; the PR checks reject an out-of-date directory.

### Use in your browser

These tools open immediately without installing a server or command-line program.
A tool that asks you to select a local file is still a browser tool.

<!-- BEGIN BROWSER_TOOLS -->

62 browser tools, grouped as on the homepage.

#### Homelab &amp; archiving

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Rack Recipes](<https://coolcode.ca/rack-recipes/>) | Plan a home server stack and export a Docker Compose starter. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/rack-recipes>) |
| [Archive Shelf](<https://coolcode.ca/archive-shelf/>) | Search historical newsletters by page or index a private collection on Linux. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/archive-shelf>) |

#### Networks &amp; routing

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [DNS Lens](<https://coolcode.ca/dnslens/>) | Compare public resolvers and inspect DNS records, mail policies and registration. | [Source &amp; docs](<https://github.com/jsdyer/dnslens>) |
| [IP Snapshot](<https://coolcode.ca/ipsnapshot/>) | See ports, hostnames and vulnerability identifiers from passive InternetDB observations. | [Source &amp; docs](<https://github.com/jsdyer/ipsnapshot>) |
| [Certificate Trail](<https://coolcode.ca/certtrail/>) | Trace issued certificates, names, issuers and dates across certificate transparency logs. | [Source &amp; docs](<https://github.com/jsdyer/certtrail>) |
| [Route Archaeologist](<https://coolcode.ca/routearchaeologist/>) | Trace observed BGP origins by IP prefix or ASN. | [Source &amp; docs](<https://github.com/jsdyer/routearchaeologist>) |
| [RPKI Guard](<https://coolcode.ca/rpkiguard/>) | Check whether a route origin ASN and prefix are authorized by published ROAs. | [Source &amp; docs](<https://github.com/jsdyer/rpkiguard>) |
| [Outage Scope](<https://coolcode.ca/outagescope/>) | Explore network disruptions and compare the measurement signals behind them. | [Source &amp; docs](<https://github.com/jsdyer/outagescope>) |
| [Broadband Atlas](<https://coolcode.ca/broadbandatlas/>) | Explore reported coverage, funding and nearby radio licences, with provincial plan prices. | [Source &amp; docs](<https://github.com/jsdyer/broadbandatlas>) |
| [Telecom Pulse](<https://coolcode.ca/telecompulse/>) | Compare the CRTC’s published telecommunications indicators over time. | [Source &amp; docs](<https://github.com/jsdyer/telecompulse>) |
| [Onion Pulse](<https://coolcode.ca/onionpulse/>) | Compare Tor user, relay, bridge and onion-service measurements. | [Source &amp; docs](<https://github.com/jsdyer/onionpulse>) |
| [Blocked or Gone?](<https://coolcode.ca/blockedorgone/>) | Investigate interference and test coverage in public OONI measurements. | [Source &amp; docs](<https://github.com/jsdyer/blockedorgone>) |
| [Packet Detour](<https://coolcode.ca/packet-detour/>) | Follow a Canadian route through Seattle or paste your own annotated hops. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/packet-detour>) |
| [Protocol Cabinet](<https://coolcode.ca/protocol-cabinet/>) | Read the messages sent in a DNS lookup, HTTP request, or SMTP conversation. | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/protocol-cabinet>) |

#### Security &amp; forensics

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Tracker X-Ray](<https://coolcode.ca/trackerxray/>) | Inspect HAR captures for third-party requests, cookies and analytics hosts. | [Source &amp; docs](<https://github.com/jsdyer/trackerxray>) |
| [Header Autopsy](<https://coolcode.ca/headerautopsy/>) | Read HTTP header values and inspect security policy, cookies and cache signals. | [Source &amp; docs](<https://github.com/jsdyer/headerautopsy>) |
| [Mail Path](<https://coolcode.ca/mailpath/>) | Reconstruct received-email hops and the authentication results each server reported. | [Source &amp; docs](<https://github.com/jsdyer/mailpath>) |
| [Packet Pocket](<https://coolcode.ca/packetpocket/>) | Examine local packet captures for conversations, DNS, HTTP and observable TLS data. | [Source &amp; docs](<https://github.com/jsdyer/packetpocket>) |
| [Dependency X-Ray](<https://coolcode.ca/dependencyxray/>) | Inspect dependency lockfiles and query advisories for selected packages. | [Source &amp; docs](<https://github.com/jsdyer/dependencyxray>) |
| [Exploit Graveyard](<https://coolcode.ca/exploitgraveyard/>) | Search CISA’s catalogue of known exploited vulnerabilities by product or CVE. | [Source &amp; docs](<https://github.com/jsdyer/exploitgraveyard>) |
| [Patch Signal](<https://coolcode.ca/patchsignal/>) | Look up CVEs and compare reported exploitation, EPSS estimates and advisories. | [Source &amp; docs](<https://github.com/jsdyer/patchsignal>) |

#### Government &amp; public records

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [ATIP Records Explorer](<https://coolcode.ca/atip/>) | Find released records, request copies, or draft an access request. | [Source &amp; docs](<https://github.com/jsdyer/atip>) |
| [Government Memory Map](<https://coolcode.ca/governmentmemory/>) | Find record classes and personal information banks to reference in an access request. | [Source &amp; docs](<https://github.com/jsdyer/governmentmemory>) |
| [The Briefing Room](<https://coolcode.ca/briefings/>) | Search briefing note titles and reference numbers. | [Source &amp; docs](<https://github.com/jsdyer/briefings>) |
| [Evidence Lab](<https://coolcode.ca/evidencelab/>) | Search disclosure PDFs, find dates and section references, and save page citations. | [Source &amp; docs](<https://github.com/jsdyer/evidencelab>) |
| [The ATIP Popularity Index](<https://coolcode.ca/atippopularity/>) | See which released records received the most informal copy requests. | [Source &amp; docs](<https://github.com/jsdyer/atippopularity>) |
| [ATIP Metrics](<https://coolcode.ca/atipmetrics/>) | Compare institutional workloads, find related records and briefing notes, and build a request draft. | [Source &amp; docs](<https://github.com/jsdyer/atipmetrics>) |
| [What the Minister Was Prepared to Say](<https://coolcode.ca/ministersays/>) | Compare Question Period notes and the issues they address. | [Source &amp; docs](<https://github.com/jsdyer/ministersays>) |
| [The Government’s Wrongdoing Files](<https://coolcode.ca/wrongdoings/>) | Read published findings, recommendations and corrective actions. | [Source &amp; docs](<https://github.com/jsdyer/wrongdoings>) |
| [Algorithm Watch](<https://coolcode.ca/algorithmwatch/>) | Explore the federal AI register and find matched impact assessments. | [Source &amp; docs](<https://github.com/jsdyer/algorithmwatch>) |
| [The Government Dataset Explorer](<https://coolcode.ca/datasetexplorer/>) | Find federal datasets and their downloadable files. | [Source &amp; docs](<https://github.com/jsdyer/datasetexplorer>) |
| [The Open Data Graveyard](<https://coolcode.ca/opendatagraveyard/>) | Investigate datasets removed from the federal catalogue. | [Source &amp; docs](<https://github.com/jsdyer/opendatagraveyard>) |
| [Canada.ca Pulse](<https://coolcode.ca/canadaanalytics/>) | Explore recent patterns in federal government website usage. | [Source &amp; docs](<https://github.com/jsdyer/canadaanalytics>) |

#### Public disclosures

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Corporate Ghosts](<https://coolcode.ca/corporateghosts/>) | Search Canada’s federal corporate register and compare legal statuses. | [Source &amp; docs](<https://github.com/jsdyer/corporateghosts>) |
| [Lobby Trail](<https://coolcode.ca/lobbytrail/>) | Explore reported federal lobbying communications by organization, subject and institution. | [Source &amp; docs](<https://github.com/jsdyer/lobbytrail>) |
| [Charity Flows](<https://coolcode.ca/charityflows/>) | Compare Canadian charity filings and explore grants to reported recipients. | [Source &amp; docs](<https://github.com/jsdyer/charityflows>) |
| [Tariff X-Ray](<https://coolcode.ca/tariffxray/>) | Find Canadian telecom tariff items and the regulatory decisions behind them. | [Source &amp; docs](<https://github.com/jsdyer/tariffxray>) |
| [Gear Autopsy](<https://coolcode.ca/gearautopsy/>) | Find device filings and public FCC exhibits by model or FCC ID. | [Source &amp; docs](<https://github.com/jsdyer/gearautopsy>) |
| [Recall Radar](<https://coolcode.ca/recallradar/>) | Search Canadian safety alerts and check affected vehicle makes, models and years. | [Source &amp; docs](<https://github.com/jsdyer/recallradar>) |
| [Patent Attic](<https://coolcode.ca/patentattic/>) | Search Canadian technology patents and open original CIPO records. | [Source &amp; docs](<https://github.com/jsdyer/patentattic>) |

#### Maps, trails &amp; history

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Trailglass](<https://coolcode.ca/trailglass/>) | Explore cycling and trail layers and inspect a Garmin GPX ride. | [Source &amp; docs](<https://github.com/jsdyer/trailglass>) |
| [Weather Archive](<https://coolcode.ca/weatherarchive/>) | Compare daily Canadian weather station records and monthly climate normals. | [Source &amp; docs](<https://github.com/jsdyer/weatherarchive>) |
| [Spectrum Atlas](<https://coolcode.ca/spectrumatlas/>) | Map published spectrum authorizations and inspect bands and frequencies. | [Source &amp; docs](<https://github.com/jsdyer/spectrumatlas>) |
| [Shipwreck Explorer](<https://coolcode.ca/shipwrecks/>) | Search Nova Scotia wrecks by area, vessel and date. | [Source &amp; docs](<https://github.com/jsdyer/shipwrecks>) |
| [Forgotten Places](<https://coolcode.ca/forgottenplaces/>) | Explore sites in Canada’s historic places register. | [Source &amp; docs](<https://github.com/jsdyer/forgottenplaces>) |
| [Names That Time Forgot](<https://coolcode.ca/namesforget/>) | Trace Canadian place names, features and their locations. | [Source &amp; docs](<https://github.com/jsdyer/namesforget>) |
| [BC Place Names Explorer](<https://coolcode.ca/bcplacenames/>) | Explore nearby BC place names, official and recorded names, and naming decisions. | [Source &amp; docs](<https://github.com/jsdyer/bcplacenames>) |
| [Strange Skies Canada](<https://coolcode.ca/strangeskies/>) | Search aviation occurrence reports by location, year and event. | [Source &amp; docs](<https://github.com/jsdyer/strangeskies>) |

#### Sky &amp; photography

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Nightfinder](<https://coolcode.ca/nightfinder/>) | Plan a night shoot around darkness, target positions and lens framing. | [Source &amp; docs](<https://github.com/jsdyer/nightfinder>) |
| [Satellite Pass](<https://coolcode.ca/satpasses/>) | Calculate passes for the ISS and other satellites from your location. | [Source &amp; docs](<https://github.com/jsdyer/satpasses>) |
| [Sky Archive Explorer](<https://coolcode.ca/skyarchive/>) | Find selected Hubble and Webb observations and open the original archive records. | [Source &amp; docs](<https://github.com/jsdyer/skyarchive>) |
| [Photo Lab](<https://coolcode.ca/photolab/>) | Inspect metadata, edit photos and export cleaned copies on your device. | [Source &amp; docs](<https://github.com/jsdyer/photolab>) |

#### Money &amp; markets

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [BankRate Lab](<https://coolcode.ca/bankrates/>) | Chart Bank of Canada rates, exchange rates and yields. | [Source &amp; docs](<https://github.com/jsdyer/bankrates>) |
| [Canadian Price Atlas](<https://coolcode.ca/priceatlas/>) | Compare historical grocery prices across Canadian regions. | [Source &amp; docs](<https://github.com/jsdyer/priceatlas>) |
| [Insolvency Atlas](<https://coolcode.ca/insolvencyatlas/>) | Explore insolvency counts and rates, or compare filings with grocery prices and policy rates. | [Source &amp; docs](<https://github.com/jsdyer/insolvencyatlas>) |
| [Market Shadows](<https://coolcode.ca/marketshadows/>) | Compare CIRO trading and short positions and rank changes between reports. | [Source &amp; docs](<https://github.com/jsdyer/marketshadows>) |

#### Media, events &amp; the old web

| Tool | What it does | Code / documentation |
| --- | --- | --- |
| [Event Radar](<https://coolcode.ca/eventradar/>) | Browse local listings and keep selected events on your calendar. | [Source &amp; docs](<https://github.com/jsdyer/eventradar>) |
| [Screen Radar](<https://coolcode.ca/screenradar/>) | Find television and Canadian films, and keep a watchlist in this browser. | [Source &amp; docs](<https://github.com/jsdyer/screenradar>) |
| [Media Echoes](<https://coolcode.ca/mediaechoes/>) | Search the Internet Archive for old games, Flash projects and media. | [Source &amp; docs](<https://github.com/jsdyer/mediaechoes>) |
| [Ghost Links](<https://coolcode.ca/ghostlinks/>) | Follow dead URLs through web archives and dated captures. | [Source &amp; docs](<https://github.com/jsdyer/ghostlinks>) |
| [Lost Code](<https://coolcode.ca/lostcode/>) | Look up archived repository visits, branches and tags. | [Source &amp; docs](<https://github.com/jsdyer/lostcode>) |
| [The Unreleased Worlds Index](<https://coolcode.ca/unreleased/>) | Search a Canada Media Fund export for funded games, films and digital projects. | [Source &amp; docs](<https://github.com/jsdyer/unreleased>) |

<!-- END BROWSER_TOOLS -->

### Install yourself

These projects need software on your computer, NAS or server. Their names below
open installation instructions. A web interface does not necessarily mean a
publicly hosted tool: Timefold and Switchboard run on the machine where you install them.

<!-- BEGIN INSTALL_TOOLS -->

7 installation options. Tools with both versions also appear above.

| Project / installation guide | What it does | Requirements | Code / documentation |
| --- | --- | --- | --- |
| [Switchboard](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/switchboard>) | Build a local front door for your NAS, DNS console and other services. | PHP 8+ | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/switchboard>) |
| [Vhost Logbook](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/logbook>) | Summarize requests, status codes and traffic from Apache access logs. | PHP CLI 8+ | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/logbook>) |
| [LANWatch](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/lanwatch>) | Ping your devices and keep a local history of when they were reachable. | Python 3, SQLite and Linux ping | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/lanwatch>) |
| [Archive Shelf](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/archive-shelf>) | Search historical newsletters by page or index a private collection on Linux. | Python 3, SQLite FTS5 and Poppler for PDFs | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/archive-shelf>) |
| [Waystation](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation>) | Capture websites into portable archives, map links and browse offline. | Downloadable executable for Linux, macOS or Windows | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/waystation>) |
| [Timefold](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold>) | Build a personal timeline of photos, game saves and web fragments. | PHP 8.2+ and MySQL/MariaDB; optional SQLite demo | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold>) |
| [Tape Index](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index>) | Fingerprint and verify scans, web archives and game saves from the terminal. | Python 3 | [Source &amp; docs](<https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/tape-index>) |

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
