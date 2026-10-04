import type { MemoryEntry } from "./memory-types";
import { DEFAULT_CORE_MEMORY_PROMPT } from "./memory-types";
import {
    loadMemoryConfig,
    loadMemoryEntriesByType,
    saveMemoryEntries,
    getCoreMemoryCounter,
    resetCoreMemoryCounter,
    getLastCoreSummarizedTimestamp,
    setLastCoreSummarizedTimestamp,
} from "./memory-storage";
import { resolveAuxiliaryApiConfig } from "./settings-storage";
import { simpleLLMCall } from "./api-helpers";
import { assertIdentityActive } from "./identity-runtime";
import { canCurrentIdentityInteract } from "./identity-access";
import { estimateTokens } from "./token-counter";

const coreBuildingSet = new Set<string>();

type CoreTimelineItem = {
    id: string;
    timestamp: string;
    content: string;
    sourceApp: MemoryEntry["sourceApp"];
    sourceSessionIds: string[];
};

function formatCoreTimelineForSummarization(
    entries: CoreTimelineItem[],
): { eventsText: string; earliest: string; latest: string; count: number } | null {
    if (entries.length === 0) return null;
    return {
        eventsText: entries.map(entry => `- ${entry.content}`).join("\n"),
        earliest: entries[0].timestamp,
        latest: entries[entries.length - 1].timestamp,
        count: entries.length,
    };
}

export async function runCoreMemoryPipeline(
    characterId: string,
    characterName: string,
    options?: { force?: boolean },
): Promise<{ success: boolean; error?: string; rebuiltCount?: number }> {
    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return { success: false, error: "当前身份无法访问该角色" };
    if (coreBuildingSet.has(characterId)) return { success: false, error: "核心记忆正在整理中" };
    coreBuildingSet.add(characterId);
    try { return await buildCore(characterId, characterName, options); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : "核心记忆整理失败" }; }
    finally { coreBuildingSet.delete(characterId); }
}

async function buildCore(characterId: string, characterName: string, options?: { force?: boolean }): Promise<{ success: boolean; error?: string; rebuiltCount?: number }> {
    const config = loadMemoryConfig();
    const allLongTermEntries = await loadMemoryEntriesByType(characterId, "long_term");

    if (allLongTermEntries.length === 0) {
        return { success: false, error: "没有可用于总结核心记忆的长期记忆" };
    }

    const apiConfig = resolveAuxiliaryApiConfig("memorySummaryApiConfigId");
    if (!apiConfig) {
        return { success: false, error: "未配置记忆总结 API（请在绑定配置 → 辅助API绑定中设置）" };
    }

    const afterTimestamp = options?.force ? undefined : (getLastCoreSummarizedTimestamp(characterId) ?? undefined);
    const previousCore = (await loadMemoryEntriesByType(characterId, "core")).filter(e => e.metadata?.active !== false);
    const represented = new Set(previousCore.flatMap(e => Array.isArray(e.metadata?.sourceMemoryIds) ? e.metadata.sourceMemoryIds.map(String) : []));
    const candidates = allLongTermEntries
        .filter(entry => !afterTimestamp || entry.createdAt > afterTimestamp || (entry.createdAt === afterTimestamp && !represented.has(entry.id)))
        .map(entry => ({
            id: entry.id,
            timestamp: entry.createdAt,
            content: entry.content,
            sourceApp: entry.sourceApp,
            sourceSessionIds: Array.isArray(entry.metadata?.sourceSessionIds)
                ? entry.metadata.sourceSessionIds.map(String)
                : [],
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const entries: CoreTimelineItem[] = [];
    let inputTokens = 0;
    for (const entry of candidates) {
        const bounded = { ...entry, content: entry.content.slice(0, 10000) };
        const cost = estimateTokens(bounded.content) + 10;
        if (entries.length && inputTokens + cost > 12000) break;
        entries.push(bounded); inputTokens += cost;
    }

    if (entries.length === 0) {
        if (!options?.force) resetCoreMemoryCounter(characterId);
        return { success: false, error: "没有新的长期记忆需要总结" };
    }

    const formatted = formatCoreTimelineForSummarization(entries);
    if (!formatted) return { success: false, error: "格式化核心记忆数据失败" };

    const { eventsText, earliest, latest } = formatted;
    const priorLines: string[] = [];
    const priorIds = new Set<string>();
    let priorTokens = 0;
    for (const entry of [...previousCore].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
        const cost = estimateTokens(entry.content);
        if (priorTokens + cost > 3000) continue;
        priorLines.push(entry.content); priorIds.add(entry.id); priorTokens += cost;
    }
    const promptTemplate = config.coreMemoryPrompt?.trim() || DEFAULT_CORE_MEMORY_PROMPT;
    const prompt = promptTemplate
        .replace(/\{\{char\}\}/gi, characterName)
        .replace(/\{\{earliest\}\}/gi, earliest)
        .replace(/\{\{latest\}\}/gi, latest)
        .replace(/\{\{events\}\}/gi, eventsText)
        .replace(/\{\{longTermMemories\}\}/gi, eventsText);

    const result = await simpleLLMCall(
        apiConfig,
        [{ role: "system", content: "合并已有核心记忆与新增事实，输出当前完整核心摘要。保留重要关系转折及人物变化；纠正过时状态，区分当前与历史。仅保留稳定重要事实，不加入日常、短时情绪及猜测。" },
         { role: "user", content: `已有核心记忆：\n${priorLines.join("\n")}\n\n${prompt}` }],
        { temperature: 0.3 },
    );
    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return { success: false, error: "角色权限已变更，已取消入库" };

    if (!result.content) {
        return { success: false, error: result.error || "核心记忆总结失败" };
    }
    if (result.wasTruncated) {
        return { success: false, error: "核心记忆总结结果疑似被截断，已取消入库，请稍后重试" };
    }

    const summary = result.content.trim();
    if (!summary) {
        return { success: false, error: "核心记忆总结结果为空" };
    }

    const now = new Date().toISOString();
    const sourceCounts = new Map<string, number>();
    for (const entry of entries) {
        sourceCounts.set(entry.sourceApp, (sourceCounts.get(entry.sourceApp) || 0) + 1);
    }
    let dominantSource: MemoryEntry["sourceApp"] = "chat";
    let maxCount = 0;
    for (const [src, count] of sourceCounts) {
        if (count > maxCount) {
            dominantSource = src as MemoryEntry["sourceApp"];
            maxCount = count;
        }
    }
    const sourceSessionIds = Array.from(new Set(entries.flatMap(entry => entry.sourceSessionIds)));

    const coreEntry: MemoryEntry = {
        id: `mem_core_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        characterId,
        sourceApp: dominantSource,
        type: "core",
        content: summary,
        importance: 0.95,
        createdAt: now,
        updatedAt: now,
        metadata: {
            active: true,
            summarizedLongTermEntries: entries.length,
            timeSpan: `${earliest} ~ ${latest}`,
            sourceSessionIds,
            evidence: allLongTermEntries.filter(e => entries.some(source => source.id === e.id)).flatMap(e => Array.isArray(e.metadata?.evidence) ? e.metadata.evidence : []).slice(-64),
            sourceMemoryIds: [...new Set([...previousCore.filter(e => priorIds.has(e.id)).flatMap(e => Array.isArray(e.metadata?.sourceMemoryIds) ? e.metadata.sourceMemoryIds.map(String) : [e.id]), ...entries.map(e => e.id)])],
        },
    };
    const currentCore = await loadMemoryEntriesByType(characterId, "core");
    if (previousCore.filter(e => priorIds.has(e.id)).some(entry => !currentCore.some(current => current.id === entry.id && current.updatedAt === entry.updatedAt))) {
        return { success: false, error: "整理期间核心记忆被修改，已保留修改，请重新整理" };
    }
    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return { success: false, error: "角色权限已变更，已取消入库" };
    await saveMemoryEntries([
        ...previousCore.filter(e => priorIds.has(e.id)).map(entry => ({ ...entry, metadata: { ...entry.metadata, active: false, supersededBy: coreEntry.id } })),
        coreEntry,
    ]);

    const last = getLastCoreSummarizedTimestamp(characterId);
    if (!last || latest > last) setLastCoreSummarizedTimestamp(characterId, latest);
    if (!options?.force) {
        resetCoreMemoryCounter(characterId);
    }

    return { success: true, rebuiltCount: 1 };
}

export async function maybeRunCoreMemoryPipeline(
    characterId: string,
    characterName: string,
): Promise<void> {
    const config = loadMemoryConfig();
    if (!config.autoBuildCoreEnabled) return;

    const counter = getCoreMemoryCounter(characterId);
    if (counter < config.coreSummarizationInterval) return;

    const result = await runCoreMemoryPipeline(characterId, characterName);
    if (!result.success) console.warn("[CoreMemory] Auto summary failed:", result.error);
}
