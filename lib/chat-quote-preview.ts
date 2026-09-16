import type { ChatMessage } from "./chat-storage";

/** Copy readable content, not media URLs or an empty content field. */
export function getQuotePreview(message: ChatMessage): string {
    const d = message.mediaData;
    if (d?.photoGroupId && (d.photoGroupCount || 0) > 1) {
        const index = Math.max(0, Math.min((d.photoGroupCount || 1) - 1, d.photoGroupActiveIndex ?? 0));
        const label = d.photoGroupLeadLabel?.trim() || d.label?.trim() || "照片";
        return `照片组 ${index + 1} / ${d.photoGroupCount}：${label}`;
    }
    const text = (d?.label || message.content || "").trim();
    const labeled = (kind: string, value = text) => value ? `${kind}：${value}` : `${kind}消息`;
    switch (message.mediaType) {
        case "audio": return labeled("语音", (message.content || d?.label || d?.synthesizedFromText || "").trim());
        case "transfer":
        case "red_packet": {
            const amount = typeof d?.amount === "number" && Number.isFinite(d.amount)
                ? `¥${d.amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}` : "";
            return labeled(message.mediaType === "transfer" ? "转账" : "红包", [amount, text].filter(Boolean).join(" · "));
        }
        case "gift": return labeled("礼物", [d?.giftName, text].filter((value, index, values) => value && values.indexOf(value) === index).join(" · "));
        case "image": return labeled("图片");
        case "sticker": return labeled("表情包");
        case "location": return labeled("位置");
        case "contact_card": return labeled("名片", d?.contactCardName || text);
        case "app_card": return labeled("卡片", [d?.appCardTitle, d?.appCardSummary || d?.appCardBody || text].filter(Boolean).join(" · "));
        case "music":
        case "music_share": return labeled("音乐", [d?.musicTitle, d?.musicArtist].filter(Boolean).join(" — ") || text);
        case "media_file": return labeled("文件", d?.fileName || text);
        default: return (message.content || d?.label || "").trim() || "消息";
    }
}
