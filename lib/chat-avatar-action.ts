import { loadChatMessages, loadChatSessions, pushChatMessage, type ChatMessage } from "./chat-storage";
import { loadCharacters, saveCharacters } from "./character-storage";

type Grant = { at: number; images: Map<string, { original: string; resolved: string }> };
const grants = new Map<string, Grant>();
export function isAvatarDiscussion(history: ChatMessage[]): boolean {
    const recent = history.filter(m => m.role === "user" || m.role === "assistant").slice(-12);
    const lastUser = [...recent].reverse().find(m => m.role === "user" && m.content.trim())?.content || "";
    if (/(不要|别|不许).{0,8}(换|改).{0,4}头像|不是头像|don.?t.{0,12}(avatar|profile picture)/i.test(lastUser)) return false;
    return recent.some(m => /(头像|情头|avatar|profile picture|matching icons)/i.test(m.content));
}

/** Only images actually retained in this vision prompt are eligible. No stickers/video frames. */
export function buildAvatarActionPrompt(sessionId: string, characterId: string, history: ChatMessage[], visionHistory: ChatMessage[], enabled: boolean): string {
    const key = `${sessionId}:${characterId}`;
    grants.delete(key);
    for (const [id, grant] of grants) if (Date.now() - grant.at > 600000) grants.delete(id);
    const intro = "你可以结合关系与上下文自然提出换情侣头像，等待用户提供候选；只能改你自己的头像，不能替用户修改。不要把普通分享照片、表情包、风景或人物照自动当头像。";
    if (!enabled || !isAvatarDiscussion(history)) return intro + "当前无可执行的头像候选，不要声称已经更换。";
    const images: Grant["images"] = new Map();
    for (const msg of visionHistory) {
        const original = history.find(m => m.id === msg.id && m.sessionId === sessionId && m.role === "user");
        if (!original?.mediaUrl || original.isRetracted || !msg.mediaUrl || !(msg.mediaType === "image" || (msg.mediaType === "media_file" && msg.mediaData?.fileType === "image"))) continue;
        if (!/^(data:image\/(png|jpeg|webp|gif);|https?:\/\/)/i.test(msg.mediaUrl)) continue;
        images.set(msg.id, { original: original.mediaUrl, resolved: msg.mediaUrl });
        msg.content += `\n[头像候选引用ID：${msg.id}，仅在上下文确实讨论头像且你看清图片时可选]`;
    }
    if (!images.size) return intro + "本轮没有可见的图片候选，不要声称已经更换。";
    grants.set(key, { at: Date.now(), images });
    return intro + `\n本轮允许的候选ID：${[...images.keys()].join("、")}。先判断用户是否在邀请你挑选/更换头像（否定、只是展示、不确定时不换，可以询问）。你可决定不换。只有看懂图片且决定换时，输出一次 [Avatar:候选ID]，勿编造ID或URL。标记由系统执行并反馈；不要输出用户头像修改指令。`;
}

export function applyAvatarAction(sessionId: string, characterId: string, imageId?: string): boolean {
    const key = `${sessionId}:${characterId}`;
    const grant = grants.get(key);
    const candidate = imageId && grant?.images.get(imageId.trim());
    const session = loadChatSessions().find(s => s.id === sessionId);
    if (!candidate || !grant || Date.now() - grant.at > 600000 || !session) return false;
    if (session.isGroup ? !session.participantIds?.includes(characterId) : session.contactId !== characterId) return false;
    const history = loadChatMessages(sessionId);
    if (!isAvatarDiscussion(history) || !history.some(m => m.id === imageId?.trim() && !m.isRetracted && m.role === "user" && m.mediaUrl === candidate.original)) return false;
    const chars = loadCharacters();
    const char = chars.find(c => c.id === characterId);
    if (!char) return false;
    grants.delete(key); // At most one change per issued model turn, including replay/edit.
    if (char.avatar === candidate.resolved) return false;
    saveCharacters(chars.map(c => c.id === characterId ? { ...c, avatar: candidate.resolved } : c));
    pushChatMessage({ sessionId, role: "system", content: `${char.name} 更换了头像`, status: "sent" });
    return true;
}
