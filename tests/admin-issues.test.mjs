import { test } from "node:test";
import assert from "node:assert/strict";
import { issueSubject } from "../admin/public-issues.mjs";

const catalog = [{id: "nightfinder", title: "Nightfinder"}];
test("matches the public form's website and tool prefixes without a label dependency", () => {
  assert.equal(issueSubject({body:"Tool: Nightfinder\r\n\r\nWhat happened?"},catalog),"Nightfinder");
  assert.equal(issueSubject({body:"Tool: nightfinder\n\nWhat happened?"},catalog),"Nightfinder");
  assert.equal(issueSubject({body:"Website: CoolCode website or catalogue\n\nWhat happened?"},catalog),"CoolCode website");
});
test("unrecognized, empty, and off-topic issues remain repository issues", () => {
  for (const body of [null,"","Tool: unknown","Maintenance\nTool: Nightfinder","Website: example.org"])
    assert.equal(issueSubject({body},catalog),"Repository issue");
});
