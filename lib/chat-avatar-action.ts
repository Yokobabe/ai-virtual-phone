import { loadChatMessages, loadChatSessions, pushChatMessage, normalizeVisionImagePromptLimit, MAX_VISION_IMAGE_PROMPT_LIMIT, type ChatMessage } from "./chat-storage";
import { loadCharacters, saveCharacters } from "./character-storage";

type Grant = { at: number; turnId: string; consumed: boolean; reported: Set<string>; images: Map<string, { original: string; resolved: string }> };
const grants = new Map<string, Grant>();
const AVATAR_TOPIC = /(头像|情头|avatar|profile picture|matching icons)/i;
const AVATAR_CONTINUATION = /(换|改|用|选|挑).{0,8}(这张|那张|这个|那个|新的|另一张|一张|一套|一对)|((你俩|你们|咱俩|我们).{0,8}(一起换|换一套|一人一张|用这个|用这张))|一人一张|各[选挑用]一张|情侣.{0,5}(一对|一套)|matching.{0,8}(pair|pictures)|use (this|that|the new) (one|picture)/i;
function latestUserTurn(history: ChatMessage[]): string {
    return [...history].reverse().find(m => m.role === "user" && !m.isRetracted)?.id || "";
}
function userDeclinesAvatar(history: ChatMessage[]): boolean {
    const lastUser = [...history].reverse().find(m => m.role === "user" && !m.isRetracted && m.content.trim())?.content || "";
    return /(不要|别|不许|不用|先不).{0,5}(换|改|用这张)|不是头像|只是.{0,5}(看看|分享|发给)|(?:壁纸|聊天背景)|don.?t.{0,12}(avatar|profile picture|change|use)/i.test(lastUser);
}
export function isAvatarDiscussion(history: ChatMessage[]): boolean {
    if (userDeclinesAvatar(history)) return false;
    // Count USER turns, not bubble fragments: two talkative group members must not
    // erase the context before the second member's action gets processed.
    let start = 0, userTurns = 0, inUserTurn = false;
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.isRetracted) continue;
        if (msg.role === "user") {
            if (!inUserTurn && ++userTurns > 6) { start = i + 1; break; }
            inUserTurn = true;
        } else if (msg.role === "assistant") inUserTurn = false;
    }
    const users = history.slice(start).filter(m => m.role === "user" && !m.isRetracted);
    const lastText = [...users].reverse().find(m => m.content.trim())?.content || "";
    if (AVATAR_TOPIC.test(lastText) || AVATAR_CONTINUATION.test(lastText)) return true;
    const recent = history.slice(start).filter(m => !m.isRetracted && (m.role === "user" || m.role === "assistant"));
    // Earlier context is only a candidate hint; the vision model still decides
    // whether the new image belongs to that discussion, rather than changing automatically.
    return recent.some(m => AVATAR_TOPIC.test(m.content));
}

function isUserPhoto(msg: ChatMessage): boolean {
    return msg.role === "user" && !msg.isRetracted && Boolean(msg.mediaUrl)
        && (msg.mediaType === "image" || (msg.mediaType === "media_file" && msg.mediaData?.fileType === "image"));
}

/** Only expand for the last user photo batch in an avatar discussion; zero remains off. */
export function getAvatarVisionPromptLimit(history: ChatMessage[], configured: unknown, enabled: boolean): number {
    const limit = normalizeVisionImagePromptLimit(configured);
    if (!enabled || !limit || !isAvatarDiscussion(history)) return limit;
    let lastPhoto = -1;
    for (let i = history.length - 1; i >= 0; i--) if (isUserPhoto(history[i])) { lastPhoto = i; break; }
    let photos = 0;
    for (let i = lastPhoto; i >= 0; i--) {
        if (history[i].role === "assistant") break;
        if (isUserPhoto(history[i])) photos++;
    }
    return Math.max(limit, Math.min(MAX_VISION_IMAGE_PROMPT_LIMIT, photos));
}

/** All members receive the SAME visible image ordering and current-avatar ownership. */
export function buildGroupAvatarContext(sessionId: string, history: ChatMessage[], visionHistory: ChatMessage[], enabled: boolean): string {
    if (!enabled || !isAvatarDiscussion(history)) return "";
    const session = loadChatSessions().find(s => s.id === sessionId);
    if (!session?.isGroup) return "";
    const chars = loadCharacters().filter(c => session.participantIds?.includes(c.id));
    const photos = visionHistory.filter(msg => isUserPhoto(msg) && /^(data:image\/(png|jpeg|webp|gif);|https?:\/\/)/i.test(msg.mediaUrl!) && history.some(original => original.id === msg.id && original.sessionId === sessionId && isUserPhoto(original)));
    if (!photos.length) return "群聊当前没有可见的头像候选，不要臆测其他成员的头像模样。";
    const rows = photos.map((msg, index) => {
        const original = history.find(m => m.id === msg.id)!;
        const owners = chars.filter(c => c.avatar === msg.mediaUrl || c.avatar === original.mediaUrl).map(c => c.name);
        const marker = `[共享选图顺序：第${index + 1}张；图片ID：${msg.id}]`;
        if (!msg.content.includes(marker)) msg.content += `\n${marker}`;
        return `第${index + 1}张 → ${msg.id}；当前使用者：${owners.join("、") || "没有群成员使用"}`;
    });
    const roster = chars.map(c => {
        const index = photos.findIndex(msg => c.avatar === msg.mediaUrl || c.avatar === history.find(m => m.id === msg.id)?.mediaUrl);
        return index >= 0 ? `${c.name}：当前用第${index + 1}张（${photos[index].id}）` : `${c.name}：当前头像不在本轮可见候选中，不能猜测其内容`;
    });
    return `群聊共享头像状态（以实际存储为准，不以“我换好了”的口头说法为准）：\n${roster.join("\n")}\n本轮可见候选按用户发送先后排列；“第一张、第二张”指这里的顺序，不是新图优先列表的顺序：\n${rows.join("\n")}\n这些是可见图片与当前使用者的事实，不是头像分配制度或占用锁。已经有人使用的图片仍可选；同图不会替换或移除其他人的头像。是否更换、选哪张、争抢同款、拒绝、让步或继续讨论，由你根据各角色的人设、关系和上下文自行决定；系统不预设合作或争抢，也不要求每个人都换。用户的提议是角色互动的上下文，不代表程序已替角色作出决定。只有角色实际决定更换时才在自己的发言段输出 Avatar 指令；只讨论、拒绝或犹豫时不执行。图片不可见时不能编造其内容，口头说换好也不等于动作已成功。`;
}

/** Only images actually retained in this vision prompt are eligible. No stickers/video frames. */
export function buildAvatarActionPrompt(sessionId: string, characterId: string, history: ChatMessage[], visionHistory: ChatMessage[], enabled: boolean): string {
    const key = `${sessionId}:${characterId}`;
    for (const [id, grant] of grants) if (Date.now() - grant.at > 600000) grants.delete(id);
    const intro = "你可以结合关系与上下文自然提出换情侣头像，等待用户提供候选；只能改你自己的头像，不能替用户修改。不要把普通分享照片、表情包、风景或人物照自动当头像。";
    if (!enabled || !isAvatarDiscussion(history)) return intro + "当前无可执行的头像候选，不要声称已经更换。";
    const images: Grant["images"] = new Map();
    const currentAvatar = loadCharacters().find(c => c.id === characterId)?.avatar;
    for (const msg of [...visionHistory].reverse()) {
        const original = history.find(m => m.id === msg.id && m.sessionId === sessionId && m.role === "user");
        if (!original?.mediaUrl || original.isRetracted || !msg.mediaUrl || !(msg.mediaType === "image" || (msg.mediaType === "media_file" && msg.mediaData?.fileType === "image"))) continue;
        if (!/^(data:image\/(png|jpeg|webp|gif);|https?:\/\/)/i.test(msg.mediaUrl)) continue;
        images.set(msg.id, { original: original.mediaUrl, resolved: msg.mediaUrl });
        const marker = `[头像候选引用ID：${msg.id}，仅在上下文确实讨论头像且你看清图片时可选]`;
        if (!msg.content.includes(marker)) msg.content += `\n${marker}`;
    }
    if (!images.size) return intro + "本轮没有可见的图片候选，不要声称已经更换。";
    const turnId = latestUserTurn(history);
    const previous = grants.get(key);
    if (previous?.turnId === turnId) {
        // Prompt previews/background sync must neither consume nor reset this turn.
        for (const [id, image] of images) if (!previous.images.has(id)) previous.images.set(id, image);
    } else grants.set(key, { at: Date.now(), turnId, images, consumed: false, reported: new Set() });
    const currentIds = [...images].filter(([, image]) => image.resolved === currentAvatar || image.original === currentAvatar).map(([id]) => id);
    return intro + `\n本轮允许的候选ID（新图在前，仅用于标识，不代表选择优先级）：${[...images.keys()].join("、")}。${currentIds.length ? `你当前正在用的图片ID：${currentIds.join("、")}；重复选它不会改变头像。` : ""}先结合完整上下文判断是否在讨论头像；“用这张吧”“你俩一起换”“另一张”等可以承接上文，不要求用户重复说“头像”。普通分享、否定或用途不明时不换，可以询问。看清新旧图片后，由角色自己决定接受提议、选择哪张或拒绝更换，不必迎合或按顺序挑选。只有看懂图片且决定换时，输出一次 [Avatar:候选ID]，勿编造ID或URL；仅口头说“换好了”不会执行。标记由系统执行并反馈；不要输出用户头像修改指令。`;
}

export function applyAvatarAction(sessionId: string, characterId: string, imageId?: string): boolean {
    const key = `${sessionId}:${characterId}`;
    const grant = grants.get(key);
    const candidate = imageId && grant?.images.get(imageId.trim());
    const session = loadChatSessions().find(s => s.id === sessionId);
    if (!session) return false;
    if (session.isGroup ? !session.participantIds?.includes(characterId) : session.contactId !== characterId) return false;
    const history = loadChatMessages(sessionId);
    if (grant?.consumed && latestUserTurn(history) === grant.turnId) return false; // Ignore duplicate output from the completed turn.
    const chars = loadCharacters();
    const char = chars.find(c => c.id === characterId);
    if (!char) return false;
    const fail = (reason: string): false => {
        const reportKey = `${imageId}:${reason}`;
        if (!grant?.reported.has(reportKey)) {
            grant?.reported.add(reportKey);
            pushChatMessage({ sessionId, role: "system", content: `${char.name} 未更换头像：${reason}`, status: "sent" });
        }
        return false;
    };
    if (!grant || Date.now() - grant.at > 600000) return fail("本轮图片候选已失效，请重新发起请求");
    if (!candidate) return fail("回复引用的图片不在本轮候选中");
    if (latestUserTurn(history) !== grant.turnId || userDeclinesAvatar(history)) return fail("用户的新消息已改变本轮请求");
    if (!history.some(m => m.id === imageId?.trim() && !m.isRetracted && m.role === "user" && m.mediaUrl === candidate.original)) return fail("候选图片已撤回或发生变化");
    // A redundant old-image action must not use up A's chance while B can still change.
    if (char.avatar === candidate.resolved || char.avatar === candidate.original) return fail("选中的图片已是当前头像");
    saveCharacters(chars.map(c => c.id === characterId ? { ...c, avatar: candidate.resolved } : c));
    grant.consumed = true;
    pushChatMessage({ sessionId, role: "system", content: `${char.name} 更换了头像`, status: "sent" });
    return true;
}
