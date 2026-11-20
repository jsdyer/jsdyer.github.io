import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runChecks} from '../admin/service-checks.mjs';

test('checks the built site and health payload without event writes or credentials', async () => {
  const paths = {'/':'index.html','/sitemap.xml':'sitemap.xml','/assets/tool-catalog.json':'assets/tool-catalog.json'};
  const rows = await runChecks(new AbortController().signal, async (url, init) => {
    assert.equal(init.method, 'GET');
    assert.equal(init.credentials, 'omit');
    const path = new URL(url).pathname;
    return new Response(path === '/health' ? '{"ok":true}' : readFileSync('dist/' + paths[path]));
  });
  assert.equal(rows.length, 4);
  assert.ok(rows.every(row => row.ok));
});

test('separates incorrect content, HTTP failures and an unreachable observer', async () => {
  const rows = await runChecks(new AbortController().signal, async url => {
    switch (new URL(url).pathname) {
      case '/health': throw new TypeError('offline');
      case '/sitemap.xml': return new Response('', {status:503});
      default: return new Response('<html>unexpected response</html>');
    }
  });
  assert.deepEqual(rows.map(r => [r.status, r.detail]), [
    [200, 'Unexpected content'], [200, 'Unexpected content'], [503, 'HTTP 503'], [null, 'Request could not finish'],
  ]);
});
