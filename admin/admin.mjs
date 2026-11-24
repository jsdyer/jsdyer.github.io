import {sameSettings, makeSettings} from './lineup.mjs';
import {initializeStats} from './stats.mjs';
import {initializeServiceStatus} from './service-status.mjs';
import {initializeActivity} from './activity.mjs';
import {initializeCanadaChecks} from './canada-panel.mjs';
import {initializeCloudflareUsage} from './cloudflare-usage.mjs';
import {initializeOutcomes} from './tool-outcomes.mjs';
const $ = id => document.getElementById(id);
const api = 'https://api.github.com/repos/jsdyer/jsdyer.github.io/contents/data/featured.json';
export async function openDashboard(session, initialMetrics) {
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
      try { await navigator.clipboard.writeText(value); if (session.signal.aborted) return; $('save-status').textContent='Copied. Replace the configuration in the GitHub editor and commit the change.'; }
      catch { if (session.signal.aborted) return; $('copy-fallback').hidden=false; $('copy-fallback').textContent=value; $('copy-fallback').focus(); $('save-status').textContent='Select and copy the configuration below.'; }
    } catch (err) {$('save-status').textContent=err.message;}
  });
  $('lineup').addEventListener('submit',async e=>{
    e.preventDefault(); const token = session.token;
    try {
      const next = settings();
      if (sameSettings(next,baseline)) throw Error('The selected lineups already match the published configuration.');
      if (!token) return;
      $('controls').disabled=true;
      const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
      const request={headers,cache:'no-store',referrerPolicy:'no-referrer',credentials:'omit',redirect:'error',signal:session.signal};
      const response=await fetch(api+'?ref=main',request);
      if(response.status===401) return session.lock();
      if(!response.ok) throw Error('GitHub could not read the current configuration (HTTP '+response.status+').');
      const current=await response.json();
      const remote=JSON.parse(atob(current.content.replace(/\s/g,'')));
      if(!sameSettings(remote,baseline)) throw Error('The repository configuration changed after this page was published. Refresh after the latest deployment before saving.');
      const res=await fetch(api,{...request,method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({branch:'main',sha:current.sha,message:'Update homepage featured tools',content:btoa(formatted(next))})});
      if(res.status===401) return session.lock();
      if(res.status===403) throw Error('GitHub declined publishing. Use the GitHub editor or sign in with Contents write access to the catalogue repository.');
      if(!res.ok) throw Error(res.status===409?'Another edit was saved first. Reload after deployment.':'GitHub declined the save (HTTP '+res.status+'). Check the repository permission or use its editor.');
      baseline=next; experimentId=freshId(); renderEdition(); $('save-status').textContent='Saved to GitHub. The homepage will update after the Pages build finishes.';
    } catch(err) { if (!session.signal.aborted) $('save-status').textContent=err.message; }
    finally { if (!session.signal.aborted) $('controls').disabled=!baseline; }
  });
  const responses=await Promise.all(['/assets/tool-catalog.json','./featured.json'].map(path=>fetch(path,{cache:'no-cache',signal:session.signal})));
  if(responses.some(r=>!r.ok)) throw Error('Catalogue data is unavailable. Reload to try again.');
  [catalog,baseline]=await Promise.all(responses.map(r=>r.json()));
  if (session.signal.aborted) return;
  const browser=catalog.filter(t=>t.access==='browser').length;
  $('health').textContent=catalog.length+' catalogue tools · '+browser+' available in the browser · '+(catalog.length-browser)+' install-only projects';
  bind();
  initializeStats(catalog, session, initialMetrics);
  initializeActivity(session.signal);
  initializeOutcomes(session);
  initializeServiceStatus(session.signal);
  initializeCanadaChecks(session.signal);
  initializeCloudflareUsage(session);
}
