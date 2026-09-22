import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const file of ['public/app.js', 'netlify/functions/score.mjs', 'lib/lookup.mjs', 'lib/data.mjs']) execFileSync(process.execPath, ['--check', file]);
for (const file of ['public/index.html', 'public/styles.css', 'data/scores.enc.json']) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const data = JSON.parse(fs.readFileSync('data/scores.enc.json'));
if (!data.body || !data.iv || !data.tag || data.version !== 1) throw new Error('Invalid encrypted data');
console.log('Build verified: static frontend and encrypted server data ready.');
