import {dateAt, dayAfter, week, onDate, ical} from "./schedule.mjs";

const el = id => document.getElementById(id);
const storageKey = "coolcode:atlanticdial:preferences";
const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
let preferences = {};
try { preferences = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
const saved = new Set(Array.isArray(preferences.saved) ? preferences.saved : []);
let selection = "today";
let data, cache, cacheKey;
const textFormats = new Map();

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function remember() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({saved: [...saved], zone: el("zone").value}));
  } catch {}
}
function link(text, href) {
  const anchor = node("a", text);
  anchor.href = href;
  return anchor;
}
function button(text, handler, className = "quiet-button") {
  const control = node("button", text, className);
  control.type = "button";
  control.addEventListener("click", handler);
  return control;
}
function fmt(ms, timeZone, options) {
  const key = timeZone + JSON.stringify(options);
  if (!textFormats.has(key)) textFormats.set(key, new Intl.DateTimeFormat("en-CA", {timeZone, ...options}));
  return textFormats.get(key).format(ms);
}
function dayName(date, options) {
  return fmt(Date.parse(date + "T12:00:00Z"), "UTC", options);
}
function times(row, zone) {
  const clock = ms => fmt(ms, zone, {hour: "numeric", minute: "2-digit"});
  return clock(row.start) + " – " + clock(row.end)
    + (dateAt(row.end, zone) !== dateAt(row.start, zone) ? " (+1 day)" : "");
}
function calendar(row) {
  const url = URL.createObjectURL(new Blob([ical(row)], {type: "text/calendar;charset=utf-8"}));
  const a = link("Calendar", url);
  a.download = row.show.id + ".ics";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function setSelection(key) {
  selection = key;
  render();
}

function renderDays(today) {
  const days = el("days");
  const previouslyFocused = days.contains(document.activeElement);
  const options = [["week", "All week", "Show all seven days"]];
  for (let i = 0; i < 7; i++) {
    const day = dayAfter(today, i);
    const label = i ? dayName(day, {weekday: "short", day: "numeric"}) : "Today";
    options.push([i ? day : "today", label, dayName(day, {weekday: "long", month: "long", day: "numeric"})]);
  }
  if (!options.some(([key]) => key === selection)) selection = "today";
  days.replaceChildren(...options.map(([key, label, full]) => {
    const control = button(label, () => setSelection(key), "");
    control.setAttribute("aria-pressed", String(key === selection));
    control.setAttribute("aria-label", full);
    return control;
  }));
  if (previouslyFocused) days.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
}

function renderFeature(rows, now, zone) {
  const target = el("feature");
  const current = rows.find(row => row.start <= now && now < row.end);
  const next = current || rows.find(row => row.start > now);
  if (!next) {
    target.replaceChildren(node("p", "No upcoming shows in this selection."));
    return;
  }
  const {show, station} = next;
  const context = current ? "Scheduled now" : "Next on the dial";
  const when = fmt(next.start, zone, {weekday:"short", hour:"numeric", minute:"2-digit", timeZoneName:"short"});
  target.replaceChildren(node("p", context, "kicker"), node("h2", show.title),
    node("p", station.name + " · " + station.town + " · " + when, "tune"), link("Listen at " + station.name + " ↗", station.listen));
}

function airingRow(row, now, zone) {
  const {show, station} = row;
  const article = node("article", undefined, "airing");
  article.dataset.airing = show.id + "-" + row.start;
  const clock = node("div", undefined, "clock");
  clock.append(node("p", times(row, zone), "time"));
  const home = fmt(row.start, station.zone, {weekday:"short",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
  clock.append(node("p", home + " at the station", "home-time"));
  const body = node("div");
  body.append(node("h3", show.title), node("p", station.name + " · " + station.frequency + " · " + station.town + ", " + station.province, "place"),
    node("p", show.description, "description"));
  const actions = node("div", undefined, "actions");
  actions.append(link("Station player ↗", station.listen), link("Published schedule", station.source));
  if (row.end > now) actions.append(button("Add to calendar", () => calendar(row)));
  body.append(actions);
  const active = saved.has(show.id);
  const save = button(active ? "★ Saved" : "☆ Save", () => {
    if (saved.has(show.id)) saved.delete(show.id); else saved.add(show.id);
    remember();
    render();
    const match = Array.from(el("list").querySelectorAll("[data-save]")).find(entry => entry.dataset.save === show.id);
    (match || el("saved")).focus({preventScroll:true});
  }, "quiet-button save");
  save.dataset.save = show.id;
  save.setAttribute("aria-label", (active ? "Remove saved show " : "Save show ") + show.title);
  save.setAttribute("aria-pressed", String(active));
  article.append(clock, body, save);
  return article;
}

function render() {
  if (!data) return;
  const now = Date.now(), zone = el("zone").value, today = dateAt(now, zone);
  const key = today + zone;
  if (key !== cacheKey) { cache = week(data, now, zone); cacheKey = key; }
  const province = el("province").value;
  const rows = cache.filter(row => (!province || row.station.province === province) && (!el("saved").checked || saved.has(row.show.id)));
  renderFeature(rows, now, zone);
  renderDays(today);
  const day = selection === "today" ? today : selection;
  const shown = rows.filter(row => row.end > now && (selection === "week" || onDate(row, day, zone)));
  const out = document.createDocumentFragment();
  let lastDate = null;
  for (const row of shown) {
    const date = dateAt(row.start, zone);
    if (date !== lastDate) {
      out.append(node("h3", dayName(date, {weekday:"long",month:"short",day:"numeric"}), "day-title"));
      lastDate = date;
    }
    out.append(airingRow(row, now, zone));
  }
  el("summary").textContent = shown.length + (shown.length === 1 ? " airing" : " airings") + " · " +
    (selection === "today" ? "On now and coming up today" : selection === "week" ? "On now and coming up this week" : dayName(day, {weekday:"long",month:"long",day:"numeric"}));
  if (!shown.length) {
    const empty = node("div", undefined, "empty");
    const future = rows.find(row => row.start > now);
    if (el("saved").checked && !saved.size) {
      empty.append(node("p", "Save a show in the full guide to see its upcoming airings here."), button("Browse all shows", () => {el("saved").checked = false; render();}));
    } else if (future && selection !== "week") {
      empty.append(node("p", "No airings left for this day and selection."), button("See the full week", () => setSelection("week")));
    } else empty.append(node("p", "No listed airings match these filters. Try another province or show all programmes."));
    out.append(empty);
  }
  el("list").replaceChildren(out);
}

const zones = new Map([[deviceZone, "Device · " + deviceZone.replaceAll("_"," ")]]);
for (const [key, name] of [["America/Halifax","Halifax"],["America/St_Johns","St. John’s"],["America/Vancouver","Vancouver"],["America/Toronto","Toronto"],["UTC","UTC"]]) {
  if (!zones.has(key)) zones.set(key,name);
}
for (const [value,label] of zones) el("zone").add(new Option(label,value));
el("zone").value = zones.has(preferences.zone) ? preferences.zone : deviceZone;
el("zone").addEventListener("change", () => {remember(); selection = "today"; render();});
el("province").addEventListener("change", render);
el("saved").addEventListener("change", render);
document.querySelector('a[href="#sources"]').addEventListener("click", () => {el("sources").open = true;});

try {
  const res = await fetch("./schedule.json");
  if (!res.ok) throw Error("Schedule download failed");
  data = await res.json();
  const date = dayName(data.reviewed, {month:"short",day:"numeric",year:"numeric"});
  el("edition").textContent = data.shows.length + " programmes · " + Object.keys(data.stations).length + " stations · Schedules reviewed " + date;
  render();
  let lastCheck = Date.now();
  function refreshAtBoundary() {
    if (document.hidden) return;
    const now = Date.now(), zone = el("zone").value;
    const previous = lastCheck;
    lastCheck = now;
    const crossed = time => previous < time && time <= now;
    if (now >= previous && dateAt(now, zone) === dateAt(previous, zone) &&
        !cache.some(row => crossed(row.start) || crossed(row.end))) return;

    const active = document.activeElement;
    const row = active.closest("article.airing");
    const index = row ? [...row.querySelectorAll("a,button")].indexOf(active) : -1;
    render();
    if (index !== -1) {
      const match = [...el("list").querySelectorAll("article.airing")].find(item => item.dataset.airing === row.dataset.airing);
      const target = match?.querySelectorAll("a,button")[index] || el("days").querySelector('[aria-pressed="true"]');
      target.focus({preventScroll: true});
    }
  }
  setInterval(refreshAtBoundary, 15000);
  document.addEventListener("visibilitychange", refreshAtBoundary);
} catch {
  el("feature").textContent = "The schedule is unavailable.";
  el("summary").textContent = "Use the station links below, or reload to try the guide again.";
  el("sources").open = true;
}
