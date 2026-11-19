import {sameSettings, makeSettings} from './lineup.mjs';
const $ = id => document.getElementById(id);
const api = 'https://api.github.com/repos/jsdyer/jsdyer.github.io/contents/data/featured.json';
const fields = {a:[], b:[]};
let baseline, valid, catalog;
let experimentId = freshId();
function freshId() { return 'home-' + new Date().toISOString().slice(0,10) + '-' + crypto.randomUUID().slice(0,8); }
function renderEdition() {
  $('b-panel').hidden = $('mode').value !== 'ab';
  $('edition').textContent = 'Published configuration: ' + baseline.experiment + '. Changing an active lineup starts a new measurement period.';
}
function selections(key) {return fields[key].map(input => input.value);}
function settings() { return makeSettings(baseline,$('mode').value,selections('a'),selections('b'),valid,experimentId); }
function formatted(d) {return JSON.stringify(d,null,2)+'\n';}
function bind() {
  const sorted = catalog.filter(x => x.access === 'browser').sort((a,b)=>a.title.localeCompare(b.title,'en-CA'));
  valid = new Set(sorted.map(x=>x.id));
  for (const key of ['a','b']) {
    baseline[key].forEach((selected, i)=>{
      const id = key+'-'+i, lab = document.createElement('label'), input = document.createElement('select');
      lab.htmlFor = input.id = id; lab.textContent = 'Position '+(i+1);
      for (const item of sorted) input.add(new Option(item.title,item.id));
      input.value = selected; $(key).append(lab,input); fields[key].push(input);
    });
  }
  $('mode').value = baseline.mode; $('mode').addEventListener('change',renderEdition); renderEdition();
  $('controls').disabled = false;
}
$('copy').addEventListener('click',async()=>{
  try {
    const value = formatted(settings());
    try { await navigator.clipboard.writeText(value); $('save-status').textContent='Copied. Replace the configuration in the GitHub editor and commit the change.'; }
    catch { $('copy-fallback').hidden=false; $('copy-fallback').textContent=value; $('copy-fallback').focus(); $('save-status').textContent='Select and copy the configuration below.'; }
  } catch (err) {$('save-status').textContent=err.message;}
});
$('lineup').addEventListener('submit',async e=>{
  e.preventDefault(); const token = $('github-token').value.trim(); $('github-token').value='';
  try {
    const next = settings();
    if (sameSettings(next,baseline)) throw Error('The selected lineups already match the published configuration.');
    if (!token) throw Error('Enter a repository token or use Copy lineup JSON and the GitHub editor.');
    $('controls').disabled=true;
    const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
    const request={headers,cache:'no-store',referrerPolicy:'no-referrer',credentials:'omit'};
    const response=await fetch(api+'?ref=main',request);
    if(!response.ok) throw Error('GitHub could not read the current configuration (HTTP '+response.status+').');
    const current=await response.json();
    const remote=JSON.parse(atob(current.content.replace(/\s/g,'')));
    if(!sameSettings(remote,baseline)) throw Error('The repository configuration changed after this page was published. Refresh after the latest deployment before saving.');
    const res=await fetch(api,{...request,method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({branch:'main',sha:current.sha,message:'Update homepage featured tools',content:btoa(formatted(next))})});
    if(!res.ok) throw Error(res.status===409?'Another edit was saved first. Reload after deployment.':'GitHub declined the save (HTTP '+res.status+'). Check the repository permission or use its editor.');
    baseline=next; experimentId=freshId(); renderEdition(); $('save-status').textContent='Saved to GitHub. The homepage will update after the Pages build finishes.';
  } catch(err) { $('save-status').textContent=err.message; }
  finally { $('controls').disabled=!baseline; }
});
try {
  const responses=await Promise.all(['/assets/tool-catalog.json','./featured.json'].map(path=>fetch(path,{cache:'no-cache'})));
  if(responses.some(r=>!r.ok)) throw Error('Catalogue data is unavailable. Reload to try again.');
  [catalog,baseline]=await Promise.all(responses.map(r=>r.json()));
  const browser=catalog.filter(t=>t.access==='browser').length;
  $('health').textContent=catalog.length+' catalogue tools · '+browser+' available in the browser · '+(catalog.length-browser)+' install-only projects';
  bind();
  const {initializeStats}=await import('./stats.mjs'); await initializeStats(catalog);
} catch(err) { $('save-status').textContent=err.message; }
