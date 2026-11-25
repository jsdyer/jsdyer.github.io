// Bounded server adapters for the second discovery batch. No client-chosen upstreams.
// Existing DB binding and Secret values are reused; keys and request bodies are never logged.
const sbVersion = 'second-batch.v1';
const sbDay = 86400000;

async function sbHash(value) {
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return Array.from(new Uint8Array(hash), b=>b.toString(16).padStart(2,'0')).join('');
}

async function sbSchema(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS discovery_cache (id TEXT PRIMARY KEY,payload TEXT NOT NULL,expiry INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS discovery_budget (id TEXT PRIMARY KEY,hits INTEGER NOT NULL,expiry INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS measure_budget (month TEXT PRIMARY KEY,hits INTEGER NOT NULL,day TEXT NOT NULL,day_hits INTEGER NOT NULL,expiry INTEGER NOT NULL)'),
  ]);
}

async function sbBudget(db,id,now,expiry,maximum) {
  // One atomic conditional write. Simultaneous Worker instances cannot overspend.
  const row=await db.prepare('INSERT INTO discovery_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(id,expiry,maximum).first();
  if(!row) apiThrow(429,'quota_wait','This source has reached its shared allowance. Cached results and local calculations remain available.',Math.max(1,Math.ceil((expiry-now)/1000)));
}

async function sbCacheGet(db,id,now) {
  const value=await db.prepare('SELECT payload FROM discovery_cache WHERE id=? AND expiry>?').bind(id,now).first('payload');
  return value ? JSON.parse(value) : null;
}

async function sbCachePut(db,id,value,ttl,now) {
  const payload=JSON.stringify(value);
  if(encoder.encode(payload).byteLength>500000) return;
  await db.batch([
    db.prepare('DELETE FROM discovery_cache WHERE expiry<=?').bind(now),
    db.prepare('DELETE FROM discovery_budget WHERE expiry<=?').bind(now),
    db.prepare('DELETE FROM measure_budget WHERE expiry<=?').bind(now),
    db.prepare('INSERT INTO discovery_cache(id,payload,expiry) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,expiry=excluded.expiry').bind(id,payload,now+ttl),
    db.prepare('DELETE FROM discovery_cache WHERE id IN (SELECT id FROM discovery_cache ORDER BY expiry DESC,id DESC LIMIT -1 OFFSET 512)'),
  ]);
}

async function sbRead(target,headers,limit=1000000,timeout=12000) {
  const signal=AbortSignal.timeout(timeout);
  try {
    const response=await fetch(target,{headers,redirect:'manual',signal});
    if(!response.ok){await response.body?.cancel();apiThrow(response.status===429?429:502,'source_unavailable','The upstream source could not complete this request. Try again later.',response.status===429?60:undefined);}
    return await apiRead(response,limit);
  } catch(error) {
    if(error.api) throw error;
    if(signal.aborted) apiThrow(504,'source_timeout','The upstream source took too long to respond. Please retry later.');
    apiThrow(502,'source_network','The upstream source could not be reached. Please retry later.');
  }
}

async function sbJson(target,headers,limit=1000000) {
  const text=await sbRead(target,headers,limit);
  try{return JSON.parse(text);}catch{apiThrow(502,'invalid_source','The source returned invalid JSON.');}
}

function sbImage(path) {
  return typeof path==='string' && /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path) ? 'https://image.tmdb.org/t/p/w342'+path : null;
}

function sbPerson(person,payload,wikidata) {
  if(!person || !Number.isSafeInteger(person.id) || person.id<=0 || typeof person.name!=='string' || !Array.isArray(payload.cast)) apiThrow(502,'invalid_source','The actor source returned an unexpected result.');
  if(payload.id!==undefined && payload.id!==person.id) apiThrow(502,'invalid_source','The source credits belong to a different person.');
  const seen=new Set();
  const credits=payload.cast.filter(x=>x && x.adult!==true && ['movie','tv'].includes(x.media_type) && Number.isSafeInteger(x.id) && x.id>0)
    .sort((a,b)=>(Number(b.vote_count)||0)-(Number(a.vote_count)||0))
    .filter(x=>{const key=x.media_type+':'+x.id;if(seen.has(key))return false;seen.add(key);return true;})
    .slice(0,30).map(x=>({id:x.id,media_type:x.media_type,title:String(x.title||x.name||'').slice(0,300),release_date:/^\d{4}-\d{2}-\d{2}$/.test(x.release_date||x.first_air_date||'') ? (x.release_date||x.first_air_date) : null,character:String(x.character||'').slice(0,500),url:`https://www.themoviedb.org/${x.media_type}/${x.id}`,poster:sbImage(x.poster_path)}));
  return {person:{wikidata,id:person.id,name:person.name.slice(0,200),profile:sbImage(person.profile_path),url:`https://www.themoviedb.org/person/${person.id}`},credits,attribution:'This product uses the TMDB API but is not endorsed or certified by TMDB.'};
}

async function sbPersonHandle(request,env,url,db,now) {
  if(url.pathname!=='/api/screenradar/person') return apiFailure(404,'unknown_endpoint','Unknown actor endpoint.');
  const p=apiParams(url,['wikidata']), wikidata=p('wikidata',/^Q[1-9]\d{0,11}$/);
  if(!env.TMDB_READ_ACCESS_TOKEN) return apiFailure(503,'not_configured','Actor credits are awaiting the site API configuration.');
  const id=sbVersion+':person:'+wikidata, cached=await sbCacheGet(db,id,now);
  if(cached) return {body:cached};
  const day=Math.floor(now/sbDay);
  await sbBudget(db,'tmdb-people:'+day,now,(day+1)*sbDay,1000);
  const headers={Accept:'application/json',Authorization:'Bearer '+env.TMDB_READ_ACCESS_TOKEN,'User-Agent':apiUA};
  const found=await sbJson(`https://api.themoviedb.org/3/find/${wikidata}?external_source=wikidata_id&language=en-US`,headers,524288);
  if(!Array.isArray(found.person_results)) apiThrow(502,'invalid_source','The actor source returned an unexpected result.');
  // Ambiguous mappings are not silently assigned to the first person.
  if(found.person_results.length!==1) {
    const result={fetched_at:new Date(now).toISOString(),data:null};
    await sbCachePut(db,id,result,3600000,now); return {body:result};
  }
  const person=found.person_results[0];
  if(!Number.isSafeInteger(person.id)||person.id<=0) apiThrow(502,'invalid_source','The actor source returned an invalid identifier.');
  const credits=await sbJson(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?language=en-US`,headers);
  const captured=Date.now(), result={fetched_at:new Date(captured).toISOString(),data:sbPerson(person,credits,wikidata)};
  await sbCachePut(db,id,result,sbDay,captured); return {body:result};
}

function sbArchivePlan(url) {
  const p=apiParams(url,['domain','mode','from','to']);
  const domain=p('domain',/^[a-zA-Z0-9.-]{1,253}$/).toLowerCase();
  if(!domain.includes('.') || !/^[a-z]{2,63}$/.test(domain.split('.').at(-1)) || domain.split('.').some(x=>!x || x.length>63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x)) || /\.(?:localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(domain)) apiThrow(400,'invalid_parameter','Enter a public domain name without a URL, path or IP address.');
  const mode=p('mode',/^(homepage|pages)$/,'homepage'),limit=mode==='homepage'?2500:500;
  const target=new URL('https://web.archive.org/cdx/search/cdx');
  target.searchParams.set('url',domain+'/');
  target.searchParams.set('matchType',mode==='homepage'?'exact':'host');
  target.searchParams.set('output','json');target.searchParams.set('fl','timestamp,original,statuscode,mimetype');
  target.searchParams.append('filter','statuscode:200');target.searchParams.append('filter','mimetype:text/html');
  target.searchParams.set('limit',String(limit+1));
  if(mode==='pages') {
    target.searchParams.set('collapse','urlkey');
    target.searchParams.append('filter','original:.*[/:](about|contact)([-_/][^?]*)?(\\.(html?|php|aspx?))?/?(\\?.*)?$');
  }
  let from='',to='';
  if(url.searchParams.has('from')) {from=p('from',/^(?:19|20)\d{2}$/);target.searchParams.set('from',from);}
  if(url.searchParams.has('to')) {to=p('to',/^(?:19|20)\d{2}$/);target.searchParams.set('to',to);}
  if(from && to && from>to) apiThrow(400,'invalid_parameter','The start year must not be after the end year.');
  return {domain,mode,limit,target};
}

function sbArchiveRows(payload,plan,now) {
  if(!Array.isArray(payload)) apiThrow(502,'invalid_source','The archive returned an unexpected result.');
  const header=['timestamp','original','statuscode','mimetype'];
  if(payload.length && JSON.stringify(payload[0])!==JSON.stringify(header)) apiThrow(502,'invalid_source','The archive returned an unexpected column layout.');
  const all=payload.slice(1), rows=[];
  for(const row of all.slice(0,plan.limit)) {
    if(!Array.isArray(row)||row.length!==4||row.some(v=>typeof v!=='string')||!/^\d{14}$/.test(row[0])||row[2]!=='200'||row[3]!=='text/html'||row[1].length>2048) apiThrow(502,'invalid_source','The archive returned a malformed capture.');
    const stamp=row[0],iso=`${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)}T${stamp.slice(8,10)}:${stamp.slice(10,12)}:${stamp.slice(12,14)}Z`,date=new Date(iso);
    if(!Number.isFinite(date.getTime())||date.toISOString().replace(/[-:TZ.]/g,'').slice(0,14)!==stamp || (plan.target.searchParams.has('from') && stamp.slice(0,4)<plan.target.searchParams.get('from')) || (plan.target.searchParams.has('to') && stamp.slice(0,4)>plan.target.searchParams.get('to'))) apiThrow(502,'invalid_source','The archive returned a capture outside the requested date range or with an invalid date.');
    let original;try{original=new URL(row[1]);}catch{apiThrow(502,'invalid_source','The archive returned an invalid original URL.');}
    if(!['http:','https:'].includes(original.protocol)||original.username||original.password||original.port||original.hostname.replace(/^www\./,'')!==plan.domain.replace(/^www\./,'')) apiThrow(502,'invalid_source','The archive returned a capture outside the requested hostname.');
    if(plan.mode==='homepage' && (original.pathname!=='/'||original.search)) apiThrow(502,'invalid_source','The archive returned a non-homepage capture.');
    if(plan.mode==='pages' && !/(?:^|\/)(?:about|contact)(?:[-_/][^?]*)?(?:\.(?:html?|php|aspx?))?\/?$/i.test(original.pathname)) continue;
    rows.push(row);
  }
  return {rows:[header,...rows],truncated:all.length>plan.limit,checked_at:new Date(now).toISOString(),scope:plan.mode,limit:plan.limit,source_url:plan.target.href};
}

async function sbArchiveHandle(request,env,url,db,now) {
  if(url.pathname!=='/api/domain-biography/archive') return apiFailure(404,'unknown_endpoint','Unknown archive endpoint.');
  const plan=sbArchivePlan(url),id=sbVersion+':archive:'+await sbHash(plan.target.href),cached=await sbCacheGet(db,id,now);
  if(cached) return {body:cached};
  const day=Math.floor(now/sbDay);await sbBudget(db,'archive-cdx:'+day,now,(day+1)*sbDay,1000);
  const payload=await sbJson(plan.target.href,{Accept:'application/json','User-Agent':apiUA});
  const captured=Date.now(),result={fetched_at:new Date(captured).toISOString(),data:sbArchiveRows(payload,plan,captured)};
  await sbCachePut(db,id,result,6*3600000,captured);return {body:result};
}

async function sbMeasureHandle(request,env,url,db,now) {
  if(url.pathname!=='/api/measurebench/answer') return apiFailure(404,'unknown_endpoint','Unknown calculation endpoint.');
  apiParams(url,[]);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||'')) return apiFailure(415,'content_type','Send a JSON calculation request.');
  let value;try{value=await body(request,2048);}catch{return apiFailure(400,'invalid_request','Send one query of at most 300 characters.');}
  if(Object.keys(value).some(k=>k!=='query')||typeof value.query!=='string') return apiFailure(400,'invalid_request','Send one calculation query.');
  const query=value.query.trim().replace(/\s+/g,' ');
  if(!query||query.length>300||/[\x00-\x1f\x7f]/.test(query)) return apiFailure(400,'invalid_request','Use a query of 1–300 characters.');
  if(!env.WOLFRAM_APP_ID) return apiFailure(503,'not_configured','Optional Wolfram answers are awaiting the site API configuration. Local calculations are ready.');
  const id=sbVersion+':wolfram:'+await sbHash(query),cached=await sbCacheGet(db,id,now);
  if(cached) return {body:{...cached,cached:true}};
  const date=new Date(now),day=Math.floor(now/sbDay),month=date.toISOString().slice(0,7),monthEnd=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
  // Reserve both limits in one atomic write, including failed provider calls.
  // Rejected daily requests cannot consume the rest of the month's allowance.
  const usage=await db.prepare('INSERT INTO measure_budget(month,hits,day,day_hits,expiry) VALUES(?,1,?,1,?) ON CONFLICT(month) DO UPDATE SET hits=hits+1,day=excluded.day,day_hits=CASE WHEN day=excluded.day THEN day_hits+1 ELSE 1 END WHERE hits<1000 AND CAST(day AS INTEGER)<=CAST(excluded.day AS INTEGER) AND (day<>excluded.day OR day_hits<50) RETURNING hits').bind(month,String(day),monthEnd).first();
  if(!usage) apiThrow(429,'quota_wait','The shared Wolfram allowance is reached (50 requests per UTC day, 1,000 per calendar month). Cached answers and local calculations remain available.',Math.ceil(((day+1)*sbDay-now)/1000));
  const target=new URL('https://api.wolframalpha.com/v1/result');
  target.searchParams.set('i',query);target.searchParams.set('appid',env.WOLFRAM_APP_ID);target.searchParams.set('units','metric');target.searchParams.set('timeout','5');
  const answer=(await sbRead(target.href,{Accept:'text/plain','User-Agent':apiUA},16384,8000)).trim();
  if(!answer||answer.length>8000||/^(?:Error\b|Invalid appid|Appid missing|<html|<!DOCTYPE)/i.test(answer)||answer.includes(env.WOLFRAM_APP_ID)) apiThrow(502,'no_answer','Wolfram could not provide a short answer for this query.');
  const captured=Date.now(),result={answer,source:'Wolfram Alpha',cached:false,fetched_at:new Date(captured).toISOString()};
  await sbCachePut(db,id,result,7*sbDay,captured);return {body:result};
}

async function secondBatchApiHandle(request,env,ctx) {
  try {
    const url=new URL(request.url),origin=request.headers.get('Origin'),measure=url.pathname.startsWith('/api/measurebench/');
    if(origin && origin!==ORIGIN) return apiFailure(403,'origin_denied','Origin is not allowed.');
    if(request.method==='OPTIONS') return {status:204};
    if(request.method!==(measure?'POST':'GET')) return apiFailure(405,'method_denied',measure?'Use POST for optional calculation requests.':'Use GET for public data requests.');
    if(measure && origin!==ORIGIN) return apiFailure(403,'origin_denied','Optional calculation requests must come from CoolCode.');
    const db=env.DB,now=Date.now();if(!db) return apiFailure(503,'storage_unavailable','The shared request limiter is unavailable.');
    if(!await allowed(db,request,new Date(now),'discovery-api')) return apiFailure(429,'client_wait','Too many requests. Please retry later.',300);
    await sbSchema(db);
    if(measure) return await sbMeasureHandle(request,env,url,db,now);
    if(url.pathname.startsWith('/api/screenradar/')) return await sbPersonHandle(request,env,url,db,now);
    return await sbArchiveHandle(request,env,url,db,now);
  }catch(error){
    if(error.api) return apiFailure(error.status,error.code,error.message,error.retry);
    return apiFailure(503,'temporarily_unavailable','The source or shared request service is temporarily unavailable. Local tools remain available.');
  }
}
