const headerNames = new Set(['content-type','content-length','cache-control','date','etag','last-modified','age','vary']);
const cleanHeaders = headers => (Array.isArray(headers) ? headers : []).filter(h=>h && headerNames.has(String(h.name).toLowerCase())).map(h=>h.name+': '+h.value);
const duration = ms => Number.isFinite(ms) && ms >= 0 ? Math.round(ms)+' ms' : 'Unreported';

export function httpCapture(har) {
  const entries = har?.log?.entries;
  if (!Array.isArray(entries) || !entries.length) throw Error('Open a HAR export with at least one network entry.');
  if (entries.length > 15000) throw Error('Limit this capture to 15,000 network entries.');
  return entries.map((entry,index)=>{
    const {request,response}=entry||{};
    if (!request || !response) throw Error('Entry '+(index+1)+' is missing its HTTP request or response.');
    let url;
    try { url = new URL(request.url); } catch { throw Error('Entry '+(index+1)+' has an unreadable URL.'); }
    const host = url.hostname || url.protocol;
    const code = response.status > 0 ? String(response.status) : 'No HTTP status';
    const text = [request.method+' '+url.origin+url.pathname, (response.httpVersion||'HTTP')+' '+code,...cleanHeaders(response.headers)].join('\n');
    const timings = Object.entries(entry.timings || {}).filter(([key,value])=>['blocked','dns','connect','send','wait','receive'].includes(key) && Number.isFinite(value) && value>=0)
      .map(([key,value])=>key+' '+duration(value)).join(' · ');
    return {title:request.method+' '+code+' · '+host,body:text,field:'Recorded timing',detail:duration(entry.time)+(timings?' · '+timings:''),stamp:entry.startedDateTime||'',ms:Number.isFinite(entry.time)?entry.time:-1,group:code,host};
  });
}

const codes = {0:'NOERROR',1:'FORMERR',2:'SERVFAIL',3:'NXDOMAIN',4:'NOTIMP',5:'REFUSED'};
const types = {1:'A',2:'NS',5:'CNAME',6:'SOA',12:'PTR',15:'MX',16:'TXT',28:'AAAA',33:'SRV',43:'DS',46:'RRSIG',48:'DNSKEY',64:'SVCB',65:'HTTPS',257:'CAA'};
export function dnsCapture(data) {
  const single = Number.isInteger(data?.Status) && data.Question?.length;
  const queries = single ? [{name:data.Question[0].name,type:types[data.Question[0].type]||data.Question[0].type,status:data.Status,answers:data.Answer||[],validated:data.AD,truncated:data.TC}] : data?.dns;
  if (!Array.isArray(queries)||!queries.length||queries.length>100) throw Error('Choose a DNS Lens JSON report or a DNS-over-HTTPS JSON response.');
  return queries.map(q=>{
    if (!q || typeof q.name!=='string'||(!Number.isInteger(q.status) && !q.failed)||!Array.isArray(q.answers)) throw Error('A DNS question or answer is unreadable.');
    const code=q.failed?'Unavailable':(codes[q.status]||'Status '+q.status);
    const rows=q.answers.map(a=>[a.name,types[a.type]||a.type,'TTL '+a.TTL,a.data].join('  '));
    return {title:q.type+' '+q.name,body:[q.type+' '+q.name,code,...rows].join('\n'),field:'Resolver evidence',
      detail:q.failed||[rows.length+' returned answer rows',q.validated?'AD flag set':'AD flag clear',q.truncated?'Truncated reply':''].filter(Boolean).join(' · '),
      stamp:data.observed||'',group:code,host:q.name};
  });
}

export function mailCapture(text) {
  const header = text.replace(/\r\n?/g,'\n').split(/\n\n/,1)[0].replace(/\n[ \t]+/g,' ');
  const hops = [...header.matchAll(/^Received:\s*(.+)$/gmi)].map(match=>match[1]).reverse();
  if (!hops.length) throw Error('Paste complete email headers containing at least one Received field.');
  return hops.map((line,index)=>{
    const split=line.lastIndexOf(';');
    const stamp=split>=0?line.slice(split+1).trim():'';
    const by=line.match(/\bby\s+([^\s;()]+)/i)?.[1] || 'Unnamed receiver';
    const from=line.match(/\bfrom\s+([^\s;()]+)/i)?.[1];
    return {title:'Hop '+(index+1)+' · '+by,body:'Received: '+line,field:'Recorded handoff',detail:(from || 'Origin unspecified')+' → '+by,stamp,group:'Received',host:by};
  });
}
