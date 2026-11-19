import {httpCapture,dnsCapture,mailCapture} from './capture.mjs';
const $ = id=>document.getElementById(id);
const modes = {
  http:{name:'HTTP',accept:'.har,.json',tip:'Export a HAR from your browser’s Network panel, or inspect the live HTTP response for this page.',live:'Inspect this page’s HTTP response'},
  dns:{name:'DNS',accept:'.json',tip:'Open a DNS Lens report or a DNS-over-HTTPS JSON reply, or retrieve the current A record for coolcode.ca from Google Public DNS.',live:'Read the live coolcode.ca DNS reply'},
  smtp:{name:'Email',accept:'.eml,.txt',tip:'Open an .eml or paste the original headers. Read the Received fields in delivery order, starting with the oldest recorded hop. Each line reflects what its recording server claimed.'}
};
let mode, generation=0, entries=[], visible=[], position=0;
function choose() {
  const key=location.hash.slice(1).split('/')[0];
  mode=Object.hasOwn(modes,key)?key:'http';
  generation++;
  for(const button of document.querySelectorAll('[data-protocol]')) button.setAttribute('aria-pressed',String(button.dataset.protocol===mode));
  $('instructions').textContent=modes[mode].tip;
  $('file').accept=modes[mode].accept; $('file').value=''; $('paste').value=''; $('filter').value=''; $('sort').value='original';
  $('notice').textContent=''; $('report').hidden=true; $('live').hidden=!modes[mode].live; $('live').textContent=modes[mode].live||'';
  $('sort-box').hidden=mode!=='http'; $('paste-box').open=mode==='smtp'; entries=[];
}
function show(i) {
  position=i; const row=visible[i]; $('viewer').hidden=!row;
  if(!row) return;
  $('jump').value=String(i); $('previous').disabled=i===0; $('forward').disabled=i===visible.length-1;
  $('kind').textContent=modes[mode].name; $('direction').textContent=row.title; $('message').textContent=row.body;
  $('field').textContent=row.field; $('meaning').textContent=row.detail; $('stamp').textContent=row.stamp;
}
function filter() {
  const term=$('filter').value.trim().toLowerCase();
  visible=entries.filter(row=>[row.title,row.group,row.host].join(' ').toLowerCase().includes(term));
  if(mode==='http' && $('sort').value==='slow') visible.sort((a,b)=>b.ms-a.ms);
  $('jump').replaceChildren(...visible.map((r,i)=>new Option((i+1)+' · '+r.title,i)));
  $('count').textContent=visible.length+' of '+entries.length+' entries'; show(0);
}
function display(rows,label) {
  entries=rows; $('filter').value=''; $('report').hidden=false; $('notice').textContent=label; filter();
}
async function read(getText,label) {
  const ticket=++generation;
  try {
    const text=await getText(); if(ticket!==generation) return;
    if(text.length>8*1024*1024) throw Error('Choose a capture of 8 MiB or less.');
    display(mode==='smtp'?mailCapture(text):mode==='http'?httpCapture(JSON.parse(text)):dnsCapture(JSON.parse(text)),label);
  } catch(e) {if(ticket===generation){$('notice').textContent=e instanceof SyntaxError?'The capture is not valid JSON.':e.message;$('report').hidden=true;}}
}
$('file').addEventListener('change',()=>{
  const f=$('file').files[0];
  if(f) read(()=>{if(f.size>8*1024*1024) throw Error('Choose a capture of 8 MiB or less.');return f.text();},f.name);
});
$('read').onclick=()=>read(()=>$('paste').value,'Pasted capture');
$('live').onclick=async()=>{
  const ticket=++generation; $('notice').textContent='Requesting the live response…'; $('report').hidden=true;
  try{
    let rows, label;
    if(mode==='http'){
      const start=performance.now(), stamp=new Date().toISOString();
      const response=await fetch(location.pathname,{method:'HEAD',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});
      rows=httpCapture({log:{entries:[{request:{method:'HEAD',url:response.url},response:{status:response.status,headers:Array.from(response.headers,([name,value])=>({name,value}))},startedDateTime:stamp,time:performance.now()-start}]}});
      label='Live HTTP headers received by this browser';
    } else {
      const response=await fetch('https://dns.google/resolve?name=coolcode.ca&type=A',{credentials:'omit',signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw Error('Google Public DNS returned HTTP '+response.status+'.');
      rows=dnsCapture(await response.json()); label='Google Public DNS · '+new Date().toISOString();
    }
    if(ticket===generation) display(rows,label);
  }catch(e){if(ticket===generation) $('notice').textContent='Live request failed. '+e.message+' You can still open a local capture.';}
};
for(const b of document.querySelectorAll('[data-protocol]')) b.onclick=()=>{location.hash=b.dataset.protocol;};
$('filter').oninput=filter; $('sort').onchange=filter; $('jump').onchange=()=>show(Number($('jump').value));
$('previous').onclick=()=>show(position-1); $('forward').onclick=()=>show(position+1); window.addEventListener('hashchange',choose);choose();
