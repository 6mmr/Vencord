/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import type { PluginNative } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { closeModal, Modal, openModal, TextInput, useEffect, useRef, useState } from "@webpack/common";

import { active, isSnowflake, isToken, messages, type SessionInfo } from "./shared";

const MODAL_KEY = "mc5mr-afk-panel";
const Native = VencordNative.pluginHelpers.AFKPanel as PluginNative<typeof import("./native")>;

export function PanelIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1M4 12H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h3v-7H4Zm16 0h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-3v-7h2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12h6l-6 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
}

function Panel(props: RenderModalProps) {
    const [tab, setTab] = useState<"sessions" | "connection">("sessions");
    const [url, setUrl] = useState("http://127.0.0.1:3847");
    const [savedUrl, setSavedUrl] = useState("");
    const [key, setKey] = useState("");
    const [hasKey, setHasKey] = useState(false);
    const [online, setOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState("");
    const [connectionError, setConnectionError] = useState("");
    const [busy, setBusy] = useState("");
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [limit, setLimit] = useState(3);
    const [token, setToken] = useState("");
    const [guildId, setGuildId] = useState("");
    const [channelId, setChannelId] = useState("");
    const alive = useRef(true);
    const polling = useRef(false);
    const configured = useRef(false);
    const epoch = useRef(0);
    const totalActive = sessions.filter(active).length;

    async function refresh() {
        if (!configured.current || polling.current || !alive.current) return;
        polling.current = true;
        const version = epoch.current;
        try {
            const result = await Native.listSessions();
            if (!alive.current || version !== epoch.current) return;
            setOnline(result.ok);
            if (result.ok) {
                setSessions(result.value.sessions); setLimit(result.value.maxSessions); setConnectionError("");
            } else setConnectionError(result.error);
        } catch {
            if (alive.current && version === epoch.current) {
                setOnline(false); setConnectionError("Could not check the service. The displayed sessions are their last known state.");
            }
        } finally { polling.current = false; }
    }

    useEffect(() => {
        alive.current = true;
        if (!Native) {
            setLoading(false);
            setConnectionError("Close Discord completely and reopen it after building this plugin.");
            return () => { alive.current = false; };
        }
        Native.getServer().then(async result => {
            if (!alive.current) return;
            if (!result.ok) return setConnectionError(result.error);
            setUrl(result.value.url); setSavedUrl(result.value.hasKey ? result.value.url : ""); setHasKey(result.value.hasKey);
            configured.current = result.value.hasKey;
            if (result.value.hasKey) await refresh();
            else setTab("connection");
        }).catch(() => {
            if (alive.current) setConnectionError("Close Discord completely and reopen it after building this plugin.");
        }).finally(() => { if (alive.current) setLoading(false); });
        const timer = setInterval(() => { void refresh(); }, 4000);
        return () => { alive.current = false; clearInterval(timer); };
    }, []);

    async function saveConnection() {
        if (!Native || busy || loading) return;
        setBusy("Saving connection…"); setNotice(""); epoch.current++;
        try {
            const result = await Native.saveServer(url.trim(), key.trim());
            if (!alive.current) return;
            if (!result.ok) return setNotice(result.error);
            setUrl(result.value.url); setSavedUrl(result.value.url); setHasKey(true); setKey("");
            setToken(""); setSessions([]); setOnline(false); configured.current = true;
            setNotice("Connection verified and saved."); setTab("sessions");
            await refresh();
        } catch { if (alive.current) setNotice("Could not save the connection. Try again."); }
        finally { if (alive.current) setBusy(""); }
    }

    async function start() {
        if (!online || busy || !isToken(token.trim()) || !isSnowflake(guildId.trim()) || !isSnowflake(channelId.trim())) return;
        setBusy("Starting session…"); setNotice(""); epoch.current++;
        const entered = token.trim(); setToken("");
        try {
            const result = await Native.startSession(entered, guildId.trim(), channelId.trim());
            if (!alive.current) return;
            if (!result.ok) return setNotice(result.error);
            setSessions(current => [...current.filter(session => session.id !== result.value.id), result.value]);
            setNotice("Start requested. The session will show Connected after voice is confirmed.");
        } catch { if (alive.current) setNotice("The request was interrupted. Refresh sessions before trying again."); }
        finally { if (alive.current) setBusy(""); }
    }

    async function stopOrRemove(session: SessionInfo) {
        if (!online || busy) return;
        const remove = !active(session);
        setBusy(remove ? "Removing session…" : "Stopping session…"); setNotice(""); epoch.current++;
        try {
            const result = await (remove ? Native.removeSession(session.id) : Native.stopSession(session.id));
            if (!alive.current) return;
            if (!result.ok) return setNotice(result.error);
            setSessions(current => remove ? current.filter(item => item.id !== session.id) : current.map(item => item.id === session.id ? result.value : item));
        } catch { if (alive.current) setNotice("Could not confirm the result. Refresh sessions to check their state."); }
        finally { if (alive.current) setBusy(""); }
    }

    return <Modal {...props} size="md" title={<span className="vc-afkp-title"><PanelIcon /> AFK Panel</span>} subtitle="Personal voice sessions · Mc5mr">
        <div className="vc-afkp-shell" dir="ltr">
            <div className="vc-afkp-tabs" role="tablist" aria-label="AFK Panel tabs">
                {(["sessions", "connection"] as const).map(value => <Button key={value} variant="none" role="tab" id={`vc-afkp-${value}-tab`} aria-controls={`vc-afkp-${value}-panel`} aria-selected={tab === value} className={tab === value ? "vc-afkp-tab vc-afkp-selected" : "vc-afkp-tab"} onClick={() => setTab(value)}>{value === "sessions" ? "Sessions" : "Connection"}</Button>)}
                <span className={online ? "vc-afkp-service vc-afkp-online" : "vc-afkp-service"}>{loading ? "Checking…" : online ? "Service online" : hasKey ? "Service unavailable" : "Setup needed"}</span>
            </div>

            {tab === "connection" ? <section id="vc-afkp-connection-panel" role="tabpanel" aria-labelledby="vc-afkp-connection-tab">
                <p className="vc-afkp-hint">Start the included AFK service first. Use its address and service key here.</p>
                <label className="vc-afkp-field"><span>Service address</span><TextInput value={url} onChange={setUrl} placeholder="http://127.0.0.1:3847" disabled={Boolean(busy)} aria-label="Service address" /></label>
                <label className="vc-afkp-field"><span>Service key</span><TextInput value={key} onChange={setKey} type="password" maxLength={128} autoComplete="new-password" placeholder={hasKey ? "Saved — leave blank to keep the same key" : "From afkpanel.local.json"} disabled={Boolean(busy)} aria-label="Service key" /></label>
                <Button onClick={saveConnection} disabled={loading || Boolean(busy) || !Native}>Test &amp; save connection</Button>
                <p className="vc-afkp-hint">The key is encrypted on this computer. Remote service addresses must use HTTPS.</p>
            </section> : <section id="vc-afkp-sessions-panel" role="tabpanel" aria-labelledby="vc-afkp-sessions-tab">
                <div className="vc-afkp-destination">{hasKey ? <>Service: <span>{savedUrl}</span></> : "Set up a service in the Connection tab."}</div>
                <label className="vc-afkp-field"><span>Your account token</span><TextInput value={token} onChange={setToken} type="password" maxLength={2048} autoComplete="new-password" placeholder="Paste one token for an account you own" disabled={Boolean(busy)} aria-label="Your account token" /></label>
                <div className="vc-afkp-ids">
                    <label className="vc-afkp-field"><span>Server ID</span><TextInput value={guildId} onChange={setGuildId} maxLength={20} placeholder="Server ID" disabled={Boolean(busy)} aria-label="Server ID" /></label>
                    <label className="vc-afkp-field"><span>Voice channel ID</span><TextInput value={channelId} onChange={setChannelId} maxLength={20} placeholder="Voice channel ID" disabled={Boolean(busy)} aria-label="Voice channel ID" /></label>
                </div>
                <div className="vc-afkp-actions"><Button onClick={start} disabled={!online || Boolean(busy) || totalActive >= limit || !isToken(token.trim()) || !isSnowflake(guildId.trim()) || !isSnowflake(channelId.trim())}>Start AFK</Button><Button variant="secondary" size="small" onClick={refresh} disabled={loading || Boolean(busy) || !hasKey}>Refresh</Button><span>{totalActive}/{limit} active</span></div>
                <p className="vc-afkp-hint">Account automation is experimental and may lead to account suspension. Tokens are sent to your service and kept in memory while active.</p>
                <div className="vc-afkp-sessions" aria-label="AFK sessions">
                    {sessions.length ? sessions.map(session => <article key={session.id} className="vc-afkp-session">
                        <div className="vc-afkp-session-top"><strong>{session.username ? `@${session.username}` : active(session) ? "Connecting account…" : "Account session"}</strong><span className={`vc-afkp-badge ${online && session.status === "connected" ? "vc-afkp-online" : ""}`}>{!online ? "Last known: " : ""}{session.status}</span></div>
                        <p>Server <code>{session.guildId}</code><br />Voice <code>{session.channelId}</code></p>
                        {session.errorCode ? <p className="vc-afkp-error">{messages[session.errorCode] || messages.SERVICE_ERROR}</p> : null}
                        <Button size="small" variant={active(session) ? "dangerSecondary" : "secondary"} disabled={!online || Boolean(busy) || session.status === "stopping"} onClick={() => stopOrRemove(session)}>{active(session) ? "Stop" : "Remove"}</Button>
                    </article>) : <p className="vc-afkp-empty">No sessions yet. Add an account and a voice channel above.</p>}
                </div>
                <p className="vc-afkp-hint">Closing this panel keeps sessions running while the AFK service is running. Stop a session here to disconnect it.</p>
            </section>}
            {connectionError ? <p className="vc-afkp-error" role="status">{connectionError}</p> : null}
            {busy || notice ? <p className="vc-afkp-notice" role="status">{busy || notice}</p> : null}
        </div>
    </Modal>;
}

const SafePanel = ErrorBoundary.wrap(Panel);
export function openPanel() { openModal(props => <SafePanel {...props} />, { modalKey: MODAL_KEY }); }
export function closePanel() { closeModal(MODAL_KEY); }
