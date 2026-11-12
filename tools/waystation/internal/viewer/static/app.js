"use strict";
const $ = id => document.getElementById(id);
const state = { snapshots: [], current: null };
const bytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const isCaptured = r => Boolean(r.hash) && !r.error;
const isPage = r => r.media_type && ["text/html", "application/xhtml+xml"].includes(r.media_type.split(";")[0].trim().toLowerCase());
const label = s => s.label || "Untitled capture";
const date = value => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const replayURL = (s, r) => `/replay/${encodeURIComponent(s.id)}?url=${encodeURIComponent(r.url)}`;
function element(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
function notice(text, error = false) { $("notice").textContent = text; $("notice").classList.toggle("error", error); }
async function request(path) { const response = await fetch(path, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "The library could not be read."); return result; }
async function refresh() {
  $("refresh").disabled = true;
  try {
    state.snapshots = await request("/api/snapshots");
    $("library-count").textContent = String(state.snapshots.length).padStart(2, "0");
    $("empty").hidden = state.snapshots.length !== 0;
    $("workspace").hidden = state.snapshots.length === 0;
    $("snapshot").replaceChildren();
    for (const s of state.snapshots) { const option = element("option", "", `${label(s)} · ${date(s.created)}`); option.value = s.id; $("snapshot").append(option); }
    notice("");
    if (state.snapshots.length) {
      const initial = new URLSearchParams(location.search).get("snapshot");
      const previous = state.current && state.current.id;
      selectSnapshot(state.snapshots.find(s => s.id === (previous || initial)) || state.snapshots[0]);
    }
  } catch (error) { notice(error.message, true); }
  finally { $("refresh").disabled = false; }
}
function selectSnapshot(snapshot) {
  state.current = snapshot;
  $("snapshot").value = snapshot.id;
  $("snapshot-date").textContent = date(snapshot.created);
  $("snapshot-id").textContent = snapshot.id;
  const resources = snapshot.resources || [];
  const captured = resources.filter(isCaptured);
  $("stat-captured").textContent = captured.length;
  $("stat-bytes").textContent = bytes(captured.reduce((total, r) => total + r.size, 0));
  $("stat-errors").textContent = resources.length - captured.length;
  $("gap-note").textContent = snapshot.truncated ? "limit reached · partial capture" : "recorded errors";
  notice(snapshot.truncated ? "This is a partial capture: a configured limit was reached. Some linked addresses may not be in the capsule." : "");
  const first = captured.find(r => (snapshot.seeds || []).includes(r.url) && isPage(r)) || captured.find(isPage) || captured[0];
  $("start-replay").href = first ? replayURL(snapshot, first) : "/missing";
  $("start-replay").setAttribute("aria-disabled", String(!first));
  $("start-replay").tabIndex = first ? 0 : -1;
  $("before").replaceChildren();
  for (const s of state.snapshots.filter(s => s.id !== snapshot.id)) { const option = element("option", "", `${label(s)} · ${date(s.created)}`); option.value = s.id; $("before").append(option); }
  const earlier = state.snapshots.find(s => s.id !== snapshot.id && new Date(s.created) < new Date(snapshot.created));
  if (earlier) $("before").value = earlier.id;
  $("before").disabled = state.snapshots.length < 2;
  $("compare").disabled = state.snapshots.length < 2;
  $("compare-current").textContent = label(snapshot);
  $("changes").replaceChildren();
  $("diff-summary").textContent = state.snapshots.length < 2 ? "Capture this site again to compare two visits." : "Choose another capture to see added, changed, and removed addresses.";
  renderResources(); renderGraph();
}
function renderResources() {
  const term = $("search").value.toLowerCase().trim();
  const resources = (state.current.resources || []).filter(r => [r.title, r.url, r.media_type, r.error].join(" ").toLowerCase().includes(term));
  $("resources").replaceChildren();
  for (const resource of resources) {
    const row = element("li", "resource-row");
    const address = element("div");
    const title = element(isCaptured(resource) ? "a" : "span", "resource-title", resource.title || addressLabel(resource.url));
    if (isCaptured(resource)) title.href = replayURL(state.current, resource);
    address.append(title, element("span", "resource-url", resource.url));
    if (resource.error) address.append(element("p", "resource-error", resource.error));
    const type = (resource.media_type || "unknown").split(";")[0];
    row.append(address, element("span", "resource-type", type), element("span", "resource-size", bytes(resource.size)), element("span", `badge${isCaptured(resource) ? "" : " gap"}`, isCaptured(resource) ? "stored" : "gap"));
    $("resources").append(row);
  }
  $("no-results").hidden = resources.length !== 0;
}
function addressLabel(value) { try { const u = new URL(value); return u.pathname === "/" ? u.host : decodeURI(u.pathname) + u.search; } catch { return value; } }
function renderGraph() {
  const svg = $("graph"); svg.replaceChildren();
  const all = state.current.resources || [];
  const resources = [...all].sort((a, b) => Number(isPage(b)) - Number(isPage(a))).slice(0, 48);
  $("map-caption").textContent = all.length > 48 ? `Showing 48 of ${all.length} addresses. Every address is listed below.` : "Each dot is an address. Follow one into the archive.";
  const positions = new Map();
  resources.forEach((r, i) => {
    const angle = i * 2.399963229728653;
    const radius = Math.sqrt((i + 1) / resources.length);
    positions.set(r.url, { x: 500 + Math.cos(angle) * radius * 420, y: 155 + Math.sin(angle) * radius * 120 });
  });
  function node(tag, attrs) { const el = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value); return el; }
  for (const r of resources) for (const link of r.links || []) {
    const from = positions.get(r.url), to = positions.get(link);
    if (to && link !== r.url) svg.append(node("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "graph-link" }));
  }
  for (const [i, r] of resources.entries()) {
    const p = positions.get(r.url);
    const kind = !isCaptured(r) ? "gap" : isPage(r) ? "page" : "asset";
    const anchor = node("a", { href: isCaptured(r) ? replayURL(state.current, r) : `/missing?url=${encodeURIComponent(r.url)}`, class: `graph-node ${kind}`, "aria-label": `${r.title || addressLabel(r.url)} (${kind})` });
    const tooltip = node("title", {}); tooltip.textContent = `${r.title || addressLabel(r.url)}\n${r.url}`;
    anchor.append(tooltip, node("circle", { cx: p.x, cy: p.y, r: kind === "page" ? 7 : 4 }));
    if (i < 12 && (kind === "page" || resources.length < 8)) { const left = p.x > 700; const text = node("text", { x: p.x + (left ? -13 : 13), y: p.y + 4, "text-anchor": left ? "end" : "start" }); const name = r.title || addressLabel(r.url); text.textContent = name.length > 24 ? name.slice(0, 23) + "…" : name; anchor.append(text); }
    svg.append(anchor);
  }
}
async function compare() {
  const before = $("before").value, after = state.current.id;
  $("compare").disabled = true; $("diff-summary").textContent = "Comparing the two captures…"; $("changes").replaceChildren();
  try {
    const changes = await request(`/api/diff?before=${encodeURIComponent(before)}&after=${encodeURIComponent(after)}`);
    if (!state.current || state.current.id !== after || $("before").value !== before) return;
    const counts = { added: 0, changed: 0, removed: 0 };
    for (const change of changes) {
      if (Object.hasOwn(counts, change.kind)) counts[change.kind]++;
      const row = element("li"); row.append(element("span", `badge ${change.kind}`, change.kind), element("span", "", change.url)); $("changes").append(row);
    }
    $("diff-summary").textContent = changes.length ? `${counts.added} added · ${counts.changed} changed · ${counts.removed} removed. “Removed” means absent from the later capture; check its capture limits and gaps.` : "The captured bytes, response states, and errors are unchanged.";
  } catch (error) { $("diff-summary").textContent = error.message; }
  finally { $("compare").disabled = state.snapshots.length < 2; }
}
$("refresh").addEventListener("click", refresh);
$("snapshot").addEventListener("change", () => { const selected = state.snapshots.find(s => s.id === $("snapshot").value); if (selected) selectSnapshot(selected); });
$("search").addEventListener("input", () => { if (state.current) renderResources(); });
$("compare").addEventListener("click", compare);
refresh();
