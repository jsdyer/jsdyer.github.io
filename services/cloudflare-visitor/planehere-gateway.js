// Public ADS-B gateway. Inline into CoolCode's Worker after removing export keywords.
// Reuses the existing DB binding / gateway_cache and gateway_budget tables.
// The small structural DB type keeps this module testable with SQLite and D1.
/** @typedef {{prepare:(sql:string)=>any,batch:(statements:any[])=>Promise<any>}} PhDB */
/** @typedef {{DB?:PhDB,ADSBLOL_API_KEY?:string,PLANEHERE_AUTH_MODE?:string,PLANEHERE_DAILY_LIMIT?:string}} PhEnv */
/** @typedef {{lat:number,lon:number,radius:number,centre:{lat:number,lon:number},cacheId:string}} PhQuery */
/** @typedef {Error & {ph?:boolean,status:number,code:string,retry?:number}} PhError */
const phVersion = 'planehere.v1';
const phDay = 86400000;
const phTTL = 300000;
const phUA = 'CoolCode PlaneHere/1.0 (+https://coolcode.ca/planehere/)';
/** @param {number} status @param {string} code @param {string} message @param {number} [retry] */
const phFailure = (status, code, message, retry) => ({status, body:{error:{code,message}}, ...(retry ? {headers:{'Retry-After':String(retry)}} : {})});
/** @param {number} status @param {string} code @param {string} message @param {number} [retry] @returns {never} */
function phThrow(status, code, message, retry) { throw Object.assign(new Error(message), {ph:true,status,code,retry}); }

/** @param {URL} url @returns {PhQuery} */
function planehereQuery(url) {
  const keys = ['lat','lon','radius'];
  for (const [key] of url.searchParams) if (!keys.includes(key) || url.searchParams.getAll(key).length !== 1) phThrow(400,'invalid_parameter','Use one latitude, longitude and radius.');
  /** @param {string} key @param {number} min @param {number} max */
  function number(key, min, max) {
    const raw = url.searchParams.get(key);
    if (raw === null || !/^-?\d+(?:\.\d+)?$/.test(raw) || raw.length > 20) phThrow(400,'invalid_parameter','Enter valid latitude and longitude numbers.');
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) phThrow(400,'invalid_parameter','Latitude must be −90 to 90 and longitude −180 to 180.');
    return n;
  }
  const lat = number('lat',-90,90), lon = number('lon',-180,180);
  const radius = Number(url.searchParams.get('radius') || '25');
  if (![10,25,50].includes(radius)) phThrow(400,'invalid_parameter','Choose a radius of 10, 25 or 50 nautical miles.');
  const centre = {lat:Math.round(lat*10)/10,lon:Math.round(lon*10)/10};
  return {lat,lon,radius,centre,cacheId:`${phVersion}:${centre.lat.toFixed(1)}:${centre.lon.toFixed(1)}`};
}

/** @param {any} raw @param {number} [now] */
function planehereNormalize(raw, now = Date.now()) {
  if (!raw || !Array.isArray(raw.ac) || raw.ac.length > 5000 || (raw.msg && raw.msg !== 'No error')) phThrow(502,'invalid_source','The aircraft source returned an unexpected result.');
  const sourceNow = Number(raw.now);
  if (!Number.isFinite(sourceNow) || sourceNow < 1577836800000 || sourceNow > now+60000) phThrow(502,'invalid_source','The aircraft source did not provide a valid observation time.');
  if (sourceNow < now-900000) phThrow(502,'stale_source','The aircraft provider returned observations more than 15 minutes old. Try again later.');
  /** @param {unknown} value @param {number} max */
  const text = (value,max) => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,max) : null;
  /** @param {unknown} value @param {number} min @param {number} max */
  const numeric = (value,min,max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
  const seen = new Set(), aircraft = [];
  for (const ac of raw.ac) {
    if (!ac || typeof ac !== 'object') continue;
    const hex = text(ac.hex,16), lat = numeric(ac.lat,-90,90), lon = numeric(ac.lon,-180,180), age = numeric(ac.seen_pos,0,86400);
    if (!hex || !/^~?[a-f0-9]{6}$/i.test(hex) || seen.has(hex) || lat === null || lon === null || age === null) continue;
    seen.add(hex);
    aircraft.push({hex,lat,lon,callsign:text(ac.flight,20),registration:text(ac.r,24),aircraft_type:text(ac.t,16),
      altitude_ft:ac.alt_baro === 'ground' ? null : numeric(ac.alt_baro,-2000,100000),
      on_ground:ac.alt_baro === 'ground',speed_knots:numeric(ac.gs,0,2500),track_deg:numeric(ac.track,0,360),
      position_at:new Date(sourceNow-age*1000).toISOString(),source:text(ac.type,32)});
  }
  return {source_at:new Date(sourceNow).toISOString(),aircraft,coverage:'Aircraft with reported positions; reception is incomplete.',licence:'ODbL-1.0',source_url:'https://www.adsb.lol/'};
}

/** @param {PhDB} db */
async function phSchema(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS gateway_cache (id TEXT PRIMARY KEY, payload TEXT NOT NULL, expiry INTEGER NOT NULL, touched INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS gateway_budget (id TEXT PRIMARY KEY, hits INTEGER NOT NULL, expiry INTEGER NOT NULL)'),
  ]);
}
/** @param {PhDB} db @param {string} id @param {number} now @param {number} maximum */
async function phBudget(db,id,now,maximum) {
  const bucket = Math.floor(now/phDay), expiry = (bucket+1)*phDay;
  const row = await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(`${id}:${bucket}`,expiry,maximum).first();
  if (!row) phThrow(429,'quota_wait','The shared daily aircraft allowance has been used. Previously loaded observations remain available.',Math.ceil((expiry-now)/1000));
}
/** @param {PhDB} db @param {string} id @param {number} now */
async function phFlag(db,id,now) {return db.prepare('SELECT expiry FROM gateway_budget WHERE id=? AND expiry>?').bind(id,now).first();}
/** @param {PhDB} db @param {string} id @param {number} expiry */
async function phSetFlag(db,id,expiry) {return db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=excluded.expiry').bind(id,expiry).run();}
/** @param {Response} response @param {number} now */
function phRetry(response,now) {
  const h = response.headers.get('Retry-After');
  let n = /^\d+$/.test(h || '') ? Number(h) : (Date.parse(h || '')-now)/1000;
  if (!Number.isFinite(n)) n = 300;
  return Math.max(60,Math.min(86400,Math.ceil(n)));
}
/** @param {Response} response */
async function phRead(response) {
  const maximum = 1500000;
  if (Number(response.headers.get('Content-Length')) > maximum) {await response.body?.cancel();phThrow(502,'source_too_large','The aircraft source exceeded its response limit.');}
  if (!response.body) phThrow(502,'invalid_source','The aircraft source returned no data.');
  const reader = response.body.getReader(), chunks=[];let size=0;
  try {for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maximum)phThrow(502,'source_too_large','The aircraft source exceeded its response limit.');chunks.push(value);}}
  catch(error) {await reader.cancel().catch(()=>{});throw error;}
  const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes));}catch{phThrow(502,'invalid_source','The aircraft source returned unreadable data.');}
}
/** @param {PhQuery} query @param {PhEnv} env @param {PhDB} db @param {number} now @param {typeof fetch} fetcher */
async function phFetch(query,env,db,now,fetcher) {
  const mode = env.PLANEHERE_AUTH_MODE || 'auto';
  if (!['auto','key','anonymous'].includes(mode)) phThrow(503,'configuration_error','The aircraft service authentication mode needs review.');
  const configuredKey = typeof env.ADSBLOL_API_KEY === 'string' ? env.ADSBLOL_API_KEY.trim() : '';
  if (mode === 'key' && !configuredKey) phThrow(503,'not_configured','The aircraft service key has not been configured.');
  const keyDisabled = mode === 'auto' && await phFlag(db,'planehere:key-rest',now);
  let key = mode === 'anonymous' || keyDisabled ? '' : configuredKey;
  const configuredLimit = Number(env.PLANEHERE_DAILY_LIMIT || 450);
  if (!Number.isInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > 7000) phThrow(503,'configuration_error','The aircraft service request limit needs review.');
  const target = `https://api.adsb.lol/v2/lat/${query.centre.lat.toFixed(1)}/lon/${query.centre.lon.toFixed(1)}/dist/60`;
  const signal = AbortSignal.timeout(12000);
  for (let attempt=0;attempt<2;attempt++) {
    await phBudget(db,'planehere:total',Date.now(),configuredLimit);
    if (!key) await phBudget(db,'planehere:anonymous',Date.now(),450);
    /** @type {Record<string,string>} */
    const headers = {Accept:'application/json','User-Agent':phUA};if (key) headers['x-api-key']=key;
    let response;
    try {response=await fetcher(target,{headers,redirect:'manual',signal});}
    catch {phThrow(signal.aborted?504:502,'source_unavailable',signal.aborted?'The aircraft source took too long to respond.':'The aircraft source is temporarily unreachable.');}
    if ([401,403].includes(response.status) && key && mode === 'auto' && attempt === 0) {
      // 401 means failed authentication. A 403 can instead be a policy block; only
      // an explicit key-authentication error allows the documented anonymous path.
      let keyRejected=response.status===401;
      if(response.status===403){
        let reason='';try{const detail=await phRead(response);reason=JSON.stringify(detail).slice(0,8000);}catch{}
        keyRejected=/(?:invalid|expired|revoked)[_ \-]*(?:api[_ \-]*)?key|(?:api[_ \-]*)?key[_ \-]*(?:invalid|expired|revoked)/i.test(reason);
      }
      if(keyRejected){await response.body?.cancel().catch(()=>{});await phSetFlag(db,'planehere:key-rest',Date.now()+3600000);key='';continue;}
    }
    if (response.status === 429) {
      const retry=phRetry(response,Date.now());await response.body?.cancel();await phSetFlag(db,'planehere:provider-rest',Date.now()+retry*1000);
      phThrow(429,'source_wait','The aircraft provider has asked us to pause. Please retry after the indicated delay.',retry);
    }
    if (!response.ok) {await response.body?.cancel().catch(()=>{});phThrow(502,'source_unavailable','The aircraft source could not complete this lookup.');}
    const data=planehereNormalize(await phRead(response));
    return {fetched_at:new Date().toISOString(),data:{...data,query_centre:query.centre,query_radius_nm:60,access_mode:key?'key':'anonymous'}};
  }
  phThrow(502,'source_unavailable','The aircraft source could not complete this lookup.');
}

/** @param {Request} request @param {PhEnv} env @param {unknown} ctx @param {{fetcher?:typeof fetch}} [options] */
async function planehereApiHandle(request,env,ctx,options={}) {
  const fetcher=options.fetcher || fetch;let db,lease;
  try {
    const url=new URL(request.url),origin=request.headers.get('Origin');
    if (origin && origin !== 'https://coolcode.ca') return phFailure(403,'origin_denied','Origin is not allowed.');
    if (url.pathname !== '/api/planehere/nearby') return phFailure(404,'unknown_endpoint','Unknown aircraft endpoint.');
    if (request.method==='OPTIONS') return {status:204};
    if (request.method!=='GET') return phFailure(405,'method_denied','Use GET for aircraft lookups.');
    const query=planehereQuery(url),now=Date.now();db=env.DB;
    if(!db)return phFailure(503,'storage_unavailable','The shared aircraft cache is unavailable.');
    await phSchema(db);
    const cached=await db.prepare('SELECT payload FROM gateway_cache WHERE id=? AND expiry>?').bind(query.cacheId,now).first('payload');
    if(cached)return {body:JSON.parse(cached),headers:{'Cache-Control':'public, max-age=30'}};
    const resting=await phFlag(db,'planehere:provider-rest',now);
    if(resting)return phFailure(429,'source_wait','The aircraft provider has asked us to pause.',Math.ceil((resting.expiry-now)/1000));
    const leaseId='planehere:lease:'+query.cacheId;
    const acquired=await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=excluded.expiry WHERE expiry<=? RETURNING hits').bind(leaseId,now+20000,now).first();
    if(!acquired)return phFailure(429,'refresh_in_progress','This area is being refreshed. Try again in a few seconds.',5);
    lease={id:leaseId,expiry:now+20000};
    const result=await phFetch(query,env,db,now,fetcher),payload=JSON.stringify(result),captured=Date.now();
    if(new TextEncoder().encode(payload).byteLength>500000)phThrow(502,'source_too_large','The aircraft result exceeds the shared cache limit.');
    await db.batch([
      db.prepare('INSERT INTO gateway_cache(id,payload,expiry,touched) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,expiry=excluded.expiry,touched=excluded.touched').bind(query.cacheId,payload,captured+phTTL,captured),
      db.prepare("DELETE FROM gateway_cache WHERE id LIKE 'planehere.v1:%' AND expiry<=?").bind(captured),
      db.prepare("DELETE FROM gateway_cache WHERE id IN (SELECT id FROM gateway_cache WHERE id LIKE 'planehere.v1:%' ORDER BY touched DESC,id DESC LIMIT -1 OFFSET 128)"),
      db.prepare("DELETE FROM gateway_budget WHERE id LIKE 'planehere:%' AND expiry<=?").bind(captured),
    ]);
    return {body:result,headers:{'Cache-Control':'public, max-age=30'}};
  } catch(error) {
    if(error && typeof error==='object' && 'ph' in error){const failure=/** @type {PhError} */(error);return phFailure(failure.status,failure.code,failure.message,failure.retry);}
    return phFailure(503,'temporarily_unavailable','The shared aircraft service is temporarily unavailable.');
  } finally {
    if(db&&lease)await db.prepare('DELETE FROM gateway_budget WHERE id=? AND expiry=?').bind(lease.id,lease.expiry).run().catch(()=>{});
  }
}
