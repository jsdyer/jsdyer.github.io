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
  "mode": "Browser"
}
```

`mode` is optional. All other fields are required. Use an existing `data-icon` value
from `assets/coolcode.css`; new icons need a corresponding sprite/CSS update.
`source` links to the repository or directory containing the code; `url` is where
the catalogue sends the visitor. They are deliberately independent.

For `local`, create `<slug>/index.html` and its assets here and use `/<slug>/` as
the URL. The build includes this directory automatically. A directory cannot reuse
the route of a separately published project. For `external`, supply an HTTPS URL,
such as the installation guide for a command-line application.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`, search for the tool and check its category. External
project routes are deployed independently and will return 404 on this local server;
check those at `https://coolcode.ca/<repo>/`. The homepage contains the complete
catalogue even with JavaScript disabled.

Commit the metadata and any actual source changes; never commit `dist/` or edit a
generated homepage. PR checks validate and build the site. Only `main` publishes.
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
