import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';

export function encrypt(data, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), body: body.toString('base64') };
}

export function decrypt(envelope, key) {
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('Missing data key');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.body, 'base64')), decipher.final()]).toString('utf8'));
}
