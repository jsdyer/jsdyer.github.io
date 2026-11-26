import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const code = await readFile(new URL('../services/cloudflare-visitor/worker.js', import.meta.url), 'utf8');
const {default: worker} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const tools = [...JSON.parse(await readFile(new URL('../data/tools.json', import.meta.url), 'utf8')),
  ...JSON.parse(await readFile(new URL('../data/unlisted-tools.json', import.meta.url), 'utf8'))];

test('live-registry returns public and unlisted measured IDs without touching the database', async () => {
  const response = await worker.fetch(new Request('https://worker.example/registry'), {});
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).tool_ids, tools.map(t => t.id).sort());
});

test('every registered tool event is accepted against a fake database', async () => {
  let writes = 0;
  const statement = {bind(){return this;}, async first(field){return field === 'secret' ? 'test-salt' : {hits:1};},
    async run(){writes++;}, async all(){return {results:[]};}};
  const DB = {prepare(){return statement;}};
  for (const tool of tools) {
    const response = await worker.fetch(new Request('https://worker.example/event', {
      method:'POST', headers:{Origin:'https://coolcode.ca','Content-Type':'application/json'},
      body:JSON.stringify({tool:tool.id,type:'pageview'})}), {DB});
    assert.equal(response.status, 204, tool.id);
  }
  assert.equal(writes, tools.length);
});

test('unknown IDs and foreign origins remain rejected without writes', async () => {
  for (const [origin,tool,status] of [['https://coolcode.ca','unregistered',400], ['https://example.com','translink',403]]) {
    const response = await worker.fetch(new Request('https://worker.example/event', {
      method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({tool,type:'pageview'})}), {});
    assert.equal(response.status,status);
  }
});

test('invalid UTF-8 is a bad request on Workers as well as Node, while BOM JSON stays accepted', async () => {
  const statement={bind(){return this;},async first(field){return field==='secret'?'test-salt':{hits:1};},async run(){}};
  const DB={prepare(){return statement;}};
  const send=bytes=>worker.fetch(new Request('https://worker.example/event',{
    method:'POST',headers:{Origin:'https://coolcode.ca','Content-Type':'application/json'},body:bytes}),{DB});
  const malformed=await send(new Uint8Array([0x7b,0xff,0x7d]));
  assert.equal(malformed.status,400);
  assert.equal((await malformed.json()).error,'Invalid JSON request.');
  const valid=new TextEncoder().encode('\ufeff'+JSON.stringify({tool:tools[0].id,type:'pageview'}));
  assert.equal((await send(valid)).status,204);
});
