'use strict';

const messages = Object.freeze({
  BAD_INPUT: 'Enter one complete user token and valid server and voice-channel IDs.',
  UNAUTHORIZED: 'The AFK service key is missing or incorrect.',
  LIMIT: 'Stop an existing session before starting another account.',
  WAIT: 'Wait a few seconds before starting another session.',
  DUPLICATE: 'This account already has an active AFK session.',
  LOGIN_FAILED: 'Discord did not allow this sign-in. Check the token or sign in normally.',
  USER_ONLY: 'Use a user account you own. This service does not accept bot tokens.',
  CHANNEL: 'The voice channel is unavailable, belongs to another server, or you cannot connect to it.',
  LAVALINK_OFFLINE: 'Could not connect to the configured Lavalink node.',
  LAVALINK_VERSION: 'The Lavalink node must support API v4 and current Discord voice encryption.',
  LAVALINK_VOICE: 'The Lavalink node could not establish the voice connection.',
  VOICE_TIMEOUT: 'Voice connection was not confirmed. Check the channel permissions and Lavalink version.',
  DISCONNECTED: 'The voice connection ended. Start the session again when ready.',
  MOVED: 'The account left or was moved out of the selected channel. AFK was stopped.',
  SERVICE_ERROR: 'The operation could not be completed. No automatic retry was made.',
  NOT_FOUND: 'This session is no longer available.',
  STOPPING: 'The service is shutting down.'
});

class PublicError extends Error {
  constructor(code, status = 400) { super(messages[code] || messages.SERVICE_ERROR); this.code = code in messages ? code : 'SERVICE_ERROR'; this.status = status; }
}

function errorResult(error) {
  const safe = error instanceof PublicError ? error : new PublicError('SERVICE_ERROR', 500);
  return { status: safe.status, body: { ok: false, code: safe.code, error: safe.message } };
}

function validateStart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PublicError('BAD_INPUT');
  const { token, guildId, channelId } = value;
  if (typeof token !== 'string' || token.length < 20 || token.length > 2048 || !/^[\w.-]+$/.test(token)
    || !(token.startsWith('mfa.') || token.split('.').length === 3)
    || typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)
    || typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) throw new PublicError('BAD_INPUT');
  return { token, guildId, channelId };
}

module.exports = { PublicError, errorResult, validateStart, messages };
