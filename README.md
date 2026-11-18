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

### Use in your browser

These tools open immediately without installing a server or command-line program.
A tool that asks you to select a local file is still a browser tool.

| Tool | What you can do | Source |
| --- | --- | --- |
| [Packet Detour](https://coolcode.ca/packet-detour/) | Explore Canadian routing examples and inspect your own annotated hops. | [Included here](packet-detour/README.md) |
| [Protocol Cabinet](https://coolcode.ca/protocol-cabinet/) | Step through DNS, HTTP and SMTP exchanges. | [Included here](protocol-cabinet/README.md) |
| [Rack Recipes](https://coolcode.ca/rack-recipes/) | Plan a home server stack and export a Docker Compose starter. | [Included here](rack-recipes/README.md) |
| [Archive Shelf demo](https://coolcode.ca/archive-shelf/) | Search a fictional newsletter; an installable version is available below. | [Browser files](archive-shelf/) |
| [DNS Lens](https://coolcode.ca/dnslens/) | Inspect DNS and mail policies. | [Separate repository](https://github.com/jsdyer/dnslens) |
| [Government Memory Map](https://coolcode.ca/governmentmemory/) | Find record classes and personal information banks to reference in an access request. | [Separate repository](https://github.com/jsdyer/governmentmemory) |
| [Shipwreck Explorer](https://coolcode.ca/shipwrecks/) | Search Nova Scotia wrecks by area, vessel and date. | [Separate repository](https://github.com/jsdyer/shipwrecks) |

This table is a starting selection. Use the [homepage](https://coolcode.ca/) for the
full searchable directory, including security, government, outdoors, astronomy,
finance and media tools.

### Install yourself

These projects need software on your computer, NAS or server. Their names below
open installation instructions. A web interface does not necessarily mean a
publicly hosted tool: Timefold and Switchboard run on the machine where you install them.

| Project | What you can do | Requirements / way to run |
| --- | --- | --- |
| [Archive Shelf](tools/archive-shelf/README.md) | Search newsletters and meeting minutes by page and open the original PDF at the passage you found. | Python 3, SQLite FTS5 and Poppler for PDFs |
| [Waystation](tools/waystation/README.md) | Capture websites into verifiable capsules, compare changes and replay them offline. | One downloadable Go executable for Linux, macOS or Windows |
| [Timefold](tools/timefold/README.md) | Browse a private archive of photographs, notes, game saves and web fragments. | Docker Compose, or PHP 8.2+ with Apache and MySQL/MariaDB; optional SQLite demo |
| [Tape Index](tools/tape-index/README.md) | Verify a collection of files against a SHA-256 manifest. | Python 3 |
| [Switchboard](tools/switchboard/README.md) | Serve a LAN start page linking to your NAS and other services. | PHP 8+ |
| [Vhost Logbook](tools/logbook/README.md) | Summarize Apache requests, status codes and traffic. | PHP CLI 8+ |
| [LANWatch](tools/lanwatch/README.md) | Check chosen hosts and keep their availability history. | Python 3, SQLite and Linux `ping` |

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
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open `http://localhost:8000/`. The server is a local preview; it does not publish
anything. Open separate project tools at their `https://coolcode.ca/` addresses.
PHP and Docker are not needed to build this static homepage.

When a pull request (PR) is opened or updated, [pages.yml](.github/workflows/pages.yml)
validates the listings, builds the site and checks it in a browser. A PR is a proposed
change on a separate branch; it does not change the live homepage. Its `deploy` job
is deliberately **skipped**. The run saves `catalogue-preview` (the generated files)
and `catalogue-browser-checks` (screenshots) as downloadable Actions artifacts.

After a merge into `main`, the workflow runs again and publishes `dist/` to GitHub
Pages if the build and checks succeed. Follow progress in the
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
| [Catalogue · Check and publish](.github/workflows/pages.yml) | PRs and changes on `main`: validates metadata, builds the homepage and tests search/access filters in a browser. Publishes only from `main`. |
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
4. Run the homepage tests and build above, review the result, and open a PR.

`hosting` describes the destination: `local` means files included in this repository,
`project` means a separate GitHub Pages project, and `external` means an explicit HTTPS
destination such as an installation guide. It is separate from the browser/install label.

Follow [Adding tools](docs/adding-tools.md) for the full record format, Pages setup,
URL rules, privacy/storage conventions and data-refresh guidance. Edit an existing
app in its source repository; change the homepage record only when its listing changes.
Do not edit generated HTML or commit `dist/`, and do not copy another project's
published files into this repository just to link to it.
