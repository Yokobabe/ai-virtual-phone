import { createMixId, type MixCharacterCard, type MixMaterial } from "./types";

export type MixImportSource = "native" | "tavern" | "janitor";
export type CompatRecord = Record<string, unknown>;
export type MixCompatibility = {
    source: "tavern" | "janitor";
    format: "card" | "preset" | "worldbook";
    /** Data only: extensions and scripts are never evaluated. */
    data: CompatRecord;
    warnings: string[];
};
export const record = (value: unknown): CompatRecord => value && typeof value === "object" && !Array.isArray(value) ? value as CompatRecord : {};
export const string = (value: unknown): string => typeof value === "string" ? value : "";
export const records = (value: unknown): CompatRecord[] => Array.isArray(value) ? value.map(record) : [];
export const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

// Do not persist API credentials/provider routing from a downloaded preset.
const privateKey = /api.?key|secret|password|token$|cookie|authorization|proxy|base.?url|endpoint/i;
function dataOnly(value: unknown, depth = 0): unknown {
    if (depth > 40) throw new Error("文件嵌套过深，无法导入。");
    if (Array.isArray(value)) return value.map(v => dataOnly(v, depth + 1));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !privateKey.test(k) && !["__proto__", "constructor", "prototype"].includes(k)).map(([k, v]) => [k, dataOnly(v, depth + 1)]));
    return value;
}

export function parseCompatExamples(text: string): { role: "user" | "char"; text: string }[] {
    const result: { role: "user" | "char"; text: string }[] = [];
    for (const part of text.split(/<START>/i)) {
        const pattern = /(?:^|\n)\s*\{\{(user|char)\}\}\s*:\s*/gi;
        const matches = [...part.matchAll(pattern)];
        for (let i = 0; i < matches.length; i++) {
            const m = matches[i];
            const body = part.slice(m.index! + m[0].length, matches[i + 1]?.index ?? part.length).trim();
            if (body) result.push({ role: m[1].toLowerCase() as "user" | "char", text: body });
        }
    }
    return result;
}

export function parseCompatibilityJson(value: unknown, source: Exclude<MixImportSource, "native">, fileName = ""): MixMaterial[] {
    const root = record(dataOnly(value));
    const now = Date.now();
    const meta = { id: createMixId("mixmat"), createdAt: now, updatedAt: now };
    const warnings: string[] = [];
    if (root.entries && (Array.isArray(root.entries) || typeof root.entries === "object")) {
        return [{ ...meta, kind: "flavor", name: string(root.name) || fileName.replace(/\.json$/i, "") || "世界书", content: "", hook: "世界书 · 放入风味后按规则触发", compatibility: { source, format: "worldbook", data: root, warnings: ["世界书作为「风味」入柜，可与内嵌世界书一起使用。支持常驻、关键词/正则关键词、递归、概率、分组、持续/冷却及预算；向量召回和外部自动化不执行。预算采用 token 估算。"] } }];
    }
    if (Array.isArray(root.prompts)) {
        if (source !== "tavern") throw new Error("这是酒馆预设，请选择「酒馆兼容」入口。");
        if (!records(root.prompts).every(p => typeof p.identifier === "string" && (p.content === undefined || typeof p.content === "string"))) throw new Error("预设条目格式不完整。");
        const orders = records(root.prompt_order);
        if (orders.length && !orders.some(o => Array.isArray(o.order))) throw new Error("不支持这份预设的排序格式。");
        warnings.push("预设作为「基底」入柜；每杯只选一份酒馆预设。原生序言、杯型等仍可按需搭配。", "支持常用变量、随机/骰子宏、消息顺序与深度插入；复杂宏、工具调用、助手预填充及服务商专用参数未启用。", "采用预设的温度等通用参数；单次输出上限最多 8192 tokens，避免导入超大上限。实际可用长度仍取决于接口。");
        extensionWarnings(root, warnings);
        return [{ ...meta, kind: "base", name: string(root.name) || fileName.replace(/\.json$/i, "") || "酒馆预设", content: "", hook: "酒馆预设 · 放入基底后生效", compatibility: { source, format: "preset", data: root, warnings } }];
    }
    const nested = record(root.data);
    const card = Object.keys(nested).length ? nested : Object.keys(record(root.character)).length ? record(root.character) : root;
    const name = string(card.name) || string(card.char_name);
    const description = string(card.description) || string(card.char_persona);
    const personality = string(card.personality);
    const scenario = string(card.scenario) || string(card.world_scenario);
    const first = string(card.first_mes) || string(card.first_message) || string(card.initial_message) || string(card.char_greeting);
    if (!name.trim() || !(description || personality || scenario || first)) throw new Error("没有找到完整角色字段。需要角色名、人设和开场白等数据；角色链接或头像不能代替角色文件。");
    const openings = [first, ...strings(card.alternate_greetings)].filter(s => s.trim());
    if (!openings.length) throw new Error("角色文件没有开场白。请补充 first_mes 或 initial_message 后导入。");
    const examples = string(card.mes_example) || string(card.example_dialogs) || string(card.example_dialogue);
    const normalized = { ...card, name, description, personality, scenario, first_mes: first, mes_example: examples };
    warnings.push("支持人设、多开场、示例、卡片系统指令，以及世界书关键词、递归、概率、分组、持续/冷却和预算。向量召回与外部自动化未启用；预算使用 token 估算。", "这是本地角色副本；不会连接 JanitorAI 模型、同步站内聊天或从链接提取隐藏设定。");
    extensionWarnings(card, warnings);
    const result: MixCharacterCard = { ...meta, kind: "character", name, charName: name, baseInfo: description, personality, plot: scenario, openings, examples: parseCompatExamples(examples), author: string(card.creator) || undefined, tags: strings(card.tags), compatibility: { source, format: "card", data: normalized, warnings } };
    return [result];
}

function extensionWarnings(data: CompatRecord, warnings: string[]) {
    const extensions = record(data.extensions);
    const count = records(extensions.regex_scripts).length;
    if (count) warnings.push(`附带 ${count} 条酒馆正则，按开关、消息类型、显示/上下文与深度执行。原始回复保留；HTML 美化使用隔离展示，不运行插件脚本。斜杠命令与接口独立 reasoning 字段不适用。`);
    if (extensions.tavern_helper || extensions.ray_mobile || extensions.SPreset) warnings.push("附带酒馆插件/脚本扩展，已保留但不会执行；依赖插件的自定义界面与行为不兼容。");
}

export function compatibilityWarnings(materials: MixMaterial[]): string[] {
    return [...new Set(materials.flatMap(m => {
        if (!m.compatibility) return [];
        const warnings = m.compatibility.warnings.filter(w => !w.includes("条酒馆正则") && !w.includes("复杂世界书递归"));
        extensionWarnings(m.compatibility.data, warnings);
        if (m.compatibility.format !== "preset") warnings.push("世界书按触发条件与预算注入；每轮可查看入选和未入选原因。向量召回、外部自动化及酒馆插件脚本不执行。");
        return warnings;
    }))];
}
