import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../rack-recipes/recipe.js', import.meta.url), 'utf8');
const { services, exportRecipe } = runInNewContext(source + '\n;({ services, exportRecipe });');
const groups = ['Library', 'Operations', 'Personal'];
assert(services.every(service => groups.includes(service.group)), 'Include every service group in the CI matrix');
const group = process.argv[2];
assert(groups.includes(group), 'Choose Library, Operations or Personal');
const selected = services.filter(service => service.group === group);
assert(selected.length > 0);
const plan = list => ({
  version: 1, ram: 16, services: list.map(({ id, port }) => ({ id, port, storage: 'volume' }))
});
const workspace = mkdtempSync(join(tmpdir(), 'rack-startup-'));
const file = join(workspace, 'compose.yaml');
function compose(args, timeout = 30_000) {
  return execFileSync('docker', ['compose', '--file', file, ...args], {
    cwd: workspace, timeout, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, COMPOSE_ANSI: 'never', COMPOSE_PROJECT_NAME: workspace.split('/').at(-1).toLowerCase() }
  });
}

async function firstResponse({ id, port }) {
  const address = 'http://127.0.0.1:' + port + '/';
  const deadline = Date.now() + 150_000;
  let last = 'connection unavailable';
  do {
    try {
      const response = await fetch(address, { redirect: 'manual', signal: AbortSignal.timeout(4000) });
      await response.body?.cancel();
      last = 'HTTP ' + response.status;
      if ((response.status >= 200 && response.status < 400) || [401, 403].includes(response.status)) {
        console.log(id + ' ' + address + ' ' + last);
        return;
      }
    } catch (error) {
      last = error.cause?.code || error.message;
    }
    await sleep(1500);
  } while (Date.now() < deadline);
  throw Error(id + ' ' + address + ' did not reach first-run HTTP readiness (' + last + ')');
}

try {
  writeFileSync(file, exportRecipe(plan(services)));
  compose(['config', '--quiet']);
  writeFileSync(file, exportRecipe(plan(selected)));
  const config = JSON.parse(compose(['config', '--format', 'json']));
  const running = [], failures = [];
  for (const service of selected) {
    const { id, image, port, internalPort } = service;
    const ports = config.services[id].ports;
    assert.equal(ports.length, 1);
    assert.equal(ports[0].host_ip, '127.0.0.1');
    assert.equal(Number(ports[0].published), port);
    assert.equal(ports[0].target, internalPort);
    // Create the documented media folders as the host user before Docker binds them.
    for (const mount of config.services[id].volumes) {
      if (mount.type === 'bind') mkdirSync(mount.source, { recursive: true });
    }
    try {
      compose(['up', '--detach', '--no-deps', id], 160_000);
      running.push(service);
    } catch (error) {
      // Compose may print image layer progress before the registry/start error.
      failures.push(id + ' (' + image + ') failed to start: ' + (error.stderr || error.message).trim().split('\n').slice(-3).join(' '));
    }
  }
  const results = await Promise.allSettled(running.map(firstResponse));
  for (const result of results) if (result.status === 'rejected') failures.push(result.reason.message);
  if (failures.length) {
    console.error(compose(['ps', '--all']));
    throw Error(failures.join('\n'));
  }
} finally {
  try { compose(['down', '--volumes', '--remove-orphans', '--timeout', '3'], 60_000); }
  finally { rmSync(workspace, { recursive: true, force: true }); }
}
