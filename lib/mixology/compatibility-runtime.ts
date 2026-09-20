import { applyCompatibilityRegex, compatibilityRegexRules } from "./compatibility-regex";
import { selectCompatibilityLore, type LoreState, type LoreReport } from "./compatibility-worldbook";
import type { LLMMessage } from "../llm-prompt-assembler";
import type { PresetConfig } from "../settings-types";
import type { MixCharacterCard, MixMaterial, MixMaterialKind } from "./types";
import { mixCardProfileText, mixCardWorldText } from "./card-freeform";
import { record, records, string, strings, type CompatRecord } from "./compatibility";

const finite = (v: unknown, fallback: number) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
const role = (v: unknown): "system" | "user" | "assistant" => v === "user" || v === "assistant" ? v : "system";

/** Per-request variables never leak between characters or sessions. Unknown macros stay visible. */
export function createCompatibilityMacros(values: Record<string, string>, random = Math.random) {
    const vars = new Map<string, string>();
    const expand = (input: string, nesting = 0): string => {
        if (nesting > 12) return input;
        const text = input.replace(/\{\{\/\/[\s\S]*?\}\}/g, "").replace(/[ \t]*\n?[ \t]*\{\{trim\}\}[ \t]*\n?[ \t]*/gi, "");
        const evaluate = (whole: string, body: string): string => {
                body = expand(body, nesting + 1);
                const parts = body.split("::");
                const op = parts.shift()!.trim().toLowerCase();
                if (op === "setvar") {
                    const key = (parts.shift() ?? "").trim();
                    const value = parts.join("::");
                    vars.set(key, value);
                    return "";
                }
                if (op === "getvar") return vars.get(parts.join("::").trim()) ?? "";
                if (op === "random" || op === "pick") return parts[Math.floor(random() * parts.length)] ?? "";
                const dice = body.trim().match(/^roll(?:::|:)(\d{1,2})d(\d{1,4})([+-]\d+)?$/i);
                if (dice) {
                    const [, count, sides, offset] = dice;
                    if (+sides < 1 || +count > 50) return whole;
                    return String(Array.from({ length: +count }, () => 1 + Math.floor(random() * +sides)).reduce((a, b) => a + b, Number(offset ?? 0)));
                }
                if (op === "trim") return "";
                if (op === "newline") return "\n";
                if (op === "noop") return "";
                const lookup = op === "outlet" ? "outlet::" + parts.join("::") : op;
                return Object.hasOwn(values, lookup) ? expand(values[lookup], nesting + 1) : whole;
            };
        let out = "", cursor = 0;
        while (cursor < text.length) {
            const start = text.indexOf("{{", cursor);
            if (start < 0) { out += text.slice(cursor); break; }
            out += text.slice(cursor, start);
            let depth = 1, end = start + 2;
            while (end < text.length && depth) {
                if (text.slice(end, end + 2) === "{{") { depth++; end += 2; }
                else if (text.slice(end, end + 2) === "}}") { depth--; end += 2; }
                else end++;
            }
            if (depth) { out += text.slice(start); break; }
            out += evaluate(text.slice(start, end), text.slice(start + 2, end - 2));
            if (out.length > 2_000_000) throw new Error("预设宏展开后的内容过长，请精简预设。");
            cursor = end;
        }
        return out;
    };
    return (input: string) => expand(input);

}

function promptList(data: CompatRecord): CompatRecord[] {
    const prompts = records(data.prompts);
    const orders = records(data.prompt_order);
    const order = orders.find(o => o.character_id === 100001) ?? orders.find(o => Array.isArray(o.order));
    return order ? records(order.order).filter(o => o.enabled === true).flatMap(o => {
        const p = prompts.find(p => p.identifier === o.identifier);
        return p ? [p] : [];
    }) : prompts.filter(p => p.enabled !== false);
}

export function compatibilityPreset(material: MixMaterial | undefined): PresetConfig | null {
    if (material?.compatibility?.format !== "preset") return null;
    const d = material.compatibility.data;
    return {
        id: material.id, name: material.name, createdAt: material.createdAt, updatedAt: material.updatedAt,
        temperature: Math.max(0, Math.min(2, finite(d.temperature, 1))),
        top_p: Math.max(0, Math.min(1, finite(d.top_p, 1))), top_k: Math.max(0, finite(d.top_k, 0)),
        frequency_penalty: Math.max(-2, Math.min(2, finite(d.frequency_penalty, 0))),
        presence_penalty: Math.max(-2, Math.min(2, finite(d.presence_penalty, 0))),
        repetition_penalty: Math.max(0, Math.min(2, finite(d.repetition_penalty, 1))),
        openai_max_tokens: Math.max(1, Math.min(8192, finite(d.openai_max_tokens, 4096))),
        openai_max_context: Math.max(1024, finite(d.openai_max_context, 32000)),
        // Message assembly has already happened here; never reapply global chat prompts.
        prompts: [], prompt_order: [],
    };
}

export function buildCompatibilityMessages(input: {
    card: MixCharacterCard;
    active: Partial<Record<MixMaterialKind, MixMaterial[]>>;
    history: LLMMessage[];
    userName: string;
    nativeSystem: string;
    postHistory: string;
    nudge?: string;
    loreState?: LoreState;
    turn?: number;
    trigger?: string;
    seed?: string;
    historyEdits?: boolean[];
}): { messages: LLMMessage[]; preset: PresetConfig | null; loreState: LoreState; loreReport: LoreReport } | null {
    const { card, active, userName } = input;
    const presets = (active.base ?? []).filter(m => m.compatibility?.format === "preset");
    if (presets.length > 1) throw new Error("一杯特调只能使用一份酒馆预设，请从基底移除多余预设。");
    const presetMaterial = presets[0];
    if (!presetMaterial && !card.compatibility && !(active.flavor ?? []).some(m => m.compatibility)) return null;
    const presetData = presetMaterial?.compatibility?.data ?? {};
    const data = card.compatibility?.data ?? {};
    const persona = active.persona?.[0];
    const values = { char: card.charName, user: userName, description: card.profileMode === "freeform" ? mixCardProfileText(card) : [card.baseInfo, card.appearance, card.background, card.extra].filter(Boolean).join("\n\n"), personality: card.personality ?? "", scenario: mixCardWorldText(card), persona: persona && "content" in persona ? persona.content : "", original: "" };
    const apply = createCompatibilityMacros(values);
    const prompts = promptList(presetData);
    // Initialize variables in configured order before resolving marker references.
    for (const p of prompts) if (/\{\{\s*setvar::/i.test(string(p.content))) apply(string(p.content));
    const messages: LLMMessage[] = [];
    const push = (r: unknown, content: string) => { const text = apply(content); if (text.trim()) messages.push({ role: role(r), content: text }); };
    const regexRules = compatibilityRegexRules(active);
    const sourceHistory = input.history.map((m, i) => ({ ...m, content: typeof m.content === "string" ? applyCompatibilityRegex(apply(m.content), regexRules, { phase: "source", placement: m.role === "user" ? 1 : 2, isEdit: input.historyEdits?.[i], macro: apply }) : m.content }));
    const history = sourceHistory.map((m, i) => ({ ...m, content: typeof m.content === "string" ? applyCompatibilityRegex(m.content, regexRules, { phase: "prompt", placement: m.role === "user" ? 1 : 2, depth: sourceHistory.length - i - 1, macro: apply }) : m.content }));
    let seed = [...(input.seed ?? "mixology")].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
    const loreResult = selectCompatibilityLore({ card, active, history: sourceHistory.map(m => typeof m.content === "string" ? m.content : ""), fields: { persona_description: values.persona, character_description: values.description, character_personality: values.personality, character_depth_prompt: string(record(record(data.extensions).depth_prompt).prompt), scenario: values.scenario, creator_notes: string(data.creator_notes) }, macro: apply, state: input.loreState, turn: input.turn ?? 0, trigger: input.trigger, contextBudget: Math.min(8192, Math.floor(finite(presetData.openai_max_context, 32000) * .25)), random: () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; } });
    const lore = loreResult.entries;
    const before = lore.filter(e => e._position === 0);
    const after = lore.filter(e => e._position === 1);
    const joinLore = (entries: CompatRecord[]) => entries.map(e => applyCompatibilityRegex(string(e.content), regexRules, { phase: "source", placement: 5, macro: apply })).join("\n\n");
    const beforeExamples = joinLore(lore.filter(e => e._position === 5));
    const afterExamples = joinLore(lore.filter(e => e._position === 6));
    for (const [name, text] of Object.entries(loreResult.outlets)) (values as Record<string, string>)["outlet::" + name] = text;
    const depthItems: { depth: number; order: number; message: LLMMessage }[] = [];
    const addDepth = (depth: unknown, order: unknown, r: unknown, text: string) => {
        const content = apply(text);
        if (content.trim()) depthItems.push({ depth: Math.max(0, finite(depth, 4)), order: finite(order, 100), message: { role: role(r), content } });
    };
    for (const e of lore) {
        if ([2, 3, 4].includes(e._position)) addDepth(e._position === 4 ? e._depth : 0, e._position === 2 ? 0 : e._position === 3 ? 200 : e._order, ["system", "user", "assistant"][e._role], joinLore([e]));
    }
    const depthPrompt = record(record(data.extensions).depth_prompt);
    if (string(depthPrompt.prompt)) addDepth(depthPrompt.depth, 100, ["system", "user", "assistant"][finite(depthPrompt.role, 0)], string(depthPrompt.prompt));
    let historyIndex = -1;
    let mainSeen = false, postSeen = false;
    const seen = new Set<string>();
    const examples = card.examples?.length ? card.examples.map(e => ({ role: e.role === "char" ? "assistant" as const : "user" as const, content: e.text })) : [];
    const markers: Record<string, string> = { charDescription: values.description, charPersonality: card.profileMode === "freeform" ? "" : values.personality, scenario: values.scenario, personaDescription: values.persona, worldInfoBefore: joinLore(before), worldInfoAfter: joinLore(after) };
    if (!presetMaterial) {
        push("system", string(data.system_prompt));
        push("system", joinLore(before));
        push("system", input.nativeSystem);
        push("system", joinLore(after));
        push("system", beforeExamples);
        push("system", afterExamples);
        historyIndex = messages.length;
        messages.push(...history);
    } else {
        for (const p of prompts) {
            const id = string(p.identifier);
            seen.add(id);
            if (p.marker === true || id === "chatHistory" || id === "dialogueExamples") {
                if (id === "chatHistory") { historyIndex = messages.length; messages.push(...history); }
                else if (id === "dialogueExamples") { push("system", beforeExamples); for (const m of examples) push(m.role, m.content); push("system", afterExamples); }
                else if (id in markers) push(p.role, markers[id]);
                continue;
            }
            let content = string(p.content);
            if (id === "main") { mainSeen = true; if (p.forbid_overrides !== true && string(data.system_prompt)) content = string(data.system_prompt).replace(/\{\{original\}\}/gi, content); }
            if (id === "jailbreak") { postSeen = true; if (p.forbid_overrides !== true && string(data.post_history_instructions)) content = string(data.post_history_instructions).replace(/\{\{original\}\}/gi, content); }
            if (p.injection_position === 1) addDepth(p.injection_depth, p.injection_order, p.role, content);
            else push(p.role, content);
        }
        // Missing markers (as distinct from intentionally disabled markers) get a fallback.
        const defined = new Set(records(presetData.prompts).map(p => string(p.identifier)));
        const fallback: LLMMessage[] = [];
        for (const [id, content] of Object.entries(markers)) if (!seen.has(id) && !defined.has(id) && content.trim()) fallback.push({ role: "system", content: apply(content) });
        messages.unshift(...fallback);
        if (historyIndex >= 0) historyIndex += fallback.length;
        if (!mainSeen && !defined.has("main") && string(data.system_prompt)) { messages.unshift({ role: "system", content: apply(string(data.system_prompt)) }); if (historyIndex >= 0) historyIndex++; }
        if (historyIndex < 0) { historyIndex = messages.length; messages.push(...history); }
        // Native supplementary material/contracts are explicit additions, not duplicate card text.
        if (input.nativeSystem.trim()) { messages.unshift({ role: "system", content: apply(input.nativeSystem) }); historyIndex++; }
    }
    depthItems.sort((a, b) => a.depth - b.depth || b.order - a.order);
    for (const item of depthItems) messages.splice(historyIndex + Math.max(0, history.length - item.depth), 0, item.message);
    if (!postSeen) push("system", string(data.post_history_instructions));
    push("system", input.postHistory);
    if (input.nudge) push("user", input.nudge);
    return { messages: messages.filter(m => typeof m.content !== "string" || m.content.trim()), preset: compatibilityPreset(presetMaterial), loreState: loreResult.state, loreReport: loreResult.report };
}
