/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DATA_DIR } from "@main/utils/constants";
import { randomUUID } from "crypto";
import { type IpcMainInvokeEvent, safeStorage } from "electron";
import { mkdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { join } from "path";

import { isSession, isSessionList, isSnowflake, isToken, messages, type Result, type SessionInfo, type SessionList } from "./shared";

interface Connection { url: string; key: string; }
const directory = join(DATA_DIR, "mc5mrAfkPanel");
const file = join(directory, "connection.encrypted");

function validateUrl(value: unknown): string {
    if (typeof value !== "string" || value.length > 500) throw Error("Invalid URL");
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash
        || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) throw Error("Invalid URL");
    return url.origin;
}

async function readConnection(): Promise<Connection | null> {
    try {
        if ((await stat(file)).size > 8192) throw Error("Invalid configuration");
        const value = JSON.parse(safeStorage.decryptString(await readFile(file))) as Connection;
        if (validateUrl(value.url) !== value.url || typeof value.key !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(value.key)) throw Error("Invalid configuration");
        return { url: value.url, key: value.key };
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
        throw error;
    }
}

async function guarded<T>(event: IpcMainInvokeEvent, action: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        if (event.senderFrame !== event.sender.mainFrame || !["https://discord.com", "https://canary.discord.com", "https://ptb.discord.com"].includes(new URL(event.senderFrame.url).origin)) return { ok: false, error: "Open AFK Panel from Discord desktop." };
        if (!safeStorage.isEncryptionAvailable() || process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text") return { ok: false, error: "Encrypted storage is unavailable on this device." };
        return await action();
    } catch {
        return { ok: false, error: "Could not read or save the encrypted connection settings. Existing settings were preserved." };
    }
}

function api(connection: Connection, route: string, method = "GET", body?: unknown): Promise<Result<unknown>> {
    return new Promise(resolve => {
        const url = new URL(connection.url + route);
        const request = url.protocol === "https:" ? httpsRequest : httpRequest;
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const req = request(url, { method, signal: AbortSignal.timeout(12_000), headers: {
            Authorization: `Bearer ${connection.key}`, Accept: "application/json",
            ...(payload === undefined ? {} : { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) })
        } }, response => {
            const chunks: Buffer[] = []; let size = 0;
            response.on("data", (chunk: Buffer) => {
                size += chunk.length;
                if (size > 128 * 1024) { req.destroy(); resolve({ ok: false, error: "The service returned an unexpected response." }); }
                else chunks.push(chunk);
            });
            response.on("error", () => resolve({ ok: false, error: "The connection to the AFK service was interrupted." }));
            response.on("end", () => {
                try {
                    // Redirects are never followed, and raw response/error text is never displayed.
                    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                    if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300 && value?.ok === true) return resolve({ ok: true, value: value.value });
                    const code = typeof value?.code === "string" && Object.hasOwn(messages, value.code) ? value.code : "SERVICE_ERROR";
                    resolve({ ok: false, error: messages[code] });
                } catch { resolve({ ok: false, error: "This address did not return an AFK Panel response." }); }
            });
        });
        req.on("error", () => resolve({ ok: false, error: "Could not reach the AFK service. Check its address and make sure it is running." }));
        req.end(payload);
    });
}

async function configured<T>(validate: (value: unknown) => value is T, route: string, method = "GET", body?: unknown): Promise<Result<T>> {
    const connection = await readConnection();
    if (!connection) return { ok: false, error: "Set up the service in the Connection tab first." };
    const result = await api(connection, route, method, body);
    if (!result.ok) return result;
    return validate(result.value) ? { ok: true, value: result.value } : { ok: false, error: "The AFK service returned an unsupported response. Check its version." };
}

export async function getServer(event: IpcMainInvokeEvent): Promise<Result<{ url: string; hasKey: boolean; }>> {
    return guarded(event, async () => {
        const connection = await readConnection();
        return { ok: true, value: { url: connection?.url || "http://127.0.0.1:3847", hasKey: Boolean(connection) } };
    });
}

export async function saveServer(event: IpcMainInvokeEvent, inputUrl: unknown, inputKey: unknown): Promise<Result<{ url: string; hasKey: boolean; }>> {
    return guarded(event, async () => {
        let url: string;
        try { url = validateUrl(inputUrl); } catch { return { ok: false, error: "Use an HTTPS service address, or HTTP on localhost. Include the port when needed; use no path or query." }; }
        const old = await readConnection();
        const key = typeof inputKey === "string" && inputKey ? inputKey : old?.url === url ? old.key : "";
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(key)) return { ok: false, error: "Paste the service key from afkpanel.local.json." };
        const test = await api({ url, key }, "/v1/health");
        if (!test.ok) return test;
        if (!test.value || typeof test.value !== "object" || !("version" in test.value) || test.value.version !== 1) return { ok: false, error: "This is not a compatible AFK Panel service." };
        const encrypted = safeStorage.encryptString(JSON.stringify({ url, key }));
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temporary = join(directory, `${randomUUID()}.tmp`);
        try {
            await writeFile(temporary, encrypted, { flag: "wx", mode: 0o600 });
            await rename(temporary, file);
        } finally { await rm(temporary, { force: true }); }
        return { ok: true, value: { url, hasKey: true } };
    });
}

export async function listSessions(event: IpcMainInvokeEvent): Promise<Result<SessionList>> {
    return guarded(event, () => configured(isSessionList, "/v1/sessions"));
}

export async function startSession(event: IpcMainInvokeEvent, token: unknown, guildId: unknown, channelId: unknown): Promise<Result<SessionInfo>> {
    return guarded(event, async () => {
        if (!isToken(token) || !isSnowflake(guildId) || !isSnowflake(channelId)) return { ok: false, error: messages.BAD_INPUT };
        return configured(isSession, "/v1/sessions", "POST", { token, guildId, channelId });
    });
}

export async function stopSession(event: IpcMainInvokeEvent, id: unknown): Promise<Result<SessionInfo>> {
    return guarded(event, async () => {
        if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return { ok: false, error: messages.NOT_FOUND };
        return configured(isSession, `/v1/sessions/${id}/stop`, "POST");
    });
}

export async function removeSession(event: IpcMainInvokeEvent, id: unknown): Promise<Result<SessionInfo>> {
    return guarded(event, async () => {
        if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return { ok: false, error: messages.NOT_FOUND };
        return configured(isSession, `/v1/sessions/${id}`, "DELETE");
    });
}
