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
