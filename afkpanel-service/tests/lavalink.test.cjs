'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { WebSocketServer } = require('ws');
const { LavalinkConnection } = require('../lavalink.cjs');

test('real local WebSocket + HTTP exchange waits for node readiness, forwards only voice credentials, and deletes the player', async () => {
  const requests = [], states = [], failures = [];
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    requests.push({ method: req.method, path: req.url, authorization: req.headers.authorization, body: Buffer.concat(chunks).toString() });
    res.writeHead(req.method === 'DELETE' ? 204 : 200, { 'Content-Type': 'application/json' });
    res.end(req.method === 'DELETE' ? undefined : JSON.stringify({ state: { connected: true } }));
  });
  const wss = new WebSocketServer({ server, path: '/v4/websocket' });
  let handshake;
  wss.on('connection', (socket, req) => { handshake = req.headers; socket.send(JSON.stringify({ op: 'ready', sessionId: 'TEST_NODE_SESSION', resumed: false })); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const transport = new LavalinkConnection({ host: '127.0.0.1', port: server.address().port, secure: false, password: 'FAKE_NODE_PASSWORD' }, '300000000000000001', '100000000000000001', state => states.push(state), error => failures.push(error.code));
  try {
    await transport.connect();
    assert.equal(handshake['user-id'], '300000000000000001');
    const voice = { token: 'FAKE_EPHEMERAL_VOICE_TOKEN', endpoint: 'voice.example.invalid:443', sessionId: 'VOICE_SESSION', channelId: '200000000000000001' };
    transport.updateVoice(voice); transport.updateVoice(voice); await transport.updatePromise;
    assert.deepEqual(states, [true]); assert.equal(requests.length, 1);
    assert.equal(requests[0].method, 'PATCH'); assert.equal(JSON.parse(requests[0].body).voice.channelId, voice.channelId);
    assert.ok(!requests[0].body.includes('FAKE_ACCOUNT_TOKEN'));
    await transport.destroy();
    assert.equal(requests.at(-1).method, 'DELETE'); assert.deepEqual(failures, []);
  } finally {
    await transport.destroy(); for (const client of wss.clients) client.terminate();
    await new Promise(resolve => wss.close(resolve)); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
