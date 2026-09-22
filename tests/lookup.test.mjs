import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, normalizeId } from '../lib/lookup.mjs';
import { encrypt, decrypt } from '../lib/data.mjs';

const fixture = { id: '00001', name: 'นักเรียนตัวอย่าง', before: 30, after: 0, final: 'ขาดสอบ', total: 30, grade: '0' };
const handler = createHandler(() => [fixture]);
const request = (body, options = {}) => new Request('https://school.test/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...options });

test('exact lookup preserves zero, absence, original grade and leading zeros', async () => {
  const response = await handler(request({ studentId: '00001' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { student: fixture });
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('Thai and fullwidth digits normalize without accepting non-text input', () => {
  assert.equal(normalizeId(' ๐๐๐๐๑ '), '00001');
  assert.equal(normalizeId('００００１'), '00001');
  assert.equal(normalizeId(1), '');
});
test('invalid, missing, malformed and unknown input do not return records', async () => {
  for (const studentId of ['', '1234', '123456', 'abcde', 1, null, ['00001']]) assert.equal((await handler(request({ studentId }))).status, 400);
  assert.equal((await handler(request(null))).status, 400);
  assert.equal((await handler(request({ studentId: '99999' }))).status, 404);
  assert.equal((await handler(request({}, { body: '{' }))).status, 400);
  assert.equal((await handler(request({}, { body: ' '.repeat(257) }))).status, 400);
});
test('GET, cross-origin and non-JSON requests are rejected', async () => {
  assert.equal((await handler(new Request('https://school.test/api/score'))).status, 405);
  assert.equal((await handler(request({ studentId: '00001' }, { headers: { 'Content-Type': 'application/json', Origin: 'https://other.test' } }))).status, 403);
  assert.equal((await handler(request({}, { headers: { 'Content-Type': 'text/plain' } }))).status, 415);
});
test('missing server data returns a generic unavailable response', async () => {
  const broken = createHandler(() => { throw new Error('private detail'); });
  const response = await broken(request({ studentId: '00001' }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'UNAVAILABLE' });
});
test('authenticated encryption round trips and rejects the wrong key or tampering', () => {
  const key = '01'.repeat(32);
  const envelope = encrypt([fixture], key);
  assert.deepEqual(decrypt(envelope, key), [fixture]);
  assert.throws(() => decrypt(envelope, '02'.repeat(32)));
  assert.throws(() => decrypt(envelope, ''));
  const damaged = { ...envelope, tag: Buffer.alloc(16).toString('base64') };
  assert.throws(() => decrypt(damaged, key));
});
