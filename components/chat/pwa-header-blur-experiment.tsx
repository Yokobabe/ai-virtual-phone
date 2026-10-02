"use client";

import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Device-local, opt-in experiment: never synced to a session or sent to a model.
const KEY = "float:pwa-header-blur-experiment:v1";
const CHANGE = "float:pwa-header-blur-experiment-change";
let memoryFallback: boolean | undefined;

function readEnabled() {
    if (memoryFallback !== undefined) return memoryFallback;
    try { return window.localStorage.getItem(KEY) === "1"; }
    catch { return false; }
}

function subscribe(notify: () => void) {
    const storage = (event: StorageEvent) => {
        if (event.key === KEY || event.key === null) { memoryFallback = undefined; notify(); }
    };
    window.addEventListener(CHANGE, notify);
    window.addEventListener("storage", storage);
    return () => {
        window.removeEventListener(CHANGE, notify);
        window.removeEventListener("storage", storage);
    };
}

function useExperiment() {
    const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);
    const [supported, setSupported] = useState(false);
    useEffect(() => {
        const mode = window.matchMedia("(display-mode: standalone)");
        const update = () => {
            const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
                || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            const standalone = mode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
            setSupported(ios && standalone);
        };
        update();
        mode.addEventListener("change", update);
        window.addEventListener("pageshow", update);
        return () => {
            mode.removeEventListener("change", update);
            window.removeEventListener("pageshow", update);
        };
    }, []);
    return { enabled, supported };
}

export function PwaHeaderBlurToggle({ icon }: { icon?: ReactNode }) {
    const { enabled, supported } = useExperiment();
    const label = useId(), hint = useId();
    const [storageFailed, setStorageFailed] = useState(false);
    return <div className="menu-item">
        {icon}
        <div className="menu-label-group">
            <span className="menu-label" id={label}>顶部模糊兼容（实验）</span>
            <span className="menu-desc" id={hint}>
                {storageFailed ? "本次已切换，但设备未能保存；重开后需重新开启。"
                    : !supported ? "仅从 iPhone / iPad 主屏幕打开后生效；仅此设备。"
                    : "返回聊天对比；可能改变状态栏底色，关闭可撤回。"}
            </span>
        </div>
        <div className="menu-right">
            <button type="button" role="switch" className="ui-toggle" data-ui="toggle"
                aria-labelledby={label} aria-describedby={hint} aria-checked={enabled}
                data-checked={enabled ? "" : undefined}
                onClick={() => {
                    const next = !enabled;
                    memoryFallback = next;
                    try { window.localStorage.setItem(KEY, next ? "1" : "0"); memoryFallback = undefined; setStorageFailed(false); }
                    catch { setStorageFailed(true); }
                    window.dispatchEvent(new Event(CHANGE));
                }}>
                <span className="ui-toggle-knob" />
            </button>
        </div>
    </div>;
}

export function PwaHeaderBlurExperiment({ active, dark }: { active: boolean; dark: boolean }) {
    const { enabled, supported } = useExperiment();
    if (!active || !enabled || !supported) return null;
    // Experimental WebKit workaround, not a public API. Empty text clips all page
    // pixels, while the opaque background may still tint the SYSTEM status bar.
    // Body portal avoids the simulated phone shell's transformed containing block.
    // Reference: https://qiita.com/na-trium-144/items/0add98a80ca2391e3f17
    return createPortal(<div data-pwa-header-blur-experiment="" aria-hidden="true" style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 11,
        zIndex: 2147483647, pointerEvents: "none",
        backgroundColor: dark ? "#17212e" : "#f8f7f2",
        WebkitBackgroundClip: "text", backgroundClip: "text",
    }} />, document.body);
}
