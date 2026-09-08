export type MessageTapback = string;

export const IMESSAGE_TAPBACKS: ReadonlyArray<{ id: MessageTapback; glyph: string; label: string }> = [
    { id: "❤️", glyph: "❤️", label: "爱心" },
    { id: "👍", glyph: "👍", label: "赞" },
    { id: "👎", glyph: "👎", label: "踩" },
    { id: "😂", glyph: "😂", label: "笑哭" },
    { id: "‼️", glyph: "‼️", label: "强调" },
    { id: "❓", glyph: "❓", label: "疑问" },
];

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
    return IMESSAGE_TAPBACKS.find(item => item.glyph === glyph)?.label || "回应";
}
