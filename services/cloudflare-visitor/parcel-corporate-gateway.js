// Inlined after gateway.js. Fixed-host, read-only Canada Post and federal registry adapters.
// OAuth credentials and bearer tokens never enter the shared response cache or logs.
// Contracts reviewed 2026-11-25: Canada Post portal downloads /4632/document (Rating),
// /4631/document (Post Office); https://api.ised-isde.canada.ca/swagger/spec/corporation-en.json
const pcBase = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/';
const pcPostal = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;
let pcToken = null; // Bounded, isolate-local token; expiry and credential fingerprint checked on every use.
const pcText = (v,n=300) => typeof v==='string'?v.slice(0,n):'';
const pcNumber = v => typeof v==='number' && Number.isFinite(v)?v:null;
const pcDate = v => typeof v==='string' && /^\d{4}-\d\d-\d\d(?:T.*)?$/.test(v) && Number.isFinite(Date.parse(v))?v.slice(0,10):null;

function pcRoute(url,env) {
  const path=url.pathname;
  if(!path.startsWith('/api/parcelbench/') && !path.startsWith('/api/corporateghosts/')) return null;
  const plan={pc:true,ttl:0,limit:1_000_000,group:'canadapost',window:60000,maximum:80,headers:{Accept:'application/json','Accept-Language':'en-CA','User-Agent':apiUA}};
  let p;
  if(path==='/api/corporateghosts/corporation') {
    p=apiParams(url,['id']); const id=p('id',/^\d{1,12}$/);
    plan.target=new URL('https://apigateway-passerelledapi.ised-isde.canada.ca/cc/api/v1/corporations/'+id);
    for(const include of ['directors','filings','isc']) plan.target.searchParams.append('include',include);
    if(!env.ISED_CORPORATIONS_API_KEY) apiThrow(503,'not_configured','Current federal records are awaiting the site API configuration. Snapshot search remains available.');
    Object.assign(plan,{group:'ised-corporations',maximum:50,ttl:300,kind:'corporation',id});
  } else if(path==='/api/parcelbench/rates') {
    p=apiParams(url,['origin','destination','weight','length','width','height','mailingDate']);
    const postal=key=>p(key,pcPostal), number=(key,min,max,precision)=>{
      const raw=p(key,new RegExp('^\\d{1,3}(?:\\.\\d{1,'+precision+'})?$')), value=Number(raw);
      if(value<min||value>max)apiThrow(400,'invalid_parameter','Check the '+key+' value.');return value;
    };
    const dimensions=[number('length',0.1,200,1),number('width',0.1,200,1),number('height',0.1,200,1)].sort((a,b)=>b-a);
    const mailingDate=p('mailingDate',/^\d{4}-\d\d-\d\d$/), day=Date.parse(mailingDate+'T00:00:00Z'), now=Date.now();
    if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==mailingDate||day<now-2*86400000||day>now+366*86400000)apiThrow(400,'invalid_parameter','Choose a real mailing date from today through the coming year.');
    plan.body=JSON.stringify({quoteType:'counter',expectedMailingDate:mailingDate,originPostalCode:postal('origin'),destination:{domestic:{postalCode:postal('destination')}},parcelCharacteristics:{weight:number('weight',0.001,30,3),dimensions:{length:dimensions[0],width:dimensions[1],height:dimensions[2]}}});
    plan.method='POST';plan.kind='rates';plan.target=new URL(pcBase+'rating/v1/prices');plan.cacheKey=plan.body;
  } else if(path==='/api/parcelbench/offices') {
    p=apiParams(url,['postal']);plan.kind='offices';plan.target=new URL(pcBase+'postoffice/v1/post-offices');
    plan.target.searchParams.set('postal-code',p('postal',pcPostal));plan.target.searchParams.set('maximum','10');plan.target.searchParams.set('d2po','false');
  } else if(path==='/api/parcelbench/office') {
    p=apiParams(url,['id']);plan.kind='office';plan.target=new URL(pcBase+'postoffice/v1/post-offices/'+p('id',/^\d{1,12}$/)+'/details');
  } else apiThrow(404,'unknown_endpoint','Unknown parcel or corporation endpoint.');
  if(plan.group==='canadapost'&&(!env.CANADAPOST_CLIENT_ID||!env.CANADAPOST_CLIENT_SECRET))apiThrow(503,'not_configured','Canada Post lookup is awaiting the site API configuration.');
  return plan;
}

async function pcPace(db,group) {
  // Shared lease prevents bursts across Worker instances, not merely in one isolate.
  for(let attempt=0;attempt<2;attempt++) {
    const now=Date.now(), spacing=group==='canadapost'?300:1100;
    const row=await db.prepare('INSERT INTO gateway_budget(id,hits,expiry) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expiry=excluded.expiry WHERE expiry<=? RETURNING hits').bind(group+'-lease',now+spacing,now).first();
    if(row)return;
    if(!attempt)await new Promise(resolve=>setTimeout(resolve,spacing));
  }
  apiThrow(429,'source_pacing','This source is busy. Please retry in a moment.',2);
}

async function pcFetch(target,options,plan,env) {
  await pcPace(env.DB,plan.group);
  const signal=AbortSignal.timeout(15000);
  try {
    const response=await fetch(target,{...options,redirect:'manual',signal});
    if(!response.ok){
      await response.body?.cancel();
      if(response.status===404)apiThrow(404,'record_not_found','The source did not find this record. Check the number in the official register.');
      if(response.status===429)apiThrow(429,'source_busy','The source has asked us to pause. Please retry later.',60);
      if(response.status===401||response.status===403)apiThrow(503,'source_authentication','The source did not accept this service’s API credentials or subscription. The site operator needs to check its production API configuration.');
      if(response.status===400||response.status===422)apiThrow(400,'source_input','The source could not quote these inputs. Check the postal codes, mailing date, weight and dimensions; some services have package limits.');
      apiThrow(502,'source_unavailable','The source could not complete this request. Please retry later.');
    }
    const raw=await apiRead(response,plan.limit);
    try{return JSON.parse(raw);}catch{apiThrow(502,'invalid_source','The source returned an unexpected response.');}
  } catch(error) {
    if(error.api)throw error;
    apiThrow(signal.aborted?504:502,signal.aborted?'source_timeout':'source_network','The source could not be reached in time. Please retry later.');
  }
}

async function pcBearer(plan,env) {
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(env.CANADAPOST_CLIENT_ID+'\0'+env.CANADAPOST_CLIENT_SECRET))),b=>b.toString(16).padStart(2,'0')).join('');
  if(pcToken?.fingerprint===fingerprint&&pcToken.expires>Date.now()+60000)return pcToken.value;
  const body=new URLSearchParams({grant_type:'client_credentials',scope:'merchant',client_id:env.CANADAPOST_CLIENT_ID,client_secret:env.CANADAPOST_CLIENT_SECRET});
  const token=await pcFetch(pcBase+'cpc-api-native-oauth-provider/oauth2/token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body}, {...plan,limit:20000},env);
  if(typeof token.access_token!=='string'||token.access_token.length>16000||!/^\S+$/.test(token.access_token)||!/^Bearer$/i.test(token.token_type||'')||!Number.isFinite(Number(token.expires_in))||Number(token.expires_in)<=0)apiThrow(502,'source_authentication','The source returned an invalid authorization response.');
  pcToken={fingerprint,value:token.access_token,expires:Date.now()+Math.min(Number(token.expires_in),28800)*1000};
  return pcToken.value;
}

function pcRates(data) {
  if(!Array.isArray(data)||data.length>50)apiThrow(502,'invalid_source','The quote source returned an unexpected result.');
  return {quoteType:'counter',currency:'CAD',quotes:data.map(x=>{
    if(!x||typeof x.serviceCode!=='string'||typeof x.serviceName!=='string'||pcNumber(x.priceDetails?.due)===null)apiThrow(502,'invalid_source','The quote source returned an incomplete price.');
    const p=x.priceDetails,s=x.serviceStandard||{};
    return {code:pcText(x.serviceCode,40),name:pcText(x.serviceName),total:pcNumber(p.due),base:pcNumber(p.base),taxes:Object.fromEntries(['gst','pst','hst'].filter(k=>p.taxes?.[k]).map(k=>[k,pcNumber(p.taxes[k].amt)])),adjustments:(p.adjustments||[]).slice(0,20).map(a=>({name:pcText(a.adjustmentName),cost:pcNumber(a.adjustmentCost)})),options:(p.options||[]).slice(0,20).map(a=>({name:pcText(a.optionName),cost:pcNumber(a.optionPrice)})),cubedWeight:pcNumber(x.weightDetails?.cubedWeight),expectedDeliveryDate:pcDate(s.expectedDeliveryDate),expectedTransitTime:pcNumber(s.expectedTransitTime),guaranteedDelivery:typeof s.guaranteedDelivery==='boolean'?s.guaranteedDelivery:null};
  })};
}
function pcOfficeDay(day) {
  // Only canonical integer strings are equivalent to the documented day numbers.
  if(typeof day==='string' && /^[1-7]$/.test(day))return Number(day);
  return Number.isInteger(day)&&day>=1&&day<=7?day:null;
}
function pcOffice(x) {
  if(!x||!/^\d{1,12}$/.test(String(x.officeId))||!x.address)apiThrow(502,'invalid_source','The post office source returned an incomplete record.');
  const a=x.address,latitude=Number(a.latitude),longitude=Number(a.longitude);
  const coordinates=Number.isFinite(latitude)&&latitude>=40&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-150&&longitude<=-50?{latitude,longitude}:null;
  // Use a validated fixed-host detail link ID when supplied, preserving leading zeros.
  let id=String(x.officeId);try{const link=new URL(x.link?.href);if(link.origin===new URL(pcBase).origin){const match=link.pathname.match(/\/post-offices\/(\d{1,12})\/details$/);if(match)id=match[1];}}catch{}
  return {id,name:pcText(x.name),location:pcText(x.location),address:[a.officeAddress,a.city,a.province,a.postalCode].filter(v=>typeof v==='string').map(v=>v.slice(0,150)).join(', '),coordinates,distance:pcNumber(x.distance),hours:Array.isArray(x.hoursList)?x.hoursList.slice(0,7).filter(h=>h&&pcOfficeDay(h.day)!==null&&Array.isArray(h.time)).map(h=>({day:pcOfficeDay(h.day),times:h.time.slice(0,4).filter(t=>typeof t==='string'&&/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(t))})):null};
}
function pcCorporation(x) {
  if(!x||!/^\d{1,12}$/.test(String(x.corporationNumber))||!x.corporateName||typeof x.corporateName.legalName!=='string')apiThrow(502,'invalid_source','The federal source returned an incomplete record.');
  const filings=Array.isArray(x.filingHistory)?x.filingHistory.slice(0,500).map(f=>({type:pcText(f.recordType,100),receivedDate:pcDate(f.receivedDate),effectiveDate:pcDate(f.effectiveDate),year:pcNumber(f.year),legalName:pcText(f.corporateName?.legalName)})):null;
  const statements=Array.isArray(x.controlStatements)?x.controlStatements.slice(0,500):null;
  return {id:String(x.corporationNumber),legalName:pcText(x.corporateName.legalName,500),alternateLegalName:pcText(x.corporateName.alternateLegalName,500),status:pcText(x.status,100),statusDetail:pcText(x.statusDetail,200),legislation:pcText(x.legislation,100),corporationType:pcText(x.declaredCorporationType,150),anniversaryDate:pcDate(x.anniversaryDate),locality:[x.registeredOffice?.city,x.registeredOffice?.subdivision,x.registeredOffice?.country].filter(v=>typeof v==='string').map(v=>v.slice(0,150)).join(', '),annualReturns:Array.isArray(x.annualReturnCompliance)?x.annualReturnCompliance.slice(0,100).map(a=>({year:pcNumber(a.year),status:pcText(a.status,80)})):null,directors:Array.isArray(x.board?.directors)?x.board.directors.slice(0,200).map(d=>({name:[pcText(d.givenName),pcText(d.familyName)].filter(Boolean).join(' '),changeType:pcText(d.changeType,80)})):null,directorsTruncated:Array.isArray(x.board?.directors)&&x.board.directors.length>200,filings,filingsTruncated:Array.isArray(x.filingHistory)&&x.filingHistory.length>500,controlStatements:statements===null?null:statements.filter(s=>s.recordType==='person').map(s=>({date:pcDate(s.statementDate),status:pcText(s.recordStatus,50),personType:pcText(s.recordDetails?.personType,80),names:Array.isArray(s.recordDetails?.names)?s.recordDetails.names.slice(0,10).map(n=>pcText(n.fullName,300)||[pcText(n.givenName),pcText(n.familyName)].filter(Boolean).join(' ')).filter(Boolean):[]})),controlStatementsTruncated:Array.isArray(x.controlStatements)&&x.controlStatements.length>500};
}
async function pcUpstream(plan,env) {
  const headers={...plan.headers};
  if(plan.group==='canadapost')headers.Authorization='Bearer '+await pcBearer(plan,env);
  else headers.user_key=env.ISED_CORPORATIONS_API_KEY;
  if(plan.body)headers['Content-Type']='application/json';
  let data;
  try{data=await pcFetch(plan.target.href,{method:plan.method||'GET',headers,...(plan.body?{body:plan.body}:{})},plan,env);}catch(error){if(plan.group==='canadapost'&&error.code==='source_authentication')pcToken=null;throw error;}
  if(plan.kind==='rates')return pcRates(data);
  if(plan.kind==='office')return pcOffice(data);
  if(plan.kind==='offices'){if(!Array.isArray(data)||data.length>50)apiThrow(502,'invalid_source','The post office source returned an unexpected result.');return {offices:data.slice(0,10).map(pcOffice)};}
  const corporation=pcCorporation(data);
  if(Number(corporation.id)!==Number(plan.id))apiThrow(502,'invalid_source','The federal source returned a different corporation number.');
  return corporation;
}
