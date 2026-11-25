import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const code=await readFile(new URL('../services/cloudflare-visitor/worker.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const origin='https://coolcode.ca';
function environment(){
  const sql=new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE salts(day TEXT PRIMARY KEY,secret TEXT); CREATE TABLE limits(bucket INTEGER,kind TEXT,client TEXT,hits INTEGER,expiry INTEGER,PRIMARY KEY(bucket,kind,client));');
  const DB={prepare(query){return {args:[],bind(...args){this.args=args;return this;},async first(field){const row=sql.prepare(query).get(...this.args);return field?row?.[field]:row||null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){return sql.prepare(query).run(...this.args);}};},async batch(statements){sql.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.all());sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  return {DB,sql,WOLFRAM_APP_ID:'private-wolfram-sentinel',TMDB_READ_ACCESS_TOKEN:'private-tmdb-sentinel'};
}
const get=(path,env,headers={})=>worker.fetch(new Request('https://worker.invalid'+path,{headers:{Origin:origin,...headers}}),env);
const post=(query,env,extra={})=>worker.fetch(new Request('https://worker.invalid/api/measurebench/answer',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify({query})}),env);
function stub(t,fn){const old=globalThis.fetch;globalThis.fetch=fn;t.after(()=>globalThis.fetch=old);}

test('registry preserves all previous tools and adds the four accepted IDs',async()=>{
  const body=await(await get('/registry',{})).json();
  assert.equal(new Set(body.tool_ids).size,body.tool_ids.length);
  for(const id of ['civicrevision','openseed','noticeguide','measurebench','screenplaces','planehere','halifaxnext','canadapulse'])assert.ok(body.tool_ids.includes(id));
});

test('shared public RSS paths are allowed without opening recursive or arbitrary CoolCode requests',async t=>{
  const env=environment();let calls=0;stub(t,async target=>{calls++;assert.match(String(target),/^https:\/\/coolcode.ca\/(civicrevision|releasereceipt)\//);return new Response('<rss version="2.0"><channel><title>Public feed</title></channel></rss>');});
  for(const path of ['/civicrevision/data/feeds/all.xml','/civicrevision/data/feeds/rights-policy.xml','/releasereceipt/feed.xml','/releasereceipt/feeds/v41690973.xml'])assert.equal((await get('/api/feedharbour/feed?url='+encodeURIComponent('https://coolcode.ca'+path),env)).status,200);
  for(const path of ['/api/feedharbour/feed','/admin/','/civicrevision/data/feeds/other.xml','/releasereceipt/feed.xml?secret=x','/releasereceipt/feeds/v0.xml'])assert.equal((await get('/api/feedharbour/feed?url='+encodeURIComponent('https://coolcode.ca'+path),env)).status,400);
  assert.equal(calls,4);
});

test('status never exposes credentials and retains earlier adapters',async()=>{
  const env=environment(),raw=await(await get('/api/status',env)).text(),body=JSON.parse(raw);
  for(const key of ['screenradar','measurebench','domain_biography','screenplaces','planehere'])assert.equal(body.configured[key],true);
  assert.equal(raw.includes(env.WOLFRAM_APP_ID),false);assert.equal(raw.includes(env.TMDB_READ_ACCESS_TOKEN),false);
});

test('optional calculation uses POST with explicit same-origin intent',async t=>{
  stub(t,()=>{throw Error('must not fetch');});
  assert.equal((await get('/api/measurebench/answer',{})).status,405);
  assert.equal((await post('2+2',{}, {Origin:'https://elsewhere.invalid'})).status,403);
  assert.equal((await worker.fetch(new Request('https://worker.invalid/api/measurebench/answer',{method:'POST',body:'{}'}),{})).status,403);
  const preflight=await worker.fetch(new Request('https://worker.invalid/api/measurebench/answer',{method:'OPTIONS',headers:{Origin:origin}}),{});
  assert.equal(preflight.status,204);assert.match(preflight.headers.get('Access-Control-Allow-Methods'),/POST/);
});

test('Wolfram cache avoids quota calls, stores no query or AppID, uses fixed upstream',async t=>{
  const env=environment();let calls=0;
  stub(t,async(target,options)=>{calls++;const u=new URL(target);assert.equal(u.origin,'https://api.wolframalpha.com');assert.equal(u.pathname,'/v1/result');assert.equal(u.searchParams.get('appid'),env.WOLFRAM_APP_ID);assert.equal(u.searchParams.get('i'),'convert twelve unusual units');assert.equal(options.redirect,'manual');return new Response('42 metres');});
  const first=await(await post('convert twelve unusual units',env)).json();assert.equal(first.answer,'42 metres');assert.equal(first.cached,false);
  const second=await(await post(' convert   twelve unusual units ',env)).json();assert.equal(second.cached,true);assert.equal(calls,1);
  const stored=JSON.stringify(env.sql.prepare('SELECT * FROM discovery_cache').all());assert.equal(stored.includes('convert twelve'),false);assert.equal(stored.includes(env.WOLFRAM_APP_ID),false);
});

test('both quotas are atomic and daily rejection cannot consume monthly slots',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return new Response('4');});
  await post('2+2',env);env.sql.prepare('UPDATE measure_budget SET day_hits=50,hits=73').run();
  assert.equal((await post('3+3',env)).status,429);assert.equal(env.sql.prepare('SELECT hits FROM measure_budget').get().hits,73);assert.equal(calls,1);
  assert.equal((await post('2+2',env)).status,200,'cached answers continue at quota');
  env.sql.prepare('UPDATE measure_budget SET day_hits=0,hits=1000').run();const monthly=await post('4+4',env);assert.equal(monthly.status,429);assert.equal(calls,1);
  const now=new Date(),expected=(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)-Date.now())/1000;assert.ok(Math.abs(Number(monthly.headers.get('Retry-After'))-expected)<3);
});

test('new UTC day resets daily allowance but retains month total',async t=>{
  const env=environment();stub(t,async()=>new Response('4'));
  await post('one',env);env.sql.prepare("UPDATE measure_budget SET day='old',day_hits=50,hits=90").run();
  assert.equal((await post('two',env)).status,200);const row=env.sql.prepare('SELECT hits,day_hits FROM measure_budget').get();assert.equal(row.hits,91);assert.equal(row.day_hits,1);
});

test('invalid local inputs, missing key, broken DB and provider errors fail safely',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return new Response('bad '+env.WOLFRAM_APP_ID,{status:403});});
  for(const value of ['', 'x'.repeat(301), null, 123])assert.equal((await post(value,env)).status,400);
  assert.equal((await post('x',env,{'Content-Type':'text/plain'})).status,415);
  assert.equal((await post('x',{...env,WOLFRAM_APP_ID:''})).status,503);
  assert.equal((await post('x',{WOLFRAM_APP_ID:'configured'})).status,503);
  const bad=await post('upstream error',env);assert.equal(bad.status,502);assert.equal((await bad.text()).includes(env.WOLFRAM_APP_ID),false);assert.equal(calls,1);
  assert.equal(env.sql.prepare('SELECT hits FROM measure_budget').get().hits,1,'failed upstream consumes one allowance');
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM discovery_cache').get().n,0);
});

test('credential redirects and oversized answers never cache or leak',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://evil.invalid'}});});
  assert.equal((await post('redirect',env)).status,502);assert.equal(calls,1);
  globalThis.fetch=async()=>new Response('x'.repeat(17000));assert.equal((await post('oversized',env)).status,502);
  globalThis.fetch=async()=>new Response('Invalid appid '+env.WOLFRAM_APP_ID);assert.equal((await post('rejected',env)).status,502);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM discovery_cache').get().n,0);
});

test('actor lookup uses exact Wikidata match and returns bounded credits with safe URLs',async t=>{
  const env=environment();let calls=0;
  stub(t,async(target,options)=>{calls++;const u=new URL(target);assert.equal(u.hostname,'api.themoviedb.org');assert.equal(options.headers.Authorization,'Bearer '+env.TMDB_READ_ACCESS_TOKEN);
    return Response.json(u.pathname.startsWith('/3/find/')?{person_results:[{id:42,name:'Test Actor',profile_path:'/test.jpg'}]}:{cast:[{id:1,media_type:'movie',title:'A film',character:'A role',poster_path:'/poster.jpg',vote_count:20},{id:1,media_type:'movie',title:'Duplicate'},{id:2,media_type:'tv',name:'A show',poster_path:'https://evil.invalid/x'},{id:3,media_type:'movie',adult:true,title:'Excluded'}]});});
  const data=(await(await get('/api/screenradar/person?wikidata=Q42',env)).json()).data;
  assert.equal(data.person.wikidata,'Q42');assert.equal(data.person.id,42);assert.equal(data.credits.length,2);assert.equal(data.credits[1].poster,null);assert.match(data.credits[0].url,/themoviedb.org\/movie\/1$/);
  await get('/api/screenradar/person?wikidata=Q42',env);assert.equal(calls,2);
});

test('ambiguous actor identity is never assigned to the first result',async t=>{
  const env=environment();stub(t,async()=>Response.json({person_results:[{id:1},{id:2}]}));
  assert.equal((await(await get('/api/screenradar/person?wikidata=Q42',env)).json()).data,null);
});

test('archive lookup is fixed-host, bounded and date-filtered without collapsing count rows',async t=>{
  const env=environment();let calls=0;
  stub(t,async target=>{calls++;const u=new URL(target);assert.equal(u.origin,'https://web.archive.org');assert.equal(u.searchParams.get('url'),'example.ca/');assert.equal(u.searchParams.get('limit'),'2501');assert.equal(u.searchParams.get('collapse'),null);assert.equal(u.searchParams.get('from'),'2000');assert.equal(u.searchParams.get('to'),'2001');return Response.json([['timestamp','original','statuscode','mimetype'],['20000102030405','http://example.ca/','200','text/html']]);});
  const path='/api/domain-biography/archive?domain=example.ca&from=2000&to=2001';const result=await(await get(path,env)).json();assert.equal(result.data.scope,'homepage');assert.equal(result.data.rows.length,2);assert.equal(result.data.truncated,false);
  await get(path,env);assert.equal(calls,1);
});

test('archive malformed, redirected, oversized and off-host source responses fail closed',async t=>{
  const env=environment();stub(t,async()=>Response.json({error:'timeout'}));
  assert.equal((await get('/api/domain-biography/archive?domain=example.ca',env)).status,502);
  globalThis.fetch=async()=>Response.json([['timestamp','original','statuscode','mimetype'],['20000102030405','http://evil.invalid/','200','text/html']]);
  assert.equal((await get('/api/domain-biography/archive?domain=example.ca',env)).status,502);
  globalThis.fetch=async()=>new Response('x'.repeat(1000001));assert.equal((await get('/api/domain-biography/archive?domain=example.ca',env)).status,502);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM discovery_cache').get().n,0);
});

test('archive pagination sentinel marks lower bounds without returning extra rows',async t=>{
  const env=environment();stub(t,async()=>Response.json([['timestamp','original','statuscode','mimetype'],...Array.from({length:2501},()=>['20000102030405','https://example.ca/','200','text/html'])]));
  const result=await(await get('/api/domain-biography/archive?domain=example.ca',env)).json();assert.equal(result.data.truncated,true);assert.equal(result.data.rows.length,2501);
});

test('about/contact candidates are distinct URLs, never arbitrary returned paths',async t=>{
  const env=environment();stub(t,async target=>{const u=new URL(target);assert.equal(u.searchParams.get('matchType'),'host');assert.equal(u.searchParams.get('collapse'),'urlkey');return Response.json([['timestamp','original','statuscode','mimetype'],['20000102030405','https://example.ca/contact-us.html','200','text/html'],['20000102030405','https://example.ca/private/','200','text/html']]);});
  const result=await(await get('/api/domain-biography/archive?domain=example.ca&mode=pages',env)).json();assert.equal(result.data.rows.length,2);assert.equal(result.data.scope,'pages');
});

test('invalid endpoint parameters cannot turn the archive route into an open proxy',async t=>{
  const env=environment();let calls=0;stub(t,()=>{calls++;throw Error('must not fetch');});
  for(const query of ['domain=127.0.0.1','domain=localhost','domain=https://example.ca','domain=a.local','domain=x.ca&url=https://evil.invalid','domain=x.ca&domain=y.ca','domain=x.ca&from=2020&to=1999','domain=x.ca&mode=anything'])assert.equal((await get('/api/domain-biography/archive?'+query,env)).status,400,query);
  for(const query of ['wikidata=Q0','wikidata=Q1&wikidata=Q2','wikidata=Q1&url=https://evil.invalid'])assert.equal((await get('/api/screenradar/person?'+query,env)).status,400,query);
  assert.equal(calls,0);
});

test('a delayed prior-day reservation cannot regress the daily counter',async t=>{
  const env=environment();let calls=0;stub(t,async()=>{calls++;return new Response('4');});
  await post('initialize allowance',env);
  const laterDay=String(Math.floor(Date.now()/86400000)+1);
  env.sql.prepare('UPDATE measure_budget SET day=?,day_hits=49,hits=90').run(laterDay);
  const delayed=await post('delayed old-day request',env);
  assert.equal(delayed.status,429);
  const row=env.sql.prepare('SELECT day,day_hits,hits FROM measure_budget').get();
  assert.deepEqual({...row},{day:laterDay,day_hits:49,hits:90});
  assert.equal(calls,1,'rejected old-day request never contacts Wolfram');
});

test('archive timestamps must be real calendar instants inside the requested years',async t=>{
  const env=environment();let stamp='20000230030405';
  stub(t,async()=>Response.json([['timestamp','original','statuscode','mimetype'],[stamp,'https://example.ca/','200','text/html']]));
  const path='/api/domain-biography/archive?domain=example.ca&from=2000&to=2001';
  assert.equal((await get(path,env)).status,502,'February 30 is not a valid capture');
  for(const invalid of ['20000101246000','19991231235959','20020101000000']){
    stamp=invalid;assert.equal((await get(path,env)).status,502,invalid);
  }
  stamp='20000229030405';assert.equal((await get(path,env)).status,200,'valid leap day is accepted');
});

test('actor credit payload cannot silently identify a different person',async t=>{
  const env=environment();stub(t,async target=>Response.json(new URL(target).pathname.startsWith('/3/find/')?{person_results:[{id:42,name:'Intended Actor'}]}:{id:43,cast:[]}));
  const response=await get('/api/screenradar/person?wikidata=Q42',env);
  assert.equal(response.status,502);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM discovery_cache').get().n,0);
});
