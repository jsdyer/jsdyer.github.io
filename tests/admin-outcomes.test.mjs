import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReport,matchingOutcomes,reportAge} from '../admin/tool-outcomes.mjs';
const row={repo:'jsdyer/example',workflow:'refresh.yml',titles:['Example'],status:'attention',execution:{latest:{id:42,at:'2026-11-24T11:00:00Z',conclusion:'failure'}},output:{status:'recent',checks:[]},counts:[],reasons:[]};
const report={version:1,checked_at:'2026-11-24T12:00:00Z',rows:[row]};
test('workflow failure with current publication remains in attention filter',()=>{
  assert.equal(validateReport(report),report);
  assert.deepEqual(matchingOutcomes([row],'attention','Example'),[row]);
  assert.deepEqual(matchingOutcomes([row],'checked',''),[]);
});
test('report age cannot be confused with current tool health',()=>{
  assert.equal(reportAge(report,Date.parse('2026-11-24T13:00:00Z')),'recent');
  assert.equal(reportAge(report,Date.parse('2026-11-24T16:00:00Z')),'stale');
  assert.equal(reportAge(report,Date.parse('2026-11-24T11:00:00Z')),'future');
});
test('malformed reports and duplicate workflows do not render as healthy',()=>{
  assert.throws(()=>validateReport({...report,rows:[row,row]}),/repeats/);
  assert.throws(()=>validateReport({...report,rows:[{...row,repo:'https://bad.example'}]}),/invalid/);
  assert.throws(()=>validateReport({...report,rows:[{...row,output:null}]}),/invalid/);
  assert.throws(()=>validateReport({...report,checked_at:'yesterday'}),/unsupported/);
});
