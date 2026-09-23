'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { AccountSession, SessionManager } = require('../session.cjs');
const { PublicError } = require('../errors.cjs');

const token = 'FAKE_ACCOUNT_FOR_TESTS.segment.SIGNATURE_NOT_A_REAL_TOKEN';
const guildId = '100000000000000001', channelId = '200000000000000001', userId = '300000000000000001';
const input = { token, guildId, channelId };
const node = { host: '127.0.0.1', port: 2333, secure: false, password: 'FAKE_NODE_PASSWORD' };
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixtures(options = {}) {
  const sent = [], transports = [], clients = [];
  class Client extends EventEmitter {
    constructor() {
      super(); clients.push(this); this.user = { id: userId, username: 'test_user', bot: Boolean(options.bot) };
      this.channels = { fetch: async () => ({ type: 'GUILD_VOICE', guild: { id: options.wrongGuild ? '999999999999999999' : guildId, shard: { send: payload => sent.push(payload) } }, permissionsFor: () => ({ has: () => !options.denied }) }) };
    }
    async login(value) { this.token = value; if (options.reject) throw Error(`private library detail ${value}`); await options.loginWait; }
    destroy() { this.destroyed = true; this.token = null; }
  }
  class Transport {
    constructor(n, u, g, onState, onFailure) { this.node = n; this.userId = u; this.guildId = g; this.onState = onState; this.onFailure = onFailure; this.updates = []; transports.push(this); }
    async connect() { if (options.nodeDown) throw new PublicError('LAVALINK_OFFLINE'); }
    updateVoice(data) { this.updates.push(data); }
    async destroy() { this.destroyed = true; }
  }
  return { Client, Transport, sent, transports, clients };
}

function packets(session, reverse = false) {
  const state = { t: 'VOICE_STATE_UPDATE', d: { user_id: userId, guild_id: guildId, channel_id: channelId, session_id: 'TEST_VOICE_SESSION' } };
  const server = { t: 'VOICE_SERVER_UPDATE', d: { guild_id: guildId, endpoint: 'voice.example.invalid:443', token: 'FAKE_EPHEMERAL_VOICE_TOKEN' } };
  for (const packet of reverse ? [state, server] : [server, state]) session.onPacket(packet);
}

test('session needs both voice events and confirmed transport; stopping releases account credentials', async () => {
  for (const reverse of [false, true]) {
    const f = fixtures(); let claimed = false, released = false;
    const session = new AccountSession(input, node, () => { claimed = true; }, () => { released = true; }, f);
    try {
      await session.start();
      assert.equal(session.status, 'connecting'); assert.ok(claimed);
      assert.deepEqual(f.sent, [{ op: 4, d: { guild_id: guildId, channel_id: channelId, self_mute: true, self_deaf: true } }]);
      f.transports[0].onState(true);
      assert.equal(session.status, 'connecting');
      packets(session, reverse);
      assert.equal(f.transports[0].updates.length, 1);
      assert.equal(f.transports[0].updates[0].channelId, channelId);
      assert.ok(!JSON.stringify(f.transports[0].updates).includes(token));
      f.transports[0].onState(true);
      assert.equal(session.status, 'connected');
      assert.ok(!JSON.stringify(session.publicData()).includes(token));
      session.onPacket({ t: 'MESSAGE_CREATE', d: { content: 'not used' } });
      assert.equal(f.transports[0].updates.length, 1);
      await session.stop();
      assert.equal(session.status, 'stopped'); assert.ok(released);
      assert.equal(f.sent.at(-1).d.channel_id, null);
      assert.equal(session.token, ''); assert.equal(session.client, null); assert.equal(f.clients[0].token, null);
      assert.ok(f.transports[0].destroyed);
    } finally { await session.stop(); }
  }
});

test('expired tokens, bot tokens, forbidden channels, and node failure fail without false success', async () => {
  for (const [options, code] of [[{ reject: true }, 'LOGIN_FAILED'], [{ bot: true }, 'USER_ONLY'], [{ denied: true }, 'CHANNEL'], [{ wrongGuild: true }, 'CHANNEL'], [{ nodeDown: true }, 'LAVALINK_OFFLINE']]) {
    const f = fixtures(options);
    const session = new AccountSession(input, node, () => {}, () => {}, f);
    await session.start();
    assert.equal(session.status, 'error'); assert.equal(session.errorCode, code);
    assert.equal(f.sent.length, 0); assert.ok(f.clients[0].destroyed);
    assert.ok(!JSON.stringify(session.publicData()).includes(token));
  }
});

test('leaving or being moved stops the session without rejoining or disconnecting the new channel', async () => {
  const f = fixtures(); const session = new AccountSession(input, node, () => {}, () => {}, f);
  await session.start(); packets(session); f.transports[0].onState(true);
  session.onPacket({ t: 'VOICE_STATE_UPDATE', d: { user_id: userId, guild_id: guildId, channel_id: '400000000000000001' } });
  await tick();
  assert.equal(session.status, 'error'); assert.equal(session.errorCode, 'MOVED');
  assert.equal(f.sent.length, 1); assert.ok(f.transports[0].destroyed);
});

test('stop during a pending login prevents a later join', async () => {
  let finish;
  const f = fixtures({ loginWait: new Promise(resolve => { finish = resolve; }) });
  const session = new AccountSession(input, node, () => {}, () => {}, f);
  const starting = session.start(); await session.stop(); finish(); await starting;
  assert.equal(session.status, 'stopped'); assert.equal(f.sent.length, 0); assert.equal(f.transports.length, 0);
});

test('manager deduplicates both the token and the resolved account ID, limits starts, and shuts down', async t => {
  let now = 1000; t.mock.method(Date, 'now', () => now);
  const f = fixtures(); const manager = new SessionManager({ maxSessions: 3, node }, f);
  try {
    manager.create(input); await tick();
    assert.throws(() => manager.create(input), error => error.code === 'DUPLICATE');
    const changed = { ...input, token: token + '_ROTATED' };
    assert.throws(() => manager.create(changed), error => error.code === 'WAIT');
    now += 4000;
    manager.create(changed); await tick();
    assert.equal(manager.list()[1].errorCode, 'DUPLICATE');
    assert.equal(f.transports.length, 1);
    await manager.close();
    assert.ok(manager.list().every(s => ['error', 'stopped'].includes(s.status)));
    assert.throws(() => manager.create(input), error => error.code === 'STOPPING');
  } finally { await manager.close(); }
});

module.exports = { fixtures, input, node };
