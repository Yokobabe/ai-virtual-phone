// lib/memory-summarizer.ts
// Auto-summarization engine: summarizes short-term events into long-term memories.
// Trigger: every N events (configurable). Short-term events are NOT deleted after summarization.

import type { MemoryEntry } from "./memory-types";
import { DEFAULT_SUMMARIZATION_PROMPT } from "./memory-types";
import {
    loadMemoryConfig,
    loadMemoryEntries,
    loadMemoryEntriesByType,
    saveMemoryEntries,
    loadPersistedMemoryCognition,
    deleteMemoryEntries,
    getEventCounter,
    resetEventCounter,
    getLastSummarizedTimestamp,
    setLastSummarizedTimestamp,
    getPendingSummaryTimestamp,
    setPendingSummaryTimestamp,
    incrementCoreMemoryCounter,
} from "./memory-storage";
import { resolveAuxiliaryApiConfig } from "./settings-storage";
import { loadNativeTimeline, formatTimelineForSummarization, filterTimelineByAllowedSources } from "./short-term-assembler";
import { generateEmbedding, resolveEmbeddingModel } from "./memory-embedding";
import { simpleLLMCall } from "./api-helpers";
import { maybeRunCoreMemoryPipeline } from "./core-memory-builder";
import { loadCharacters } from "./character-storage";
import { resolveUserIdentity } from "./settings-storage";
import { assertIdentityActive, getCurrentIdentityId } from "./identity-runtime";
import { canCurrentIdentityInteract } from "./identity-access";
import { estimateTokens } from "./token-counter";
import { loadMemoryCognition, cacheMemoryCognition, evidenceFromTimeline, parseMemoryCognitionUpdate, cognitionForSummary, MEMORY_COGNITION_PROTOCOL } from "./memory-cognition";
import { buildCognitionContext } from "./memory-cognition-context";

/** Per-character lock to prevent concurrent summarization. */
const summarizingSet = new Set<string>();
const autoRetryAfter = new Map<string, number>();

function cognitionUserContext(identity: ReturnType<typeof resolveUserIdentity>): string {
    if (!identity) return "用户";
    return [`姓名：${identity.name}`, identity.gender && identity.gender !== "保密" ? `性别：${identity.gender}` : "",
        identity.age ? `年龄：${identity.age}` : "", identity.occupation ? `职业：${identity.occupation}` : "",
        identity.bio?.slice(0, 2500), identity.customSettings?.slice(0, 2000)].filter(Boolean).join("；");
}

/**
 * Check if summarization should run based on event counter, then execute.
 * Trigger: counter >= summarizationEventInterval.
 * API config is resolved from auxiliary binding (global, not per-character).
 */
export async function maybeRunSummarization(
    characterId: string,
    characterName: string
): Promise<void> {
    const config = loadMemoryConfig();
    if (!config.autoSummarizeEnabled) return;

    const counter = getEventCounter(characterId);
    if (counter < config.summarizationEventInterval && !getPendingSummaryTimestamp(characterId)) return;
    const identityId = getCurrentIdentityId();
    const retryKey = `${identityId}:${characterId}`;
    if ((autoRetryAfter.get(retryKey) || 0) > Date.now()) return;
    // Drain a bounded backlog at the same summary nodes, never reanalyse each chat bubble.
    for (let batch = 0; batch < 3; batch++) {
        assertIdentityActive();
        if (getCurrentIdentityId() !== identityId || !loadMemoryConfig().autoSummarizeEnabled) return;
        const result = await runSummarizationPipeline(characterId, characterName);
        if (!result.success) { autoRetryAfter.set(retryKey, Date.now() + 60000); return; }
        autoRetryAfter.delete(retryKey);
        if (!result.remainingCount) return;
    }
}

/**
 * Run the full summarization pipeline.
 * Reads events since last summarization, summarizes them, saves as long-term memory.
 * Does NOT delete short-term events — they are only trimmed by token budget elsewhere.
 * API config is resolved from auxiliary binding (global, not per-character).
 */
export async function runSummarizationPipeline(
    characterId: string,
    characterName: string,
    options?: {
        force?: boolean;
        /** 手动指定总结起点（覆盖进度水位线）；force 为真时忽略 */
        sinceTimestamp?: string;
    }
): Promise<{ success: boolean; error?: string; remainingCount?: number; nextSinceTimestamp?: string }> {
    const key = `${getCurrentIdentityId()}:${characterId}`;
    if (summarizingSet.has(key)) return { success: false, error: "该角色的记忆正在整理中" };
    if (!canCurrentIdentityInteract(characterId)) return { success: false, error: "当前身份无法访问该角色" };
    summarizingSet.add(key);
    try { return await summarize(characterId, characterName, options); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : "记忆整理失败" }; }
    finally { summarizingSet.delete(key); }
}

async function summarize(characterId: string, characterName: string, options?: { force?: boolean; sinceTimestamp?: string }): Promise<{ success: boolean; error?: string; remainingCount?: number; nextSinceTimestamp?: string }> {
    assertIdentityActive();
    const config = loadMemoryConfig();

    // Resolve API from auxiliary binding
    const apiConfig = resolveAuxiliaryApiConfig("memorySummaryApiConfigId");
    if (!apiConfig) {
        return { success: false, error: "未配置记忆总结 API（请在绑定配置 → 辅助API绑定中设置）" };
    }

    const stored = await loadMemoryEntries(characterId);
    assertIdentityActive();
    const persistedPrevious = await loadPersistedMemoryCognition(characterId);
    const previous = persistedPrevious || loadMemoryCognition(characterId);
    const startingCounter = getEventCounter(characterId);
    const pending = getPendingSummaryTimestamp(characterId);
    // Read native app data (chat messages, moments) directly — no separate event log
    const afterTimestamp = options?.force
        ? undefined
        : options?.sinceTimestamp ?? pending ?? (getLastSummarizedTimestamp(characterId) ?? undefined);
    // 记忆来源开关同样作用于长期总结：被关掉的来源不进总结素材。
    // 进度水位线取「过滤后」最后一条的时间，因此关掉的来源不会把水位线推过头，
    // 但已被水位线越过的内容重新打开后也不会回补——这一点在设置里已注明。
    const boundaryIds = new Set(stored.filter(e => e.metadata?.lastSourceTimestamp === afterTimestamp).flatMap(e => e.sourceMessageIds || []));
    const availableEntries = filterTimelineByAllowedSources(
        loadNativeTimeline(characterId, afterTimestamp ? { afterTimestamp: new Date(Date.parse(afterTimestamp) - 1).toISOString() } : undefined),
        config.shortTermAllowedSources,
    ).filter(e => !afterTimestamp || e.timestamp > afterTimestamp || !boundaryIds.has(e.id));
    // Oldest-first bounded batches: remaining events are handled in the next run, never skipped.
    const allEntries: typeof availableEntries = [];
    let inputTokens = 0;
    for (const entry of availableEntries) {
        const content = entry.content.slice(0, 12000);
        const cost = estimateTokens(content) + 35;
        if (allEntries.length && inputTokens + cost > 12000) break;
        allEntries.push({ ...entry, content }); inputTokens += cost;
    }

    if (allEntries.length === 0) {
        if (!options?.force) resetEventCounter(characterId);
        return { success: false, error: "没有可总结的事件" };
    }

    const formatted = formatTimelineForSummarization(allEntries);
    if (!formatted) return { success: false, error: "格式化事件数据失败" };

    const { earliest, latest } = formatted;
    const eventsText = allEntries.map(e => `[${e.id}] ${e.timestamp} ${e.sourceApp}${e.sourceDetail ? "/" + e.sourceDetail : ""}\n${e.content}`).join("\n\n");

    // Use user-editable prompt template from config, with placeholder substitution
    const promptTemplate = config.summarizationPrompt?.trim() || DEFAULT_SUMMARIZATION_PROMPT;
    const summaryPrompt = promptTemplate
        .replace(/\{\{char\}\}/gi, characterName)
        .replace(/\{\{earliest\}\}/gi, earliest)
        .replace(/\{\{latest\}\}/gi, latest)
        .replace(/\{\{events\}\}/gi, eventsText);
    const character = loadCharacters().find(c => c.id === characterId);
    const identity = resolveUserIdentity();
    const context = config.cognitionEnabled !== false
        ? buildCognitionContext(characterId, stored, allEntries, previous, config, "incremental") : null;
    const cognitionInput = context ? `\n\n更新方式：增量缝补\n角色人设：${character?.persona.slice(0, 10000) || "未填写"}\n表达习惯：${character?.personality?.slice(0, 1500) || ""}\n当前用户身份：${cognitionUserContext(identity)}\n已有认知与未了事项：${cognitionForSummary(previous, eventsText)}\n相关记忆与旧判断依据：\n${context.supplement || "无"}` : "";

    // Call LLM for summarization — compatible with all providers
    // label 用于在「底层调用大模型日志」中标识这是记忆总结调用
    const result = await simpleLLMCall(
        apiConfig,
        [
            ...(config.cognitionEnabled !== false ? [{ role: "system" as const, content: MEMORY_COGNITION_PROTOCOL }] : []),
            { role: "user", content: `${summaryPrompt}${!/\{\{events\}\}/i.test(promptTemplate) ? `\n\n本批事件：\n${eventsText}` : ""}${cognitionInput}` },
        ],
        { temperature: 0.3, label: `记忆总结·${characterName}` },
    );

    if (!result.content) {
        return { success: false, error: result.error || "LLM 返回了空内容" };
    }

    if (result.wasTruncated) {
        console.warn("[MemorySummarizer] Summary generation truncated:", result.finishReason);
        return { success: false, error: "记忆总结结果疑似被截断，已取消入库，请稍后重试或提高模型输出上限" };
    }

    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return { success: false, error: "角色权限已变更，已取消入库" };
    const update = config.cognitionEnabled !== false
        ? parseMemoryCognitionUpdate(result.content, previous, context!.sources, latest, { basis: context!.basis, requireClaims: true }) : null;
    const summary = update?.summary || result.content;
    // Re-summarizing an older range may add historical memory but cannot roll back current cognition.
    const cognition = update && (!(previous.reviewedThrough || previous.updatedAt) || latest >= (previous.reviewedThrough || previous.updatedAt!)) ? update.cognition : previous;

    // Generate embedding for the summary (only if vector recall is enabled)
    let embedding: number[] | undefined;
    const embeddingApiConfig = config.vectorRecallEnabled ? resolveAuxiliaryApiConfig("embeddingApiConfigId") : null;
    if (embeddingApiConfig && resolveEmbeddingModel(embeddingApiConfig)) {
        try {
            const emb = await generateEmbedding(summary, embeddingApiConfig);
            if (emb) embedding = emb;
        } catch { /* ignore */ }
    }

    // Determine sourceApp: use the most common source among summarized entries
    const sourceCounts = new Map<string, number>();
    for (const e of allEntries) {
        sourceCounts.set(e.sourceApp, (sourceCounts.get(e.sourceApp) || 0) + 1);
    }
    let dominantSource = "chat";
    let maxCount = 0;
    for (const [src, count] of sourceCounts) {
        if (count > maxCount) { dominantSource = src; maxCount = count; }
    }
    const sourceSessionIds = Array.from(new Set(
        allEntries
            .map(entry => entry.sessionId)
            .filter((sessionId): sessionId is string => Boolean(sessionId)),
    ));

    // Save as long-term memory
    const now = new Date().toISOString();
    const longTermEntry: MemoryEntry = {
        id: `mem_lt_${characterId}_${allEntries[0].id}_${allEntries[allEntries.length - 1].id}`,
        characterId,
        sourceApp: dominantSource as MemoryEntry["sourceApp"],
        type: "long_term",
        content: summary,
        embedding,
        importance: 0.8,
        createdAt: now,
        updatedAt: now,
        sourceMessageIds: allEntries.map(e => e.id),
        metadata: {
            summarizedEvents: allEntries.length,
            timeSpan: `${earliest} ~ ${latest}`,
            sourceSessionIds,
            evidence: evidenceFromTimeline(allEntries).map(({ context, ...source }) => ({ ...source,
                ...(context && context !== source.excerpt ? { context: context.slice(0, 1800) } : {}),
            })),
            lastSourceTimestamp: latest,
        },
    };
    assertIdentityActive();
    if (!canCurrentIdentityInteract(characterId)) return { success: false, error: "角色权限已变更，已取消入库" };
    const currentCognition = await loadPersistedMemoryCognition(characterId);
    if (update && (currentCognition?.updatedAt || "") !== (persistedPrevious?.updatedAt || "")) {
        return { success: false, error: "整理期间认知或事项被修改，已保留新修改，请重新整理" };
    }
    await saveMemoryEntries([longTermEntry], update ? cognition : undefined, update ? {
        generatedCognition: update.cognition, baselineCognition: previous, expectedUpdatedAt: persistedPrevious?.updatedAt || "",
    } : undefined);
    if (update) await cacheMemoryCognition(cognition);

    // Update last summarized timestamp + reset counter
    const last = getLastSummarizedTimestamp(characterId);
    if (!last || latest > last) setLastSummarizedTimestamp(characterId, latest);
    const remainingCount = availableEntries.length - allEntries.length;
    resetEventCounter(characterId, Math.max(0, getEventCounter(characterId) - startingCounter) + remainingCount);
    if (remainingCount) setPendingSummaryTimestamp(characterId, latest);
    else if (pending) setPendingSummaryTimestamp(characterId, null);

    // Enforce long-term limit
    const allLongTerm = await loadMemoryEntriesByType(characterId, "long_term");
    if (allLongTerm.length > config.maxLongTermEntries) {
        const excess = allLongTerm.slice(0, allLongTerm.length - config.maxLongTermEntries);
        await deleteMemoryEntries(excess.map(e => e.id));
    }

    incrementCoreMemoryCounter(characterId);
    await maybeRunCoreMemoryPipeline(characterId, characterName);

    console.log(`[MemorySummarizer] Summarized ${allEntries.length} entries → 1 long-term memory`);
    return { success: true, remainingCount, nextSinceTimestamp: latest };
}

/** Reassess cognition from memories and recent experience without advancing fact-summary cursors. */
export async function refreshMemoryCognition(characterId: string, characterName: string): Promise<{ success: boolean; error?: string; changed?: boolean }> {
    const identityId = getCurrentIdentityId(), key = `${identityId}:${characterId}`;
    if (summarizingSet.has(key)) return { success: false, error: "该角色的记忆正在整理中" };
    const guard = () => {
        assertIdentityActive();
        if (getCurrentIdentityId() !== identityId || !canCurrentIdentityInteract(characterId)) throw new Error("身份或角色权限已变更，未保存结果");
    };
    summarizingSet.add(key);
    try {
        guard();
        const config = loadMemoryConfig();
        if (config.cognitionEnabled === false) return { success: false, error: "请先开启角色认知" };
        const apiConfig = resolveAuxiliaryApiConfig("memorySummaryApiConfigId");
        if (!apiConfig) return { success: false, error: "未配置记忆总结 API" };
        const memories = await loadMemoryEntries(characterId); guard();
        const persisted = await loadPersistedMemoryCognition(characterId); guard();
        const previous = persisted || loadMemoryCognition(characterId);
        const timeline = filterTimelineByAllowedSources(loadNativeTimeline(characterId), config.shortTermAllowedSources);
        const context = buildCognitionContext(characterId, memories, timeline, previous, config, "review");
        if (!context.sources.length) return { success: false, error: "还没有可供审视的记忆或经历" };
        const character = loadCharacters().find(c => c.id === characterId), identity = resolveUserIdentity();
        const events = context.events.map(e => `[${e.id}] ${e.timestamp} ${e.sourceApp}\n${e.content}`).join("\n\n");
        const result = await simpleLLMCall(apiConfig, [
            { role: "system", content: `${MEMORY_COGNITION_PROTOCOL}\n本次主动重审镜子与凝视，不生成新的长期记忆。summary填写材料概括；未了事项只在材料明确证明变化时更新。没有新判断时对应字段填null。` },
            { role: "user", content: `角色：${characterName}\n更新方式：主动重审\n角色人设：${character?.persona.slice(0, 10000) || "未填写"}\n表达习惯：${character?.personality?.slice(0, 1500) || ""}\n当前用户身份：${cognitionUserContext(identity)}\n已有认知与未了事项：${cognitionForSummary(previous, events)}\n近期经历：\n${events || "无"}\n核心、长期记忆与旧判断依据：\n${context.supplement || "无"}` },
        ], { temperature: 0.3, label: `认知重审·${characterName}` });
        guard();
        if (!result.content || result.wasTruncated) return { success: false, error: result.error || "认知生成失败或被截断，未保存" };
        const through = context.events.at(-1)?.timestamp || previous.reviewedThrough || previous.updatedAt || context.basis.latest!;
        const update = parseMemoryCognitionUpdate(result.content, previous, context.sources, through, { basis: context.basis, requireClaims: true });
        guard();
        await saveMemoryEntries([], update.cognition, { baselineCognition: previous, generatedCognition: update.cognition, expectedUpdatedAt: persisted?.updatedAt || "" });
        guard(); await cacheMemoryCognition(update.cognition);
        return { success: true, changed: update.cognition.mirror?.revisionId !== previous.mirror?.revisionId || update.cognition.gaze?.revisionId !== previous.gaze?.revisionId };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "认知重审失败" };
    } finally { summarizingSet.delete(key); }
}
