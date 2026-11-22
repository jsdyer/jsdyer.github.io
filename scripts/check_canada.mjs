import { appendFile, writeFile } from 'node:fs/promises';
import { runCanadaChecks } from '../admin/canada-probes.mjs';

const result = await runCanadaChecks();
await writeFile('canada-probes.json', JSON.stringify(result, null, 2) + '\n');
const clean = value => String(value ?? '—').replace(/[|<>\r\n]/g, ' ');
const summary = ['## Canadian probe observations', result.checkedAt, '',
  '|Requested city|Actual probe / network|Destination|Check|Result|Time (ms)|', '|---|---|---|---|---|---|'];
for (const row of result.rows) {
  summary.push('| ' + [row.city, row.probeCity && [row.probeCity, row.network, 'AS' + row.asn].join(' · '),
    row.target, row.check, row.status, row.ms].map(clean).join(' | ') + ' |');
}
const report = summary.join('\n') + '\n';
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
if (result.rows.some(row => row.collectionError)) process.exitCode = 1;
