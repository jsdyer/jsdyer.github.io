"use strict";

const samples = [
  {
    title: "Via Seattle",
    endpoints: "Langley → Victoria",
    notes: [
      "Langley access | CA | 1.8",
      "Vancouver aggregation | CA | 3.2",
      "Seattle transit | US | 13.4",
      "Vancouver return | CA | 20.8",
      "Victoria destination | CA | 25.1"
    ]
  },
  {
    title: "Across Canada",
    endpoints: "Calgary → Toronto",
    notes: [
      "Calgary access | CA | 2.1",
      "Regina transit | CA | 12.3",
      "Winnipeg transit | CA | 19.2",
      "Toronto destination | CA | 39.6"
    ]
  },
  {
    title: "A missing hop",
    endpoints: "Montréal → Halifax",
    notes: [
      "Montréal access | CA | 1.5",
      "No reply | ? | ?",
      "Unlocated router | ? | 19.1",
      "Halifax destination | CA | 28.7"
    ]
  }
];

const byId = (id) => document.getElementById(id);
const notes = byId("notes");
const error = byId("error");
const sampleButtons = [];

function parseNotes(input) {
  if (input.length > 16000) throw new Error("Use 16,000 characters or fewer.");
  const hops = [];
  for (const [index, raw] of input.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const prefix = "Line " + (index + 1) + ": ";
    if (hops.length >= 128) throw new Error(prefix + "use at most 128 hops.");
    const fields = raw.trim().split(raw.includes("|") ? "|" : "\t").map(field => field.trim());
    if (fields.length !== 3) throw new Error(prefix + "supply location, country and RTT, separated by pipes or tabs.");
    const [location, countryCode, time] = fields;
    if (!location || location.length > 100) throw new Error(prefix + "enter a location note of 1 to 100 characters.");
    if (!/^(?:[a-z]{2}|\?)$/i.test(countryCode)) throw new Error(prefix + "use a two-letter country code or ?.");
    if (time !== "?" && !/^\d+(?:\.\d{1,3})?$/.test(time)) {
      throw new Error(prefix + "use a nonnegative RTT in milliseconds with up to three decimal places, or ?.");
    }
    const rtt = time === "?" ? null : Number(time);
    if (rtt !== null && rtt > 60000) throw new Error(prefix + "RTT must be 60,000 ms or less.");
    hops.push({ location, country: countryCode.toUpperCase(), rtt, time });
  }
  if (!hops.length) throw new Error("Enter at least one hop before analyzing.");
  return hops;
}

function changesCountry(previous, current) {
  return previous && previous.country !== "?" && current.country !== "?" && previous.country !== current.country;
}

function describeRoute(hops, gapCount, changes) {
  const countries = new Set(hops.map(hop => hop.country).filter(country => country !== "?"));
  const canadaEnds = hops[0].country === "CA" && hops[hops.length - 1].country === "CA";
  const foreignCodes = [...countries].filter(country => country !== "CA");
  let description;
  if (!countries.size) {
    return "Every location is unlabelled. The country sequence is unknown.";
  } else if (canadaEnds && foreignCodes.length) {
    description = "The notes start and end in Canada. A " + foreignCodes.join(", ") + " label in between suggests a cross-border detour.";
  } else if (countries.size === 1) {
    description = "Every known country label is " + [...countries][0] + ".";
  } else {
    description = "The notes contain " + countries.size + " distinct country labels.";
  }
  if (gapCount) return description + " Missing labels leave part of the route unresolved. Changes are counted only between adjacent labelled hops.";
  if (!changes) return description + " Unseen hops and inaccurate labels can still affect the physical route.";
  return description + " Changes are inferred from adjacent labels. Physical locations require independent verification.";
}

function render(title, source, hops) {
  const gapCount = hops.filter(hop => hop.country === "?").length;
  const changes = hops.filter((hop, i) => changesCountry(hops[i - 1], hop)).length;
  const sequence = hops.filter((hop, i) => !i || hop.country !== hops[i - 1].country).map(hop => hop.country);
  const largest = Math.max(...hops.map(hop => hop.rtt ?? 0));
  const last = hops[hops.length - 1];
  byId("source-label").textContent = source;
  byId("route-title").textContent = title;
  byId("reading").textContent = describeRoute(hops, gapCount, changes);
  byId("path").textContent = "Country sequence · " + sequence.join(" → ");
  byId("changes").textContent = changes;
  byId("gaps").textContent = gapCount;
  byId("final-rtt").textContent = last.rtt === null ? "Unknown" : last.time + " ms";
  const rows = document.createDocumentFragment();
  for (const [i, hop] of hops.entries()) {
    const row = document.createElement("tr");
    if (changesCountry(hops[i - 1], hop)) row.className = "crossing";
    const index = document.createElement("th");
    index.scope = "row";
    index.textContent = String(i + 1).padStart(2, "0");
    row.append(index);
    for (const value of [hop.location, hop.country, hop.rtt === null ? "—" : hop.time]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    const timing = row.lastElementChild;
    timing.className = "timing";
    if (hop.rtt === null) {
      timing.setAttribute("aria-label", "Unknown round-trip time");
    } else {
      const bar = document.createElement("span");
      bar.className = "bar";
      bar.setAttribute("aria-hidden", "true");
      bar.style.width = (largest ? hop.rtt / largest * 100 : 0) + "%";
      timing.append(bar);
    }
    rows.append(row);
  }
  byId("hops").replaceChildren(rows);
}

function selectSample(index) {
  const sample = samples[index];
  for (const [i, button] of sampleButtons.entries()) button.setAttribute("aria-pressed", String(i === index));
  notes.value = sample.notes.join("\n");
  notes.removeAttribute("aria-invalid");
  error.textContent = "";
  render(sample.title, "Illustrative route · " + sample.endpoints, parseNotes(notes.value));
  byId("notice").textContent = sample.title + " loaded, " + sample.notes.length + " hops.";
}

for (const [i, sample] of samples.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = sample.title;
  const endpoints = document.createElement("small");
  endpoints.textContent = sample.endpoints;
  button.append(endpoints);
  button.addEventListener("click", () => selectSample(i));
  byId("samples").append(button);
  sampleButtons.push(button);
}

byId("note-form").addEventListener("submit", event => {
  event.preventDefault();
  let hops;
  try {
    hops = parseNotes(notes.value);
  } catch (reason) {
    notes.setAttribute("aria-invalid", "true");
    error.textContent = reason.message;
    notes.focus();
    return;
  }
  error.textContent = "";
  notes.removeAttribute("aria-invalid");
  for (const button of sampleButtons) button.setAttribute("aria-pressed", "false");
  render("Your annotated route", "Local notes", hops);
  byId("notice").textContent = "Analyzed " + hops.length + (hops.length === 1 ? " hop." : " hops.");
  byId("route-title").focus();
});

selectSample(0);
