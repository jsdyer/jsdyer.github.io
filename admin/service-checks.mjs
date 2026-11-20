import { SERVICE } from '../assets/service.mjs';

const site = 'https://coolcode.ca';
const checks = [
  {name: 'Homepage', url: site + '/', valid: body => body.includes('data-featured-grid') && body.includes('https://coolcode.ca/')},
  {name: 'Tool catalogue', url: site + '/assets/tool-catalog.json', valid(body) {
    const tools = JSON.parse(body);
    return Array.isArray(tools) && tools.length > 0 && tools.every(t => t && typeof t.id === 'string' && typeof t.title === 'string');
  }},
  {name: 'Search sitemap', url: site + '/sitemap.xml', valid: body =>
    body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') && body.includes('<loc>https://coolcode.ca/</loc>')},
  {name: 'Visitor API and D1', url: SERVICE + '/health', valid: body => JSON.parse(body)?.ok === true},
];

export async function runChecks(signal, request = fetch) {
  return Promise.all(checks.map(async ({name, url, valid}) => {
    const start = performance.now();
    const timeout = AbortSignal.timeout(12000);
    let status = null, detail;
    try {
      const response = await request(url, {signal: AbortSignal.any([timeout, signal]), method: 'GET',
        credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer'});
      status = response.status;
      if (!response.ok) detail = 'HTTP ' + status;
      else {
        const body = await response.text();
        try { if (!valid(body)) detail = 'Unexpected content'; }
        catch { detail = 'Unexpected content'; }
      }
    } catch {
      if (signal.aborted) throw signal.reason;
      detail = timeout.aborted ? 'Timed out after 12 s' : 'Request could not finish';
    }
    return {name, url, ok: !detail, status, detail: detail || 'Passed', ms: Math.round(performance.now() - start)};
  }));
}
