import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../report/report.mjs', import.meta.url), 'utf8');
const publicTools = [{id:'nightfinder', title:'Nightfinder'}];
const prototypes = [
  {id:'townheritage', title:'Town Heritage (unlisted prototype)', source:'https://github.com/jsdyer/townheritage'},
  {id:'another-prototype', title:'Another prototype', source:'https://github.com/jsdyer/another-prototype'},
];

function page(query='', {measured=prototypes, measuredOK=true, catalogueOK=true, pending}={}) {
  const nodes = new Map(), requests = [];
  function element() {
    return {options:[], value:'', hidden:true, disabled:false, textContent:'', handlers:{},
      add(option) { this.options.push(option); if (!this.value) this.value=option.value; },
      replaceChildren(...options) { this.options=options; this.value=options[0]?.value || ''; },
      get selectedOptions() { return this.options.filter(option=>option.value===this.value); },
      addEventListener(name, callback) { this.handlers[name]=callback; },
      focus() {}, setCustomValidity() {}, reportValidity() { return true; }};
  }
  const document = {getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  }};
  runInNewContext(source, {document, location:new URL('https://coolcode.ca/report/'+query),
    URL, URLSearchParams, AbortSignal, Option:function(text,value) { this.text=text; this.value=value; },
    async fetch(url) {
      requests.push(url);
      if (url.includes('measurement-tools')) {
        if (pending) await pending;
        return {ok:measuredOK, json:async()=>measured};
      }
      return {ok:catalogueOK, json:async()=>publicTools};
    }});
  return {nodes, requests, settled:()=>new Promise(resolve=>setImmediate(resolve))};
}

test('retains the requested registered prototype without listing other prototypes', async()=>{
  const p=page('?tool=townheritage');
  await p.settled();
  const tool=p.nodes.get('tool');
  assert.equal(tool.value,'townheritage');
  assert.equal(tool.selectedOptions[0].text,'Town Heritage (unlisted prototype)');
  assert.equal(tool.options.some(option=>option.value==='another-prototype'),false);
  assert.equal(tool.disabled,false);
  assert.match(new URL(p.nodes.get('github').href).searchParams.get('body'),/^Tool: Town Heritage/);
});

test('ordinary reporting does not discover unlisted tools', async()=>{
  for (const query of ['', '?tool=nightfinder']) {
    const p=page(query); await p.settled();
    assert.equal(p.requests.some(url=>url.includes('measurement-tools')),false);
    assert.equal(p.nodes.get('tool').options.some(option=>option.value==='townheritage'),false);
    assert.equal(p.nodes.get('tool').value,query?'nightfinder':'site');
  }
});

test('unknown or unverifiable requested identities are not selectable', async()=>{
  for (const options of [
    {measuredOK:false}, {measured:[]},
    {measured:[{...prototypes[0],source:'https://example.com/'}]},
  ]) {
    const p=page('?tool=townheritage',options); await p.settled();
    assert.equal(p.nodes.get('tool').value,'site');
    assert.equal(p.nodes.get('tool').options.some(option=>option.value==='townheritage'),false);
    assert.equal(p.nodes.get('catalogue-note').hidden,false);
    assert.match(p.nodes.get('catalogue-note').textContent,/could not be verified/);
  }
});

test('the form cannot submit the default website identity while verification is pending', async()=>{
  let release;
  const pending=new Promise(resolve=>{ release=resolve; });
  const p=page('?tool=townheritage',{pending}); await p.settled();
  assert.equal(p.nodes.get('send-report').disabled,true);
  assert.equal(p.nodes.get('tool').disabled,true);
  release(); await p.settled();
  assert.equal(p.nodes.get('send-report').disabled,false);
  assert.equal(p.nodes.get('tool').value,'townheritage');
});

test('a catalogue failure keeps the public fallback usable without inventing an identity', async()=>{
  const p=page('?tool=unknown',{catalogueOK:false}); await p.settled();
  assert.equal(p.nodes.get('tool').value,'site');
  assert.equal(p.nodes.get('tool').options.length,1);
  assert.equal(p.nodes.get('send-report').disabled,false);
  assert.match(p.nodes.get('catalogue-note').textContent,/could not load/);
});
