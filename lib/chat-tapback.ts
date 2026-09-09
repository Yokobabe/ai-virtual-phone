import { getChatMessagePreview, loadChatMessages, updateMessageMediaData, type ChatMessage } from "./chat-storage";
import { kvGet, kvSet, registerKvMigration } from "./kv-db";

export type MessageTapback = string;
export type IMessageTapbackCandidate = { id: MessageTapback; glyph: string; label: string };

export const IMESSAGE_TAPBACKS: ReadonlyArray<IMessageTapbackCandidate> = [
    { id: "❤️", glyph: "❤️", label: "爱心" },
    { id: "👍", glyph: "👍", label: "赞" },
    { id: "👎", glyph: "👎", label: "踩" },
    { id: "😂", glyph: "😂", label: "笑哭" },
    { id: "‼️", glyph: "‼️", label: "强调" },
    { id: "❓", glyph: "❓", label: "疑问" },
];

const IMESSAGE_TAPBACKS_STORAGE_KEY = "chat_imessage_tapbacks_v1";
export const IMESSAGE_TAPBACKS_UPDATED_EVENT = "imessage-tapbacks-updated";
export const IMESSAGE_TAPBACK_APPLIED_EVENT = "imessage-tapback-applied";
export const IMESSAGE_TAPBACK_COUNT = 6;

registerKvMigration(IMESSAGE_TAPBACKS_STORAGE_KEY);

const LEGACY_TAPBACK_GLYPHS: Record<string, string> = {
    heart: "❤️",
    thumbs_up: "👍",
    thumbs_down: "👎",
    haha: "😂",
    emphasis: "‼️",
    question: "❓",
};

export function getTapbackGlyph(tapback: string | undefined): string {
    if (!tapback) return "";
    return LEGACY_TAPBACK_GLYPHS[tapback] || tapback;
}

export function getTapbackLabel(tapback: string | undefined): string {
    const glyph = getTapbackGlyph(tapback);
    return loadIMessageTapbacks().find(item => item.glyph === glyph)?.label || "回应";
}

function normalizeCandidateGlyph(value: unknown): string {
    return typeof value === "string" ? value.trim().slice(0, 32) : "";
}

export function loadIMessageTapbacks(): IMessageTapbackCandidate[] {
    try {
        const parsed = JSON.parse(kvGet(IMESSAGE_TAPBACKS_STORAGE_KEY) || "[]") as unknown;
        if (!Array.isArray(parsed)) return [...IMESSAGE_TAPBACKS];
        const glyphs = parsed
            .map(normalizeCandidateGlyph)
            .filter((glyph, index, all) => glyph && all.indexOf(glyph) === index)
            .slice(0, IMESSAGE_TAPBACK_COUNT);
        if (glyphs.length !== IMESSAGE_TAPBACK_COUNT) return [...IMESSAGE_TAPBACKS];
        return glyphs.map((glyph, index) => ({
            id: glyph,
            glyph,
            label: IMESSAGE_TAPBACKS.find(item => item.glyph === glyph)?.label || `候选 ${index + 1}`,
        }));
    } catch {
        return [...IMESSAGE_TAPBACKS];
    }
}

export function saveIMessageTapbacks(glyphs: string[]): IMessageTapbackCandidate[] {
    const normalized = glyphs
        .map(normalizeCandidateGlyph)
        .filter((glyph, index, all) => glyph && all.indexOf(glyph) === index)
        .slice(0, IMESSAGE_TAPBACK_COUNT);
    if (normalized.length !== IMESSAGE_TAPBACK_COUNT) {
        throw new Error("Tapback 候选需要 6 个不重复的表情");
    }
    kvSet(IMESSAGE_TAPBACKS_STORAGE_KEY, JSON.stringify(normalized));
    const next = loadIMessageTapbacks();
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(IMESSAGE_TAPBACKS_UPDATED_EVENT, { detail: { tapbacks: next } }));
    }
    return next;
}

export function resetIMessageTapbacks(): IMessageTapbackCandidate[] {
    return saveIMessageTapbacks(IMESSAGE_TAPBACKS.map(item => item.glyph));
}

const NON_TAPBACK_TARGET_MEDIA = new Set<NonNullable<ChatMessage["mediaType"]>>([
    "poke",
    "voice_call",
    "video_call",
    "accept_red_packet",
    "decline_red_packet",
    "accept_transfer",
    "decline_transfer",
    "accept_payment_request",
    "decline_payment_request",
    "tool_notice",
    "tool_call",
    "tool_result",
    "memory_write_request",
    "system_instruction",
    "group_admin_notice",
]);

/** Apply a model-authored Tapback to the latest eligible user message. */
export function applyAssistantTapback(sessionId: string, requestedTapback: string | undefined): ChatMessage | null {
    const requested = getTapbackGlyph(normalizeCandidateGlyph(requestedTapback));
    const allowed = loadIMessageTapbacks().find(item => item.glyph === requested);
    if (!allowed) return null;

    const target = [...loadChatMessages(sessionId)].reverse().find(message => (
        message.role === "user"
        && !message.isRetracted
        && (!message.mediaType || !NON_TAPBACK_TARGET_MEDIA.has(message.mediaType))
        && Boolean(message.content.trim() || message.mediaType || getChatMessagePreview(message))
    ));
    if (!target) return null;

    const mediaData = { ...target.mediaData, tapback: allowed.glyph, tapbackBy: "assistant" as const };
    updateMessageMediaData(target.id, mediaData);
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(IMESSAGE_TAPBACK_APPLIED_EVENT, {
            detail: { sessionId, messageId: target.id },
        }));
    }
    return { ...target, mediaData };
}

export function buildIMessageTapbackPromptInstruction(): string {
    const glyphs = loadIMessageTapbacks().map(item => item.glyph);
    return [
        "### iMessage Tapback（可选的真实动作）",
        `你可以主动对用户最新一条可回应的消息添加 Tapback。候选仅限：${glyphs.join(" ")}。`,
        "需要使用时输出独立标记 [Tapback:表情]，例如 [Tapback:❤️]；它会真实贴到用户消息上，不会显示成文字气泡。",
        "Tapback 是可选动作，只在语境自然时使用；每轮最多一次，可以单独使用，也可以和正常文字回复同时使用。不要输出候选列表以外的表情。",
    ].join("\n");
}
