# Switching the hub to generated publishing

This change moves the homepage source to `templates/index.html`; the deployable
homepage is `dist/index.html`. Existing tools and their repositories stay in place.

## First rollout

1. Let the PR's **Validate and build catalogue** check pass. Its `catalogue-preview`
   artifact contains the generated site for review.
2. Before merging, open the hub repository's **Settings → Pages → Build and
   deployment** and select **GitHub Actions** as the source. Keep the existing
   custom domain `coolcode.ca` and HTTPS settings.
3. Merge the PR. The `main` push builds and deploys `dist/`. If necessary, run
   **Catalogue · Check and publish** manually on `main`.
4. Check the homepage, search, category anchors, Field Notes, and the four included
   browser tools: Rack Recipes, Archive Shelf, Packet Detour and Protocol Cabinet.
   Also open an independently hosted tool such as DNS Lens.

Changing the publishing source does not prepare a new deployment by itself. Do not
merge this change while the site still publishes directly from the repository root.
There are no DNS changes or changes to project-site Pages settings in this rollout.

If branch rules currently require Timefold checks for every PR, replace that hub-wide
requirement with **Validate and build catalogue** before applying the new path filters.
Keep Timefold tests required for Timefold changes using suitable rules for your workflow.

## Rollback

Revert the catalogue migration PR to restore the root `index.html`, then restore
the previous Pages source (branch `main`, root directory). Keep the custom domain.
Independent project deployments are unaffected by either publishing method.

## Template setup

In `jsdyer/coolcode-tool-template`, enable **Settings → General → Template repository**.
The template itself does not need Pages enabled. A repository created from it must
enable **Settings → Pages → Source → GitHub Actions** and then run the Pages workflow.
Templates copy files, not repository settings or later template changes.

## Search discovery

Every hub build publishes a [sitemap](https://coolcode.ca/sitemap.xml) and
[robots.txt](https://coolcode.ca/robots.txt). The sitemap includes the homepage, local
and independently deployed browser tools in the catalogue, and each published
Field Notes article and its index. Use a stable page URL for an article that
answers a distinct question. URL fragments continue to work for sharing tool
settings. Dataset retrieval dates stay on the tool cards.

1. In Google Search Console, select the existing **coolcode.ca** property and open
   **Sitemaps**. Submit `https://coolcode.ca/sitemap.xml` once it opens publicly.
   The same address updates whenever a catalogue build is published.
2. Open the submitted sitemap to review its status. Use **URL inspection** on the
   homepage and on an individual tool to see what Google fetched and which
   canonical URL it selected.
3. In **Performance → Search results**, filter by a tool's page URL and examine
   its queries, impressions, clicks and click-through rate. Give a new property
   time to collect data. Search Console reports visits from Google Search.

[Google’s sitemap submission guide](https://support.google.com/webmasters/answer/7451001)
