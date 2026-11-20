// Run the same public, read-only probes as the owner dashboard from an external runner.
import { appendFileSync } from 'node:fs';
import { runChecks } from '../admin/service-checks.mjs';

const checkedAt = new Date().toISOString();
const results = await runChecks(new AbortController().signal);
const summary = [
  '## CoolCode service checks',
  '',
  'Checked at ' + checkedAt + ' from a GitHub Actions runner.',
  '',
  '| Service | Result | HTTP | Elapsed |',
  '| --- | --- | --- | --- |',
  ...results.map(row => `| [${row.name}](${row.url}) | ${row.detail} | ${row.status ?? '—'} | ${row.ms} ms |`),
  '',
];
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
if (results.some(r => !r.ok)) process.exitCode = 1;
