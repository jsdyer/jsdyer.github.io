import test from 'node:test';
import assert from 'node:assert/strict';
import {checkRegion} from '../admin/canada-probes.mjs';

const target = new URL('https://coolcode.ca/');
const wait = async () => {};
const json = (value, status=200) => new Response(JSON.stringify(value), {status});
test('city availability is distinct from a probe observing an HTTP failure', async () => {
  const calls = [];
  const request = async (url, opts) => {
    calls.push([url,opts]);
    if (opts.method === 'POST') return json({id:'abc', probesCount:1}, 202);
    return json({status:'finished', results:[{probe:{country:'CA',city:'Toronto',asn:1,network:'Example'},
      result:{status:'finished',statusCode:503,timings:{total:0}}}]});
  };
  const rows = await checkRegion(target,'http',{request,wait});
  assert.equal(rows.length,3);
  assert.equal(rows[1].status,'HTTP 503'); assert.equal(rows[1].ms,0);
  assert.equal(rows[2].status,'No probe returned');
  assert.deepEqual(JSON.parse(calls[0][1].body).measurementOptions.request,{method:'GET',path:'/'});
  assert.equal(calls[0][1].credentials,'omit');
});
test('quota, provider failures and unavailable probes retain different meanings', async () => {
  for (const [code,type,status] of [[422,'no_probes_found','No probe returned'],[429,'rate_limit','Globalping hourly limit reached'],
    [422,'validation_error','Globalping request failed (HTTP 422)']]) {
    const rows = await checkRegion(target,'dns',{request:async()=>json({error:{type}}, code),wait});
    assert.ok(rows.every(row => row.status === status));
  }
});
