import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { encrypt, decrypt } from '../lib/data.mjs';

const path = process.argv[2];
if (!path) throw new Error('Usage: npm run import -- /absolute/path/to/workbook.xlsx (Python with openpyxl required)');
const python = process.env.PYTHON_BIN || 'python3';
const rows = JSON.parse(execFileSync(python, ['-c', `
import openpyxl,json,sys
w=openpyxl.load_workbook(sys.argv[1],data_only=True)
s=w.active
expected=['รหัสนักเรียน','คำนำหน้า','ชื่อ','สกุล','ก่อนกลางภาค','หลังกลางภาค','สอบปลายภาค','รวม','เกรด']
rows=list(s.values)
assert list(rows[0])==expected, 'Workbook columns do not match'
print(json.dumps([list(r) for r in rows[1:] if any(v is not None for v in r)],ensure_ascii=False))
`, path], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }));
const ids = new Set();
const records = rows.map((r, i) => {
  const id = String(r[0]);
  if (!/^\d{5}$/.test(id) || ids.has(id)) throw new Error(`Invalid/duplicate ID at row ${i + 2}`);
  ids.add(id);
  if (r.slice(1, 4).some(x => !String(x ?? '').trim())) throw new Error(`Missing name at row ${i + 2}`);
  if (r.slice(4, 8).some(x => !(typeof x === 'number' && Number.isFinite(x) && x >= 0) && x !== 'ขาดสอบ')) throw new Error(`Invalid score at row ${i + 2}`);
  if (typeof r[7] !== 'number' || r[7] > 100 || !['0','1','1.5','2','2.5','3','3.5','4'].includes(String(r[8]))) throw new Error(`Invalid total/grade at row ${i + 2}`);
  if (r.slice(4, 7).every(x => typeof x === 'number') && Math.abs(r[4]+r[5]+r[6]-r[7]) > 0.001) throw new Error(`Total mismatch at row ${i + 2}`);
  return { id, name: `${r[1]}${r[2]} ${r[3]}`, before: r[4], after: r[5], final: r[6], total: r[7], grade: String(r[8]) };
});
let key = process.env.SCORE_DATA_KEY;
if (!key) {
  if (fs.existsSync('.env')) throw new Error('Existing .env has no SCORE_DATA_KEY; refusing to overwrite');
  key = randomBytes(32).toString('hex');
  fs.writeFileSync('.env', `SCORE_DATA_KEY=${key}\n`, { mode: 0o600 });
}
if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('SCORE_DATA_KEY must be 64 hexadecimal characters');
const encrypted = encrypt(records, key);
if (JSON.stringify(decrypt(encrypted, key)) !== JSON.stringify(records)) throw new Error('Encryption verification failed');
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/scores.enc.json', JSON.stringify(encrypted));
console.log(`Imported and verified ${records.length} records. Plaintext is not written to the repository.`);
