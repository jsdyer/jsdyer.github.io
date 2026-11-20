import assert from 'node:assert/strict';
import test from 'node:test';
import {loadProviderStatus} from '../admin/service-status.mjs';

const signal = new AbortController().signal;
const summary = {
  page: {updated_at: '2026-11-19T01:01:00Z'},
  components: [
    {id: '57srcl8zcn7c', name: 'Workers', status: 'degraded_performance'},
    {id: 'untracked', name: 'Queues', status: 'operational'},
  ],
  incidents: [
    {id: 'abc1', name: 'Worker changes delayed', status: 'monitoring',
      components: [{id: 'untracked'}, {id: '57srcl8zcn7c'}], updated_at: '2026-11-20T01:02:01Z'},
    {id: 'abc2', name: 'Other service incident', status: 'identified', components: [{id: 'untracked'}]},
    {id: 'abc3', name: 'Unassigned incident', status: 'investigating', components: []},
    {id: '../bad', name: 'Update references D1', status: 'identified', components: [],
      incident_updates: [{affected_components: [{code: 'z0yd3sxqjqdm'}]}]},
    {id: 'abc4', status: 'resolved', components: [{id: '57srcl8zcn7c'}]},
  ],
};

test('isolates provider failures, filters incident components and exposes missing coverage', async () => {
  const [github, cf] = await loadProviderStatus(signal, async (url, options) => {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers, undefined);
    return url.includes('githubstatus') ? new Response('', {status: 503}) : Response.json(summary);
  });
  assert.equal(github.unavailable, true);
  assert.equal(cf.components[0].status, 'degraded performance');
  assert.equal(cf.components[1].status, 'unavailable');
  assert.deepEqual(cf.incidents.map(i => i.name), ['Worker changes delayed', 'Update references D1']);
  assert.deepEqual(cf.incidents[0].affected, ['Workers']);
  assert.equal(cf.incidents[0].url, 'https://www.cloudflarestatus.com/incidents/abc1');
  assert.equal(cf.incidents[0].updated, '2026-11-20 01:02 UTC');
  assert.equal(cf.incidents[1].url, 'https://www.cloudflarestatus.com');
  assert.equal(cf.unassigned, 1);
  assert.equal(cf.updated, '2026-11-19 01:01 UTC');
});

test('malformed feeds are unavailable and a locked session cancels outstanding checks', async () => {
  const broken = await loadProviderStatus(signal, () => Response.json({}));
  assert.ok(broken.every(p => p.unavailable));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadProviderStatus(controller.signal, (_, {signal}) => signal.throwIfAborted()), {name: 'AbortError'});
});
