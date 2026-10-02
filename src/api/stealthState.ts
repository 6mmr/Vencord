/*
 * Nightcord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let _stealthActive = false;
try { _stealthActive = localStorage.getItem("Nightcord_stealthMode") === "1"; } catch { }

export function isStealthModeEnabled(): boolean {
    return _stealthActive;
}

export function setStealthActive(active: boolean) {
    _stealthActive = active;
}
