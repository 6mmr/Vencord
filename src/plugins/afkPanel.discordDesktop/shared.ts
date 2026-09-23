/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Result<T> = { ok: true; value: T; } | { ok: false; error: string; };
export const statuses = ["starting", "connecting", "connected", "stopping", "stopped", "error"] as const;
export type SessionStatus = typeof statuses[number];
export interface SessionInfo {
    id: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    status: SessionStatus;
    createdAt: number;
    connectedAt: number | null;
    errorCode: string | null;
}
export interface SessionList { version: 1; maxSessions: number; sessions: SessionInfo[]; }
export const messages: Record<string, string> = {
    BAD_INPUT: "Enter a complete account token and valid server and voice-channel IDs.",
    UNAUTHORIZED: "The service key is incorrect. Check Connection settings.",
    LIMIT: "Stop an active session before adding another account.",
    WAIT: "Wait a few seconds before trying again.",
    DUPLICATE: "This account already has an active session.",
    LOGIN_FAILED: "Discord did not allow the sign-in. Check the token or sign in normally.",
    USER_ONLY: "Use a user account you own. Bot tokens are not supported here.",
    CHANNEL: "The voice channel is unavailable, belongs to another server, or the account cannot connect.",
    LAVALINK_OFFLINE: "The AFK service cannot reach its configured Lavalink node.",
    LAVALINK_VERSION: "The Lavalink node needs API v4 and current Discord voice encryption support.",
    LAVALINK_VOICE: "Lavalink could not establish the voice connection.",
    VOICE_TIMEOUT: "Voice connection was not confirmed. Check channel permissions and Lavalink compatibility.",
    DISCONNECTED: "The voice connection ended. Start again when ready.",
    MOVED: "The account left or was moved out of the target channel. AFK was stopped.",
    SERVICE_ERROR: "The AFK service could not complete the operation.",
    NOT_FOUND: "This session is no longer available.",
    STOPPING: "The AFK service is shutting down."
};

export function isSnowflake(value: unknown): value is string { return typeof value === "string" && /^\d{17,20}$/.test(value); }
export function isToken(value: unknown): value is string {
    return typeof value === "string" && value.length >= 20 && value.length <= 2048 && /^[\w.-]+$/.test(value)
        && (value.startsWith("mfa.") || value.split(".").length === 3);
}
export function isSession(value: unknown): value is SessionInfo {
    if (!value || typeof value !== "object") return false;
    const s = value as SessionInfo;
    return typeof s.id === "string" && /^[a-f0-9-]{36}$/.test(s.id)
        && (s.userId === "" || isSnowflake(s.userId)) && typeof s.username === "string" && s.username.length <= 80
        && isSnowflake(s.guildId) && isSnowflake(s.channelId) && statuses.includes(s.status)
        && Number.isFinite(s.createdAt) && (s.connectedAt === null || Number.isFinite(s.connectedAt))
        && (s.errorCode === null || typeof s.errorCode === "string" && Object.hasOwn(messages, s.errorCode));
}
export function isSessionList(value: unknown): value is SessionList {
    if (!value || typeof value !== "object") return false;
    const list = value as SessionList;
    return list.version === 1 && Number.isInteger(list.maxSessions) && list.maxSessions >= 1 && list.maxSessions <= 5
        && Array.isArray(list.sessions) && list.sessions.length <= 20 && list.sessions.every(isSession);
}
export function active(session: SessionInfo): boolean { return ["starting", "connecting", "connected", "stopping"].includes(session.status); }
