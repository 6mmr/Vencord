'use strict';
const { randomUUID, createHash } = require('node:crypto');
const { PublicError } = require('./errors.cjs');
const { LavalinkConnection } = require('./lavalink.cjs');

const activeStates = new Set(['starting', 'connecting', 'connected', 'stopping']);

function withTimeout(promise, ms, code) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new PublicError(code)), ms); timer.unref(); })])
    .finally(() => clearTimeout(timer));
}

class AccountSession {
  constructor(input, node, claim, release, dependencies = {}) {
    this.id = randomUUID();
    this.token = input.token;
    this.tokenHash = createHash('sha256').update(input.token).digest('hex');
    this.guildId = input.guildId;
    this.channelId = input.channelId;
    this.node = node;
    this.claim = claim;
    this.release = release;
    this.dependencies = dependencies;
    this.status = 'starting';
    this.createdAt = Date.now();
    this.errorCode = null;
  }

  get active() { return activeStates.has(this.status); }

  publicData() {
    return { id: this.id, userId: this.userId || '', username: this.username || '',
      guildId: this.guildId, channelId: this.channelId, status: this.status,
      createdAt: this.createdAt, connectedAt: this.connectedAt || null, errorCode: this.errorCode };
  }

  async start() {
    try {
      const Client = this.dependencies.Client || require('discord.js-selfbot-v13').Client;
      const client = this.client = new Client({
        presence: { status: 'idle', activities: [], afk: true },
        allowedMentions: { parse: [] }, restRequestTimeout: 10_000, retryLimit: 0
      });
      // Do not attach debug/error loggers: library events can contain credentials.
      client.on('error', () => { void this.fail(new PublicError('LOGIN_FAILED')); });
      client.on('invalidated', () => { void this.fail(new PublicError('LOGIN_FAILED')); });
      client.on('raw', packet => this.onPacket(packet));
      try { await withTimeout(client.login(this.token), 30_000, 'LOGIN_FAILED'); }
      catch { throw new PublicError('LOGIN_FAILED'); }
      this.token = '';
      if (!this.active || this.stopping) return;
      if (!client.user || client.user.bot) throw new PublicError('USER_ONLY');
      this.userId = client.user.id;
      this.username = String(client.user.username || '').slice(0, 80);
      this.claim(this);
      let channel;
      try { channel = await withTimeout(client.channels.fetch(this.channelId), 12_000, 'CHANNEL'); }
      catch { throw new PublicError('CHANNEL'); }
      if (!this.active || this.stopping) return;
      if (!channel || channel.type !== 'GUILD_VOICE' || channel.guild?.id !== this.guildId
        || !channel.permissionsFor(client.user)?.has('CONNECT')) throw new PublicError('CHANNEL');
      this.guild = channel.guild;
      this.status = 'connecting';
      const Transport = this.dependencies.Transport || LavalinkConnection;
      this.voice = new Transport(this.node, this.userId, this.guildId,
        connected => this.onVoiceConnection(connected), error => { void this.fail(error); });
      await this.voice.connect();
      if (!this.active || this.stopping) return;
      this.joinRequested = true;
      this.voiceTimer = setTimeout(() => { void this.fail(new PublicError('VOICE_TIMEOUT')); }, 45_000);
      this.guild.shard.send({ op: 4, d: {
        guild_id: this.guildId, channel_id: this.channelId, self_mute: true, self_deaf: true
      } });
    } catch (error) {
      this.token = '';
      await this.fail(error instanceof PublicError ? error : new PublicError('SERVICE_ERROR'));
    }
  }

  onPacket(packet) {
    if (!this.joinRequested || this.stopping || !this.active || !packet?.d) return;
    const data = packet.d;
    if (packet.t === 'VOICE_STATE_UPDATE' && data.user_id === this.userId && data.guild_id === this.guildId) {
      if (data.channel_id !== this.channelId) {
        void this.fail(new PublicError('MOVED'), false);
        return;
      }
      if (typeof data.session_id === 'string') this.voiceState = { sessionId: data.session_id };
    } else if (packet.t === 'VOICE_SERVER_UPDATE' && data.guild_id === this.guildId) {
      if (typeof data.endpoint !== 'string' || !data.endpoint || typeof data.token !== 'string' || !data.token) { this.voiceServer = null; return; }
      this.voiceServer = { endpoint: data.endpoint, token: data.token };
    } else return;
    if (this.voiceState && this.voiceServer) this.voice.updateVoice({
      ...this.voiceServer, sessionId: this.voiceState.sessionId, channelId: this.channelId
    });
  }

  onVoiceConnection(connected) {
    if (this.stopping || !this.active) return;
    if (connected && this.voiceState && this.voiceServer) {
      clearTimeout(this.voiceTimer);
      this.status = 'connected';
      this.connectedAt ||= Date.now();
    } else if (!connected && this.status === 'connected') {
      void this.fail(new PublicError('DISCONNECTED'));
    }
  }

  fail(error, leave = true) {
    if (this.stopping || this.status === 'stopping' || !this.active) return Promise.resolve();
    return this.stop(error.code || 'SERVICE_ERROR', leave);
  }

  stop(errorCode = null, leave = true) {
    if (this.stopping) return this.stopping;
    if (!this.active) return Promise.resolve();
    this.status = 'stopping';
    this.errorCode = errorCode;
    clearTimeout(this.voiceTimer);
    this.stopping = (async () => {
      if (leave && this.joinRequested) {
        try { this.guild?.shard.send({ op: 4, d: { guild_id: this.guildId, channel_id: null, self_mute: true, self_deaf: true } }); } catch { /* client already closed */ }
      }
      try { await this.voice?.destroy(); } catch { /* close the Discord session regardless */ }
      try { await this.client?.destroy(); } catch { /* already destroyed */ }
      this.client = null;
      this.voice = null;
      this.voiceState = null;
      this.voiceServer = null;
      this.token = '';
      this.tokenHash = '';
      this.node = null;
      this.guild = null;
      this.status = errorCode ? 'error' : 'stopped';
      this.release(this);
    })();
    return this.stopping;
  }
}

class SessionManager {
  constructor(config, dependencies = {}) {
    this.config = config;
    this.dependencies = dependencies;
    this.sessions = new Map();
    this.accounts = new Map();
    this.nextStart = 0;
    this.closing = false;
  }

  list() { return [...this.sessions.values()].map(session => session.publicData()); }

  create(input) {
    if (this.closing) throw new PublicError('STOPPING', 503);
    const active = [...this.sessions.values()].filter(session => session.active);
    if (active.length >= this.config.maxSessions) throw new PublicError('LIMIT', 409);
    const hash = createHash('sha256').update(input.token).digest('hex');
    if (active.some(session => session.tokenHash === hash)) throw new PublicError('DUPLICATE', 409);
    if (Date.now() < this.nextStart) throw new PublicError('WAIT', 429);
    this.nextStart = Date.now() + 3000;
    const session = new AccountSession(input, this.config.node, current => {
      const existing = this.accounts.get(current.userId);
      if (existing && existing !== current.id) throw new PublicError('DUPLICATE', 409);
      this.accounts.set(current.userId, current.id);
    }, current => {
      if (this.accounts.get(current.userId) === current.id) this.accounts.delete(current.userId);
    }, this.dependencies);
    if (this.sessions.size >= 20) {
      for (const [id, old] of this.sessions) {
        if (!old.active) { this.sessions.delete(id); break; }
      }
    }
    this.sessions.set(session.id, session);
    void session.start();
    return session.publicData();
  }

  async stop(id, remove = false) {
    const session = this.sessions.get(id);
    if (!session) throw new PublicError('NOT_FOUND', 404);
    await session.stop();
    if (remove) this.sessions.delete(id);
    return session.publicData();
  }

  async close() {
    this.closing = true;
    await Promise.allSettled([...this.sessions.values()].map(session => session.stop()));
  }
}

module.exports = { AccountSession, SessionManager, activeStates };
