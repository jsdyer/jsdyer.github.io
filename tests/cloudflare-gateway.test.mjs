import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const source=await readFile(new URL('../services/cloudflare-visitor/worker.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://coolcode.ca';
function environment(){
  const sql=new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE salts(day TEXT PRIMARY KEY,secret TEXT); CREATE TABLE limits(bucket INTEGER,kind TEXT,client TEXT,hits INTEGER,expiry INTEGER,PRIMARY KEY(bucket,kind,client));');
  const DB={prepare(query){return {args:[],bind(...args){this.args=args;return this;},async first(field){const row=sql.prepare(query).get(...this.args);return field?row?.[field]:row||null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){return sql.prepare(query).run(...this.args);}};},async batch(statements){sql.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.all());sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  return {DB,sql,PODCASTINDEX_API_KEY:'fake-public-test-key',PODCASTINDEX_API_SECRET:'fake-private-test-secret',YOUTUBE_API_KEY:'fake-youtube-secret',FDC_API_KEY:'fake-food-secret'};
}
const request=(path,headers={})=>new Request('https://worker.example'+path,{headers:{Origin:origin,...headers}});
const run=(path,env)=>worker.fetch(request(path),env);
function stub(t,fn){const original=globalThis.fetch;globalThis.fetch=fn;t.after(()=>{globalThis.fetch=original;});}

test('status exposes configuration booleans without database access or key values',async()=>{
  const r=await run('/api/status',{FDC_API_KEY:'never-show-this'}), body=await r.text();
  assert.equal(r.status,200);assert.equal(JSON.parse(body).configured.recipemath,true);assert.equal(body.includes('never-show-this'),false);
});

test('new credential status reports presence only and keyless adapters remain enabled',async()=>{
  const env={CANADAPOST_CLIENT_ID:'private-id',CANADAPOST_CLIENT_SECRET:'private-secret',ISED_CORPORATIONS_API_KEY:'private-ised'};
  const r=await run('/api/status',env), raw=await r.text(), status=JSON.parse(raw).configured;
  for(const name of ['parcelbench','corporateghosts','halifaxnext','inspectiontrail'])assert.equal(status[name],true,name);
  for(const secret of Object.values(env))assert.equal(raw.includes(secret),false);
  assert.equal((await(await run('/api/status',{CANADAPOST_CLIENT_ID:'only-one'})).json()).configured.parcelbench,false);
});

test('federal detail dispatch is authenticated server-side and caches each corporation separately',async t=>{
  const env={...environment(),ISED_CORPORATIONS_API_KEY:'private-federal-key'};let calls=0;
  stub(t,async(target,options)=>{calls++;const u=new URL(target),id=u.pathname.split('/').at(-1);
    assert.equal(u.hostname,'apigateway-passerelledapi.ised-isde.canada.ca');assert.equal(options.headers.user_key,env.ISED_CORPORATIONS_API_KEY);
    return Response.json({corporationNumber:Number(id),corporateName:{legalName:'Corporation '+id},status:'active'});});
  assert.equal((await(await run('/api/corporateghosts/corporation?id=123',env)).json()).data.id,'123');
  assert.equal((await run('/api/corporateghosts/corporation?id=123',env)).status,200);assert.equal(calls,1);
  env.sql.prepare("DELETE FROM gateway_budget WHERE id='ised-corporations-lease'").run();
  assert.equal((await(await run('/api/corporateghosts/corporation?id=456',env)).json()).data.id,'456');assert.equal(calls,2);
  assert.equal(JSON.stringify(env.sql.prepare('SELECT * FROM gateway_cache').all()).includes(env.ISED_CORPORATIONS_API_KEY),false);
});

test('parcel rates pass through the complete handler without persisting quotes or postal inputs',async t=>{
  const env={...environment(),CANADAPOST_CLIENT_ID:'parcel-key',CANADAPOST_CLIENT_SECRET:'parcel-secret'};let quotes=0;
  stub(t,async(target,options)=>{
    if(String(target).endsWith('/token'))return Response.json({token_type:'Bearer',access_token:'test-bearer',expires_in:3600});
    quotes++;assert.equal(options.headers.Authorization,'Bearer test-bearer');assert.equal(JSON.parse(options.body).quoteType,'counter');
    return Response.json([{serviceCode:'DOM.RP',serviceName:'Regular Parcel',priceDetails:{due:12+quotes,base:12}}]);});
  const path='/api/parcelbench/rates?origin=B3J1S9&destination=K1A0B1&weight=1&length=30&width=20&height=10&mailingDate='+new Date().toISOString().slice(0,10);
  const first=await run(path,env);assert.equal(first.status,200);assert.match(first.headers.get('Cache-Control'),/no-store/);assert.equal((await first.json()).data.quotes[0].total,13);
  env.sql.prepare("DELETE FROM gateway_budget WHERE id='canadapost-lease'").run();
  assert.equal((await(await run(path,env)).json()).data.quotes[0].total,14);assert.equal(quotes,2);
  assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM gateway_cache').get().n,0);
  const stored=JSON.stringify(env.sql.prepare('SELECT * FROM gateway_budget').all());
  for(const value of ['B3J1S9','K1A0B1','parcel-secret','test-bearer'])assert.equal(stored.includes(value),false);
});

test('invalid upstream UTF-8 is rejected and a leading BOM is decoded consistently',async t=>{
  const env=environment();let calls=0;
  stub(t,async()=>new Response(calls++===0?new Uint8Array([0xff]):'\ufeff{"foods":[]}'));
  const bad=await run('/api/recipemath/search?q=invalid',env);
  assert.equal(bad.status,502);assert.equal((await bad.json()).error.code,'source_encoding');
  const good=await run('/api/recipemath/search?q=valid',env);assert.deepEqual((await good.json()).data,{foods:[]});
});

test('missing runtime secrets, foreign origins and unsupported methods fail before upstream access',async t=>{
  stub(t,()=>{throw new Error('must not fetch');});
  assert.equal((await run('/api/podcastroute/search?q=space',{})).status,503);
  assert.equal((await worker.fetch(request('/api/status',{Origin:'https://elsewhere.example'}),{})).status,403);
  assert.equal((await worker.fetch(new Request('https://worker.example/api/status',{method:'POST'}),{})).status,405);
});

test('strict route and parameter validation reject disguised endpoints and duplicate keys',async t=>{
  const env=environment();stub(t,()=>{throw new Error('must not fetch');});
  for(const path of ['/api/podcastroute/anything/search?q=test','/api/recipemath/search?q=test&q=other','/api/channelqueue/videos?ids=not-valid','/api/distropilot/project?name=../admin']) assert.ok([400,404].includes((await run(path,env)).status),path);
});

test('Podcast Index signatures are correct and credentials are not cached or returned',async t=>{
  const env=environment();let calls=0;
  stub(t,async(url,options)=>{calls++;const u=new URL(url);assert.equal(u.hostname,'api.podcastindex.org');assert.equal(u.searchParams.get('q'),'astronomy');assert.equal(options.redirect,'manual');
    const h=options.headers;assert.equal(h.Authorization,createHash('sha1').update(env.PODCASTINDEX_API_KEY+env.PODCASTINDEX_API_SECRET+h['X-Auth-Date']).digest('hex'));
    return Response.json({status:'true',feeds:[{id:7,title:'Astronomy'}]});});
  const first=await(await run('/api/podcastroute/search?q=astronomy',env)).json();
  const second=await(await run('/api/podcastroute/search?q=astronomy',env)).json();
  assert.deepEqual(first,second);assert.equal(calls,1);assert.ok(first.fetched_at);
  const cache=JSON.stringify(env.sql.prepare('SELECT * FROM gateway_cache').all());
  for(const secret of [env.PODCASTINDEX_API_KEY,env.PODCASTINDEX_API_SECRET])assert.equal(cache.includes(secret),false);
});

test('YouTube lookup preserves status and has a bounded explicit channel-search route',async t=>{
  const env=environment();let calls=0;
  stub(t,async url=>{calls++;const u=new URL(url);assert.equal(u.searchParams.get('key'),env.YOUTUBE_API_KEY);if(u.pathname.endsWith('/videos'))assert.equal(u.searchParams.get('part'),'snippet,contentDetails,status');else{assert.equal(u.searchParams.get('type'),'channel');assert.equal(u.searchParams.get('maxResults'),'10');}return Response.json({items:[{status:{madeForKids:true,embeddable:false}}]});});
  const r=await(await run('/api/channelqueue/videos?ids=abcdefghijk',env)).json();assert.equal(r.data.items[0].status.madeForKids,true);
  assert.equal((await run('/api/channelqueue/search?q=astronomy',env)).status,200);assert.equal(calls,2);
});

test('USDA pagination is bounded and source error bodies never expose credentials',async t=>{
  const env=environment();stub(t,async url=>{const u=new URL(url);assert.equal(u.searchParams.get('api_key'),env.FDC_API_KEY);assert.equal(u.searchParams.get('pageSize'),'20');return new Response('bad key '+env.FDC_API_KEY,{status:403});});
  const r=await run('/api/recipemath/search?q=oats&page=2',env);assert.equal(r.status,502);assert.equal((await r.text()).includes(env.FDC_API_KEY),false);
  assert.equal((await run('/api/recipemath/search?q=oats&page=999',env)).status,400);
});

test('credential-bearing upstream redirects are never followed',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://evil.example/collect'}});});
  assert.equal((await run('/api/recipemath/food?id=123',env)).status,502);assert.equal(calls,1);
});

test('Repology strips unneeded fields and deduplicates records, retaining capture time',async t=>{
  const env=environment();stub(t,async()=>Response.json([{repo:'debian_13',version:'1.0',maintainers:['private@example.org']},{repo:'debian_13',version:'1.0'}]));
  const r=await(await run('/api/distropilot/project?name=sqlite',env)).json();assert.deepEqual(r.data,[{repo:'debian_13',version:'1.0'}]);assert.ok(r.fetched_at);
});

test('Repology uses an atomic sliding lease across requests, not a local counter',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return Response.json([{repo:'debian_13',version:'1'}]);});
  assert.equal((await run('/api/distropilot/project?name=one',env)).status,200);
  const r=await run('/api/distropilot/project?name=two',env);assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'2');assert.equal(calls,1);
  assert.equal(env.sql.prepare("SELECT hits FROM gateway_budget WHERE id LIKE 'repology:%'").get().hits,1,'locally rejected pacing must not consume a source call');
});

test('large normalized package evidence is cached and malformed package rows are rejected',async t=>{
  const env=environment();let calls=0;
  stub(t,async()=>{calls++;return Response.json(Array.from({length:320},(_,i)=>({repo:'distro'+i,version:'1',summary:'x'.repeat(1900)})));});
  assert.equal((await run('/api/distropilot/project?name=php',env)).status,200);
  assert.equal((await run('/api/distropilot/project?name=php',env)).status,200);assert.equal(calls,1);
  assert.ok(env.sql.prepare('SELECT length(payload) n FROM gateway_cache').get().n>500000);
  env.sql.prepare("DELETE FROM gateway_budget WHERE id='repology-lease'").run();
  globalThis.fetch=async()=>Response.json([{repo:'debian',version:null}]);
  assert.equal((await run('/api/distropilot/project?name=bad',env)).status,502);
});

test('global source budgets reject before any additional paid/quota request',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return Response.json({items:[]});});
  await run('/api/channelqueue/search?q=first',env);
  env.sql.prepare('UPDATE gateway_budget SET hits=50 WHERE id LIKE ?').run('youtube-search:%');
  const r=await run('/api/channelqueue/search?q=second',env);assert.equal(r.status,429);assert.ok(Number(r.headers.get('Retry-After'))>0);assert.equal(calls,1);
  assert.equal((await run('/api/channelqueue/search?q=first',env)).status,200);assert.equal(calls,1,'cached reads remain usable after quota reached');
});

test('only Repology gets a longer timeout; aborted sources have a distinct safe error',async t=>{
  const env=environment(), original=AbortSignal.timeout, times=[];
  AbortSignal.timeout=ms=>{times.push(ms);return AbortSignal.abort();};t.after(()=>{AbortSignal.timeout=original;});
  stub(t,async()=>{throw new Error('private URL and credential must not escape');});
  const r=await run('/api/distropilot/project?name=slow',env);assert.equal(r.status,504);assert.equal((await r.json()).error.code,'source_timeout');
  assert.equal((await run('/api/recipemath/food?id=123',env)).status,504);
  assert.deepEqual(times,[35000,12000]);
});

test('public RSS URL validation rejects local addresses, credentials and secret-bearing URLs',async t=>{
  const env=environment();stub(t,()=>{throw new Error('must not fetch');});
  for(const url of ['https://127.0.0.1/feed','https://[::1]/feed','https://user:pass@news.example.org/feed','https://localhost/feed','https://news.example.org:8443/feed','http://news.example.org/feed','https://news.example.org/feed?token=secret','https://abc.workers.dev/feed'])assert.equal((await run('/api/feedharbour/feed?url='+encodeURIComponent(url),env)).status,400,url);
});

test('feeds validate every redirect and forward no cookies or caller authorization',async t=>{
  const env=environment();let calls=0;stub(t,async(url,options)=>{calls++;assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Authorization,undefined);return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/private'}});});
  const r=await worker.fetch(request('/api/feedharbour/feed?url=https%3A%2F%2Fnews.example.org%2Frss',{Cookie:'secret',Authorization:'Bearer secret'}),env);assert.equal(r.status,400);assert.equal(calls,1);
});

test('feeds return text in JSON, reject DTDs and HTML, and never execute markup',async t=>{
  const env=environment();const sources=['<!DOCTYPE rss SYSTEM "https://evil.example/xxe"><rss/>','<html>blocked</html>','<?xml version="1.0"?><rss version="2.0"><channel><title>News</title></channel></rss>'];
  stub(t,async()=>new Response(sources.shift()));
  assert.equal((await run('/api/feedharbour/feed?url=https%3A%2F%2Fnews.example.org%2Fone',env)).status,502);
  assert.equal((await run('/api/feedharbour/feed?url=https%3A%2F%2Fnews.example.org%2Ftwo',env)).status,502);
  const r=await run('/api/feedharbour/feed?url=https%3A%2F%2Fnews.example.org%2Fthree',env);assert.equal(r.status,200);assert.match(r.headers.get('Content-Type'),/application\/json/);assert.match((await r.json()).data.xml,/<rss/);
});

test('chunked oversize responses are cancelled and never cached',async t=>{
  const env=environment();let cancelled=false;
  stub(t,async()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(1_100_000));},cancel(){cancelled=true;}})));
  const r=await run('/api/recipemath/food?id=123',env);assert.equal(r.status,502);assert.equal(cancelled,true);assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM gateway_cache').get().n,0);
});

test('cache is capped and expired records are evicted without touching visitor tables',async t=>{
  const env=environment();stub(t,async()=>Response.json({items:[]}));await run('/api/channelqueue/search?q=first',env);
  const insert=env.sql.prepare('INSERT INTO gateway_cache VALUES(?,?,?,?)');for(let i=0;i<260;i++)insert.run('record'+i,'{}',Date.now()+60000,i);
  await run('/api/channelqueue/search?q=second',env);assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM gateway_cache').get().n,256);assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM salts').get().n,1);
});
