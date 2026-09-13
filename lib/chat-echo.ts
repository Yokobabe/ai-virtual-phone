import type { ChatMessage } from "./chat-storage";

type EchoMessage = Pick<ChatMessage, "content" | "mediaType" | "mediaData"> & Partial<Pick<ChatMessage, "role" | "isRetracted">>;

export function canUseEcho(message: EchoMessage): boolean {
    return !message.isRetracted && message.role !== "system"
        && (!message.mediaType || message.mediaType === "quote")
        && !!message.content.trim()
        && !/<(?:[a-z][\w-]*)(?:\s[^>]*|\s*\/?)>/i.test(message.content)
        && !/!\[[^\]]*\]\(/.test(message.content);
}

export function hasEcho(message: EchoMessage): boolean {
    return message.mediaData?.screenEffect === "echo" && canUseEcho(message);
}

export function echoHistoryText(message: EchoMessage, body: string): string {
    return hasEcho(message) ? `${body}\n[本条使用了回声屏幕特效：气泡大量复制环绕，表达较强的情绪、强调或吸引注意；具体是表白、搞怪、求饶等须结合语境理解，不等于固定情绪。]` : body;
}

export function buildEchoPrompt(): string {
    return `【文字消息：回声特效】
你和用户都可以使用回声：发送的文字气泡分裂出大量副本，在屏幕上立体环绕，再回到原气泡消散。
默认使用普通文字，回声是罕见的情绪点缀，不是常规聊天样式。主要留给符合角色关系的暧昧、甜蜜、认真表白、浓烈想念或亲昵撒娇的关键一句；不是每句甜言蜜语都需要特效。
由你按角色性格、关系和当前语境自主决定是否使用；不要求用户下指令，不强行制造暧昧。日常回答、解释、一般强调、搞怪或催促默认不用，更不能为了展示功能而出戏。
每轮回复最多一条使用回声，其余句子全部普通发送。查看最近对话：如果你最近几轮已发过回声，本轮默认不用，不连续多轮使用，不因用户使用回声就跟着使用；宁可不用，也不要刷屏。
决定使用时，在该条文字前紧贴输出 [Echo]，例如：[Echo]好想现在就抱住你🥺。
只作用于当前段的一条文字气泡，空行分开的下一条不继承。仅支持文字（可含手机原生 emoji）；不能给表情包、图片、语音、音乐、卡片、HTML或动作指令加特效。
群聊时把 [Echo] 放在你自己的 [角色名]: 发言段内，不代替其他成员决定。不要口头说“发送了特效”却省略标记。`;
}
