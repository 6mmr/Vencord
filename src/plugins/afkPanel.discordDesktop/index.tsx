/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";

import { closePanel, openPanel, PanelIcon } from "./ui";

export default definePlugin({
    name: "AFKPanel",
    description: "Control personal voice sessions on your own AFK service from the title bar.",
    authors: [{ name: "Mc5mr", id: 523157034141745153n }],
    tags: ["Voice", "Utility"],

    // Append a child without replacing Fragment, so VencordToolbox can wrap the same toolbar.
    patches: [{
        find: '?"BACK_FORWARD_NAVIGATION":',
        replacement: {
            match: /(trailing:.{0,160}?children:\[)/,
            replace: "$1$self.renderButton(),"
        }
    }],

    renderButton() {
        return <ErrorBoundary key="mc5mr-afk-panel" noop>
            <button type="button" className="vc-afkp-trigger" title="AFK Panel" aria-label="Open AFK Panel" onClick={openPanel}>
                <PanelIcon />
            </button>
        </ErrorBoundary>;
    },

    settingsAboutComponent() {
        return <div className="vc-afkp-about"><p>Start the AFK service, then connect it to this panel.</p><Button onClick={openPanel}>Open AFK Panel</Button></div>;
    },

    stop() { closePanel(); }
});
