# Working on CoolCode

- The homepage catalogue is maintained in `data/tools.json` and `data/categories.json`.
  Edit layout in `templates/index.html`. `dist/` is generated and must not be committed.
- Keep existing titles, descriptions, order, category anchors, icons and URLs unless
  the task asks to change them. The homepage renders its four featured tools from `data/featured.json`.
- Small static utilities can live in a top-level directory in this repository.
  Apps with their own source imports, schedule checks, data transformations, dependencies
  or releases belong in a separate repository. Keep that work and its tests with the tool.
  Keep existing projects where they are unless a move is requested.
- New standalone browser tools start from `jsdyer/coolcode-tool-template`.
- Add one catalogue record only after checking the deployed destination. Use `local`
  hosting for an included directory, `project` for another GitHub Pages repository,
  and `external` for an HTTPS destination such as installation instructions.
- Always set `access` to `browser` or `install`; this is independent of `hosting`.
  Installable projects require `requirements`. For a tool with both versions, use
  `access: "browser"` plus `install_url` and `requirements`. Never classify file
  uploads as installation or replace the clear access label with a language name.
- Use existing icons from `assets/coolcode.css` and category IDs. Tool IDs and public
  routes must be unique. Do not create a local directory over a project site's route.
- After catalogue edits, run `python3 scripts/sync_readme.py` and commit the updated
  `README.md` with the metadata. The marked tool tables are generated; do not edit
  them by hand. CI checks they match the catalogue. Keep detailed tool guides separate.
- On additions and on changes to inputs, results, coverage or update behaviour, revise
  the tool's own README. Include a useful example or interpretation in its marked
  guide excerpt. Keep the homepage task and data-source sentences brief. Run
  `python3 scripts/sync_guides.py --tool TOOL_ID` before regenerating the root README.
- Run `python3 -m unittest discover -s tests -v` and `python3 scripts/build.py`.
  Preview using `python3 -m http.server 8000 --directory dist`.
- Do not add a dependency or framework just to maintain the catalogue. Never make
  the homepage build depend on fetching or rebuilding the independent tool repos.
- Scope application tests to the application being changed. A link failure in the
  separate network audit must not prevent a valid catalogue build from publishing.
- Keep the existing domain and public paths. Publish only `dist/`; PRs must not deploy.

See `docs/adding-tools.md` for examples and `docs/pages-rollout.md` for the publishing transition.
