# Search discovery and Field Notes

Keep search metadata in the app's own static build. This must not add a network
requirement to the hub build or require a new service.

- Use a concise descriptive task in the page title and one ` · CoolCode` suffix.
  Keep the creative app name visible. Match the actual geography, data coverage and
  task; historical passenger-load data must not be advertised as live crowding.
- The browser-tool starter supports `init.py --search-title`. Its build emits
  `WebApplication` (a SoftwareApplication subtype), a free CAD offer, social metadata
  and the canonical URL for initialized CoolCode tools. Review the category. Do not
  fabricate reviews/ratings to qualify for a Google rich result.
- Add Dataset JSON-LD only to a page that actually describes an accessible dataset.
  Include its source, licence, coverage and real downloads, and expose matching
  information as static page text. Counts and dates must come from the same snapshot
  as the app. Preserve existing Dataset markup rather than duplicating it.
- A source edition, successful retrieval and page build are separate dates.
  Salmon Lines uses the DFO edition for `dateModified`; ATIP uses `dateCreated` for
  preparation of its transformed snapshot and omits an unknown upstream modification
  date. Never advance a source date just because the page was redeployed.
- Register useful dataset landing sections in the existing `data/tools.json`
  `dataset` field. Multi-file/upstream downloads can omit `file` and `format`, so the
  directory points to their explanatory download section. Never label a provenance
  manifest as the complete dataset.
- Give Field Notes useful, reproducible subjects: the question, exact steps, evidence,
  interpretation and limitations. Add a new note when there is something worth
  showing; no publishing quota or date-only refresh. A handful of substantial guides
  is more useful than splitting every short example into a thin page.
- A note belongs at `field-notes/<slug>/index.html` with a canonical URL, descriptive
  title, publication date and links to the tool and original evidence. Link back from
  the tool, update the notes index/RSS and homepage feature, and preserve old URLs.
  `scripts/build.py` discovers note routes for the sitemap automatically.
- Keep old examples' original dates. If adding navigation to them, do not imply the
  underlying data was re-researched. The 35-example guide has stable example anchors.

Validate the app build/tests, parse its emitted JSON-LD, and compare the dates,
counts, canonical URL and downloads against the built inputs. Run the hub's normal
integration checks/tests/build and verify live HTML and sitemap after deployment.
Changes to search copy do not alter app IDs, workflow cadence or watchdog probes;
no Worker redeployment is needed when its source and accepted IDs are unchanged.

Google's documentation: [titles](https://developers.google.com/search/docs/appearance/title-link),
[software apps](https://developers.google.com/search/docs/appearance/structured-data/software-app),
[datasets](https://developers.google.com/search/docs/appearance/structured-data/dataset).
Dataset markup assists Dataset Search; structured data is not a ranking guarantee.

## Common tasks and configured examples

Use the hub's optional `task_label` to give a card a descriptive link while keeping its app name searchable. Add a `use_cases` array to a public browser tool's hub record after checking the deployed pages. Each item has a human-readable `title` and a relative `path` ending in a slash or `.html`. For example, a path of `usd-to-cad/` on FX Receipt points to `/fxreceipt/usd-to-cad/`. Use an ordinary HTML page with a self-referencing canonical, an example/result in the initial HTML and the calculator or lookup already configured. Keep personal searches and saved reports out of the list.

The builder adds those URLs to the tool's catalogue card, its applicable topic guides and the public sitemap. The link audit checks them alongside tool roots. Edit `data/topics.json` for the curated task guides. Independent app repos own the working examples and their metadata. Test the generated links and the deployed page before adding a preset.
