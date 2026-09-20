import type { MixCharacterCard, MixMaterial, MixMaterialKind } from "./types";
import { records, string } from "./compatibility";
import { createCompatibilityMacros } from "./compatibility-runtime";
import { applyCompatibilityRegex, compatibilityRegexRules, type CompatibilityRegexPhase } from "./compatibility-regex";

export type CompatibilityTextInput = { text: string; active: Partial<Record<MixMaterialKind, MixMaterial[]>>; charName: string; userName: string; phase: CompatibilityRegexPhase; placement: number; depth?: number; isEdit?: boolean; streaming?: boolean };
export function transformCompatibilityText(input: CompatibilityTextInput): string {
    const card = input.active.character?.[0] as MixCharacterCard | undefined;
    const apply = createCompatibilityMacros({ char: input.charName, user: input.userName, description: card?.baseInfo ?? card?.profileText ?? "", personality: card?.personality ?? "", scenario: card?.plot ?? card?.worldText ?? "" });
    for (const mat of input.active.base ?? []) {
        const data = mat.compatibility?.data;
        const order = records(data?.prompt_order).find(o => o.character_id === 100001) ?? records(data?.prompt_order)[0];
        const enabled = new Set(records(order?.order).filter(o => o.enabled).map(o => o.identifier));
        for (const p of records(data?.prompts)) if ((!order || enabled.has(p.identifier)) && /\{\{setvar::/i.test(string(p.content))) apply(string(p.content));
    }
    const rules = compatibilityRegexRules(input.active);
    let text = input.text;
    // Do not flash a partial hidden thinking block while waiting for its closing tag.
    if (input.streaming && rules.some(r => !r.disabled && r.markdownOnly && /think|disclaimer/i.test(string(r.findRegex)))) {
        const opens = [...text.matchAll(/<(think(?:ing)?|disclaimer)\b[^>]*>/gi)];
        for (const open of opens) if (!new RegExp(`</${open[1]}\\s*>`, "i").test(text.slice(open.index! + open[0].length))) { text = text.slice(0, open.index); break; }
    }
    text = applyCompatibilityRegex(text, rules, { ...input, phase: "source", depth: undefined, macro: apply });
    return input.phase === "source" ? text : applyCompatibilityRegex(text, rules, { ...input, isEdit: false, macro: apply });
}
