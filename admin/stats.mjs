import { readSearchReport } from "./search-report.mjs";

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
    if (filtered.length) output.replaceChildren(table("Recorded tool pageviews", ["Tool", "Pageviews"],
      filtered.map(r => [r.title, number.format(r.views)])));
    else output.replaceChildren(el("p", q ? "No matching tools in this view. Choose Every tool to include zero counts." : "No tool pageviews were recorded in this period."));
  }
  display.addEventListener("change", show);
  search.addEventListener("input", show);
  show();
}
function renderExperiments(target, rows) {
  if (!rows.length) {
    target.append(el("p", "No featured lineup impressions or clicks were recorded in this period."));
    return;
  }
  target.append(table("Featured cards by experiment and lineup", ["Experiment", "Lineup", "Impressions", "Clicks", "Clicks per impression"], rows.map(row => [
    row.experiment, row.variant.toUpperCase(), number.format(row.impressions), number.format(row.clicks), rate(row.clicks, row.impressions),
  ])));
  target.append(el("p", "Compare lineups from the same experiment and date range. Small samples can change after only a few clicks. The rate divides recorded card clicks by recorded card impressions. Each card can contribute one of each per homepage load. Reloads and blocked requests affect these totals."));
}

export async function initializeStats(catalog) {
  const root = document.getElementById("statistics");
  root.replaceChildren(el("h2", "Statistics and issue reports"));
  const names = new Map(catalog.filter(t => t.access === "browser").map(t => [t.id, t.title]));
  const access = section(root, "Private reports");
  const token = el("input");
  token.type = "password";
  token.autocomplete = "off";
  token.spellcheck = false;
  const period = choice([["7", "Last 7 days"], ["28", "Last 28 days"]]);
  const load = button("Load private reports"), clear = button("Clear private reports");
  const controls = el("div", undefined, "stats-toolbar");
  controls.append(field("Reporting period", period), load, clear);
  const notice = status();
  const results = el("div");
  access.append(el("p", "The collector verifies the owner's identity. Use a read-only GitHub token for private reporting. It is sent to the collector to verify with GitHub and is kept only in this tab's memory. Use the separate publishing control to change a lineup."),
    field("Read-only GitHub token for private reports", token), controls, notice, results);
  searchConsole(root, catalog);

  load.disabled = true;
  clear.hidden = true;
  let available = false;
  try {
    const { SERVICE } = await import("../assets/service.mjs");
    available = Boolean(SERVICE) && new URL(SERVICE).protocol === "https:";
  } catch { /* The Google Search import also works before collector activation. */ }
  if (!available) {
    notice.textContent = "Live collection is awaiting activation. Historical tool visits are unavailable. The local Search Console import and featured lineup controls work independently.";
    load.disabled = token.disabled = period.disabled = true;
    return;
  }
  load.disabled = false;
  notice.textContent = "Load private reports to see observations collected since activation.";
  let serial = 0, credential = "";
  function reset() {
    serial++;
    token.value = "";
    credential = "";
    results.replaceChildren();
    clear.hidden = true;
    load.disabled = false;
    notice.textContent = "Private reports are closed.";
  }
  clear.hidden = true;
  window.addEventListener("pagehide", reset);
  clear.addEventListener("click", reset);
  token.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); load.click(); }
  });
  period.addEventListener("change", () => { if (credential) refresh(); });
  load.addEventListener("click", () => {
    const provided = token.value.trim();
    if (provided) credential = provided;
    token.value = "";
    if (credential) refresh();
    else {
      notice.textContent = "Enter your reporting credential.";
      token.focus();
    }
  });

  async function refresh() {
    const request = ++serial;
    load.disabled = true;
    clear.hidden = false;
    notice.textContent = "Loading private reports…";
    results.replaceChildren();
    try {
      const [metrics, reports] = await Promise.all([getMetrics(credential, period.value), getReports(credential)]);
      if (serial !== request) return;
      const traffic = section(results, "Tool traffic");
      traffic.append(el("p", "Pageviews count successful reports from instrumented tool pages. Returning visitors and reloads can count again. Older visits and browsers that block reporting are absent."));
      renderTraffic(traffic, metrics.tools, names);
      const features = section(results, "Featured lineup performance");
      renderExperiments(features, metrics.experiments);
      const inbox = section(results, "Site issue inbox");
      renderInbox(inbox, reports, names, async (action, id, newStatus) => {
        action.disabled = true;
        try {
          await setReportStatus(credential, id, newStatus);
          if (serial === request) await refresh();
        } catch (error) {
          if (serial === request) { notice.textContent = error.message; action.disabled = false; }
        }
      });
      notice.textContent = "Private reports loaded.";
    } catch (error) {
      if (serial !== request) return;
      if (error.status === 401 || error.status === 403) { credential = ""; token.focus(); }
      notice.textContent = error.message;
    } finally {
      if (serial === request) load.disabled = false;
    }
  }
}

async function privateRequest(path, credential, init = {}) {
  const { SERVICE } = await import("../assets/service.mjs");
  const base = new URL(SERVICE);
  if (base.protocol !== "https:") throw new Error("The private reporting service is unavailable.");
  const response = await fetch(new URL(path, base), {
    method: init.method || "GET", body: init.body, credentials: "omit", cache: "no-store",
    redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(15000),
    headers: { Authorization: "Bearer " + credential, ...(init.body && { "Content-Type": "application/json" }) },
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

async function getMetrics(credential, days) {
  const data = await privateRequest("/admin/stats?days=" + encodeURIComponent(days), credential);
  if (!Array.isArray(data.tools) || !Array.isArray(data.experiments)) throw new Error("The service returned an unreadable traffic report.");
  return data;
}
async function getReports(credential) {
  const data = await privateRequest("/admin/reports", credential);
  if (!Array.isArray(data.reports)) throw new Error("The service returned an unreadable issue list.");
  return data.reports;
}
async function setReportStatus(credential, id, status) {
  return privateRequest("/admin/reports/" + encodeURIComponent(id), credential, {
    method: "PATCH", body: JSON.stringify({ status }),
  });
}
