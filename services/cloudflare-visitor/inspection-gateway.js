// Bounded, read-only adapter for Nova Scotia’s public ASP.NET inspection search.
// Source HTML is never inserted into the page. Only bounded text fields are exposed.
function inspectionText(value='') {
  return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>{const known={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(known[e.toLowerCase()]!==undefined)return known[e.toLowerCase()];const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/\s+/g,' ').trim();
}
function inspectionSpan(html,id){return inspectionText(html.match(new RegExp('<span\\b[^>]*\\bid="'+id+'"[^>]*>([\\s\\S]*?)<\\/span>','i'))?.[1]||'');}
function inspectionParseSearch(html){
  const date=inspectionSpan(html,'lblLastUploadDateTime'),countText=inspectionSpan(html,'LblResultsCount');
  if(!date || !/^\d+$/.test(countText))throw new Error('Unrecognized inspection search response');
  const rows=[...html.matchAll(/<tr\b[^>]*class="ResultsTableRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>{const link=m[1].match(/href="Details\.aspx\?Id1=(\d+)"[^>]*>([\s\S]*?)<\/a>/i);const address=m[1].match(/<td\b[^>]*class="ResultsTableAddress"[^>]*>([\s\S]*?)<\/td>/i);if(!link||!address)throw new Error('Unrecognized establishment row');return {id:link[1],name:inspectionText(link[2]),address:inspectionText(address[1])};});
  if(rows.length!==Number(countText)||new Set(rows.map(x=>x.id)).size!==rows.length)throw new Error('Incomplete inspection results');
  return {source_updated:date,total:rows.length,truncated:rows.length>200,establishments:rows.slice(0,200)};
}
function inspectionParseReport(html,id){
  const name=inspectionSpan(html,'LblEstablishmentName'),address=inspectionSpan(html,'LblAddress');
  if(!name||!address||!html.includes('InspectionTable'))throw new Error('Unrecognized inspection report');
  const advisoryHTML=html.match(/<table\b[^>]*id="BoilWaterAdvisoryTable"[^>]*>([\s\S]*?)<\/table>/i)?.[1]||'';
  const advisories=[...advisoryHTML.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(m=>{const cells=[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>inspectionText(c[1]));return cells.length===2?[{issued:cells[0]||null,removed:cells[1]||null}]:[];});
  const positions=[...html.matchAll(/<span\b[^>]*class="LabelInspectionDateStatus"[^>]*>Date Inspected:\s*([^<]*)<\/span>/gi)];
  const inspections=positions.map((m,i)=>{const block=html.slice(m.index,positions[i+1]?.index||html.indexOf('Disclaimer Footer'));const findings=[...block.matchAll(/<span\b[^>]*class="LabelInspectionText"[^>]*>([\s\S]*?)<\/span>\s*<\/td>\s*<td[^>]*>\s*<a\b[^>]*class="LinkInspectionText"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span\b[^>]*class="LabelInspectionHeader"[^>]*>Remedy<\/span>[\s\S]*?<span\b[^>]*class="LabelInspectionText"[^>]*>([\s\S]*?)<\/span>/gi)].map(f=>({finding:inspectionText(f[1]),status:inspectionText(f[2]),remedy:inspectionText(f[3])}));
    const summary=inspectionText(block.match(/class="DetailsCellOuter"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
    // Preserve closure/warning annotations beside the inspection date as published.
    const annotation=inspectionText(block.match(/<\/span><\/td><td[^>]*>([\s\S]*?)<\/td>/i)?.[1]||'');
    if((block.match(/class="LinkInspectionText"/g)||[]).length!==findings.length)throw new Error('Unrecognized findings layout');
    return {date:inspectionText(m[1]),annotation,summary,findings};});
  if(!inspections.length)throw new Error('Report has no recognized inspection dates');
  return {id,name,address,advisories,inspections};
}

function inspectionRoute(url) {
  if(!url.pathname.startsWith('/api/inspectiontrail/'))return null;
  if(!['/api/inspectiontrail/search','/api/inspectiontrail/report'].includes(url.pathname))apiThrow(404,'unknown_endpoint','Unknown inspection endpoint.');
  const p=apiParams(url,['q','town','address','mode','id']);
  const query={q:p('q',/^[^\x00-\x1f]{0,120}$/u,''),town:p('town',/^[^\x00-\x1f]{0,100}$/u,''),address:p('address',/^[^\x00-\x1f]{0,120}$/u,''),mode:p('mode',/^(search|current-closures|closures-year|current-warnings|warnings-year)$/,'search')};
  if(query.mode==='search' && Math.max(query.q.length,query.town.length,query.address.length)<2)apiThrow(400,'invalid_parameter','Enter at least two characters of a name, community or street.');
  const report=url.pathname.endsWith('/report');
  if(report)query.id=p('id',/^\d{1,12}$/);else if(url.searchParams.has('id'))apiThrow(400,'invalid_parameter','Search does not accept an ID.');
  return {target:new URL('https://novascotia.ca/nse/food-protection/reports/Request.aspx'),cacheKey:'inspection-v1|'+JSON.stringify(query),group:'inspection',window:86400000,maximum:1500,ttl:300,limit:2000000,timeout:30000,inspection:true,inspectionQuery:query};
}
async function inspectionUpstream(plan) {
  const signal=AbortSignal.timeout(plan.timeout),jar=new Map();
  async function read(url,body){
    const headers={'Accept':'text/html','User-Agent':apiUA};if(jar.size)headers.Cookie=[...jar].map(([k,v])=>k+'='+v).join('; ');
    if(body)headers['Content-Type']='application/x-www-form-urlencoded';
    const response=await fetch(url,{method:body?'POST':'GET',body:body?.toString(),headers,redirect:'manual',signal});
    if(!response.ok){await response.body?.cancel();apiThrow(502,'inspection_source_unavailable','The provincial inspection search is unavailable. Open the official source or try again later.');}
    // Anonymous ASP.NET session cookies never leave this one source request chain.
    const cookie=response.headers.get('Set-Cookie')||'';
    for(const m of cookie.matchAll(/(?:^|,\s*)([A-Za-z0-9_.-]{1,80})=([^;,\s]{1,2048})/gi))jar.set(m[1],m[2]);
    return apiRead(response,plan.limit);
  }
  try {
    const initial=await read(plan.target.href);const fields=new URLSearchParams();
    for(const m of initial.matchAll(/<input\b[^>]*>/gi)){
      const attrs=Object.fromEntries([...m[0].matchAll(/([\w]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]));
      if(attrs.type==='hidden' && ['__VIEWSTATE','__VIEWSTATEGENERATOR','__EVENTVALIDATION'].includes(attrs.name))fields.set(attrs.name,inspectionText(attrs.value));
    }
    if(!fields.has('__VIEWSTATE')||!fields.has('__EVENTVALIDATION'))apiThrow(502,'inspection_source_changed','The provincial search format has changed. Use the official search while this adapter is updated.');
    const q=plan.inspectionQuery;
    fields.set('TxtEstablishmentName',q.q);fields.set('TxtCity',q.town);fields.set('TxtEstablishmentStreet',q.address);fields.set('TxtEstablishmentStreetNo','');
    for(const from of ['From','To'])for(const part of ['Month','Day','Year'])fields.set('Drop'+from+part,'');
    const buttons={search:['BttnSubmit','Submit'],'current-closures':['BttnClosuresCurrent','Current Closures'],'closures-year':['BttnClosuresPastYear','Closures in Past 12 Months'],'current-warnings':['BttnWarningsCurrent','Current Warnings'],'warnings-year':['BttnWarningsPastYear','Warnings in Past 12 Months']};
    const [button,value]=buttons[q.mode];fields.set(button,value);const result=inspectionParseSearch(await read(plan.target.href,fields));
    if(q.id){
      if(!result.establishments.some(row=>row.id===q.id))apiThrow(404,'inspection_not_found','That establishment is not in this search. Refine the name or community and try again.');
      return {source_updated:result.source_updated,report:inspectionParseReport(await read(new URL('Details.aspx?Id1='+q.id,plan.target).href),q.id)};
    }
    return result;
  }catch(e){if(e.api)throw e;if(signal.aborted)apiThrow(504,'source_timeout','The provincial inspection search took too long. Try again later.');apiThrow(502,'inspection_source_changed','The provincial search could not be read. Use the official search while this adapter is checked.');}
}
