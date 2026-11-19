"use strict";

function atlasHops(measurement) {
  return measurement.hops.map(hop=>{
    const times=hop.replies.map(reply=>reply.rtt).sort((a,b)=>a-b);
    const middle=Math.floor(times.length/2);
    const median=times.length ? times.length%2 ? times[middle] : (times[middle-1]+times[middle])/2 : null;
    return {number:hop.hop,location:[...new Set(hop.replies.map(r=>r.from))].join(', ') || 'No timed reply',
      country:'?',rtt:median,time:median===null?'?':String(Number(median.toFixed(3)))};
  });
}

const byId = (id) => document.getElementById(id);
const notes = byId("notes");
const error = byId("error");
const measuredButtons = [];

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
  const adjacentKnown = hops.some((hop,i)=>i>0 && hop.country!=='?' && hops[i-1].country!=='?');
  byId("changes").textContent = adjacentKnown ? changes : 'Unknown';
  byId("gaps").textContent = gapCount;
  byId("final-rtt").textContent = last.rtt === null ? "Unknown" : last.time + " ms";
  const rows = document.createDocumentFragment();
  for (const [i, hop] of hops.entries()) {
    const row = document.createElement("tr");
    if (changesCountry(hops[i - 1], hop)) row.className = "crossing";
    const index = document.createElement("th");
    index.scope = "row";
    index.textContent = String(hop.number ?? i + 1).padStart(2, "0");
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

function selectMeasurement(index) {
  const measurement=measuredRoutes[index];
  const hops=atlasHops(measurement);
  measuredButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  error.textContent='';
  notes.removeAttribute('aria-invalid');
  notes.value=hops.map(hop=>[hop.location,hop.country,hop.time].join(' | ')).join('\n');
  render(measurement.city+' → K-root','RIPE Atlas · probe '+measurement.probe,hops);
  byId('reading').textContent='This trace recorded '+hops.length+' hops. '+hops.filter(hop=>hop.rtt===null).length+' had no timed reply. The probe location is published by RIPE Atlas. Router countries are unverified.';
  byId('path').textContent=new Date(measurement.timestamp*1000).toISOString()+' · Destination '+measurement.destination;
  const source=byId('source');source.href=measurement.source;source.hidden=false;
  byId('changes').textContent='Unknown';
  byId('notice').textContent='Loaded the recorded '+measurement.city+' measurement.';
}
for (const [i,measurement] of measuredRoutes.entries()) {
  const button=document.createElement('button');
  button.type='button';button.textContent=measurement.city;
  const sub=document.createElement('small');sub.textContent='RIPE Atlas · '+measurement.probe;
  button.append(sub);button.addEventListener('click',()=>selectMeasurement(i));
  byId('samples').append(button);measuredButtons.push(button);
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
  byId('source').hidden=true;
  for (const button of measuredButtons) button.setAttribute("aria-pressed", "false");
  render("Your annotated route", "Local notes", hops);
  byId("notice").textContent = "Analyzed " + hops.length + (hops.length === 1 ? " hop." : " hops.");
  byId("route-title").focus();
});

selectMeasurement(0);
