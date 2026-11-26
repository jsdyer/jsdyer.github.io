# Site administration

Open [the owner dashboard](https://coolcode.ca/admin/) and enter the owner’s GitHub token once. The collector verifies the owner with GitHub before the dashboard opens. Reports load automatically. The token stays in tab memory until you lock the dashboard, reload or leave the page.

Set four featured tools in display order. Fixed mode always serves lineup A. A/B mode splits new browser tabs approximately evenly between A and B and keeps a tab’s choice for the experiment. Visitors with disabled JavaScript see the server-rendered A lineup. An active-lineup change in the dashboard generates a new experiment identifier.

A read-only token covers statistics and the issue inbox. To publish from the same session, sign in with a fine-grained token limited to this repository with Contents read/write. To use **Check GitHub now**, that same admin token also needs **Actions: read and write** with `jsdyer/jsdyer.github.io` included in its repository access. This is separate from the Linux watchdog’s GitHub App. The collector receives that token for owner verification, and publishing or explicitly requesting a check sends it directly to GitHub. The dashboard checks for overlapping changes. You can also copy the configuration into GitHub’s editor. A commit triggers the existing Pages build. If the branch uses required reviews, use the GitHub editor to open a pull request. Manual edits to data/featured.json should give a changed test a fresh experiment ID.

The statistics panel distinguishes tool page opens, featured-card impressions and clicks, and Google organic clicks. Reloading a tool counts as another open when measurement is active. A card impression is counted when it enters the viewport and a click is counted once per card per page load. Browsers that disable JavaScript, opt out, or block the counter can be absent from these totals. The independently deployed tools send only their catalogue ID. A tool visit can originate anywhere.

Visitors can use Report an issue inside a tool even when that tool’s JavaScript has failed. The reporting page labels the available submission method and which reports are public. Avoid requesting credentials, files or precise locations. The admin page itself is excluded from the sitemap and marked noindex. Write permission and private data access are enforced by the services receiving the requests.

In **Statistics and issue reports**, select 7 or 28 days. **Tool traffic** ranks tools by recorded opens and shows each tool’s share of all opens in that period. Searching narrows the rows while keeping the full-period denominator. Choose **Every tool** to include browser tools with zero opens. Expand **Daily tool opens** for the site-wide UTC trend. Under **Featured lineup performance**, expand **See individual featured cards** to compare each tool’s clicks and impressions within its own experiment and lineup. A rate shown as a dash has no denominator.

When adding a catalogue ID, follow [Enable usage counts and private issue reports](adding-tools.md#enable-usage-counts-and-private-issue-reports) to register it with the collector.

Open the existing coolcode.ca property in [Google Search Console](https://search.google.com/search-console?resource_id=sc-domain%3Acoolcode.ca). In Sitemaps, submit https://coolcode.ca/sitemap.xml once. GitHub Pages regenerates the file on future catalogue builds. For organic search performance, choose the date range, open Performance → Search results, export CSV, and import the Pages.csv file into the dashboard. Import Queries.csv to search phrases and sort by clicks or impressions. To investigate one tool, filter its page in Search Console before exporting. Both files stay in your browser tab.

## Update log

After signing in, open **Update log → Browse update history**. The **Catalogue refresh journal** records each six-hour check of the metadata published by the tools. The newest attempts appear first. Use **Needs attention** for an unavailable source or unsuccessful workflow. Filter by project to see which checks for that tool changed. Open an entry for the before-and-after values or the failure reason. A check can recover while the date and record count stay the same. A successful workflow can also have unavailable sources.

Each attempt with a completed metadata step saves its UTC time, per-tool coverage and check results on the `catalogue-refresh-log` branch. The latest 120 saved attempts are available from the dashboard. The accompanying GitHub workflow lookup covers up to 100 recent runs. If an attempt stopped before it could record its checks or predates the journal, open its workflow link to investigate. The journal covers catalogue metadata. Independent tool collectors and deployments have their own histories.

Switch **History** to **Workflow runs** to read a project's public GitHub Actions history, filter failed or cancelled runs, or switch to its source commits. Open a run to inspect its steps. Projects in the main repository share workflow history, while their source history follows their own directory.

**Catalogue changes → Show what changed** compares the recorded tool entries before and after a commit. It includes reported dates, counts, unavailable or recovered checks, additions, removals and listing edits. **Featured lineup changes** links to each committed configuration change. These public histories come directly from GitHub and include existing records. The log loads on demand in pages of 20 and offers links to GitHub when its public API is rate-limited.

The six-hour catalogue workflow checks metadata published by the tools. Each independent tool has its own update process. The catalogue can retain an earlier reading when a probe fails. Expand **Unavailable catalogue checks** for the flags in the latest published snapshot. Catalogue refreshes running the updated script also write changed, unchanged and unavailable probe totals to the GitHub run summary. A source commit records a repository change. The Pages deployment result records whether a release succeeded. Private inbox actions and manual Cloudflare edits are outside this GitHub history.

## Tool outcomes

Open **Tool outcomes → Compare workflow results with published data** for two
separate results per scheduled workflow: GitHub execution and the evidence the
tool has actually published. The report defaults to **Needs review** and can
be filtered by tool, all workflows, running jobs, limited verification or passed
checks. Each row links to the latest run, the latest scheduled/manual run and the
published metadata that was read.

Validated metadata readings reuse the watchdog's bounded cache (at most six hours
for slower sources), with a fresh read after a changed run or due occurrence.
Cached evidence and record counts retain their actual read time in the report.
Unresolved failures or limited evidence are re-read on each observation, so an
independent publication cannot stay hidden behind the metadata cache.
An explicit **Check GitHub now** run reads all metadata afresh.

The report uses the same generated watchdog registry, reviewed timestamps and age limits
as the independent watchdog. It also reads record counts where the catalogue has
a reviewed count definition on the checked document. Zero or unchanged counts
are allowed; an old observation year is not substituted for a retrieval/check
date. A failed workflow and a recent retained snapshot remain visible together.
If a precise timestamp predates a successful refresh run, that run's output is
marked unconfirmed. Date-only evidence is explicitly identified as unable to
prove which individual run produced it. Missing or unreadable evidence is never
called verified.

A failed collection remains **Needs attention** after a successful build that
skipped collection. For reviewed workflows, exact GitHub step results distinguish
collection from publishing retained data. The observer searches the latest 20
runs so a build-only push cannot obscure a failed collector push between builds.
A successful collection step on a push
can confirm recovery; a green push by itself cannot. Missing step evidence stays
unconfirmed. Both run results remain visible.

Border Pulse and Status Ledger have reviewed collection steps too. When only a
failed deployment is retried, the observer compares published evidence with the
original collection step's start, not the later deployment retry. Reusing that
build does not count as another scheduled collection.

Satellite Pass deliberately permits a snapshot cached for up to two hours during
a build. That reviewed allowance is labelled as cache reuse, not a fresh download;
its ordinary published-age limit still applies. NASA Overhead exposes individual
source failures (including Sun subfeeds) even when enough feeds succeeded to
publish a useful capture. The six reviewed jobs that do not publish datasets are explicitly
labelled workflow-only checks. They are not missing dataset-monitoring coverage.

These checks do not certify the accuracy of every record or exercise every tool's
interactive features. Source validation and browser checks remain in each tool's
workflow. Tools without scheduled workflows are outside this report. An expected
unpublished archive, such as Air Check Diary's next month, can be a successful
source check with unchanged retained data.

The existing hourly `service-monitor.yml` workflow has a separate read-only
observation job. It reads workflow state and the latest 20 runs per registered
workflow, then reads public output metadata. It never dispatches, enables or
retries collectors, and it does not send additional alerts. The Linux watchdog
continues to own recovery and Healthchecks signalling. Its Healthchecks heartbeat
monitors the watchdog service executing and saving its results. Collector download
failures, old datasets, unreadable published timestamps and handled per-target
GitHub read/dispatch errors remain findings; they do not fail that heartbeat.
Rate-limit backoff and refusal to dispatch with incomplete history are safe,
reported decisions. A green watchdog check can therefore coexist with **Needs
review** in this report. Missing/rejected shared credentials, invalid local
configuration/state, disk-write failures and unexpected runtime errors still fail
the service heartbeat; a stopped watchdog leaves missing pings.
If a source can be downloaded in your browser but rejects the collector, follow
[Manual data import](manual-data-import.md). It documents the verified Census Lens
and Lobby Trail inputs, local validation, committed files and publication steps,
plus the limits of applying the same procedure to other tools.
With the updated watchdog runtime, unresolved refreshes are retried six hours apart
by default, without a three-attempt cutoff. A new cron occurrence does not shorten
that retry window, and an observed successful refresh resets it. A recent retained
snapshot can remain available during failed attempts; overdue or unreadable output
still raises a collector error in reports while recovery continues. The server's private report records
its own `recovery_attempts` and `retry_after`; this public observer does not read those
fields or know the server's next retry time. In the private report, `watchdog_health`
and `watchdog_errors` control the heartbeat, while the existing overall `health` and
`errors` still include data findings. Per-target `error_scope`, `collector_errors` and `target_errors`
make the distinction explicit. The installed `runtime_version` must be
`2026-11-26-service-health-v2` or newer for the narrower service-only policy. The revised policy requires the installed runtime
update; changing the target list alone does not install it. See the watchdog's
[runtime update instructions](../services/refresh-watchdog/README.md#install-this-runtime-update).

The job saves `collector-outcomes.json` on the `collector-outcomes-log` branch,
including the latest results and 24 recent observations. **Recent outcome
observations** shows problems, recoveries, changed counts and new workflow attempts.
A second failed attempt is recorded even when the tool remains in Needs attention. The branch's Git
history retains earlier reports. A report older than three hours is visibly
stale. The normal schedule is **hourly at :37 UTC**, subject to GitHub delays.
**Load saved report** reads that snapshot directly from GitHub’s Contents API with
cache disabled and a distinct request URL. It does not use the raw branch URL, which
can keep serving an older file after an observer finishes. The download link saves
the exact report currently displayed. Its timestamp, age in minutes,
and each workflow's observation time explain why later runs may be missing.

**Check GitHub now** explicitly dispatches `service-monitor.yml` on `main` using
the current in-memory admin token. It requires **Actions: read and write** for
`jsdyer/jsdyer.github.io`; reading the saved report needs no extra permission.
If GitHub returns 403, open [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens), edit the token used to unlock this admin, ensure its repository access includes `jsdyer/jsdyer.github.io`, and set repository **Actions → Read and write**. Save the change, lock the admin and sign in again with the token. There is no need to grant Actions write to every tool repository or change the watchdog App. You can alternatively use **Run workflow** on the linked Observation runs page.
The dispatch request uses GitHub API version `2026-03-10` and accepts its HTTP 200 run receipt as well as the legacy 204 response. Acceptance still means queued, not completed.
The button starts the observer, not the data collectors. The observer reads fresh
workflow results and published metadata, then publishes a new saved report.
The admin checks for it every 20 seconds while the panel remains open, for up to
15 minutes. An accepted dispatch is shown as waiting, never as a completed check.
A delayed/failed observer leaves the old report clearly labelled and links to its
GitHub runs. Closing the page does not cancel GitHub's work.

A successful observation job means it produced a report, even when that report
contains individual tool failures.

Only public repository identities, run links and summarized public metadata are
saved. The admin sends the existing in-memory owner token only to the fixed GitHub
API endpoint when loading the report, avoiding the anonymous API rate limit during
polling. It never forwards the token to the raw-content host or another origin.
A failed API read is shown explicitly, without silently using an older copy. No
new account, secret, server timer, Cloudflare deployment or duplicate tool list
is required. The existing registry automatically includes newly registered
scheduled workflows. Maintain that registry and reviewed evidence definitions
through the [tool lifecycle](tool-lifecycle.md).

## Service status

Open **Service status** to check the production homepage, tool catalogue, search sitemap and visitor API from your browser. Each GET validates expected response content. The visitor API health endpoint also executes a read-only schema query against D1. These checks make no pageview submissions, private report requests or database writes. Response times include network travel and reading the response. A timeout can originate between the observer and the service.

The [external monitor](https://github.com/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml) runs the same checks at minute 37 each hour and supports manual runs. Each run summary lists the HTTP status, elapsed time and result for each endpoint. The admin shows the last 24 available runs and flags a gap of over two hours. Run counts are samples rather than a measurement of continuous uptime. GitHub keeps the workflow history accessible directly if Pages or admin authentication is unavailable.

Choose **Check from across Canada** for fresh results from public Globalping probes in Vancouver, Toronto and Halifax. The browser requests only DNS A records and HTTPS for the homepage and the visitor API health path. Each row gives the requested city, actual probe network, response and total time. “No probe returned” means the service supplied no matching measurement for that city. The [daily 15:23 UTC workflow](https://github.com/jsdyer/jsdyer.github.io/actions/workflows/canada-probes.yml) runs the same checks, writes the table to its run summary and retains a JSON artifact for 30 days. Both entry points work without registering with Globalping. Each complete run uses up to 12 public probe tests.

**Provider incidents** shows the component status for GitHub Pages, Actions and API Requests, and for Cloudflare Workers and D1. Active incidents link to the provider’s report. Use the browser and external service checks above to see whether the reported incident affected a specific CoolCode endpoint.

## Cloudflare usage

**Cloudflare usage → View the last 24 hours** queries Cloudflare for the visitor API’s request count, runtime outcomes and outbound subrequests, plus queries and rows read or written for the reporting database. Counts cover a rolling UTC window. Health checks and administrative requests can contribute. Use **Tool traffic** for per-tool opens. Each provider dataset can load independently.

The on-demand metrics Worker is maintained in `services/cloudflare-admin/worker.mjs` and uses the name `coolcode-admin-metrics` on the same Cloudflare account. Its `COLLECTOR` service binding targets `coolcode-visitor-api` and delegates owner verification to the existing private stats route. Its `ANALYTICS_SQL` Analytics SQL binding queries fixed aggregate statements. `REPORTS_DATABASE_ID` selects the UUID of `coolcode-reports`. The dashboard sends the current tab's credential only when you open or refresh this panel. Locking the admin clears the session. Deploy changes to this companion separately from GitHub Pages.

### Fix a 503 after deploying the metrics Worker

If private reports load but the usage panel says the companion could not verify your sign-in, open **Workers & Pages → coolcode-admin-metrics → Edit code**. Inside `verifyOwner`, use `redirect: 'manual'` in the request to `COLLECTOR`. Earlier editions used `'error'`, which Cloudflare's runtime rejects before it contacts the visitor API. Click **Deploy** and refresh **Cloudflare usage**. You can also paste the [current companion module](../services/cloudflare-admin/worker.mjs) into that same editor and deploy it. Existing bindings survive a code-only update. [Cloudflare Request reference](https://developers.cloudflare.com/workers/runtime-apis/request/)

To test the verification step from Linux, use this literal placeholder:

```bash
curl -i -H 'Origin: https://coolcode.ca' -H 'Authorization: Bearer diagnostic-placeholder' https://coolcode-admin-metrics.jeffdyer.workers.dev/admin/cloudflare
```

The repaired Worker returns **401** for that placeholder. Use your existing sign-in in the admin to verify that the real 24-hour counts load. If the panel instead says **Sign-in succeeded**, use the Worker and D1 messages to identify which analytics query or binding needs attention.

### Register a new tool with the visitor API

The accepted IDs are generated from `data/tools.json`. Follow [the visitor Worker deployment](../services/cloudflare-visitor/README.md), preserving its existing settings and D1 binding. Verify with `python3 scripts/check_live_registry.py` and commit the verified deployment receipt. The [tool lifecycle](tool-lifecycle.md) also covers the watchdog, catalogue, README, sitemap and repository audit.

### Activate the metrics Worker on Linux

This one-time deployment enables **Cloudflare usage** in the admin. The companion runs at `coolcode-admin-metrics.jeffdyer.workers.dev`, an address issued by Cloudflare in the account that already runs the visitor API.

1. Select that account in the Cloudflare dashboard. Copy its **Account ID**. Open **Storage & databases → D1 → coolcode-reports** and copy **Database ID** (the UUID).
2. Open [My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens), click **Create Token**, name it `coolcode-metrics-deploy` and start from scratch. If the form currently says **Edit Zone policy** and **Choose a zone resource**, click the **red trash can** on that policy card. Add an **Account** policy. The **+ Add more** inside the zone card adds another zone rule.
3. In the Account policy choose **Include → Specific account** and select the account from step 1. Search the permission groups for **Workers Scripts** and select **Edit** (API name **Workers Scripts Write**). Set a short expiration, choose **Continue to summary**, confirm that only the intended account and permission appear, then click **Create Token** and copy the secret. This permission can deploy scripts across that account while the token is valid. [Cloudflare token instructions](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
4. In a Linux shell, use the following commands for a fresh checkout. If you already have a current checkout, run just the last command from its root.

   ```bash
   git clone https://github.com/jsdyer/jsdyer.github.io.git
   cd jsdyer.github.io
   python3 services/cloudflare-admin/deploy.py
   ```

5. Enter the Account ID, Database ID and Cloudflare token when prompted. The script makes two Cloudflare API requests. The first uploads [worker.mjs](../services/cloudflare-admin/worker.mjs) and configures its bindings. The second enables the public workers.dev address with preview URLs disabled. The token stays in the local process. Your DNS, domain records, and D1 tables are outside these requests. [Deployment script](../services/cloudflare-admin/deploy.py)
6. Open [CoolCode admin → Cloudflare usage](https://coolcode.ca/admin/#cloudflare), use your ordinary GitHub owner sign-in, expand **View the last 24 hours** and click **Refresh Cloudflare usage**. A successful result shows the time window and counts. After verification, revoke the temporary Cloudflare token.

To check the companion's address before signing in, run this in Linux:

```bash
curl -i -H 'Origin: https://coolcode.ca' https://coolcode-admin-metrics.jeffdyer.workers.dev/admin/cloudflare
```

HTTP 401 with `Owner sign-in required.` is the expected response without the admin credential. A 404 means the address or route is unavailable. A 503 after sign-in calls for checking the bindings and provider analytics.

### Activate the metrics Worker on Windows

The same steps work with `py services/cloudflare-admin/deploy.py` in a current checkout or the extracted [main ZIP](https://github.com/jsdyer/jsdyer.github.io/archive/refs/heads/main.zip). Use `curl.exe` for the endpoint check.

**Dashboard editing.** To do the deployment by hand, open or create a separate Worker named **coolcode-admin-metrics** and deploy [worker.mjs](../services/cloudflare-admin/worker.mjs) as a JavaScript module. Enable its workers.dev address. Add a **Service binding** named `COLLECTOR` targeting `coolcode-visitor-api` (checks the usual owner sign-in), an **Analytics SQL** binding named `ANALYTICS_SQL` (reads Cloudflare's metrics) and a **Text** variable `REPORTS_DATABASE_ID` containing the UUID (selects the reporting database). If the dashboard does not offer the Analytics SQL binding, the Linux script sets all three in the upload.

## Genre usage and GitHub interest

After signing in, **Stats & reports → Genre usage and GitHub interest** ranks the current catalogue genres by recorded browser-tool opens in the selected 7 or 28 days. Active tools have at least one open. The leading tool’s share uses all opens in that genre as the denominator, and ties are indicated. A dash means there is no denominator. Install-only projects do not contribute to the browser-tool totals.

Use **Compare tool opens with GitHub interest**, choose a genre and tool, then **Load GitHub traffic**. The browser requests the selected repository’s 14-day views, unique visitors, full clones and unique cloners directly from GitHub with the signed-in token. The repository must be included in a fine-grained token with **Administration: read**. The genre table uses the existing reporting permissions. Shared-repository tools show repository-wide traffic and install-only projects have no CoolCode pageview measure. Counts are independent and are not joined across visitors or added together.

Expand **Daily GitHub traffic** after loading a repository to see the reported UTC dates for views and full clones, their daily unique counts and the busiest dates. Missing figures appear as a dash.

## Collector alerts, visual checks and dataset releases

### Forecast Receipt and Healthchecks.io

GitHub Actions already runs `python3 scripts/collect.py` at 00:17, 06:17, 12:17 and 18:17 UTC. Its verification step checks that the expected forecasts for both stations reached the repository. Its final monitoring step sends Healthchecks.io a success or failure signal. Your Linux crontab needs no entry. [Actual GitHub workflow and commands](https://github.com/jsdyer/forecastreceipt/blob/main/.github/workflows/pages.yml)

1. Open your project in [Healthchecks.io](https://healthchecks.io/projects/), add a check named **Forecast Receipt**, and edit its schedule. Select **Cron**. In **Cron Expression** enter exactly `17 */6 * * *`. Select **UTC** under **Server's Time Zone** and **90 minutes** under **Grace Time**. The expression is the entire field. It tells Healthchecks when to expect GitHub's signal.
2. Enable an email notification integration for that check. Copy the complete **Ping URL** from the check, including its private identifier.
3. Open [Forecast Receipt’s Actions secrets](https://github.com/jsdyer/forecastreceipt/settings/secrets/actions) → **New repository secret**. Enter **Name** `HEALTHCHECKS_PING_URL` and paste the URL under **Secret**. Click **Add secret**.
4. Open [Browser tool · Check and publish](https://github.com/jsdyer/forecastreceipt/actions/workflows/pages.yml) → **Run workflow** → branch **main** → **Run workflow**. In Healthchecks open the check's log and look for the first successful ping. A run that never starts will leave a missing ping and trigger an alert after the grace period. [Healthchecks schedule fields](https://healthchecks.io/docs/configuring_checks/)

### Percy screenshot comparisons

1. In Percy’s **Setup a new project** form, select **Web App**, enter **welllayers** for Project name, select **Percy** under **Run visual tests on**, leave Labels empty and select **Git** under **Baseline management**. Click **Create Project**.
2. Open that project's **Settings**, copy its **Project token** and add it as a **New repository secret** named `PERCY_TOKEN` in [Well Layers’ Actions secrets](https://github.com/jsdyer/welllayers/settings/secrets/actions).
3. Repeat those two steps for **halifaxtimelens**, placing the second project's token in [Halifax Time Lens’s Actions secrets](https://github.com/jsdyer/halifaxtimelens/settings/secrets/actions).
4. To display Percy results on pull requests, enable the Percy GitHub integration and link each Percy project to its matching `jsdyer` repository. [Percy’s GitHub integration](https://www.browserstack.com/docs/percy/integrations/github)
5. Open [Well Layers’ workflow](https://github.com/jsdyer/welllayers/actions/workflows/pages.yml) and [Halifax Time Lens’s workflow](https://github.com/jsdyer/halifaxtimelens/actions/workflows/pages.yml) in turn. Click **Run workflow**, choose **main**, then **Run workflow**. Each Percy project should show its first baseline with a phone and desktop snapshot. Future same-repository pull requests compare the same wells and Halifax waterfront view.

### Zenodo dataset archive (optional)

Zenodo keeps a fixed copy of a published dataset and gives it a permanent identifier called a DOI that readers can cite. The [first Release Receipt dataset](https://github.com/jsdyer/releasereceipt/releases/tag/dataset-2026.11.22) is already downloadable from GitHub. To archive the next edition on Zenodo:

1. Sign in to [Zenodo’s GitHub settings](https://zenodo.org/account/settings/github/) with the GitHub account that owns the repository. Authorize access, sync the repository list and enable **jsdyer/releasereceipt**.
2. Open [Publish dataset release](https://github.com/jsdyer/releasereceipt/actions/workflows/dataset-release.yml). Click **Run workflow**, choose **main**, and enter a new version such as `2026.11.22.1` if that version is unused. Click **Run workflow** to publish.
3. In Zenodo, open the resulting record, verify its data files and copy its DOI. Each later release can receive its own version DOI. [Zenodo instructions](https://help.zenodo.org/docs/github/enable-repository/)

### Google Dataset Search

Google reads the dataset descriptions and download links on each linked [CoolCode dataset page](https://coolcode.ca/datasets/) when it crawls the website. Publishing a copy to Google is unnecessary. In [Search Console](https://search.google.com/search-console), select the **coolcode.ca** property and open **Sitemaps**. If it already shows the site sitemap as **Success**, setup is complete. Otherwise enter `https://coolcode.ca/sitemap.xml` in **Add a new sitemap** and submit. Google's later inclusion of any individual dataset is a separate decision. [Google’s dataset documentation](https://developers.google.com/search/docs/appearance/structured-data/dataset)

### Sentry browser errors

The public catalogue, Release Receipt, Policy Rate Scorecard, Export Neighbours, Metro Economy, Pantry Prices, Well Layers and Halifax Time Lens send selected JavaScript errors to the CoolCode Sentry project. Open that project’s **Issues** view and filter by tool. Reports use a known source file and line number. The filter discards exception messages, form data and URL query strings. The admin, report form and local-file utilities are outside this rollout. The shared browser code respects Do Not Track and Global Privacy Control. [Public site privacy information](https://coolcode.ca/about/)
