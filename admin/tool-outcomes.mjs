const reportUrl = 'https://raw.githubusercontent.com/jsdyer/jsdyer.github.io/collector-outcomes-log/collector-outcomes.json';
const statuses = {attention:'Needs attention', running:'Running', limited:'Limited verification', workflow_only:'Workflow-only check', checked:'Checks passed'};
const outputs = {recent:'Published check is recent', stale:'Published check is overdue', unavailable:'Published check unavailable', invalid:'Invalid published timestamp', not_configured:'Workflow-only target; no dataset output expected'};
const time = value => value ? value.replace('T', ' ').replace(/\.\d+(?=Z)/, '').replace('Z', ' UTC') : 'Not observed';
const readable = value => String(value || 'unknown').replaceAll('_', ' ');

export function validateReport(data) {
  if (data?.version !== 1 || !Number.isFinite(Date.parse(data.checked_at)) || !Array.isArray(data.rows) || !data.rows.length || data.rows.length > 1000) throw Error('The outcome report has an unsupported format.');
  const keys = new Set();
  for (const row of data.rows) {
    if (!/^jsdyer\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(row.repo) || !/^[\w.-]+\.ya?ml$/.test(row.workflow) || !Object.hasOwn(statuses, row.status) || !Object.hasOwn(outputs, row.output?.status) || !Array.isArray(row.output.checks) || !row.execution || !Array.isArray(row.counts) || !Array.isArray(row.titles) || !row.titles.every(x=>typeof x==='string') || !Array.isArray(row.reasons)) throw Error('The outcome report contains an invalid tool result.');
    for(const check of row.output.checks)if(typeof check.label!=='string'||typeof check.url!=='string'||(check.timestamp&&!Number.isFinite(Date.parse(check.timestamp))))throw Error('The outcome report contains invalid published evidence.');
    for(const count of row.counts)if(typeof count.label!=='string'||(!count.error&&(!Number.isSafeInteger(count.value)||count.value<0||typeof count.unit!=='string')))throw Error('The outcome report contains an invalid record count.');
    for(const run of [row.execution.latest,row.execution.latest_refresh,row.execution.latest_collection])if(run&&(!Number.isSafeInteger(run.id)||run.id<1||!Number.isFinite(Date.parse(run.at))))throw Error('The outcome report contains an invalid workflow run.');
    if (row.output.sources && (!Array.isArray(row.output.sources) || row.output.sources.length > 50 || !row.output.sources.every(x => typeof x.name === 'string' && ['ok','failed'].includes(x.status) && typeof x.detail === 'string'))) throw Error('The outcome report contains invalid source results.');
    const key = row.repo + '/' + row.workflow;
    if (keys.has(key)) throw Error('The outcome report repeats a workflow.');
    keys.add(key);
  }
  return data;
}

export function reportAge(report, now=Date.now()) {
  const seconds = (now - Date.parse(report.checked_at)) / 1000;
  return seconds < -300 ? 'future' : seconds > 10800 ? 'stale' : 'recent';
}

export function matchingOutcomes(rows, filter, query) {
  const q = query.trim().toLocaleLowerCase('en-CA');
  return rows.filter(row => (!filter || (filter==='review' ? ['attention','limited'].includes(row.status) : row.status === filter)) &&
    [row.repo, row.workflow, ...row.titles].join(' ').toLocaleLowerCase('en-CA').includes(q))
    .sort((a,b) => a.repo.localeCompare(b.repo) || a.workflow.localeCompare(b.workflow));
}

function node(tag, text) { const n=document.createElement(tag); if (text !== undefined) n.textContent=text; return n; }
function link(text, href) { const a=node('a',text); a.href=href; a.target='_blank'; a.rel='noopener noreferrer'; return a; }
function evidenceURL(url) { try {const u=new URL(url);return u.protocol==='https:' && ['coolcode.ca','raw.githubusercontent.com'].includes(u.hostname) && !u.username && !u.password ? u.href : null;} catch {return null;} }
function workflowURL(row) { return 'https://github.com/' + row.repo + '/actions/workflows/' + row.workflow; }
function addRun(root, label, run, repo) {
  const p=node('p', label + ': ');
  if (!run || !Number.isSafeInteger(run.id) || run.id < 1) p.append('Not found in the last 20 runs.');
  else p.append(link(readable(run.conclusion || run.status), 'https://github.com/' + repo + '/actions/runs/' + run.id), ' · ' + readable(run.event) + ' · ' + time(run.at));
  root.append(p);
}

export function renderOutcome(row) {
  const tr=node('tr');
  const tool=node('th'); tool.scope='row';
  tool.append(node('span',row.titles.join(' / ') || row.repo.split('/')[1]), node('p',row.repo));
  const execution=node('td');
  execution.append(link(row.workflow,workflowURL(row)));
  if (row.execution.state && row.execution.state !== 'active') execution.append(node('p', 'Workflow ' + readable(row.execution.state)));
  if (row.execution.error) execution.append(node('p','Could not inspect workflow: ' + readable(row.execution.error)));
  for (const step of row.execution.failed_steps || []) execution.append(node('p','Failed step: '+step));
  addRun(execution,'Latest run',row.execution.latest,row.repo);
  addRun(execution,'Scheduled/manual run',row.execution.latest_refresh,row.repo);
  if(row.execution.latest_step_check)execution.append(node('p','Source collection in latest run: '+readable(row.execution.latest_step_check.status)));
  if(row.execution.latest_collection && row.execution.latest_collection.id !== row.execution.latest_refresh?.id)addRun(execution,'Verified collection steps',row.execution.latest_collection,row.repo);
  if(row.observed_at)execution.append(node('p','Workflow checked '+time(row.observed_at)));
  if (row.execution.due_unobserved) execution.append(node('p','No '+(row.output.status==='not_configured'?'':'scheduled/manual ')+'run observed after due time ' + time(row.execution.due_at)));
  const output=node('td'); output.append(node('strong',outputs[row.output.status]));
  if (row.output.note) output.append(node('p',row.output.note));
  for (const check of row.output.checks) {
    const p=node('p'); const url=evidenceURL(check.url);
    p.append(url ? link(check.label,url) : node('span',check.label));
    p.append(' · ' + (check.timestamp ? time(check.precision==='date' ? check.timestamp.slice(0,10) : check.timestamp) : readable(check.error || check.status)));
    if (check.precision==='date') p.append(' (date only)');
    if (check.cached && check.read_at) p.append(' · metadata last read ' + time(check.read_at));
    if (Number.isFinite(check.max_age_seconds)) p.append(' · allowed age ' + (check.max_age_seconds >= 86400 ? Math.round(check.max_age_seconds/86400*10)/10 + ' days' : Math.round(check.max_age_seconds/3600*10)/10 + ' hours'));
    output.append(p);
  }
  for(const source of row.output.sources || [])if(source.status!=='ok')output.append(node('p','Source '+source.name+': '+source.detail));
  if (row.output.run_alignment==='permitted_cache') output.append(node('p','The saved snapshot was within the permitted '+Math.round(row.output.cache_max_age_seconds/3600*10)/10+'-hour cache window when the run started. This does not claim a new download.'));
  else if (row.output.run_alignment==='predates_success') output.append(node('p','Published timestamp predates the successful scheduled/manual run. Its output is not confirmed.'));
  else if (row.output.run_alignment==='date_only') output.append(node('p','Date-only evidence cannot identify the individual run that produced it.'));
  else if (row.output.run_alignment==='at_or_after_start') output.append(node('p','Published check is at or after the successful run’s start; this is timestamp evidence, not a download receipt.'));
  for (const count of row.counts) output.append(node('p',count.error ? count.label + ': count unavailable' : count.label + ': ' + count.value.toLocaleString('en-CA') + ' ' + count.unit + (count.read_at ? ' · read ' + time(count.read_at) : '')));
  const result=node('td'); result.append(node('strong',statuses[row.status]));
  for (const reason of row.reasons) result.append(node('p',reason));
  tr.append(tool,execution,output,result);
  return tr;
}

export function renderOutcomeHistory(report) {
  const details=node('details');details.append(node('summary','Recent outcome observations'));
  const list=node('ol');
  for (const observation of (report.history || []).slice(0,24)) {
    const item=node('li',time(observation.checked_at));
    if (observation.summary) item.append(node('p',Object.entries(statuses).map(([key,label])=>`${observation.summary[key] || 0} ${label.toLowerCase()}`).join(' · ')));
    const changes=node('ul');
    for (const change of observation.changes || []) {
      const before=change.before,after=change.after;
      const text=change.repo + ' · ' + change.workflow + ' · ' + readable(before?.status) + ' → ' + readable(after?.status);
      const details=[];
      for(const [key,label] of [['output','Published checks'],['latest_result','Latest run'],['refresh_result','Scheduled/manual run']])if(before?.[key]!==after?.[key])details.push(label+': '+readable(before?.[key])+' → '+readable(after?.[key]));
      const oldCounts=new Map((before?.counts||[]).map(c=>[c.label,c]));
      for(const count of after?.counts||[]){const old=oldCounts.get(count.label);if(old?.value!==count.value||old?.error!==count.error)details.push(count.label+': '+(old?.value??'unavailable')+' → '+(count.value??'unavailable'));}
      changes.append(node('li',text + (details.length ? ' · '+details.join(' · ') : before?.status===after?.status ? ' · verification details changed' : '')));
    }
    if (changes.childElementCount) item.append(changes);
    else item.append(node('p','No result or count changes recorded.'));
    list.append(item);
  }
  details.append(list); return details;
}

const observationRuns = 'https://github.com/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml';
const dispatchUrl = 'https://api.github.com/repos/jsdyer/jsdyer.github.io/actions/workflows/service-monitor.yml/dispatches';

export function snapshotDescription(report, now=Date.now()) {
  const age = reportAge(report,now);
  const minutes = Math.max(0,Math.floor((now-Date.parse(report.checked_at))/60000));
  return 'Saved report: '+time(report.checked_at)+' · '+minutes+' minutes old. Later runs are not included. '+
    (age==='stale'?'Report is over 3 hours old; current tool health is unknown.':age==='future'?'Report time is ahead of this browser; check the clock.':'Scheduled hourly at :37; GitHub may delay it.');
}

export async function requestOutcomeCheck(session, fetcher=fetch) {
  if(!session?.token)throw Error('Sign in with a token that has Actions write access to jsdyer.github.io, or use Run workflow on GitHub.');
  const response=await fetcher(dispatchUrl, {method:'POST', credentials:'omit', redirect:'error', referrerPolicy:'no-referrer',
    signal:AbortSignal.any([session.signal,AbortSignal.timeout(20000)]),
    headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+session.token,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},
    body:JSON.stringify({ref:'main'})});
  if(response.status===401){session.lock?.();throw Error('GitHub sign-in expired. Sign in again to request a check.');}
  if(response.status===403)throw Error('GitHub denied the request (403). Edit the token used to unlock this admin: include jsdyer/jsdyer.github.io and set repository Actions to Read and write. Save, lock this admin, sign in again and retry. The watchdog App is separate. You can also use Run workflow on GitHub.');
  if(response.status!==200 && response.status!==204)throw Error('GitHub did not accept the check request (HTTP '+response.status+'). Open Observation runs to investigate.');
  if(response.status===200){
    const receipt=await response.json();
    if(!Number.isSafeInteger(receipt?.workflow_run_id) || receipt.workflow_run_id<1)throw Error('GitHub returned an unexpected dispatch response. Check Observation runs before retrying.');
  }
  const serverTime=Date.parse(response.headers.get('Date'));
  return Number.isFinite(serverTime)?serverTime:Date.now();
}

export function includesFreshCheck(report, requestedAt) {
  return report?.read_mode==='fresh' && report.rows.length>0 && report.rows.every(row=>Number.isFinite(Date.parse(row.observed_at)) && Date.parse(row.observed_at)>=requestedAt);
}

export function initializeOutcomes(session) {
  // The public report is readable without a token; only an explicit check request uses it.
  const sessionSignal=session.signal;
  const panel=document.getElementById('outcomes-panel'), root=document.getElementById('outcomes-body');
  document.querySelectorAll('a[href="#outcomes"]').forEach(a=>a.addEventListener('click',()=>{panel.open=true;}));
  let initialized=false;
  panel.addEventListener('toggle',()=>{if(panel.open&&!initialized){initialized=true;setup();}});
  if(location.hash==='#outcomes')panel.open=true;
  function setup() {
    const toolbar=node('div');toolbar.className='stats-toolbar';
    const label=node('label','Results '), filter=node('select');filter.setAttribute('aria-label','Outcome results');
    for(const [value,text] of [['review','Needs review'],['attention','Failed, overdue or unreadable'],['','All workflows'],['limited','Limited verification'],['running','Running'],['workflow_only','Workflow-only checks'],['checked','Checks passed']])filter.add(new Option(text,value));
    label.append(filter);
    const searchLabel=node('label','Find tool '),search=node('input');search.type='search';search.setAttribute('aria-label','Find tool outcome');searchLabel.append(search);
    const refresh=node('button','Load saved report');refresh.type='button';
    const check=node('button','Check GitHub now');check.type='button';toolbar.append(label,searchLabel,refresh,check);
    const status=node('p');status.setAttribute('role','status');
    const requested=node('p');requested.setAttribute('role','status');requested.className='outcome-request';
    const content=node('div'),history=node('div'),links=node('p');
    links.append(link('Download report JSON',reportUrl),' · ',link('Observation runs',observationRuns));
    const permissions=node('p','Check GitHub now needs Actions: Read and write on jsdyer/jsdyer.github.io for the token used to unlock this admin. Viewing the saved report does not. ');
    permissions.append(link('Edit fine-grained token permissions','https://github.com/settings/personal-access-tokens'),' · ',link('Run the check on GitHub',observationRuns));
    root.replaceChildren(toolbar,permissions,status,requested,content,history,links);
    let report,request,timer,requestedAt,deadline;
    const ageTimer=setInterval(()=>{if(panel.open && !refresh.disabled)render();},60000);
    sessionSignal.addEventListener('abort',()=>{clearTimeout(timer);clearInterval(ageTimer);request?.abort();},{once:true});
    function render() {
      if(!report)return;
      const summary=Object.entries(statuses).map(([key,label])=>report.rows.filter(r=>r.status===key).length+' '+label.toLowerCase()).join(' · ');
      status.textContent=snapshotDescription(report)+' '+summary;
      const rows=matchingOutcomes(report.rows,filter.value,search.value);
      content.replaceChildren();
      if(!rows.length){content.append(node('p','No workflows match this filter.'));return;}
      const table=node('table');table.tabIndex=0;table.setAttribute('aria-label','Workflow and published-output comparison');table.append(node('caption',rows.length+(rows.length===1?' workflow':' workflows')+' · Results observed at the report time'));
      const head=node('thead'),headers=node('tr');for(const text of ['Tool','Workflow execution','Published output evidence','Result']){const th=node('th',text);th.scope='col';headers.append(th);}head.append(headers);table.append(head);
      const body=node('tbody');for(const row of rows)body.append(renderOutcome(row));table.append(body);content.append(table);
    }
    async function load() {
      request?.abort();request=new AbortController();
      const signal=AbortSignal.any([request.signal,sessionSignal,AbortSignal.timeout(20000)]);
      refresh.disabled=true;status.textContent='Loading the latest saved outcome report…';
      try {
        const url=reportUrl+'?check='+Date.now();
        const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-cache'});
        if(!response.ok)throw Error(response.status===404?'The first outcome report has not been published yet.':'The outcome report could not be loaded (HTTP '+response.status+').');
        const next=validateReport(await response.json());if(signal.aborted)return;report=next;
        links.querySelector('a').href=url;
        history.replaceChildren(renderOutcomeHistory(report));render();
        if(requestedAt!==undefined && includesFreshCheck(report,requestedAt)) {
          requested.textContent='A fresh check has finished. The table now shows the new saved report.';
          requestedAt=undefined;clearTimeout(timer);check.disabled=false;
        }
      } catch(error) {if(!signal.aborted || error.name==='TimeoutError'){content.replaceChildren();history.replaceChildren();report=null;status.textContent=error.name==='TimeoutError'?'Outcome report request timed out; retry or open the observation runs.':error.message;}}
      finally {if(!sessionSignal.aborted)refresh.disabled=false;}
    }
    async function poll() {
      if(sessionSignal.aborted || requestedAt===undefined)return;
      if(Date.now()>=deadline){requested.textContent='A fresh report has not arrived yet. GitHub may still have it queued or running; open Observation runs for progress, then load the saved report.';requestedAt=undefined;check.disabled=false;return;}
      if(panel.open)await load();
      if(requestedAt!==undefined)timer=setTimeout(poll,20000);
    }
    check.addEventListener('click',async()=>{
      check.disabled=true;requested.textContent='Requesting a new report from GitHub…';
      try {
        requestedAt=await requestOutcomeCheck(session);deadline=Date.now()+15*60000;
        requested.textContent='GitHub accepted the request. Waiting for the new report; the table still shows the saved snapshot. This checks results and published metadata; it does not retry collectors.';
        timer=setTimeout(poll,20000);
      } catch(error) {if(!sessionSignal.aborted){requested.textContent=error.message;check.disabled=false;}}
    });
    filter.addEventListener('change',render);search.addEventListener('input',render);refresh.addEventListener('click',load);load();
  }
}
