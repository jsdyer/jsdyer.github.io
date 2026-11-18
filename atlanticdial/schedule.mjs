const dayMs = 86_400_000;
const formatters = new Map();
const pacificCutover = Date.parse("2026-03-08T10:00:00Z");
const oldPacificRules = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Vancouver", hour: "2-digit", hourCycle: "h23"
}).format(Date.parse("2026-11-18T12:00:00Z")) !== "05";

// BC moved to year-round UTC−7 in March 2026. Some otherwise modern browsers
// still carry the previous winter rule. Keep historical dates and newer tzdata.
export function zoneAt(instant, zone) {
  if (oldPacificRules && (zone === "America/Vancouver" || zone === "Canada/Pacific") && instant >= pacificCutover) {
    return "Etc/GMT+7";
  }
  return zone;
}

function civilParts(instant, zone) {
  zone = zoneAt(instant, zone);
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat("en-CA", {
      timeZone: zone, calendar: "gregory", numberingSystem: "latn", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    }));
  }
  return Object.fromEntries(formatters.get(zone).formatToParts(instant)
    .filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}

export function dateAt(instant, zone) {
  const {year, month, day} = civilParts(instant, zone);
  return [year, month, day].join("-");
}

export function dayAfter(date, offset) {
  return new Date(Date.parse(date + "T12:00:00Z") + offset * dayMs).toISOString().slice(0, 10);
}

// Resolve a wall-clock slot with the offsets on either side of that date. A
// repeated time uses its first occurrence; a nonexistent clock time is omitted.
export function instantAt(date, clock, zone) {
  const target = Date.parse(date + "T" + clock + ":00Z");
  const times = new Set();
  for (const sample of [target - dayMs, target + dayMs]) {
    const p = civilParts(sample, zone);
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    const instant = target - (asUTC - sample);
    const local = civilParts(instant, zone);
    if (date === [local.year, local.month, local.day].join("-") && clock === local.hour + ":" + local.minute) {
      times.add(instant);
    }
  }
  return times.size ? Math.min(...times) : null;
}

export function week(data, now, zone) {
  const today = dateAt(now, zone);
  const lastDay = dayAfter(today, 6);
  const airings = [];
  for (const show of data.shows) {
    const station = data.stations[show.station];
    // The visitor may be on the other side of the date line or listening overnight.
    for (let day = dayAfter(today, -2); day <= dayAfter(lastDay, 1); day = dayAfter(day, 1)) {
      const weekday = new Date(day + "T12:00:00Z").getUTCDay();
      for (const slot of show.slots) {
        if (!slot.days.includes(weekday)) continue;
        const endDay = slot.end <= slot.start ? dayAfter(day, 1) : day;
        const start = instantAt(day, slot.start, station.zone);
        const end = instantAt(endDay, slot.end, station.zone);
        if (start !== null && end !== null && end > start &&
            dateAt(end - 1, zone) >= today && dateAt(start, zone) <= lastDay) {
          airings.push({show, station, start, end});
        }
      }
    }
  }
  return airings.sort((a, b) => a.start - b.start || a.show.title.localeCompare(b.show.title));
}

export function onDate(airing, date, zone) {
  return dateAt(airing.start, zone) <= date && dateAt(airing.end - 1, zone) >= date;
}

export function ical(airing, now = Date.now()) {
  const stamp = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = s => s.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,").replace(/;/g, "\\;");
  // RFC 5545 continuation lines may contain at most 75 UTF-8 octets.
  function fold(value) {
    const lines = [];
    let line = "", length = 0;
    for (const character of value) {
      const size = new TextEncoder().encode(character).length;
      if (length + size > 75) {
        lines.push(line);
        line = " ";
        length = 1;
      }
      line += character;
      length += size;
    }
    lines.push(line);
    return lines.join("\r\n");
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CoolCode//Atlantic Dial//EN", "BEGIN:VEVENT",
    "UID:" + airing.show.id + "-" + stamp(airing.start) + "@coolcode.ca", "DTSTAMP:" + stamp(now),
    "DTSTART:" + stamp(airing.start), "DTEND:" + stamp(airing.end),
    "SUMMARY:" + escape(airing.show.title + " on " + airing.station.name), "URL:" + airing.station.listen,
    "DESCRIPTION:" + escape(airing.show.description + "\nPublished schedule: " + airing.station.source),
    "END:VEVENT", "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}
