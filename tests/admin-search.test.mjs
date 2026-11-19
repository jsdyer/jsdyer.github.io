import assert from "node:assert/strict";
import { test } from "node:test";
import { readQueryReport, readSearchReport } from "../admin/search-report.mjs";

const catalog = [{ id: "nightfinder", title: "Nightfinder", access: "browser" },
                 { id: "install", title: "Install guide", access: "install" }];
test("imports local Pages export and weights canonical tool groups", () => {
  const csv = '\uFEFFTop pages,Clicks,Impressions,CTR,Position,Note\r\n'
    + '"https://coolcode.ca/nightfinder/?q=a,b",9,"1,000",0.9%,4,"escape ""and""\nwrap"\r\n'
    + 'https://coolcode.ca/nightfinder/path,3,500,.6%,7,\r\n'
    + 'https://coolcode.ca/,5,50,10%,10,\r\nhttps://example.org/nightfinder/,1,1,100%,1,\r\n'
    + 'https://coolcode.ca/field-notes/reading/,2,2,100%,1,\r\n'
    + 'https://coolcode.ca/install/,2,2,100%,1,\r\n'
    + 'https://coolcode.ca/nightfinder/,~,12,0%,0,\r\n';
  assert.deepEqual(readSearchReport(csv, catalog), {
    tools: [{ id: "nightfinder", title: "Nightfinder", clicks: 12, impressions: 1500,
              ctr: 12 / 1500, position: 5 }], unmatched: 4, invalid: 1,
  });
});
test("reads semicolon export and distinguishes absent or zero denominator metrics", () => {
  const result = readSearchReport('Pages;Clics;Impressions;Position moyenne\r\nhttps://coolcode.ca/nightfinder/;0;25;5,4', catalog);
  assert.equal(result.tools[0].position, 5.4);
  const empty = readSearchReport('Top pages,Clicks,Impressions\nhttps://coolcode.ca/nightfinder/,0,0', catalog);
  assert.equal(empty.tools[0].ctr, null);
  assert.equal(empty.tools[0].position, null);
});
test("rejects wrong dimension or malformed CSV", () => {
  for (const csv of ['Queries,Clicks,Impressions\nhello,2,3', 'Top pages,Clicks,Impressions\n"oops,2,3',
                       'Top pages,Clicks,Impressions\n"url"x,2,3'])
    assert.throws(() => readSearchReport(csv, catalog));
});

test("organizes actual query rows without assigning them to arbitrary pages", () => {
  const csv = 'Requêtes les plus fréquentes;Clics;Impressions;Position moyenne\n"Halifax; port";2;10;3,5\nlangley;0;0;\n;1;2;1\nbad;?;4;1';
  assert.deepEqual(readQueryReport(csv), { queries: [
    {phrase: "Halifax; port", clicks: 2, impressions: 10, ctr: 0.2, position: 3.5},
    {phrase: "langley", clicks: 0, impressions: 0, ctr: null, position: null},
  ], invalid: 2 });
  assert.throws(() => readQueryReport("Top pages,Clicks,Impressions"));
});
