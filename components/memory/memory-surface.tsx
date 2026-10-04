"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { defaultMemoryPalette, extractMemoryColors, memoryPalette, memoryPaletteText, type MemoryColorSample } from "@/lib/memory-entry-palette";
import { mix } from "@/lib/chat-bubble-colors";
import styles from "./memory-surface.module.css";

export function useMemoryPalette(avatar?: string | null) {
    const [sample, setSample] = useState<{ src: string; value: MemoryColorSample | null } | null>(null);
    const [dark, setDark] = useState(false);
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const update = () => setDark(document.documentElement.dataset.theme === "dark" || document.documentElement.classList.contains("dark") || media.matches);
        update(); media.addEventListener("change", update);
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
        return () => { media.removeEventListener("change", update); observer.disconnect(); };
    }, []);
    useEffect(() => {
        let active = true;
        if (avatar) void extractMemoryColors(avatar).then(value => {
            if (active) setSample({ src: avatar, value });
        });
        return () => { active = false; };
    }, [avatar]);
    const currentSample = avatar && sample?.src === avatar ? sample.value : null;
    return { palette: currentSample ? memoryPalette(currentSample, dark) : defaultMemoryPalette(dark), dark };
}

const roles = ["facts", "core", "open", "mirror", "gaze"] as const;
export function MemorySurface({ avatar, section, children }: { avatar?: string | null; section: string; children: ReactNode }) {
    const { palette, dark } = useMemoryPalette(avatar);
    const index = Math.max(0, roles.indexOf(section as typeof roles[number]));
    const color = palette[section === "settings" ? 1 : index];
    const labels = memoryPaletteText(color, dark);
    const page = dark ? "#1c1c1e" : "#ffffff";
    const surface = mix(page, color, dark ? .3 : .2);
    const vars: Record<string, string> = {
        "--memory-control": color,
        "--memory-control-ink": labels.text,
        "--memory-accent": labels.muted,
        "--memory-soft": mix(page, color, .5),
        "--memory-surface": surface,
        "--memory-line": mix(surface, labels.muted, .18),
        "--memory-hover": mix(color, labels.text, .08),
        "--c-text-title": dark ? "#f5f5f7" : "#1c1c1e",
        "--c-text": dark ? "#b1b1b8" : "#636366",
        "--c-icon": labels.muted,
        "--c-icon-active": labels.muted,
        "--c-icon-violet": labels.muted,
        "--c-music-accent": labels.muted,
        "--c-panel": surface,
        "--c-card": surface,
        "--c-panel-border": mix(surface, labels.muted, .18),
        "--c-card-border": mix(surface, labels.muted, .18),
        "--c-input": mix(page, color, .5),
        "--c-input-border": mix(surface, labels.muted, .18),
        "--c-bubble-self": color,
        "--c-bubble-other": surface,
    };
    roles.forEach((role, i) => {
        vars[`--memory-${role}-paper`] = palette[i];
        vars[`--memory-${role}-ink`] = memoryPaletteText(palette[i], dark).text;
    });
    return <div className={styles.scope} data-memory-theme={dark ? "dark" : "light"} data-memory-section={section} style={vars as CSSProperties}>{children}</div>;
}
