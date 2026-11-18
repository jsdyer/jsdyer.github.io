import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {dateAt, instantAt, week, onDate, ical} from "../atlanticdial/schedule.mjs";

const data = JSON.parse(readFileSync(new URL("../atlanticdial/schedule.json", import.meta.url)));
const nov21 = Date.parse("2026-11-21T16:00:00Z");

test("all published slots identify a show, a station, and its primary sources", () => {
  assert.equal(new Set(data.shows.map(s => s.id)).size, data.shows.length);
  assert.deepEqual(new Set(Object.values(data.stations).map(s => s.province)), new Set(["NS","NB","PEI","NL"]));
  for (const show of data.shows) {
    const station = data.stations[show.station];
    assert.ok(station && show.title && show.slots.length);
    for (const url of [station.listen, station.source]) assert.equal(new URL(url).protocol, "https:");
    for (const slot of show.slots) {
      for (const clock of [slot.start, slot.end]) assert.match(clock, /^([01]\d|2[0-3]):[0-5]\d$/);
      assert.notEqual(slot.start, slot.end);
      assert.ok(slot.days.length && slot.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6));
    }
  }
});
test("Atlantic, Newfoundland and DST offsets use the station's calendar", () => {
  assert.equal(instantAt("2026-11-21","19:00","America/St_Johns"), Date.parse("2026-11-21T22:30Z"));
  assert.equal(instantAt("2026-07-18","19:00","America/St_Johns"), Date.parse("2026-07-18T21:30Z"));
  assert.equal(instantAt("2026-03-08","02:30","America/Halifax"), null);
  assert.equal(instantAt("2026-11-01","01:30","America/Halifax"), Date.parse("2026-11-01T04:30Z"));
});
test("Vancouver stays at UTC−7 in winter after BC's 2026 change", () => {
  assert.equal(instantAt("2026-11-21","15:00","America/Vancouver"), Date.parse("2026-11-21T22:00:00Z"));
  assert.equal(instantAt("2025-11-21","14:00","America/Vancouver"), Date.parse("2025-11-21T22:00:00Z"));
  assert.equal(dateAt(Date.parse("2026-11-21T07:30:00Z"),"America/Vancouver"),"2026-11-21");
});
test("the Saturday Cabin Party stays in the guide early on Sunday until its end", () => {
  const now = Date.parse("2026-11-22T04:00Z");
  const row = week(data, now, "America/St_Johns").find(a => a.show.id === "cabin" && a.start <= now && a.end > now);
  assert.ok(row);
  assert.equal(row.end, Date.parse("2026-11-22T04:30Z"));
  assert.ok(onDate(row,"2026-11-22","America/St_Johns"));
  assert.ok(!onDate(row,"2026-11-22","America/Vancouver"));
  assert.equal(dateAt(row.start,"America/St_Johns"),"2026-11-21");
});
test("calendar entries retain the UTC airing and an official player across time zones", () => {
  const row = week(data, nov21, "Pacific/Auckland").find(x => x.show.id === "hoedown");
  assert.ok(row);
  const text = ical(row,nov21);
  assert.match(text,/DTSTART:20261121T220000Z/);
  assert.ok(text.includes("URL:" + row.station.listen));
  assert.ok(text.split("\r\n").every(line => Buffer.byteLength(line) <= 75));
});
