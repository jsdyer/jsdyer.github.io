# Adding a tool

The catalogue is curated in `data/tools.json`. Category IDs, titles, icons and order
are in `data/categories.json`. Array order controls listing order within each category.
The four featured cards use the same catalogue records. Edit `data/featured.json` to choose their order.
Use four distinct browser tool IDs in each lineup. Fixed mode displays `a`. In `ab` mode each browser tab receives
one of the two lineups for its session. Set a fresh experiment ID when changing the lineups to keep results interpretable.

## Choose a home

| Tool | Source location | Hosting value |
| --- | --- | --- |
| Small HTML/JS utility without a special build or refresh | Top-level directory here | `local` |
| Independent browser application or data explorer | Its own repository | `project` |
| Installation guide or other external destination | Explicit HTTPS link | `external` |

Tools with their own source imports, schedule checks or data transformations
belong in their own repository. Keep that work and its tests with the tool. The
homepage reads the tool’s published dates and counts.

Existing projects keep their locations. New substantial installable apps get their
own repository. Don't move a project just to reduce the repository count.

For a new standalone browser app, use
[coolcode-tool-template](https://github.com/jsdyer/coolcode-tool-template).
Select a unique lowercase repository name, implement and test the tool, enable
**Settings → Pages → Source → GitHub Actions**, and check its live destination.
Project repositories inherit the account site's domain: `coolcode.ca/<repo>/`.
Do not set `coolcode.ca` as the individual project's custom domain or copy the hub's CNAME.

## Register it

Append a record to the appropriate place in `data/tools.json`, for example:

```json
{
  "id": "my-tool",
  "title": "My Tool",
  "description": "Explain the task someone can accomplish.",
  "category": "security",
  "tags": ["headers", "http"],
  "icon": "scan-search",
  "url": "/my-tool/",
  "source": "https://github.com/jsdyer/my-tool",
  "hosting": "project",
  "access": "browser",
  "sync_manifest": true,
  "data_info": {
    "mode": "local",
    "detail": "The selected header file is processed in the browser."
  }
}
```

Use `sync_manifest` for a new standalone tool whose repository maintains a root
`tool.json`. The flag is optional and belongs in the hub record. The catalogue
ID, repository name and Pages route must share the same slug. Every six hours
the hub reads the project’s default branch and imports its title, description,
data-source sentence (`data_info.detail`) and scheduled check cadence. Omit
`cadence` in the project manifest when scheduled checks end. A failed import
keeps the previous card copy and flags that project for review.

Use an existing `data-icon` value
from `assets/coolcode.css`; new icons need a corresponding sprite/CSS update.
`source` links to the repository or directory containing the code; `url` is where
the catalogue sends the visitor. They are deliberately independent.

`access` describes what the visitor needs to do, independently of where code is
hosted. Set it explicitly to `browser` for an immediately usable web tool or `install`
for a project that must be installed. Do not use language names, "Local file", or
"Browser demo" as access labels. File selection does not mean installation.

An installable project also requires a `requirements` string, such as `Python 3 and
SQLite`; its `url` should open the installation guide. If a browser tool also has a
separate installable version, keep one record with `access: "browser"`, add an HTTPS
`install_url` and state the `requirements`. The build puts it in both sections with
the correct destination. Search counts it as one tool, even when both versions match.

Each entry describes its inputs in `data_info`. Choose `live` for on-demand
lookups, `local` for user inputs or calculations, `installed` for self-hosted
data, `reference` for authored or reviewed material, `snapshot` for imported
datasets, and `mixed` for tools combining methods. For dual-mode tools use
`install_detail` when the locally installed version uses different data.

For a snapshot, select dates from a small JSON file published with the tool.
Give each field its actual meaning, such as “Data retrieved”, “Source published”
or “Data through”. Record `cadence` only after checking the producer workflow.
A source can remain unchanged across several checks. For example:

```json
{
  "mode": "snapshot",
  "detail": "Annual observations from the publisher's register.",
  "cadence": "Weekly",
  "probes": [{
    "label": "Data retrieved",
    "url": "https://coolcode.ca/my-tool/data/status.json",
    "path": ["retrieved_at"],
    "count_at": {"path": ["records"], "unit": "records"}
  }]
}
```

The catalogue reads these public date fields every six hours via GitHub Actions.
`python3 scripts/refresh_dates.py` updates the cached values. The homepage
build itself works offline. A failed date check retains the last known value
and displays a notice. When a source explicitly serves a bundled fallback,
a `notice_if` rule can surface that condition. Each project owns its upstream
data acquisition. Menu entries for live queries and local files describe when
and where the query runs.

A project-hosted browser tool with a data snapshot can set `"data_date_badge": true`.
Serve `data-date.svg` alongside the app, with a visible retrieval date and an
accessible title generated from the snapshot metadata. The homepage and README
display this image. Add a probe for the same SVG URL with `"path": ["retrieved"]`
to include its date in the alternative text. Refreshing the tool updates the visible
badge independently of the catalogue. A JSON probe can report an integer count
or use `"measure": "length"` in `count_at` to count an array or keyed collection.
Use `"measure": "sum"` with a `field` to add validated nonnegative counts across
regional shards. An `end_path` pairs dates of the same precision into a coverage
range. A subdaily feed can set `"precision": "minute"` to display a timezone-aware
timestamp in UTC. With `"allow_unknown": true`, an explicit null source date
clears the previous edition's date. A failed network check preserves the prior value.

For `local`, create `<slug>/index.html` and its assets here and use `/<slug>/` as
the URL. The build includes this directory automatically. A directory cannot reuse
the route of a separately published project. For `external`, supply an HTTPS URL,
such as the installation guide for a command-line application.

```sh
python3 scripts/sync_guides.py --with-manifests --tool my-tool
python3 scripts/sync_readme.py
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`, search for the tool and check its category. External
project routes are deployed independently and will return 404 on this local server;
check those at `https://coolcode.ca/<repo>/`. The homepage contains the complete
catalogue even with JavaScript disabled.

Each tool's own README explains how to try it, where inputs come from, what the
results mean and when the source is refreshed, wherever those details apply.
When changing the tool, update the affected explanation there. The homepage
shows the task, one source sentence, and any applicable date and count.
The catalogue README also includes one practical note from the tool's own guide.
Wrap one or two plain-text sentences in these markers in that guide:

```markdown
<!-- coolcode:guide -->
A missing estimate leaves a gap in the chart. A reported zero stays visible in the CSV.
<!-- /coolcode:guide -->
```

After adding the catalogue record or adjusting a guide, run
`python3 scripts/sync_guides.py --with-manifests --tool my-tool`, then `python3 scripts/sync_readme.py`.
The first command fills the required cached `readme.note` from the tool's README.
Older guides use a short sentence prefix in `readme.lead`. Adding the markers
supersedes the prefix. The six-hour refresh re-reads guides, keeps the last good
note when a source is unavailable or ambiguous, and flags it for review.
Local guide changes are checked on pull requests. Builds use the cached notes offline.

`scripts/sync_readme.py` regenerates only its marked browser/install tables; keep
detailed usage instructions in each tool's own guide. Do not edit the generated
tables manually.

Commit the metadata, regenerated `README.md` and any actual source changes together;
never commit `dist/` or edit a generated homepage. PR checks run
`python3 scripts/sync_readme.py --check` and reject missing or stale README entries
before building the site. Only `main` publishes.
For an opted-in project, update the short listing copy in its own `tool.json` and
the practical note in its README. Edit the hub when registering or moving a tool,
changing its data mode, or changing a date or count probe. The hub manages the
destination, category, probe definitions and cached measurements.

## Shared conventions

- Keep asset URLs relative to the application directory.
- Link home to `https://coolcode.ca/` and document source/API attribution.
- Namespace storage as `coolcode:<tool-id>:<key>`; different paths share an origin.
- Explain which inputs stay local and which are sent to an API. Never embed secrets.
- Enable scheduled data refresh only when the app needs it. Check source structure
  and completeness before deploying; a failed refresh should leave the last good
  deployment available. Display the source date separately from the build date.
- GitHub can disable public-repository schedules after 60 days without activity.
  Monitor freshness, not just HTTP availability; scheduling is not an uptime guarantee.

The catalogue build is offline. The separate link-audit workflow reports network
failures without blocking catalogue deployment. HTTP success alone does not verify
that an application or its data is correct.

## Verify the first visit

Open the public entry point in a clean browser. A visitor should be able to investigate an identifiable public record, request a real reading or supply their own supported input. Exercise that path before updating the listing. Give dated excerpts and reduced datasets an original source, coverage and units. Treat missing observations, empty results and failed requests as distinct states. Synthetic fixtures belong in tests. Where an optional tutorial is relevant, keep the primary workflow and catalogue description focused on the visitor’s actual task.
