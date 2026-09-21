'use strict';
const { PublicError } = require('./errors.cjs');

class LavalinkConnection {
  constructor(node, userId, guildId, onState, onFailure, dependencies = {}) {
    this.node = node;
    this.userId = userId;
    this.guildId = guildId;
    this.onState = onState;
    this.onFailure = onFailure;
    this.WebSocket = dependencies.WebSocket || require('ws');
    this.fetch = dependencies.fetch || global.fetch;
    this.base = `${node.secure ? 'https' : 'http'}://${node.host}:${node.port}`;
    this.closed = false;
    this.controller = new AbortController();
    this.updatePromise = Promise.resolve();
    this.lastVoice = '';
  }

  async request(method, route, body, signal = this.controller.signal) {
    const response = await this.fetch(this.base + route, {
      method, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      headers: { Authorization: this.node.password, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) { await response.body?.cancel(); throw new PublicError('LAVALINK_VOICE'); }
    if (response.status === 204) return null;
    // Parse only bounded responses; never surface server bodies in errors or logs.
    const reader = response.body?.getReader();
    if (!reader) throw new PublicError('LAVALINK_VOICE');
    const chunks = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 64 * 1024) { await reader.cancel(); throw new PublicError('LAVALINK_VOICE'); }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  connect() {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true; clearTimeout(this.readyTimer);
        error ? reject(error) : resolve();
      };
      this.finishConnect = finish;
      this.readyTimer = setTimeout(() => finish(new PublicError('LAVALINK_OFFLINE')), 12_000);
      const ws = this.socket = new this.WebSocket(this.base.replace(/^http/, 'ws') + '/v4/websocket', {
        headers: { Authorization: this.node.password, 'User-Id': this.userId, 'Client-Name': 'Mc5mr-AFKPanel/1.0.0' },
        maxPayload: 256 * 1024, handshakeTimeout: 10_000, followRedirects: false
      });
      this.lastActivity = Date.now();
      ws.on('pong', () => { this.lastActivity = Date.now(); });
      ws.on('message', data => {
        if (this.closed) return;
        this.lastActivity = Date.now();
        let packet; try { packet = JSON.parse(data.toString()); } catch { return; }
        if (packet.op === 'ready' && typeof packet.sessionId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(packet.sessionId)) {
          this.sessionId = packet.sessionId;
          finish();
        } else if (packet.op === 'playerUpdate' && packet.guildId === this.guildId && typeof packet.state?.connected === 'boolean') {
          this.onState(packet.state.connected);
        } else if (packet.op === 'event' && packet.guildId === this.guildId && packet.type === 'WebSocketClosedEvent') {
          this.onFailure(new PublicError('DISCONNECTED'));
        }
      });
      ws.on('error', () => {
        finish(new PublicError('LAVALINK_OFFLINE'));
        if (!this.closed) this.onFailure(new PublicError('LAVALINK_OFFLINE'));
      });
      ws.on('close', () => {
        finish(new PublicError('LAVALINK_OFFLINE'));
        if (!this.closed) this.onFailure(new PublicError('DISCONNECTED'));
      });
      this.pingTimer = setInterval(() => {
        if (this.closed) return;
        if (Date.now() - this.lastActivity > 60_000) return this.onFailure(new PublicError('LAVALINK_OFFLINE'));
        if (ws.readyState === 1) ws.ping();
      }, 20_000);
      this.pingTimer.unref();
    });
  }

  updateVoice(voice) {
    if (this.closed || !this.sessionId) return;
    const fingerprint = JSON.stringify(voice);
    if (fingerprint === this.lastVoice) return;
    this.lastVoice = fingerprint;
    this.updatePromise = this.updatePromise.then(async () => {
      if (this.closed) return;
      const result = await this.request('PATCH', `/v4/sessions/${this.sessionId}/players/${this.guildId}`, { voice });
      if (!this.closed && result?.state?.connected === true) this.onState(true);
    }).catch(() => { if (!this.closed) this.onFailure(new PublicError('LAVALINK_VOICE')); });
  }

  async destroy() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.readyTimer); clearInterval(this.pingTimer);
    this.finishConnect?.(new PublicError('DISCONNECTED'));
    this.controller.abort();
    await this.updatePromise;
    if (this.sessionId) {
      try { await this.request('DELETE', `/v4/sessions/${this.sessionId}/players/${this.guildId}`, undefined, AbortSignal.timeout(2500)); } catch { /* best-effort release */ }
    }
    this.socket?.terminate();
    this.lastVoice = '';
    this.node = { ...this.node, password: '' };
  }
}

module.exports = { LavalinkConnection };
