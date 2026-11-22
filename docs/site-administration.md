# Site administration

Open [the owner dashboard](https://coolcode.ca/admin/) and enter the owner’s GitHub token once. The collector verifies the owner with GitHub before the dashboard opens. Reports load automatically. The token stays in tab memory until you lock the dashboard, reload or leave the page.

Set four featured tools in display order. Fixed mode always serves lineup A. A/B mode splits new browser tabs approximately evenly between A and B and keeps a tab’s choice for the experiment. Visitors with disabled JavaScript see the server-rendered A lineup. An active-lineup change in the dashboard generates a new experiment identifier.

A read-only token covers statistics and the issue inbox. To publish from the same session, sign in with a fine-grained token limited to this repository with Contents read/write. The collector receives that token for owner verification, and publishing sends it directly to GitHub. The dashboard checks for overlapping changes. You can also copy the configuration into GitHub’s editor. A commit triggers the existing Pages build. If the branch uses required reviews, use the GitHub editor to open a pull request. Manual edits to data/featured.json should give a changed test a fresh experiment ID.

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

## Service status

Open **Service status** to check the production homepage, tool catalogue, search sitemap and visitor API from your browser. Each GET validates expected response content. The visitor API health endpoint also executes a read-only schema query against D1. These checks make no pageview submissions, private report requests or database writes. Response times include network travel and reading the response. A timeout can originate between the observer and the service.

The [external monitor](https://github.com/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml) runs the same checks at minute 37 each hour and supports manual runs. Each run summary lists the HTTP status, elapsed time and result for each endpoint. The admin shows the last 24 available runs and flags a gap of over two hours. Run counts are samples rather than a measurement of continuous uptime. GitHub keeps the workflow history accessible directly if Pages or admin authentication is unavailable.

Choose **Check from across Canada** for fresh results from public Globalping probes in Vancouver, Toronto and Halifax. The browser requests only DNS A records and HTTPS for the homepage and the visitor API health path. Each row gives the requested city, actual probe network, response and total time. “No probe returned” means the service supplied no matching measurement for that city. The [daily 15:23 UTC workflow](https://github.com/jsdyer/jsdyer.github.io/actions/workflows/canada-probes.yml) runs the same checks, writes the table to its run summary and retains a JSON artifact for 30 days. Both entry points work without registering with Globalping. Each complete run uses up to 12 public probe tests.

**Provider incidents** shows the component status for GitHub Pages, Actions and API Requests, and for Cloudflare Workers and D1. Active incidents link to the provider’s report. Use the browser and external service checks above to see whether the reported incident affected a specific CoolCode endpoint.

## Cloudflare usage

**Cloudflare usage → View the last 24 hours** queries Cloudflare for the visitor API’s request count, runtime outcomes and outbound subrequests, plus queries and rows read or written for the reporting database. Counts cover a rolling UTC window. Health checks and administrative requests can contribute. Use **Tool traffic** for per-tool opens. Each provider dataset can load independently.

The on-demand metrics Worker is maintained in `services/cloudflare-admin/worker.mjs` and uses the name `coolcode-admin-metrics` on the same Cloudflare account. Its `COLLECTOR` service binding targets `coolcode-visitor-api` and delegates owner verification to the existing private stats route. Its `ANALYTICS_SQL` Analytics SQL binding queries fixed aggregate statements. `REPORTS_DATABASE_ID` selects the UUID of `coolcode-reports`. The dashboard sends the current tab's credential only when you open or refresh this panel. Locking the admin clears the session. Deploy changes to this companion separately from GitHub Pages.

### Activate the metrics Worker on Windows

1. In the Cloudflare dashboard select the account that runs **coolcode-visitor-api**. Copy its **Account ID** from the account overview. Under **Storage & databases → D1 → coolcode-reports**, copy **Database ID** (a UUID).
2. Go to [My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens), **Create Token → Create Custom Token**. Choose **Account → Workers Scripts → Edit** (“Workers Scripts Write” in the API), restrict **Account Resources** to this account, and give the token a short expiry. Copy it for the next step.
3. Open PowerShell in a current checkout of **jsdyer/jsdyer.github.io**. If you don't have one, download and extract [main as ZIP](https://github.com/jsdyer/jsdyer.github.io/archive/refs/heads/main.zip) and open the extracted folder containing `services`. With Python 3 installed, run:

   ```powershell
   py services/cloudflare-admin/deploy.py
   ```

4. At the three local prompts enter the Account ID, Database ID and temporary Cloudflare token. The script uploads the companion named **coolcode-admin-metrics**, configures its three bindings and enables its workers.dev address. The deployment token can be revoked after success.
5. Open [CoolCode admin → Cloudflare usage](https://coolcode.ca/admin/#cloudflare), sign in with your usual CoolCode GitHub credential and click **Refresh Cloudflare usage**. A signed-in result shows the 24-hour window and counts. To check just the endpoint without sharing any token, use:

   ```powershell
   curl.exe -i -H "Origin: https://coolcode.ca" https://coolcode-admin-metrics.jeffdyer.workers.dev/admin/cloudflare
   ```

   Expect HTTP 401 with `Owner sign-in required.` A 404 means that this address or route is unavailable. A 503 after sign-in requires checking the companion's bindings or provider analytics.

**Manual dashboard editing.** Open or create a separate Worker named **coolcode-admin-metrics**, deploy [worker.mjs](../services/cloudflare-admin/worker.mjs) as a JavaScript module, and enable its workers.dev address. Under bindings, add a **Service binding** named `COLLECTOR` targeting `coolcode-visitor-api` and an **Analytics SQL** binding named `ANALYTICS_SQL`. Under variables, add a **Text** variable `REPORTS_DATABASE_ID` containing the D1 UUID. If the dashboard does not offer Analytics SQL, use the script. The companion uses the service binding for your existing sign-in and the analytics binding to query Cloudflare at runtime.

## Genre usage and GitHub interest

After signing in, **Stats & reports → Genre usage and GitHub interest** ranks the current catalogue genres by recorded browser-tool opens in the selected 7 or 28 days. Active tools have at least one open. The leading tool’s share uses all opens in that genre as the denominator, and ties are indicated. A dash means there is no denominator. Install-only projects do not contribute to the browser-tool totals.

Use **Compare tool opens with GitHub interest**, choose a genre and tool, then **Load GitHub traffic**. The browser requests the selected repository’s 14-day views, unique visitors, full clones and unique cloners directly from GitHub with the signed-in token. The repository must be included in a fine-grained token with **Administration: read**. The genre table uses the existing reporting permissions. Shared-repository tools show repository-wide traffic and install-only projects have no CoolCode pageview measure. Counts are independent and are not joined across visitors or added together.

Expand **Daily GitHub traffic** after loading a repository to see the reported UTC dates for views and full clones, their daily unique counts and the busiest dates. Missing figures appear as a dash.
