'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { createServer } = require('../server.cjs');
const { PublicError } = require('../errors.cjs');

test('HTTP API authenticates every route, rejects browser origins and malformed input, and never returns submitted tokens', async () => {
  const key = 'TEST_KEY_DO_NOT_USE_IN_PRODUCTION_123456789';
  const fakeToken = 'FAKE_USER_TOKEN_FOR_TESTS.segment.NOT_A_REAL_TOKEN';
  const records = new Map(); let creates = 0;
  const manager = {
    list: () => [...records.values()],
    create: ({ guildId, channelId }) => {
      creates++;
      const record = { id: randomUUID(), guildId, channelId, status: 'starting' }; records.set(record.id, record); return record;
    },
    stop: async (id, remove) => {
      const record = records.get(id); if (!record) throw new PublicError('NOT_FOUND', 404);
      record.status = 'stopped'; if (remove) records.delete(id); return record;
    }
  };
  const { server } = createServer({ apiKey: key, maxSessions: 3 }, manager);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const input = { token: fakeToken, guildId: '100000000000000001', channelId: '200000000000000001' };
  try {
    for (const path of ['/v1/health', '/v1/sessions']) {
      const response = await fetch(base + path); assert.equal(response.status, 401); await response.text();
    }
    let response = await fetch(base + '/v1/sessions', { headers: { ...headers, Origin: 'https://untrusted.invalid' } });
    assert.equal(response.status, 403); await response.text();
    response = await fetch(base + '/v1/sessions', { method: 'POST', headers, body: JSON.stringify({ ...input, channelId: '../wrong' }) });
    assert.equal(response.status, 400); assert.ok(!(await response.text()).includes(fakeToken)); assert.equal(creates, 0);
    response = await fetch(base + '/v1/sessions', { method: 'POST', headers, body: JSON.stringify({ ...input, padding: 'x'.repeat(9000) }) });
    assert.equal(response.status, 413); await response.text(); assert.equal(creates, 0);
    response = await fetch(base + '/v1/sessions', { method: 'POST', headers, body: JSON.stringify(input) });
    assert.equal(response.status, 202); const created = await response.json(); assert.ok(!JSON.stringify(created).includes(fakeToken));
    response = await fetch(base + '/v1/sessions', { headers });
    const listed = await response.json(); assert.equal(listed.value.sessions.length, 1); assert.ok(!JSON.stringify(listed).includes(fakeToken));
    response = await fetch(base + `/v1/sessions/${created.value.id}/stop`, { method: 'POST', headers });
    assert.equal((await response.json()).value.status, 'stopped');
    response = await fetch(base + `/v1/sessions/${created.value.id}`, { method: 'DELETE', headers }); await response.text();
    assert.equal(records.size, 0);
    response = await fetch(base + '/v1/sessions/' + randomUUID(), { method: 'DELETE', headers });
    assert.equal(response.status, 404); await response.text();
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
