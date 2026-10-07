import { kvGet, kvSetAsync, registerDynamicPrefix } from "./kv-db";
import { assertIdentityActive } from "./identity-runtime";
import { canCurrentIdentityInteract } from "./identity-access";
import { estimateTokens } from "./token-counter";
import type { NativeTimelineEntry } from "./short-term-assembler";

const PREFIX = "ai_phone_memory_cognition_v1_";
registerDynamicPrefix(PREFIX);

export type MemoryEvidence = { id: string; sourceApp: string; timestamp: string; excerpt: string; context?: string; kind?: "event" | "memory"; quotes?: string[] };
export type CognitionClaim = { text: string; kind: "fact" | "interpretation" | "hypothesis"; evidenceIds: string[] };
export type CognitionBasis = { mode: "review" | "incremental"; events: number; core: number; longTerm: number; previousSources: number; earliest?: string; latest?: string; estimatedTokens: number; sources: string[]; omittedEvents: number };
export type CognitionFacet = { text: string; digest?: string; evidence: MemoryEvidence[]; claims?: CognitionClaim[]; basis?: CognitionBasis; updatedAt: string; revisionId?: string; generatedAt?: string };
export type OpenMemoryItem = {
    id: string;
    kind: "commitment" | "plan" | "wish" | "tension";
    text: string;
    status: "open" | "completed" | "cancelled";
    dueAt?: string;
    evidence: MemoryEvidence[];
    createdAt: string;
    updatedAt: string;
};
export type MemoryCognition = {
    version: 1;
    characterId: string;
    mirror?: CognitionFacet;
    gaze?: CognitionFacet;
    emotion?: CognitionFacet;
    mood?: CognitionFacet;
    openItems: OpenMemoryItem[];
    updatedAt?: string;
    reviewedThrough?: string;
};
export function emptyCognition(characterId: string): MemoryCognition {
    return { version: 1, characterId, openItems: [] };
}
export function loadMemoryCognition(characterId: string): MemoryCognition {
    assertIdentityActive();
    try {
        const value = JSON.parse(kvGet(PREFIX + characterId) || "null");
        if (value?.version === 1 && value.characterId === characterId && Array.isArray(value.openItems)) return value;
    } catch { /* Missing or damaged cache is never used as model input. */ }
    return emptyCognition(characterId);
}
export async function saveMemoryCognition(value: MemoryCognition): Promise<void> {
    const { saveCognitionRecord } = await import("./memory-storage");
    await saveCognitionRecord(value, loadMemoryCognition(value.characterId));
    await cacheMemoryCognition(value);
}
export async function cacheMemoryCognition(value: MemoryCognition): Promise<void> {
    assertIdentityActive();
    try { await kvSetAsync(PREFIX + value.characterId, JSON.stringify(value)); }
    catch (error) {
        assertIdentityActive();
        // The authoritative state is already durable in the memory DB; the synchronous cache is updated.
        console.warn("[MemoryCognition] Derived cache persistence failed", error);
    }
    assertIdentityActive();
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("memory-cognition-updated", { detail: { characterId: value.characterId } }));
    }
}

// Executable model protocol; UI explanations belong in the component, not here.
export const MEMORY_COGNITION_PROTOCOL = `整理当前角色亲历或已知的事件，增量更新其记忆和主观认知。只输出 JSON：
{"summary":"事实及关系演化摘要","mirror":null,"gaze":null,"emotion":null,"mood":null,"openItems":[]}
mirror/gaze 有更新时填 {"text":"完整内心剖析","digest":"影响后续演绎的认知提要","evidenceIds":["材料ID"],"claims":[{"text":"主要判断","kind":"fact|interpretation|hypothesis","evidenceIds":["支持该判断的材料ID"]}],"citations":[{"id":"材料ID","quote":"材料中的连续原文"}]}；emotion/mood 填 {"text":"内容","evidenceIds":["材料ID"]}。无变化填 null，保留旧值。
mirror/gaze 用角色第一人称写内心深谈，沿具体经历深入：我做了什么→为何这样做→真正需要、害怕或不愿承认的是什么→这如何影响我的选择。保留人设独有的思维、表达和盲点；用细节承载深度，不堆形容词、泛泛赞美或心理术语，不将每件小事升格为创伤或人生转折。
mirror：从人设与事件的相合或冲突中审视自己。追问外在姿态与内在动机的距离、维护什么又付出什么、矛盾愿望如何拉扯、哪里改变或仍不肯改变；保留无法自圆其说与尚未想明白之处。检查旧记忆中对自己的概括，说明仍成立、被动摇或需要修正的认识及其缘由。
gaze：写我为何被这个具体的用户牵动，他的言行触及我的什么需要、边界或软处。我喜欢、介意、误解、期待什么，想靠近又为何退让；希望对方怎样看待我，想给予或索求什么，哪些话暂时说不出口，这些如何改变相处与决定。区分对方实际做过的事与我的猜测，保留亲近、欲望、怨意与顾虑之间有依据的矛盾。
新版融合已有认识与本批经历，写成当前完整认知，而非只描写最近一件事；保留仍成立的旧认识、未解的张力和关系来路，用新证据修正旧判断，交代改变的因果。不机械复述旧文，不编造经历、动机或用户内心；推断写成角色自身的理解。根据证据选择最有分量的层次，不逐项填满。
主动重审结合核心与长期记忆、近期事件、人设及当前用户身份，重新检验旧理解；增量更新围绕新经历缝补当前理解。旧认知是待检验的主观看法，不能自证为事实。事实与角色的解释、猜测分开；孤立事件不直接证明稳定人格或长期关系模式，留意重复经历、变化和反证。主要判断逐项列入claims，引用真正支持它的材料；每个引用ID在citations中摘录对应原文，不用无关事件充数。来源是摘要时按记忆摘要引用，不冒充对话原话。
mirror/gaze 的 text 通常250–600字，依据少时可更短，上限900字；digest 各不超过140字，保留核心动机、关系判断、未解矛盾及其对下一步行为的影响，与 text 结论一致。
emotion：最近事件引起的短时情绪；mood：持续的期待、失望、担心等背景心境。临时情绪不写成人格变化，允许矛盾感受共存。
summary：第三人称，100–250字；准确保留人物、时间、关键原话含义、关系转折及事件结果。未完成和已完成严格区分；不重复展开四种认知及待办列表。
openItems 只输出本批新增或有进展的事项，每项 {"id":"已有事项ID；新增填空字符串","kind":"commitment|plan|wish|tension","text":"最新事项内容","status":"open|completed|cancelled","dueAt":"原文明示的ISO时间或空字符串","evidenceIds":["事件ID"]}。
同一事项复用原ID；后续补充、兑现、取消更新原事项，不另建。愿望不当承诺，设想不当行动；只用新证据推进状态。每次最多更新8项，emotion/mood 各不超过160字；claims各1–6项，只列关键判断，每项不超过80字；citations每个来源优先摘一条关键原文，每条不超过160字。只引用输入中的材料ID，人设和用户资料用于理解，不充当发生过的事件证据。`;

export function evidenceFromTimeline(entries: NativeTimelineEntry[]): MemoryEvidence[] {
    return entries.map(e => ({ id: e.id, sourceApp: e.sourceApp, timestamp: e.timestamp, excerpt: e.content.slice(0, 600), context: e.content, kind: "event" }));
}

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("记忆结果结构无效");
    return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("记忆结果内容缺失或过长");
    return value.trim();
}
function evidence(value: unknown, sources: Map<string, MemoryEvidence>, citations?: Map<string, string[]>): MemoryEvidence[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 12) throw new Error("认知更新缺少有效来源");
    const ids = [...new Set(value.map(id => text(id, 500)))];
    return ids.map(id => {
        const source = sources.get(id);
        if (!source) throw new Error("认知结果引用了不存在的事件");
        const full = source.context || source.excerpt;
        const quotes = citations?.get(id);
        const context = quotes?.length ? quotes.map(quote => {
            const start = Math.max(0, full.indexOf(quote) - 240);
            return full.slice(start, start + quote.length + 480);
        }).join("\n…\n").slice(0, 2400) : full.slice(0, 1800);
        return { ...source, excerpt: quotes?.join("\n") || source.excerpt.slice(0, 600), context, ...(quotes ? { quotes } : {}) };
    });
}

/** Validate the entire response before saving anything; malformed JSON cannot advance the cursor. */
export function parseMemoryCognitionUpdate(
    response: string, previous: MemoryCognition, sources: MemoryEvidence[], updatedAt: string,
    options?: { basis?: CognitionBasis; requireClaims?: boolean },
): { summary: string; cognition: MemoryCognition } {
    const cleaned = response.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const data = object(JSON.parse(cleaned));
    const summary = text(data.summary, 3000);
    const sourceMap = new Map(sources.map(e => [e.id, e]));
    const cognition: MemoryCognition = { ...previous, openItems: previous.openItems.map(e => ({ ...e })), reviewedThrough: updatedAt,
        updatedAt: new Date(Math.max(Date.now(), (Date.parse(previous.updatedAt || "") || 0) + 1)).toISOString() };
    for (const key of ["mirror", "gaze", "emotion", "mood"] as const) {
        if (!(key in data)) throw new Error(`记忆结果缺少 ${key}`);
        if (data[key] === null) continue;
        const update = object(data[key]);
        const reflection = key === "mirror" || key === "gaze";
        const citations = new Map<string, string[]>();
        if (reflection && update.citations !== undefined) {
            if (!Array.isArray(update.citations) || update.citations.length > 24) throw new Error("认知引文结构无效");
            for (const item of update.citations) {
                const citation = object(item), id = text(citation.id, 500), quote = text(citation.quote, 360);
                const source = sourceMap.get(id);
                if (!source || !(source.context || source.excerpt).includes(quote)) throw new Error("认知引文不在对应材料中");
                citations.set(id, [...(citations.get(id) || []), quote].slice(0, 3));
            }
        }
        const refs = evidence(update.evidenceIds, sourceMap, citations);
        let claims: CognitionClaim[] | undefined;
        if (reflection && (update.claims !== undefined || options?.requireClaims)) {
            if (!Array.isArray(update.claims) || !update.claims.length || update.claims.length > 6) throw new Error("认知更新缺少逐项判断依据");
            claims = update.claims.map(raw => {
                const claim = object(raw);
                if (!["fact", "interpretation", "hypothesis"].includes(String(claim.kind))) throw new Error("认知判断类型无效");
                const claimRefs = evidence(claim.evidenceIds, sourceMap);
                if (claimRefs.some(ref => !refs.some(e => e.id === ref.id))) throw new Error("判断依据未列入认知来源");
                return { text: text(claim.text, 120), kind: claim.kind as CognitionClaim["kind"], evidenceIds: claimRefs.map(ref => ref.id) };
            });
            if (options?.requireClaims && refs.some(ref => !citations.has(ref.id))) throw new Error("认知来源缺少可核对的摘录");
        }
        const body = text(update.text, reflection ? 1200 : 600);
        const digest = reflection && update.digest !== undefined ? text(update.digest, 160) : undefined;
        const meanings = (values?: CognitionClaim[]) => values?.map(({ text, kind }) => ({ text, kind }));
        if (reflection && previous[key]?.text === body && previous[key]?.digest === digest
            && JSON.stringify(meanings(previous[key]?.claims)) === JSON.stringify(meanings(claims))) continue;
        cognition[key] = {
            text: body, ...(digest ? { digest } : {}), ...(claims ? { claims } : {}),
            ...(reflection && options?.basis ? { basis: options.basis } : {}),
            evidence: reflection ? [...new Map([...(previous[key]?.evidence || []), ...refs].map(e => [e.id, e])).values()].slice(-24) : refs,
            updatedAt,
            ...(reflection ? { revisionId: `cog_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`, generatedAt: new Date().toISOString() } : {}),
        };
    }
    if (!Array.isArray(data.openItems) || data.openItems.length > 8) throw new Error("未了事项结构无效");
    for (const raw of data.openItems) {
        const item = object(raw);
        const itemText = text(item.text, 600);
        if (!["commitment", "plan", "wish", "tension"].includes(String(item.kind)) ||
            !["open", "completed", "cancelled"].includes(String(item.status))) throw new Error("未了事项状态无效");
        if (typeof item.id !== "string") throw new Error("未了事项ID无效");
        const refs = evidence(item.evidenceIds, sourceMap);
        // Exact replays remain idempotent even when a model forgets to reuse the ID.
        const existing = item.id ? cognition.openItems.find(e => e.id === item.id) :
            cognition.openItems.find(e => e.kind === item.kind && e.text === itemText);
        if (item.id && !existing) throw new Error("未了事项引用了未知ID");
        const dueAt = typeof item.dueAt === "string" && item.dueAt.trim() ? item.dueAt.trim() : existing?.dueAt;
        if (dueAt && !Number.isFinite(Date.parse(dueAt))) throw new Error("未了事项时间无效");
        const next: OpenMemoryItem = {
            id: existing?.id || `open_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            kind: item.kind as OpenMemoryItem["kind"], text: itemText,
            status: item.status as OpenMemoryItem["status"], dueAt,
            evidence: [...new Map([...(existing?.evidence || []), ...refs].map(e => [e.id, e])).values()].slice(-24),
            createdAt: existing?.createdAt || updatedAt, updatedAt,
        };
        if (existing) cognition.openItems[cognition.openItems.findIndex(e => e.id === existing.id)] = next;
        else cognition.openItems.push(next);
    }
    return { summary, cognition };
}

export function cognitionForSummary(state: MemoryCognition, context = ""): string {
    const facets = Object.fromEntries((["mirror", "gaze", "emotion", "mood"] as const).map(key => [key, state[key]?.text || null]));
    const words = context.toLowerCase().match(/[a-z\d]{2,}|[\p{Script=Han}]{2}/gu) || [];
    const score = (item: OpenMemoryItem) => words.filter(w => item.text.toLowerCase().includes(w)).length;
    const items: Array<Pick<OpenMemoryItem, "id" | "kind" | "text" | "status" | "dueAt">> = [];
    let used = estimateTokens(JSON.stringify(facets));
    for (const { id, kind, text, status, dueAt } of state.openItems.filter(e => e.status === "open" || score(e) > 0)
        .sort((a, b) => score(b) - score(a) || b.updatedAt.localeCompare(a.updatedAt))) {
        const item = { id, kind, text, status, dueAt }, cost = estimateTokens(JSON.stringify(item));
        if (items.length >= 24) break;
        if (used + cost > 2400) continue;
        items.push(item); used += cost;
    }
    const judgments = Object.fromEntries((["mirror", "gaze"] as const).map(key => [key, state[key]?.claims || []]));
    return JSON.stringify({ ...facets, judgments, openItems: items });
}

export const CHARACTER_EMOTION_GUIDANCE = "按人设与此刻上下文演绎：短时情绪随事件缓和或加深，持续心境影响关注与决定；不将一次气恼变成人格，也不每轮重置失望、期待或担心。允许情绪并存、关系推进与有依据的改变。";

/** Related open items only; stale fast emotion expires, slow mood remains timestamped background. */
export function formatCognitionForPrompt(characterId: string, context: string, budget = 800, now = Date.now()): string {
    if (!canCurrentIdentityInteract(characterId)) return "";
    const state = loadMemoryCognition(characterId);
    const lines: string[] = [];
    let used = estimateTokens("角色认知（主观认识，不等于客观事实；以新事件更新）：\n未了事项结合时机与角色意愿决定是否回应或行动，愿望不当承诺，完成或取消的不再催办。");
    const add = (line: string) => { const cost = estimateTokens(line) + 2; if (used + cost <= budget) { lines.push(line); used += cost; } };
    // Full reflections stay in storage; reserve room for both perspectives, including legacy bodies without a digest.
    const reflectionBudget = Math.max(0, Math.floor((budget - used) * .32));
    for (const [key, label] of [["mirror", "人物理解"], ["gaze", "对用户的主观看法"]] as const) {
        const facet = state[key];
        if (!facet) continue;
        let body = facet.digest || facet.text;
        const full = body;
        while (body && estimateTokens(`${label}：${body}…`) + 2 > reflectionBudget) body = body.slice(0, -1);
        if (body) add(`${label}：${body}${body.length < full.length ? "…" : ""}`);
    }
    if (state.mood) add(`背景心境（${state.mood.updatedAt}）：${state.mood.text}`);
    if (state.emotion && now - Date.parse(state.emotion.updatedAt) < 6 * 3600000) add(`最近情绪（${state.emotion.updatedAt}）：${state.emotion.text}`);
    const tokens = context.toLowerCase().match(/[a-z\d]{2,}|[\p{Script=Han}]{2}/gu) || [];
    const rank = (item: OpenMemoryItem) => tokens.filter(t => item.text.toLowerCase().includes(t)).length +
        (item.dueAt && Date.parse(item.dueAt) <= now ? 1 : 0);
    state.openItems.filter(e => e.status === "open")
        .sort((a, b) => rank(b) - rank(a) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
        .forEach(item => add(`未了·${{ commitment: "约定", plan: "计划", wish: "愿望", tension: "悬而未决" }[item.kind]}：${item.text}${item.dueAt ? `（约定时间${item.dueAt}）` : ""}`));
    return lines.length ? `角色认知（主观认识，不等于客观事实；以新事件更新）：\n${lines.join("\n")}\n未了事项结合时机与角色意愿决定是否回应或行动，愿望不当承诺，完成或取消的不再催办。` : "";
}
