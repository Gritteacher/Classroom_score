export function normalizeId(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[๐-๙]/g, d => String(d.charCodeAt(0) - 3664)).replace(/[０-９]/g, d => String(d.charCodeAt(0) - 65296));
}

export function createHandler(loadRecords) {
  const reply = (body, status = 200) => Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, private', 'Netlify-CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
  return async request => {
    if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return reply({ error: 'FORBIDDEN' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'INVALID_REQUEST' }, 415);
    let input;
    try {
      const body = await request.text();
      if (body.length > 256) return reply({ error: 'INVALID_REQUEST' }, 400);
      input = JSON.parse(body);
    } catch { return reply({ error: 'INVALID_REQUEST' }, 400); }
    const id = normalizeId(input?.studentId);
    if (!/^\d{5}$/.test(id)) return reply({ error: 'INVALID_ID' }, 400);
    try {
      const records = loadRecords();
      const record = records.find(r => r.id === id);
      if (!record) return reply({ error: 'NOT_FOUND' }, 404);
      return reply({ student: record });
    } catch { return reply({ error: 'UNAVAILABLE' }, 503); }
  };
}
