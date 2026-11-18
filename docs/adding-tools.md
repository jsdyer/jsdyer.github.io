# Adding a tool

The catalogue is curated in `data/tools.json`. Category IDs, titles, icons and order
are in `data/categories.json`. Array order controls listing order within each category.
The featured cards are separate editorial content in `templates/index.html`.

## Choose a home

| Tool | Source location | Hosting value |
| --- | --- | --- |
| Small HTML/JS utility without a special build or refresh | Top-level directory here | `local` |
| Independent browser application or data explorer | Its own repository | `project` |
| Installation guide or other external destination | Explicit HTTPS link | `external` |

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
  "data_info": {
    "mode": "local",
    "detail": "The selected header file is processed in the browser."
  }
}
```

All fields in this example are required. Use an existing `data-icon` value
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
python3 scripts/sync_readme.py
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`, search for the tool and check its category. External
project routes are deployed independently and will return 404 on this local server;
check those at `https://coolcode.ca/<repo>/`. The homepage contains the complete
catalogue even with JavaScript disabled.

The README briefly documents every catalogue tool using the same metadata.
`scripts/sync_readme.py` regenerates only its marked browser/install tables; keep
detailed usage instructions in each tool's own guide. Do not edit the generated
tables manually.

Commit the metadata, regenerated `README.md` and any actual source changes together;
never commit `dist/` or edit a generated homepage. PR checks run
`python3 scripts/sync_readme.py --check` and reject missing or stale README entries
before building the site. Only `main` publishes.
Changing an existing standalone app does not require updating the catalogue unless
its title, description, destination or other listing metadata changes.

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
