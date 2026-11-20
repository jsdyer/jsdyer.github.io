import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueChanges, sourceScope } from '../admin/activity.mjs';

test('tool source history uses its registered repository or shared directory', () => {
  assert.deepEqual(sourceScope('https://github.com/jsdyer/nightfinder'), {repo:'nightfinder',path:''});
  assert.deepEqual(sourceScope('https://github.com/jsdyer/jsdyer.github.io/tree/main/tools/timefold'), {repo:'jsdyer.github.io',path:'tools/timefold'});
  assert.equal(sourceScope('https://example.com/jsdyer/test'),null);
});

test('catalogue diff preserves zero, reports recovery, and distinguishes additions and removals', () => {
  const tool = {id:'test',title:'Test',data_info:{probes:[{label:'Snapshot',count:0,unavailable:true}]}};
  const next = structuredClone(tool);
  next.data_info.probes[0] = {label:'Snapshot',count:2};
  assert.deepEqual(catalogueChanges([tool],[tool]),[]);
  assert.deepEqual(catalogueChanges([tool,{id:'old',title:'Old'}],[next,{id:'new',title:'New'}]),
    ['New · Added','Old · Removed','Test · Snapshot count: 0 → 2; Snapshot check recovered']);
});

import { checkCounts, mergeRefreshes, matchingRefreshes, loadRefreshes } from '../admin/refresh-journal.mjs';

test('journal joins exact attempts and keeps workflow failures distinct from metadata changes', () => {
  const counts = {unchanged:1, changed:0, unavailable:0, recovered:0};
  const reports = [
    {run_id:'10', attempt:1, checked_at:'2026-11-17T01:01:00Z', counts, details:[]},
    {run_id:'10', attempt:2, checked_at:'2026-11-18T01:02:00Z', counts:{...counts, recovered:1},
      details:[{tool:'welllayers', status:'recovered'}]},
  ];
  const entries = mergeRefreshes(reports, [
    {id:10, run_attempt:2, conclusion:'failure', run_started_at:'2026-11-18T01:00:00Z'},
    {id:11, run_attempt:1, status:'queued', created_at:'2026-11-19T01:00:00Z'},
  ]);
  assert.deepEqual(entries.map(r => [r.id, r.attempt, r.outcome]),
    [['11',1,'queued'],['10',2,'failure'],['10',1,undefined]]);
  assert.deepEqual(matchingRefreshes(entries, 'attention', 'welllayers'), [entries[1]]);
  assert.deepEqual(matchingRefreshes(entries, 'changed', 'welllayers'), [entries[1]]);
  assert.deepEqual(matchingRefreshes(entries, 'unchanged', ''), [entries[2]]);
  assert.deepEqual(matchingRefreshes(entries, 'unknown', ''), [entries[0]]);
  assert.deepEqual(matchingRefreshes(entries, 'unknown', 'welllayers'), []);
});

test('legacy runs, unavailable checks and a missing journal keep their distinct meanings', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers, undefined);
    return url.includes('/actions/') ? Response.json({workflow_runs:[
      {id:12, run_attempt:1, conclusion:'cancelled', created_at:'2026-11-18T01:00:00Z'}]}) : new Response(null, {status:404});
  });
  const result = await loadRefreshes(new AbortController().signal);
  assert.equal(result.notices.length, 0);
  assert.equal(matchingRefreshes(result.entries, 'attention', '').length, 1);
  assert.equal(matchingRefreshes(result.entries, 'unchanged', '').length, 0);
  const report = {run_id:'14', attempt:1, checked_at:'2026-11-20T01:00:00Z', counts:{unchanged:0, changed:0, unavailable:1, recovered:0},
    details:[{tool:'nightfinder', label:'Date', status:'unavailable'}]};
  globalThis.fetch = async url => url.includes('/actions/') ? new Response(null, {status:403}) : Response.json({version:1, runs:[report]});
  const saved = await loadRefreshes(new AbortController().signal);
  assert.match(saved.notices.join(' '), /workflow results could not be loaded/);
  assert.equal(matchingRefreshes(saved.entries, 'attention', 'nightfinder').length, 1);
});


test('tool filters distinguish an unchanged check, an unobserved tool, and legacy coverage', () => {
  const report = {counts:{changed:1, recovered:0, unavailable:0, unchanged:2},
    checked_by_tool:{nightfinder:2, welllayers:1}, details:[{tool:'nightfinder', status:'changed'}]};
  const entries = [{report, outcome:'success'}];
  assert.deepEqual(checkCounts(report, 'welllayers'), {changed:0,recovered:0,unavailable:0,unchanged:1});
  assert.equal(checkCounts(report, 'nightfinder').unchanged, 1);
  assert.deepEqual(matchingRefreshes(entries, 'unchanged', 'welllayers'), entries);
  assert.deepEqual(matchingRefreshes(entries, 'unchanged', 'nightfinder'), []);
  assert.deepEqual(matchingRefreshes(entries, '', 'unobserved'), []);
  delete report.checked_by_tool;
  assert.equal(checkCounts(report, 'nightfinder').unchanged, null);
  assert.deepEqual(matchingRefreshes(entries, '', 'welllayers'), []);
});
