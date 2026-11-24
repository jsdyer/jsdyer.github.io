import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReport,matchingOutcomes,reportAge,snapshotDescription,requestOutcomeCheck,includesFreshCheck} from '../admin/tool-outcomes.mjs';
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
test('review filter includes uncertain data verification and excludes expected workflow-only checks',()=>{
  const limited={...row,status:'limited'};
  const check={...row,status:'workflow_only',output:{status:'not_configured',checks:[]}};
  assert.deepEqual(matchingOutcomes([row,limited,check],'review',''),[row,limited]);
  assert.deepEqual(matchingOutcomes([row,limited,check],'workflow_only',''),[check]);
  assert.equal(validateReport({...report,rows:[check]}).rows[0].status,'workflow_only');
});
test('malformed reports and duplicate workflows do not render as healthy',()=>{
  assert.throws(()=>validateReport({...report,rows:[row,row]}),/repeats/);
  assert.throws(()=>validateReport({...report,rows:[{...row,repo:'https://bad.example'}]}),/invalid/);
  assert.throws(()=>validateReport({...report,rows:[{...row,output:null}]}),/invalid/);
  assert.throws(()=>validateReport({...report,checked_at:'yesterday'}),/unsupported/);
});

test('saved-report wording and a pending request never claim live results',()=>{
  assert.match(snapshotDescription(report,Date.parse('2026-11-24T12:33:00Z')),/33 minutes old/);
  assert.match(snapshotDescription(report),/Later runs are not included/);
  assert.equal(includesFreshCheck(report,Date.parse(report.checked_at)),false);
  const fresh={...report,read_mode:'fresh',rows:[{...row,observed_at:'2026-11-24T12:01:00Z'}]};
  assert.equal(includesFreshCheck(fresh,Date.parse(report.checked_at)),true);
  assert.equal(includesFreshCheck(fresh,Date.parse('2026-11-24T12:02:00Z')),false);
});
test('explicit check dispatches only the fixed observer workflow with the existing session',async()=>{
  let call;
  const session={token:'test-token',signal:new AbortController().signal};
  const requested=await requestOutcomeCheck(session,async(url,options)=>{call={url,...options};return new Response(null,{status:204,headers:{Date:'Tue, 24 Nov 2026 12:01:00 GMT'}});});
  assert.equal(call.url,'https://api.github.com/repos/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml/dispatches');
  assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),{ref:'main'});
  assert.equal(call.credentials,'omit');assert.equal(call.redirect,'error');
  assert.equal(call.headers.Authorization,'Bearer test-token');assert.equal(requested,Date.parse('2026-11-24T12:01:00Z'));
});
test('dispatch denial is actionable, does not pretend success, and 401 locks the session',async()=>{
  let locked=false;const session={token:'test-token',signal:new AbortController().signal,lock:()=>{locked=true;}};
  await assert.rejects(requestOutcomeCheck(session,async()=>new Response(null,{status:403})),/Actions write/);
  assert.equal(locked,false);
  await assert.rejects(requestOutcomeCheck(session,async()=>new Response(null,{status:401})),/expired/);
  assert.equal(locked,true);
  await assert.rejects(requestOutcomeCheck({signal:session.signal},async()=>{throw Error('must not fetch');}),/Sign in/);
});
