// Halifax Transit public GTFS-realtime adapter. Inlined after gateway.js.
// Wire fields follow https://github.com/google/transit/blob/master/gtfs-realtime/proto/gtfs-realtime.proto.
// No arbitrary URLs, client credentials, cookies, or raw protobuf escape this adapter.
const halifaxFeeds = Object.freeze({vehicles:'Vehicle/VehiclePositions.pb',trips:'TripUpdate/TripUpdates.pb',alerts:'Alert/Alerts.pb'});
function halifaxDecode(bytes, feed) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 5000000 || !halifaxFeeds[feed]) throw new Error('Invalid GTFS-realtime input');
  let fieldsRead=0;
  function parse(buf,depth=0) {
    if(depth>10)throw new Error('GTFS nesting exceeds bound');
    const fields=new Map();let at=0;
    function vint(){let n=0n,shift=0n;for(let i=0;i<10;i++){if(at>=buf.length)throw new Error('Truncated GTFS varint');const b=buf[at++];n|=BigInt(b&127)<<shift;if(!(b&128)){if(i===9&&b>1)throw new Error('Oversized GTFS integer');return n}shift+=7n}throw new Error('Oversized GTFS varint')}
    while(at<buf.length){if(++fieldsRead>1000000)throw new Error('Too many GTFS fields');const key=Number(vint()),field=key>>>3,wire=key&7;let value;if(!field)throw new Error('Invalid GTFS field');
      if(wire===0)value=vint();
      else if(wire===2){const length=Number(vint());if(!Number.isSafeInteger(length)||length<0||at+length>buf.length)throw new Error('Truncated GTFS message');value=buf.subarray(at,at+length);at+=length}
      else if(wire===5||wire===1){const length=wire===5?4:8;if(at+length>buf.length)throw new Error('Truncated GTFS fixed field');value=new DataView(buf.buffer,buf.byteOffset+at,length);at+=length}
      else throw new Error('Unsupported GTFS wire type');
      if(!fields.has(field))fields.set(field,[]);fields.get(field).push(value);
    }
    return fields;
  }
  const num=(f,k,signed=false)=>{const v=f.get(k)?.[0];if(typeof v!=='bigint')return null;const n=Number(signed?BigInt.asIntN(32,v):v);if(!Number.isSafeInteger(n))throw new Error('GTFS integer outside safe range');return n};
  const str=(f,k,max=512)=>{const v=f.get(k)?.[0];if(v===undefined)return '';if(!(v instanceof Uint8Array)||v.length>max*4)throw new Error('Invalid GTFS text');const s=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(v);if(s.length>max)throw new Error('GTFS text too long');return s};
  const sub=(f,k)=>{const v=f.get(k)?.[0];return v instanceof Uint8Array?parse(v,1):new Map()};
  const many=(f,k)=>{const a=f.get(k)||[];return a.map(v=>{if(!(v instanceof Uint8Array))throw new Error('Invalid GTFS child');return parse(v,1)})};
  const trip=f=>({id:str(f,1),date:str(f,3),route:str(f,5),relationship:num(f,4)??0});
  const event=f=>({time:num(f,2),delay:num(f,1,true),uncertainty:num(f,3,true)});
  const translated=f=>{const a=many(f,1);return str(a.find(t=>str(t,2).startsWith('en'))||a[0]||new Map(),1,16000)};
  const root=parse(bytes),header=sub(root,1),timestamp=num(header,3);
  if(!str(header,1)||num(header,2)===1||!timestamp||timestamp<946684800)throw new Error('Missing full-feed header or source timestamp');
  const entities=many(root,2);if(entities.length>12000)throw new Error('Too many GTFS entities');
  const rows=[];
  for(const entity of entities){if(num(entity,2))continue;const id=str(entity,1);if(!id)throw new Error('Missing GTFS entity ID');
    if(feed==='vehicles'&&entity.has(4)){const v=sub(entity,4),p=sub(v,2),d=sub(v,8),x=p.get(1)?.[0],y=p.get(2)?.[0];const lat=x instanceof DataView?x.getFloat32(0,true):null,lon=y instanceof DataView?y.getFloat32(0,true):null;
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
      rows.push({id,trip:trip(sub(v,1)),vehicle:str(d,2)||str(d,1),lat,lon,timestamp:num(v,5),stop:str(v,7)});
    } else if(feed==='trips'&&entity.has(3)){const v=sub(entity,3),t=trip(sub(v,1));if(!t.id)continue;
      rows.push({id,trip:t,timestamp:num(v,4),delay:num(v,5,true),stops:many(v,2).map(s=>({id:str(s,4),sequence:num(s,1),relationship:num(s,5)??0,arrival:event(sub(s,2)),departure:event(sub(s,3))}))});
    } else if(feed==='alerts'&&entity.has(5)){const a=sub(entity,5);rows.push({id,header:translated(sub(a,10)),description:translated(sub(a,11)),url:translated(sub(a,8)),periods:many(a,1).map(p=>({start:num(p,1),end:num(p,2)})),targets:many(a,5).map(t=>({route:str(t,2),stop:str(t,5),trip:trip(sub(t,4)).id})),cause:num(a,6),effect:num(a,7)})}
  }
  return {schema:1,feed,timestamp,version:str(header,4),entities:rows};
}
async function halifaxRead(response,limit=5000000) {
  if(!response.body)throw new Error('Empty GTFS response');const reader=response.body.getReader(),parts=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit)throw new Error('Oversized GTFS response');parts.push(part.value)}}catch(e){await reader.cancel();throw e}
  const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length}return bytes;
}
async function halifaxPack(result){const json=JSON.stringify(result);if(json.length>12000000)throw new Error('Normalized GTFS response too large');const zipped=await halifaxRead(new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))),1400000);let binary='';for(let i=0;i<zipped.length;i+=8192)binary+=String.fromCharCode(...zipped.subarray(i,i+8192));return btoa(binary)}
async function halifaxUnpack(payload){if(typeof payload!=='string'||payload.length>1900000)throw new Error('Invalid transit cache');const bytes=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));const raw=await halifaxRead(new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))),12000000);return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(raw))}
async function halifaxApiHandle(request,env) {
  const origin=request.headers.get('Origin');if(origin&&origin!==ORIGIN)return apiFailure(403,'origin','This origin is not allowed.');
  if(request.method==='OPTIONS')return {status:204};if(request.method!=='GET')return apiFailure(405,'method','Use GET.');
  try {
    const url=new URL(request.url);if(url.pathname!=='/api/halifaxnext/realtime')return apiFailure(404,'route','Unknown Halifax API route.');
    const p=apiParams(url,['feed','stop']),feed=p('feed',/^(vehicles|trips|alerts)$/,'trips'),stop=p('stop',/^[A-Za-z0-9_.-]{0,64}$/,'');
    if(feed==='trips'&&!stop)return apiFailure(400,'parameter','Select a stop for departure updates.');
    const db=env.DB;if(!db)return apiFailure(503,'configuration','The transit cache is not configured.');
    const now=Date.now();if(!await allowed(db,request,new Date(now),'tool-api'))return apiFailure(429,'rate_limit','Please try again shortly.',300);
    await apiSchema(db);const key='halifax:gtfs:gzip:v1:'+feed;
    let result;const cached=await db.prepare('SELECT payload FROM gateway_cache WHERE id=? AND expiry>?').bind(key,now).first();
    if(cached){result=await halifaxUnpack(cached.payload)}else{
      await apiBudget(db,'halifax:'+feed,now,86400000,4000);
      const response=await fetch('https://gtfs.halifax.ca/realtime/'+halifaxFeeds[feed],{headers:{'User-Agent':apiUA,Accept:'application/x-protobuf,application/octet-stream'},redirect:'error',signal:AbortSignal.timeout(12000)});
      if(!response.ok)return apiFailure(502,'source','Halifax Transit is temporarily unavailable. Scheduled times remain available.');
      const data=halifaxDecode(await halifaxRead(response),feed);result={fetched_at:new Date(now).toISOString(),data};const payload=await halifaxPack(result);
      await db.prepare('INSERT INTO gateway_cache(id,payload,expiry,touched) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,expiry=excluded.expiry,touched=excluded.touched').bind(key,payload,now+30000,now).run();
    }
    if(stop&&feed==='trips')result={...result,data:{...result.data,entities:result.data.entities.filter(e=>e.stops.some(s=>s.id===stop||!s.id)||(e.trip.relationship===3||e.trip.relationship===7)||e.delay!==null).map(e=>({...e,stops:e.stops.filter(s=>s.id===stop||!s.id)}))}};
    return {status:200,body:result,headers:{'Cache-Control':'public, max-age=15'}};
  } catch(e){return e&&e.api?apiFailure(e.status,e.code,e.message,e.retry):apiFailure(503,'source','Live transit information is temporarily unavailable. Use the labelled scheduled times.');}
}
