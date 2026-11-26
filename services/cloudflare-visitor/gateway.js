// Public, read-only tool APIs. This file is inlined into the dashboard-pasteable Worker.
// Use global fetch only: do not attach private-network/VPC outbound bindings to it.
const apiVersion = 'coolcode.public-api.v1';
const apiUA = 'CoolCode/1.0 (+https://coolcode.ca/; public-tool-data)';
const apiFailure = (status, code, message, retry) => ({status, body:{error:{code,message}},
  ...(retry ? {headers:{'Retry-After':String(retry)}} : {})});
const apiThrow = (status, code, message, retry) => { throw Object.assign(new Error(message), {api:true,status,code,retry}); };

function apiPublicURL(value) {
  let u;
  try { u = new URL(value); } catch { apiThrow(400,'invalid_url','Enter a public HTTPS feed URL.'); }
  const host = u.hostname.toLowerCase();
  const coolcodeFeed=host==='coolcode.ca' && !u.search && /^\/(?:civicrevision\/data\/feeds\/(?:all|institutions|rights-policy|economy|regional)|releasereceipt\/(?:feed|feeds\/v[1-9]\d{0,14}))\.xml$/.test(u.pathname);
  if (value.length>2048 || u.protocol!=='https:' || u.username || u.password || u.port || u.hash ||
      /[\\\s]/.test(value) || !/^[a-z0-9.-]+\.[a-z]{2,63}$/.test(host) || host.endsWith('.') ||
      /(^|\.)(localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(host) ||
      (host==='coolcode.ca' && !coolcodeFeed) || host.endsWith('.workers.dev') ||
      [...u.searchParams.keys()].some(k=>/^(token|key|api[_-]?key|auth|password|secret|access_token)$/i.test(k))) {
    apiThrow(400,'invalid_url','Use a public HTTPS feed without credentials, tokens, custom ports or local addresses.');
  }
  return u;
}

function apiParams(url, names) {
  for (const [key] of url.searchParams) {
    if (!names.includes(key) || url.searchParams.getAll(key).length!==1) apiThrow(400,'invalid_parameter','Unsupported or repeated parameter.');
  }
  return (key, regex, fallback) => {
    const value = (url.searchParams.get(key) ?? fallback ?? '').trim();
    if (!regex.test(value)) apiThrow(400,'invalid_parameter','Check the '+key+' parameter.');
    return value;
  };
}

// Accept only the forms used by the two newspaper tools. The client supplies
// search fields; the upstream host, path, output projection and header are fixed.
function newspaperRoute(url, env) {
  const agent=env.LOC_USER_AGENT;
  if(typeof agent!=='string' || !/^[^\s@]+@[^\s@]+ [!-~]+$/.test(agent) || /[\r\n\u0000]/.test(agent) || agent.length>512)
    apiThrow(503,'not_configured','The newspaper search connection needs its Library of Congress configuration.');
  const constants={dl:'page',searchType:'advanced',fo:'json',at:'results,pagination'};
  const filters=['qs','ops','c','sp','st','start_date','end_date','location_state','location_city','partof_title','sb','fa'];
  const p=apiParams(url,[...Object.keys(constants),...filters]);
  for(const [key,value] of Object.entries(constants)){
    if(url.searchParams.get(key)!==value) apiThrow(400,'invalid_parameter','Use the newspaper page-search form.');
  }
  const target=new URL('https://www.loc.gov/collections/chronicling-america/');
  const query=p('qs',/^[^\u0000-\u001f\u007f]{0,300}$/u);
  const size=Number(p('c',/^(?:[1-9]\d?|100)$/));
  const page=Number(p('sp',/^[1-9]\d{0,5}$/));
  if((page-1)*size>=100000) apiThrow(400,'invalid_parameter','Narrow your dates or search before paging deeper.');
  target.searchParams.set('c',String(size));
  target.searchParams.set('sp',String(page));
  if(url.searchParams.has('st')) target.searchParams.set('st',p('st',/^gallery$/));
  target.searchParams.set('dl',constants.dl);
  target.searchParams.set('searchType',constants.searchType);
  target.searchParams.set('qs',query);
  target.searchParams.set('ops',p('ops',/^(?:AND|OR|PHRASE|~5|~10)$/));
  for(const key of ['start_date','end_date']){
    if(!url.searchParams.has(key)) continue;
    const value=p(key,/^\d{4}-\d{2}-\d{2}$/);
    const parsed=Date.parse(value);
    if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==value) apiThrow(400,'invalid_parameter','Enter a valid newspaper date.');
    target.searchParams.set(key,value);
  }
  if(target.searchParams.has('start_date')&&target.searchParams.has('end_date')&&target.searchParams.get('start_date')>target.searchParams.get('end_date')) apiThrow(400,'invalid_parameter','The start date must precede the end date.');
  for(const key of ['location_state','location_city','partof_title']) {
    if(url.searchParams.has(key)) target.searchParams.set(key,p(key,/^[^\u0000-\u001f\u007f]{1,200}$/u));
  }
  if(url.searchParams.has('fa')) target.searchParams.set('fa',p('fa',/^number_lccn:[a-zA-Z0-9-]{4,30}$/));
  if(!query && !['start_date','end_date','location_state','location_city','partof_title','fa'].some(k=>target.searchParams.has(k))) apiThrow(400,'invalid_parameter','Enter a topic, date, town or newspaper.');
  if(url.searchParams.has('sb')) target.searchParams.set('sb',p('sb',/^(?:date|date_desc)$/));
  target.searchParams.set('fo',constants.fo);
  target.searchParams.set('at',constants.at);
  // fo=json selects LOC's representation. Match the working curl request's
  // media negotiation and use an uncompressed body for this bounded JSON read.
  return {target,group:'loc-newspapers',ttl:3600,limit:4_000_000,timeout:80000,
    maximum:15,window:60000,headers:{Accept:'*/*','Accept-Encoding':'identity','User-Agent':agent}};
}

function newspaperResults(data,plan) {
  const page=Number(plan.target.searchParams.get('sp')), size=Number(plan.target.searchParams.get('c'));
  const pagination=data?.pagination;
  if(!Array.isArray(data?.results)||data.results.length>size||!pagination||
    !Number.isSafeInteger(pagination.of)||pagination.of<0||Number(pagination.current)!==page||Number(pagination.perpage)!==size)
    apiThrow(502,'invalid_source','The newspaper archive returned an unexpected results page.');
  const results=[];
  const scalar=['url','id','title','date','page_id'];
  const lists=['partof_title','location_city','location_state','number_lccn','number_page','language','contributor','image_url','description'];
  for(const row of data.results){
    if(!row||typeof row!=='object'||row.access_restricted===true||typeof row.title!=='string') continue;
    const output={};
    for(const key of scalar) if(typeof row[key]==='string') output[key]=row[key].slice(0,2048);
    for(const key of lists){
      if(Array.isArray(row[key])) output[key]=row[key].filter(v=>typeof v==='string').slice(0,12).map(v=>v.slice(0,2048));
    }
    results.push(output);
  }
  const result={results,pagination:{of:pagination.of,current:page,perpage:size,next:Boolean(pagination.next)}};
  // Inspect the final decoded values too, in case JSON escaping concealed an echo.
  const agent=plan.headers['User-Agent'];
  if(JSON.stringify(result).includes(agent.split(' ')[1])) apiThrow(502,'invalid_source','The newspaper archive returned an unexpected response.');
  return result;
}

function apiRoute(url, env) {
  if(url.pathname==='/api/newspapers/search') return newspaperRoute(url,env);
  const path=url.pathname, plan={ttl:900,limit:2_000_000,headers:{Accept:'application/json','User-Agent':apiUA}};
  let p, target;
  if (path.startsWith('/api/podcastroute/')) {
    if (!env.PODCASTINDEX_API_KEY || !env.PODCASTINDEX_API_SECRET) apiThrow(503,'not_configured','Podcast search is awaiting the site API configuration.');
    plan.group='podcast'; plan.maximum=1500; plan.window=86400000; plan.sign=true;
    target=new URL('https://api.podcastindex.org/api/1.0/');
    if (path==='/api/podcastroute/search') {p=apiParams(url,['q']); target.pathname+='search/byterm'; target.searchParams.set('q',p('q',/^.{2,120}$/u)); target.searchParams.set('max','40');}
    else if (path==='/api/podcastroute/episodes') {p=apiParams(url,['id']); target.pathname+='episodes/byfeedid'; target.searchParams.set('id',p('id',/^[1-9]\d{0,14}$/)); target.searchParams.set('max','100'); target.searchParams.set('fulltext','1');}
    else if (path==='/api/podcastroute/feed') {p=apiParams(url,['url']); target.pathname+='podcasts/byfeedurl'; target.searchParams.set('url',apiPublicURL(p('url',/^.{1,2048}$/)).href);}
    else apiThrow(404,'unknown_endpoint','Unknown podcast endpoint.');
  } else if (path.startsWith('/api/channelqueue/')) {
    if (!env.YOUTUBE_API_KEY) apiThrow(503,'not_configured','YouTube lookup is awaiting the site API configuration.');
    target=new URL('https://www.googleapis.com/youtube/v3/');
    plan.group='youtube'; plan.maximum=5000; plan.window=86400000; plan.ttl=3600;
    if (path==='/api/channelqueue/channel') {
      p=apiParams(url,['id','handle']); target.pathname+='channels';
      if (url.searchParams.has('id')===url.searchParams.has('handle')) apiThrow(400,'invalid_parameter','Choose a channel ID or handle.');
      if (url.searchParams.has('id')) target.searchParams.set('id',p('id',/^UC[\w-]{22}$/));
      else target.searchParams.set('forHandle',p('handle',/^@?[^\s/?&#]{3,100}$/u));
      target.searchParams.set('part','snippet,contentDetails');
    } else if (path==='/api/channelqueue/playlist') {
      p=apiParams(url,['id','pageToken']); target.pathname+='playlistItems';
      target.searchParams.set('playlistId',p('id',/^[\w-]{10,100}$/)); target.searchParams.set('part','snippet,contentDetails'); target.searchParams.set('maxResults','50');
      if (url.searchParams.has('pageToken')) target.searchParams.set('pageToken',p('pageToken',/^[\w=-]{1,300}$/));
    } else if (path==='/api/channelqueue/videos') {
      p=apiParams(url,['ids']); target.pathname+='videos'; const ids=p('ids',/^[\w,-]{11,599}$/).split(',');
      if (ids.length>50 || ids.some(id=>!/^[\w-]{11}$/.test(id))) apiThrow(400,'invalid_parameter','Supply up to 50 valid video IDs.');
      target.searchParams.set('id',[...new Set(ids)].sort().join(',')); target.searchParams.set('part','snippet,contentDetails,status');
    } else if (path==='/api/channelqueue/search') {
      p=apiParams(url,['q']); target.pathname+='search'; target.searchParams.set('q',p('q',/^.{2,120}$/u)); target.searchParams.set('part','snippet'); target.searchParams.set('type','channel'); target.searchParams.set('maxResults','10');
      plan.group='youtube-search'; plan.maximum=50;
    } else apiThrow(404,'unknown_endpoint','Unknown YouTube endpoint.');
    // Key is attached only after the cache identifier is computed.
    plan.keyName='key'; plan.secret=env.YOUTUBE_API_KEY;
  } else if (path.startsWith('/api/recipemath/')) {
    if (!env.FDC_API_KEY) apiThrow(503,'not_configured','USDA search is awaiting the site API configuration. Canadian foods remain available.');
    target=new URL('https://api.nal.usda.gov/fdc/v1/'); plan.group='fdc'; plan.maximum=500; plan.window=3600000; plan.ttl=86400;
    if (path==='/api/recipemath/search') {p=apiParams(url,['q','page']); target.pathname+='foods/search'; target.searchParams.set('query',p('q',/^.{2,120}$/u)); target.searchParams.set('pageNumber',p('page',/^(?:[1-9]|[1-9]\d|100)$/,'1')); target.searchParams.set('pageSize','20');}
    else if (path==='/api/recipemath/food') {p=apiParams(url,['id']); target.pathname+='food/'+p('id',/^[1-9]\d{0,11}$/);}
    else apiThrow(404,'unknown_endpoint','Unknown food endpoint.');
    plan.keyName='api_key'; plan.secret=env.FDC_API_KEY;
  } else if (path==='/api/distropilot/project') {
    p=apiParams(url,['name']); target=new URL('https://repology.org/api/v1/project/'+encodeURIComponent(p('name',/^[a-zA-Z0-9][a-zA-Z0-9+_.-]{0,99}$/)));
    plan.group='repology'; plan.maximum=600; plan.window=86400000; plan.ttl=21600; plan.limit=4_000_000; plan.timeout=35000;
  } else if (path==='/api/feedharbour/feed') {
    p=apiParams(url,['url']); target=apiPublicURL(p('url',/^.{1,2048}$/));
    plan.group='feeds'; plan.maximum=3000; plan.window=86400000; plan.feed=true;
    plan.headers.Accept='application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9';
  } else apiThrow(404,'unknown_endpoint','Unknown tool endpoint.');
  plan.target=target; return plan;
}

async function apiRead(response, limit) {
  if (Number(response.headers.get('Content-Length'))>limit) {await response.body?.cancel(); apiThrow(502,'source_too_large','The source response exceeds this tool’s size limit.');}
  if (!response.body) apiThrow(502,'empty_source','The source returned an empty response.');
  const reader=response.body.getReader(), chunks=[]; let length=0;
  try {
    while (true) {const {done,value}=await reader.read(); if(done) break; length+=value.length;
      if(length>limit) apiThrow(502,'source_too_large','The source response exceeds this tool’s size limit.'); chunks.push(value);}
  } catch(e) {await reader.cancel().catch(()=>{}); throw e;}
  const bytes=new Uint8Array(length); let at=0; for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes);}catch{apiThrow(502,'source_encoding','This source is not valid UTF-8.');}
}

async function apiSchema(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS gateway_cache (id TEXT PRIMARY KEY, payload TEXT NOT NULL, expiry INTEGER NOT NULL, touched INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS gateway_budget (id TEXT PRIMARY KEY, hits INTEGER NOT NULL, expiry INTEGER NOT NULL)'),
  ]);
}

async function apiBudget(db,id,now,width,maximum) {
  const bucket=Math.floor(now/width), expiry=(bucket+1)*width;
  const row=await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(id+':'+bucket,expiry,maximum).first();
  if(!row) apiThrow(429,'quota_wait','This source’s shared request allowance is resting. Try again after the indicated delay.',Math.ceil((expiry-now)/1000));
}

async function apiUpstream(plan,env) {
  const target=new URL(plan.target), headers={...plan.headers};
  if(plan.keyName) target.searchParams.set(plan.keyName,plan.secret);
  if(plan.sign){
    const stamp=String(Math.floor(Date.now()/1000));
    const digest=await crypto.subtle.digest('SHA-1',encoder.encode(env.PODCASTINDEX_API_KEY+env.PODCASTINDEX_API_SECRET+stamp));
    headers['X-Auth-Key']=env.PODCASTINDEX_API_KEY; headers['X-Auth-Date']=stamp;
    headers.Authorization=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  let current=target, response; const signal=AbortSignal.timeout(plan.timeout||12000);
  try {
  for(let redirect=0;redirect<4;redirect++){
    response=await fetch(current.href,{headers,redirect:'manual',signal});
    if(response.status>=300&&response.status<400){
      await response.body?.cancel();
      if(!plan.feed || redirect===3) apiThrow(502,'source_redirect','The source returned an unsupported redirect.');
      current=apiPublicURL(new URL(response.headers.get('Location')||'',current).href); continue;
    }
    break;
  }
  if(!response.ok){
    const status=response.status;
    await response.body?.cancel();
    if(plan.group==='loc-newspapers' && status>=400 && status!==429){
      // Never expose a source error page or its headers; it can echo the credential.
      console.warn(JSON.stringify({event:'newspaper-source-http',status}));
      apiThrow(status,'loc_http_'+status,'The Library of Congress returned HTTP '+status+' for this search.');
    }
    apiThrow(status===429?429:502,'source_unavailable','The upstream source could not complete this request.',status===429?60:undefined);
  }
  if(plan.group==='loc-newspapers'&&!/application\/(?:[a-z0-9.+-]+\+)?json\b/i.test(response.headers.get('Content-Type')||'')){
    await response.body?.cancel(); apiThrow(502,'invalid_source','The newspaper archive returned a web page instead of JSON.');
  }
  const raw=await apiRead(response,plan.limit);
  if(plan.feed){
    if(/<!DOCTYPE|<!ENTITY/i.test(raw) || !/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<(?:rss\b|feed\b|rdf:RDF\b)/i.test(raw)) apiThrow(502,'invalid_feed','The URL did not return a supported RSS or Atom feed.');
    return {url:current.href,xml:raw};
  }
  let data; try{data=JSON.parse(raw);}catch{apiThrow(502,'invalid_source','The source returned invalid JSON.');}
  if(plan.group==='loc-newspapers') return newspaperResults(data,plan);
  if(plan.group==='podcast' && (data.status==='false'||data.status===false)) apiThrow(502,'source_unavailable','Podcast Index could not complete this lookup.');
  if(plan.group==='repology'){
    if(!Array.isArray(data) || data.some(x=>!x||typeof x.repo!=='string'||!x.repo||typeof x.version!=='string'||!x.version)) apiThrow(502,'invalid_source','The package source returned an unexpected result.');
    const seen=new Set(); data=data.filter(x=>x&&typeof x==='object').map(x=>Object.fromEntries(['repo','subrepo','srcname','visiblename','version','origversion','summary'].filter(k=>typeof x[k]==='string').map(k=>[k,x[k].slice(0,k==='summary'?2000:300)]))).filter(x=>{const key=JSON.stringify(x);if(seen.has(key))return false;seen.add(key);return true;});
  }
  return data;
  } catch (error) {
    if(plan.group==='loc-newspapers' && !error.api){
      const timedOut=signal.aborted || error.name==='TimeoutError' || error.name==='AbortError';
      apiThrow(timedOut?504:502,timedOut?'loc_timeout':'loc_connection',
        timedOut?'The Library of Congress search timed out. Please try again later.':'The Worker could not read a response from the Library of Congress. Please try again later.');
    }
    if(signal.aborted) apiThrow(504,'source_timeout','The upstream source took too long to respond. Please retry later; saved evidence is unchanged.');
    if(error.api) throw error;
    // Log only a fixed source identifier and error category, never URLs or keys.
    console.warn(JSON.stringify({event:'public-api-source-error',source:plan.group,error:['TypeError','AbortError','TimeoutError'].includes(error.name)?error.name:'Error'}));
    apiThrow(502,'source_network','The upstream source could not be reached. Please retry later.');
  }
}

async function apiHandle(request,env,ctx) {
  try {
    const url=new URL(request.url), origin=request.headers.get('Origin');
    if(origin && origin!==ORIGIN) return apiFailure(403,'origin_denied','Origin is not allowed.');
    if(request.method==='OPTIONS') return {status:204};
    if(['/api/measurebench/','/api/screenradar/','/api/domain-biography/'].some(prefix=>url.pathname.startsWith(prefix))) return await secondBatchApiHandle(request,env,ctx);
    if(url.pathname==='/api/parcelbench/tracking') return await pcTracking(request,env,origin,url);
    if(request.method!=='GET') return apiFailure(405,'method_denied','Use GET for public data requests.');
    if(url.pathname==='/api/browserreceipt/connection') {
      if(origin!==ORIGIN) return apiFailure(403,'origin_denied','Open the connection check on CoolCode.');
      if(url.search) return apiFailure(400,'invalid_query','This connection check takes no query parameters.');
      const cf=request.cf || {};
      const limited=value=>typeof value==='string' ? value.slice(0,200) : null;
      return {headers:{'Cache-Control':'private, no-store'},body:{fetched_at:new Date().toISOString(),data:{
        ip:limited(request.headers.get('CF-Connecting-IP')),
        asn:Number.isSafeInteger(cf.asn) && cf.asn>0 ? cf.asn : null,
        organization:limited(cf.asOrganization),country:limited(cf.country),colo:limited(cf.colo),
        http:limited(cf.httpProtocol),tls:limited(cf.tlsVersion)
      }}};
    }
    if(url.pathname==='/api/status') return {body:{schema:apiVersion,configured:{podcastroute:Boolean(env.PODCASTINDEX_API_KEY&&env.PODCASTINDEX_API_SECRET),channelqueue:Boolean(env.YOUTUBE_API_KEY),recipemath:Boolean(env.FDC_API_KEY),distropilot:true,feedharbour:true,halifaxnext:true,inspectiontrail:true,parcelbench:Boolean(env.CANADAPOST_CLIENT_ID&&env.CANADAPOST_CLIENT_SECRET),corporateghosts:Boolean(env.ISED_CORPORATIONS_API_KEY),screenplaces:Boolean(env.TMDB_READ_ACCESS_TOKEN),planehere:true,planehere_key:Boolean(env.ADSBLOL_API_KEY),screenradar:Boolean(env.TMDB_READ_ACCESS_TOKEN),measurebench:Boolean(env.WOLFRAM_APP_ID),domain_biography:true,newspapers:Boolean(env.LOC_USER_AGENT)}}};
    if(url.pathname.startsWith('/api/halifaxnext/')) return await halifaxApiHandle(request,env,ctx);
    if(url.pathname.startsWith('/api/screenplaces/')) return await screenplacesApiHandle(request,env,ctx);
    if(url.pathname.startsWith('/api/planehere/')) return await planehereApiHandle(request,env,ctx);
    const plan=pcRoute(url,env)||inspectionRoute(url)||apiRoute(url,env), db=env.DB, now=Date.now();
    if(!db) return apiFailure(503,'storage_unavailable','The shared request limiter is unavailable.');
    if(!await allowed(db,request,new Date(now),'tool-api')) return apiFailure(429,'client_wait','Too many requests. Please wait before trying again.',300);
    await apiSchema(db);
    const digest=await crypto.subtle.digest('SHA-256',encoder.encode(apiVersion+'|'+plan.group+'|'+(plan.cacheKey??plan.target.href)));
    const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const cached=plan.ttl>0 ? await db.prepare('SELECT payload FROM gateway_cache WHERE id=? AND expiry>?').bind(id,now).first('payload') : null;
    if(cached) return {body:JSON.parse(cached)};
    if(plan.group==='loc-newspapers'){
      const lease=await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=excluded.expiry WHERE expiry<=? RETURNING hits').bind('loc-newspapers-lease',now+4000,now).first();
      if(!lease){
        const until=await db.prepare('SELECT expiry FROM gateway_budget WHERE id=?').bind('loc-newspapers-lease').first('expiry');
        const retry=Math.max(1,Math.ceil((Number(until)-now)/1000));
        return apiFailure(429,'source_pacing',retry>4?'The Library has paused requests. Please try again later.':'Please wait a few seconds between newspaper searches.',retry);
      }
    }
    if(plan.group==='repology'){
      // Atomic sliding lease across ALL Worker instances; Cache API alone is only per-PoP.
      const lease=await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=excluded.expiry WHERE expiry<=? RETURNING hits').bind('repology-lease',now+1100,now).first();
      if(!lease) return apiFailure(429,'source_pacing','The package source permits one request per second. Please retry shortly.',2);
    }
    await apiBudget(db,plan.group,now,plan.window,plan.maximum);
    let data;
    try {data=await (plan.pc?pcUpstream(plan,env):plan.inspection?inspectionUpstream(plan):apiUpstream(plan,env));}
    catch(error){
      if(plan.group==='loc-newspapers' && error.api && error.status===429){
        await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=MAX(expiry,excluded.expiry)').bind('loc-newspapers-lease',Date.now()+3600000).run();
        apiThrow(429,'source_cooldown','The Library has paused requests. Try again in an hour.',3600);
      }
      throw error;
    }
    const captured=Date.now(), result={fetched_at:new Date(captured).toISOString(),data}, payload=JSON.stringify(result);
    await db.prepare('DELETE FROM gateway_budget WHERE expiry<=?').bind(captured).run();
    // <=256 records; ordinary responses <=500 KB, package evidence <=1 MB.
    // Popular projects such as PHP exceed 500 KB after lossless field selection.
    if(plan.ttl>0 && encoder.encode(payload).byteLength<=(plan.group==='repology'?1000000:500000)) await db.batch([
      db.prepare('DELETE FROM gateway_cache WHERE expiry<=?').bind(captured),
      db.prepare('DELETE FROM gateway_budget WHERE expiry<=?').bind(captured),
      db.prepare('INSERT INTO gateway_cache(id,payload,expiry,touched) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,expiry=excluded.expiry,touched=excluded.touched').bind(id,payload,captured+plan.ttl*1000,captured),
      db.prepare('DELETE FROM gateway_cache WHERE id IN (SELECT id FROM gateway_cache ORDER BY touched DESC,id DESC LIMIT -1 OFFSET 256)'),
    ]);
    return {body:result};
  }catch(e){
    if(e.api) return apiFailure(e.status,e.code,e.message,e.retry);
    return apiFailure(503,'temporarily_unavailable','The source or shared request service is temporarily unavailable. Your saved workspace is unchanged.');
  }
}
