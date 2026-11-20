import { genreUsage, repoFromSource, gitTraffic } from "./interest.mjs";
import { publicIssues } from "./public-issues.mjs";
import { readQueryReport, readSearchReport } from "./search-report.mjs";

const number = new Intl.NumberFormat("en-CA");
const percent = new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 1 });
const rate = (n, d) => d ? percent.format(n / d) : "—";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function section(parent, name) {
  const node = el("section", undefined, "stats-section");
  node.append(el("h3", name));
  parent.append(node);
  return node;
}
function status() {
  const p = el("p", "", "status");
  p.setAttribute("role", "status");
  return p;
}
function field(title, control) {
  const label = el("label", title + " ");
  label.append(control);
  return label;
}
function choice(entries) {
  const input = el("select");
  for (const [value, title] of entries) {
    const option = el("option", title);
    option.value = value;
    input.append(option);
  }
  return input;
}
function button(label) {
  const b = el("button", label);
  b.type = "button";
  return b;
}
function table(caption, columns, records) {
  const wrap = el("div", undefined, "stats-table-wrap");
  const t = el("table");
  t.append(el("caption", caption));
  const head = t.createTHead().insertRow();
  for (const column of columns) {
    const th = el("th", column);
    th.scope = "col";
    head.append(th);
  }
  const body = t.createTBody();
  for (const values of records) {
    const row = body.insertRow();
    for (const [index, value] of values.entries()) {
      const cell = el(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      if (value instanceof Node) cell.append(value);
      else cell.textContent = String(value);
      row.append(cell);
    }
  }
  wrap.append(t);
  return wrap;
}

function searchConsole(parent, catalog) {
  const group = section(parent, "Google Search performance");
  group.append(el("p", "In Search Console, choose your reporting dates under Performance → Search results, export CSV, and open Pages.csv from the ZIP. This file stays in this tab."));
  const file = el("input");
  file.type = "file";
  file.accept = ".csv,text/csv";
  const state = status(), result = el("div");
  group.append(field("Import Pages.csv", file), state, result);
  file.addEventListener("change", async () => {
    const selected = file.files[0];
    result.replaceChildren();
    state.textContent = "";
    if (!selected) return;
    try {
      const report = readSearchReport(await selected.text(), catalog);
      if (file.files[0] !== selected) return;
      state.textContent = `${number.format(report.tools.length)} tools in this export. ${number.format(report.unmatched)} other page rows and ${number.format(report.invalid)} unreadable rows excluded.`;
      if (!report.tools.length) return;
      result.append(el("p", "Review titles and snippets for pages with at least 100 impressions, an average position of 10 or better, and a CTR below 2%. This editing threshold is a starting point. Check the actual queries and dates before making changes."));
      result.append(table("Google Search results grouped by tool", ["Tool", "Clicks", "Impressions", "CTR", "Average position", "Review"], report.tools.map(row => [
        row.title, number.format(row.clicks), number.format(row.impressions),
        row.ctr === null ? "—" : percent.format(row.ctr),
        row.position === null ? "—" : row.position.toFixed(1),
        row.impressions >= 100 && row.position !== null && row.position <= 10 && row.ctr < 0.02 ? "Review search snippet" : "—",
      ])));
      result.append(el("p", "The export covers its selected dates and exported rows. Google clicks count visits from Search. A tool’s CTR uses total clicks ÷ total impressions, and average position is weighted by impressions."));
    } catch (error) {
      if (file.files[0] === selected) state.textContent = error.message;
    }
  });
}

function searchPhrases(parent) {
  const group = section(parent, "Google search phrases");
  group.append(el("p", "Import Queries.csv from the same Search Console export. For the phrases that led to one tool, first filter by its page in Search Console, then export. Google omits some infrequent phrases. Your file stays in this tab."));
  const file = el("input");
  file.type = "file";
  file.accept = ".csv,text/csv";
  const filter = el("input");
  filter.type = "search";
  const order = choice([["clicks", "Most clicks"], ["impressions", "Most impressions"]]);
  const controls = el("div", undefined, "stats-toolbar");
  controls.append(field("Find a search phrase", filter), field("Sort phrases", order));
  const state = status(), output = el("div");
  controls.hidden = true;
  group.append(field("Import Queries.csv", file), controls, state, output);
  let rows = [], skipped = 0;
  function show() {
    const needle = filter.value.trim().toLocaleLowerCase("en-CA");
    const matches = rows.filter(r => r.phrase.toLocaleLowerCase("en-CA").includes(needle));
    const metric = order.value;
    matches.sort((a, b) => b[metric] - a[metric] || b.clicks - a.clicks || b.impressions - a.impressions || a.phrase.localeCompare(b.phrase));
    const visible = matches.slice(0, 100);
    state.textContent = `Showing ${number.format(visible.length)} of ${number.format(matches.length)} matching phrases in this export.`
      + (skipped ? ` ${number.format(skipped)} unreadable rows excluded.` : "");
    output.replaceChildren();
    if (visible.length) output.append(table("Google Search queries", ["Search phrase", "Clicks", "Impressions", "CTR", "Average position"],
      visible.map(r => [r.phrase, number.format(r.clicks), number.format(r.impressions),
        r.ctr === null ? "—" : percent.format(r.ctr), r.position === null ? "—" : r.position.toFixed(1)])));
  }
  filter.addEventListener("input", show);
  order.addEventListener("change", show);
  file.addEventListener("change", async () => {
    const selected = file.files[0];
    rows = [];
    skipped = 0;
    filter.value = "";
    controls.hidden = true;
    state.textContent = "";
    output.replaceChildren();
    if (!selected) return;
    try {
      const report = readQueryReport(await selected.text());
      if (file.files[0] !== selected) return;
      rows = report.queries;
      skipped = report.invalid;
      controls.hidden = !rows.length;
      show();
    } catch (error) {
      if (file.files[0] === selected) state.textContent = error.message;
    }
  });
}

function renderTraffic(target, rows, titles) {
  const values = new Map(rows.map(row => [row.tool, row.views]));
  const all = [...new Set([...titles.keys(), ...values.keys()])].map(id => ({
    id, title: titles.get(id) || id, views: values.get(id) || 0,
  })).sort((a, b) => b.views - a.views || a.title.localeCompare(b.title));
  const total = rows.reduce((sum, row) => sum + row.views, 0);
  target.append(el("p", `${number.format(total)} tool pageviews across ${number.format(rows.filter(r => r.views > 0).length)} tools with activity. A zero means this collector received no pageview for that tool in the selected period.`));
  const search = el("input");
  search.type = "search";
  const display = choice([["active", "Tools with activity"], ["all", "Every tool"]]);
  const output = el("div"), bar = el("div", undefined, "stats-toolbar");
  bar.append(field("Find a tool", search), field("Show", display));
  target.append(bar, output);
  function show() {
    const q = search.value.trim().toLocaleLowerCase("en-CA");
    const filtered = all.filter(row => (display.value === "all" || row.views)
      && (row.title + " " + row.id).toLocaleLowerCase("en-CA").includes(q));
    if (filtered.length) output.replaceChildren(table("Recorded tool pageviews", ["Tool", "Pageviews", "Share of all opens"],
      filtered.map(r => [r.title, number.format(r.views), rate(r.views, total)])));
    else output.replaceChildren(el("p", q ? "No matching tools in this view. Choose Every tool to include zero counts." : "No tool pageviews were recorded in this period."));
  }
  display.addEventListener("change", show);
  search.addEventListener("input", show);
  show();
}
function renderDaily(target, metrics) {
  if (!Array.isArray(metrics.daily) || ![7, 28].includes(metrics.days)) return;
  const through = Date.parse(metrics.through + "T00:00:00Z");
  if (!Number.isFinite(through)) return;
  const counts = new Map(metrics.daily.map(row => [row.day, row.views]));
  const days = Array.from({length: metrics.days}, (_, index) => {
    const day = new Date(through - (metrics.days - 1 - index) * 86400000).toISOString().slice(0, 10);
    return {day, views: counts.get(day) || 0};
  });
  const peak = Math.max(...days.map(row => row.views));
  const details = el("details");
  details.append(el("summary", "Daily tool opens · " + days[0].day + " to " + metrics.through + " (UTC)"));
  details.append(el("p", "Across all tools. The current UTC day is still accumulating. A zero means no opens were recorded that day."));
  details.append(table("Daily recorded pageviews", ["UTC date", "Pageviews", "Relative to busiest day"], days.map(row => {
    const bar = el("meter");
    bar.min = 0;
    bar.max = peak || 1;
    bar.value = row.views;
    bar.setAttribute("aria-label", row.day + " recorded pageviews");
    return [row.day, number.format(row.views), bar];
  })));
  target.append(details);
}

function renderInterests(target, catalog, metrics, session) {
  const groups = genreUsage(catalog, metrics.tools);
  target.append(table("Usage by catalogue genre · " + metrics.days + " days",
    ["Genre", "Tool opens", "Active / listed browser tools", "Leading tool", "Leader’s share"],
    groups.map(group => [
      group.genre, number.format(group.total), group.active + " / " + group.size,
      group.leaders.length > 1 ? group.leaders[0] + " (+" + (group.leaders.length - 1) + " tied)" : group.leaders[0] || "—",
      rate(group.peak, group.total),
    ])));
  target.append(el("p", "An active tool had at least one recorded open. The leader’s share is its fraction of opens within that genre. Only currently listed browser tools are grouped."));

  const details = el("details"), output = el("div"), siteCount = el("p");
  const visible = catalog.slice().sort((a,b) => a.title.localeCompare(b.title));
  const genre = choice([["","All genres"], ...[...new Set(visible.map(t => t.genre || "Unclassified"))].sort().map(g => [g,g])]);
  const tool = choice([]);
  const load = button("Load GitHub traffic");
  const filters = el("div", undefined, "stats-toolbar");
  genre.setAttribute("aria-label", "Comparison genre");
  tool.setAttribute("aria-label", "Comparison tool");
  filters.append(field("Comparison genre", genre), field("Comparison tool", tool), load);
  output.setAttribute("role", "status");
  details.append(el("summary", "Compare tool opens with GitHub interest"), filters, siteCount, output);
  target.append(details);
  let pending;
  function selection() {
    pending?.abort();
    const selected = visible.find(t => t.id === tool.value);
    const repo = repoFromSource(selected?.source);
    load.disabled = !repo;
    output.replaceChildren();
    if (!selected) { siteCount.textContent = ""; return; }
    const opens = metrics.tools.find(row => row.tool === selected.id)?.views || 0;
    const local = selected.access === "browser" ? number.format(opens) + " recorded CoolCode opens in " + metrics.days + " days." : "Install-only project. CoolCode does not measure guide visits.";
    const shared = repo === "jsdyer.github.io" ? " Counts cover the entire shared site repository." : "";
    siteCount.textContent = local + (repo ? " GitHub source: jsdyer/" + repo + "." + shared : " No supported GitHub repository is listed.");
  }
  function populateTools() {
    const options = visible.filter(t => !genre.value || (t.genre || "Unclassified") === genre.value);
    tool.replaceChildren(...options.map(t => new Option(t.title,t.id)));
    selection();
  }
  genre.addEventListener("change", populateTools);
  tool.addEventListener("change", selection);
  populateTools();
  load.addEventListener("click", async () => {
    const repo = repoFromSource(visible.find(t => t.id === tool.value)?.source);
    if (!repo) return;
    pending?.abort();
    pending = new AbortController();
    const signal = pending.signal;
    load.disabled = true;
    output.textContent = "Loading GitHub’s last 14 days…";
    const results = await Promise.allSettled(["views","clones"].map(type => gitTraffic(repo, type, session, signal)));
    if (signal.aborted || session.signal.aborted || !target.isConnected) return;
    const rows = results.map((r,i) => [i ? "Full clones" : "Repository views",
      r.status === "fulfilled" ? number.format(r.value.count) : "Unavailable",
      r.status === "fulfilled" ? number.format(r.value.uniques) : "—"]);
    output.replaceChildren(table("GitHub repository traffic · last 14 days", ["Metric","Total","Unique"], rows));
    for (const message of new Set(results.filter(r => r.status === "rejected").map(r => r.reason.message)))
      output.append(el("p", message));
    output.append(el("p", "GitHub counts visitors and cloners separately. Automated clones can contribute. These counts cannot be matched to individual CoolCode visits."));
    load.disabled = false;
  });
}

function renderExperiments(target, rows, cards, names) {
  if (!rows.length) {
    target.append(el("p", "No featured lineup impressions or clicks were recorded in this period."));
    return;
  }
  target.append(table("Featured cards by experiment and lineup", ["Experiment", "Lineup", "Impressions", "Clicks", "Clicks per impression"], rows.map(row => [
    row.experiment, row.variant.toUpperCase(), number.format(row.impressions), number.format(row.clicks), rate(row.clicks, row.impressions),
  ])));
  target.append(el("p", "Compare lineups from the same experiment and date range. Small samples can change after only a few clicks. The rate divides recorded card clicks by recorded card impressions. Each card can contribute one of each per homepage load. Reloads and blocked requests affect these totals."));
  if (cards?.length) {
    const details = el("details");
    details.append(el("summary", "See individual featured cards"));
    details.append(table("Featured tool performance", ["Tool", "Experiment", "Lineup", "Impressions", "Clicks", "Clicks per impression"], cards.map(row => [
      names.get(row.tool) || row.tool, row.experiment, row.variant.toUpperCase(),
      number.format(row.impressions), number.format(row.clicks), rate(row.clicks, row.impressions),
    ])));
    target.append(details);
  }
}

export function initializeStats(catalog, session, initialMetrics) {
  const root = document.getElementById("statistics");
  root.replaceChildren(el("h2", "Statistics and issue reports"));
  const names = new Map(catalog.filter(t => t.access === "browser").map(t => [t.id, t.title]));
  const access = section(root, "Private reports");
  const period = choice([["7", "Last 7 days"], ["28", "Last 28 days"]]);
  const load = button("Refresh reports");
  const controls = el("div", undefined, "stats-toolbar");
  controls.append(field("Reporting period", period), load);
  const notice = status();
  const results = el("div");
  access.append(controls, notice, results);
  publicIssues(root, catalog);
  searchConsole(root, catalog);
  searchPhrases(root);

  let serial = 0;
  period.addEventListener("change", () => refresh());
  load.addEventListener("click", () => refresh());
  refresh(initialMetrics);

  async function refresh(savedMetrics) {
    const request = ++serial;
    load.disabled = true;
    notice.textContent = "Loading private reports…";
    results.replaceChildren();
    try {
      const [metrics, reports] = await Promise.all([savedMetrics || getMetrics(session, period.value), getReports(session)]);
      if (serial !== request || session.signal.aborted) return;
      const traffic = section(results, "Tool traffic");
      traffic.append(el("p", "Pageviews count successful reports from instrumented tool pages. Returning visitors and reloads can count again. Older visits and browsers that block reporting are absent."));
      renderTraffic(traffic, metrics.tools, names);
      renderDaily(traffic, metrics);
      renderInterests(section(results, "Genre usage and GitHub interest"), catalog, metrics, session);
      const features = section(results, "Featured lineup performance");
      renderExperiments(features, metrics.experiments, metrics.cards, names);
      const inbox = section(results, "Site issue inbox");
      renderInbox(inbox, reports, names, async (action, id, newStatus) => {
        action.disabled = true;
        try {
          await setReportStatus(session, id, newStatus);
          if (serial === request) await refresh();
        } catch (error) {
          if (error.status === 401 || error.status === 403) return session.lock();
          if (serial === request) { notice.textContent = error.message; action.disabled = false; }
        }
      });
      notice.textContent = "Private reports loaded.";
    } catch (error) {
      if (serial !== request || session.signal.aborted) return;
      if (error.status === 401 || error.status === 403) return session.lock();
      notice.textContent = error.message;
    } finally {
      if (serial === request) load.disabled = false;
    }
  }
}

async function privateRequest(path, session, init = {}) {
  const { SERVICE } = await import("../assets/service.mjs");
  const base = new URL(SERVICE);
  if (base.protocol !== "https:") throw new Error("The private reporting service is unavailable.");
  const response = await fetch(new URL(path, base), {
    method: init.method || "GET", body: init.body, credentials: "omit", cache: "no-store",
    redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.any([session.signal, AbortSignal.timeout(15000)]),
    headers: { Authorization: "Bearer " + session.token, ...(init.body && { "Content-Type": "application/json" }) },
  });
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "Access was denied. Check your private reporting credential."
      : response.status === 429 ? "The reporting limit was reached. Try again shortly."
      : "The private reporting service could not complete the request. Try again later.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function renderInbox(target, reports, names, apply) {
  if (!reports.length) {
    target.append(el("p", "No issue reports returned."));
    return;
  }
  const list = el("div");
  for (const report of reports) {
    const item = el("details");
    const tool = names.get(report.tool) || report.tool || "Homepage";
    const label = report.status === "resolved" ? "Resolved" : "Open";
    const summary = el("summary", `${label} · ${tool} · ${report.category} · ${report.created}`);
    item.append(summary, el("p", report.description));
    const next = label === "Open" ? "resolved" : "open";
    const action = button(next === "open" ? "Reopen report" : "Mark resolved");
    action.addEventListener("click", () => apply(action, report.id, next));
    item.append(action);
    list.append(item);
  }
  target.append(list);
}

export async function getMetrics(session, days) {
  const data = await privateRequest("/admin/stats?days=" + encodeURIComponent(days), session);
  if (!Array.isArray(data.tools) || !Array.isArray(data.experiments)) throw new Error("The service returned an unreadable traffic report.");
  return data;
}
async function getReports(session) {
  const data = await privateRequest("/admin/reports", session);
  if (!Array.isArray(data.reports)) throw new Error("The service returned an unreadable issue list.");
  return data.reports;
}
async function setReportStatus(session, id, status) {
  return privateRequest("/admin/reports/" + encodeURIComponent(id), session, {
    method: "PATCH", body: JSON.stringify({ status }),
  });
}
