// Fixed-source, bounded GTFS-realtime relay. Parsing runs in Halifax Next's browser worker.
// This avoids large protobuf / JSON / gzip transformations in the edge CPU budget.
const halifaxFeeds = Object.freeze({vehicles:'Vehicle/VehiclePositions.pb',trips:'TripUpdate/TripUpdates.pb',alerts:'Alert/Alerts.pb'});
function halifaxBoundedStream(body,length,limit=5000000){
 if(!Number.isSafeInteger(length)||length<=0||length>limit)throw new Error('Invalid Halifax feed length');
 // Native stream enforces both short and excess bodies without JavaScript per chunk.
 return body.pipeThrough(new FixedLengthStream(length));
}
async function halifaxApiHandle(request,env,ctx) {
  const origin=request.headers.get('Origin');if(origin&&origin!==ORIGIN)return apiFailure(403,'origin','This origin is not allowed.');
  if(request.method==='OPTIONS')return {status:204};if(request.method!=='GET')return apiFailure(405,'method','Use GET.');
  try {
    const url=new URL(request.url);if(url.pathname!=='/api/halifaxnext/realtime')return apiFailure(404,'route','Unknown Halifax API route.');
    const p=apiParams(url,['feed','stop']),feed=p('feed',/^(vehicles|trips|alerts)$/,'trips'),stop=p('stop',/^[A-Za-z0-9_.-]{0,64}$/,'');
    if(feed==='trips'&&!stop)return apiFailure(400,'parameter','Select a stop for departure updates.');
    const db=env.DB;if(!db)return apiFailure(503,'configuration','The transit cache is not configured.');
    const now=Date.now();if(!await allowed(db,request,new Date(now),'tool-api'))return apiFailure(429,'rate_limit','Please try again shortly.',300);
    await apiSchema(db);
    const cache=typeof caches!=='undefined'?caches.default:null;
    const cacheRequest=new Request(new URL('/api/halifaxnext/cache/raw-v1/'+feed,url.origin).href);
    const cached=cache?await cache.match(cacheRequest):null;
    if(cached)return {rawResponse:cached};
    await apiBudget(db,'halifax:'+feed,now,86400000,4000);
    // IIS requires its actual protocol-buffer MIME; Workers supports manual, not error, redirects.
    const response=await fetch('https://gtfs.halifax.ca/realtime/'+halifaxFeeds[feed],{headers:{'User-Agent':apiUA,Accept:'application/protocol-buffer,application/x-protobuf,application/octet-stream','Accept-Encoding':'identity'},redirect:'manual',signal:AbortSignal.timeout(12000)});
    if(!response.ok){await response.body?.cancel();return apiFailure(502,'source','Halifax Transit is temporarily unavailable. Scheduled times remain available.');}
    const size=response.headers.get('Content-Length'),encoding=response.headers.get('Content-Encoding');
    if(encoding&&encoding.toLowerCase()!=='identity'){await response.body?.cancel();return apiFailure(502,'source','Halifax Transit returned an unsupported transport encoding.');}
    if(/^(?:text\/|application\/(?:json|xml|xhtml))/i.test(response.headers.get('Content-Type')||'')){await response.body?.cancel();return apiFailure(502,'source','Halifax Transit did not return a realtime feed.');}
    if(!response.body||size===null||!/^\d+$/.test(size)||!Number.isSafeInteger(Number(size))||Number(size)<=0||Number(size)>5000000){await response.body?.cancel();return apiFailure(502,'source','Halifax Transit returned an invalid or oversized response length.');}
    const raw=new Response(halifaxBoundedStream(response.body,Number(size)),{headers:{'Content-Type':'application/x-protobuf','Cache-Control':'public, max-age=30','X-CoolCode-Fetched-At':new Date(now).toISOString()}});
    if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(cacheRequest,raw.clone()).catch(()=>{}));
    return {rawResponse:raw};
  } catch(e){return e&&e.api?apiFailure(e.status,e.code,e.message,e.retry):apiFailure(503,'source','Live transit information is temporarily unavailable. Use the labelled scheduled times.');}
}
