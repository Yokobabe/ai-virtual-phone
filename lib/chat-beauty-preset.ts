import type { ChatSession } from "./chat-storage";

export type ChatBeautyPreset = "classic" | "glass" | "sp";
/** Old chats retain their previous appearance without rewriting their settings. */
export function resolveChatBeautyPreset(session: Pick<ChatSession, "beautyPreset" | "glassBubblesEnabled">): ChatBeautyPreset {
    return session.beautyPreset === "sp" || session.beautyPreset === "glass" || session.beautyPreset === "classic"
        ? session.beautyPreset : session.glassBubblesEnabled ? "glass" : "classic";
}

// Exact NJJ V37 SP palette; no generated or avatar-derived substitutions.
export function spBubbleColors(dark: boolean, user: boolean) {
    const surface = user ? dark ? "#234ED4" : "#002FA7" : dark ? "#292d35" : "#f1f3f8";
    const text = user ? "#ffffff" : dark ? "#f2f4f7" : "#17191f";
    return { surface, background: surface, text, voice: text, opacity: 1 };
}
