import { record, records, string, strings, type CompatRecord } from "./compatibility";
import type { MixMaterial, MixMaterialKind } from "./types";

export type CompatibilityRegexPhase = "source" | "display" | "prompt";
export function compatibilityRegexRules(active: Partial<Record<MixMaterialKind, MixMaterial[]>>): CompatRecord[] {
    // Match ST scope ordering: character-scoped rules precede preset-scoped rules.
    return [...(active.character ?? []), ...(active.base ?? [])].flatMap(m => records(record(m.compatibility?.data.extensions).regex_scripts));
}

export function parseCompatibilityRegex(pattern: string): RegExp {
    if (pattern.startsWith("/")) {
        const end = pattern.lastIndexOf("/");
        if (end > 0 && /^[dgimsuvy]*$/.test(pattern.slice(end + 1))) return new RegExp(pattern.slice(1, end), pattern.slice(end + 1));
    }
    return new RegExp(pattern);
}

export function applyCompatibilityRegex(text: string, rules: CompatRecord[], options: {
    phase: CompatibilityRegexPhase;
    placement: number;
    depth?: number;
    isEdit?: boolean;
    macro?: (value: string) => string;
}): string {
    const macro = options.macro ?? (s => s);
    let output = text;
    for (const rule of rules) {
        if (rule.disabled || !string(rule.findRegex) || !Array.isArray(rule.placement) || !rule.placement.includes(options.placement)) continue;
        const applies = options.phase === "display" ? rule.markdownOnly : options.phase === "prompt" ? rule.promptOnly : !rule.markdownOnly && !rule.promptOnly;
        if (!applies || (options.isEdit && !rule.runOnEdit)) continue;
        if (typeof options.depth === "number") {
            if (typeof rule.minDepth === "number" && rule.minDepth >= 0 && options.depth < rule.minDepth) continue;
            if (typeof rule.maxDepth === "number" && rule.maxDepth >= 0 && options.depth > rule.maxDepth) continue;
        }
        let pattern = string(rule.findRegex);
        if (Number(rule.substituteRegex) === 1) pattern = macro(pattern);
        if (Number(rule.substituteRegex) === 2) pattern = pattern.replace(/\{\{[^{}]*\}\}/g, token => macro(token).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t"));
        let regex: RegExp;
        try { regex = parseCompatibilityRegex(pattern); }
        catch { throw new Error(`正则「${string(rule.scriptName) || "未命名"}」语法无效，请在兼容设置中修正或停用。`); }
        output = output.replace(regex, (...args: unknown[]) => {
            const named = typeof args[args.length - 1] === "object" ? record(args[args.length - 1]) : {};
            const groupCount = args.length - (Object.keys(named).length ? 3 : 2);
            const replacement = string(rule.replaceString).replace(/\{\{match\}\}/gi, "$0").replace(/\$(\d+)|\$<([^>]+)>/g, (_whole, number: string, name: string) => {
                let captured = name ? string(named[name]) : Number(number) < groupCount ? string(args[Number(number)]) : "";
                for (const trim of strings(rule.trimStrings)) captured = captured.split(macro(trim)).join("");
                return captured;
            });
            return macro(replacement);
        });
        if (output.length > 2_000_000) throw new Error("正则替换结果过长，请检查替换模板。");
    }
    return output;
}
