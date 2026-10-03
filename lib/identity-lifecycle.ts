import Dexie from "dexie";
import { createIdentityId, initializeIdentitySpace, switchIdentitySpace, beginIdentityDeletion, finishIdentityDeletion } from "./identity-space";
import {
  readIdentityRuntime, installIdentityRuntime, silenceIdentityRuntime, getCurrentIdentityId,
  isSharedIdentityKey, identityDatabaseIsShared, IDENTITY_ACCESS_KEY, IDENTITY_BASE_BINDING_KEY,
  pauseIdentityDispatch,
} from "./identity-runtime";
import { createIdentityRecoveryPoint, listIdentityRecoveryPoints, purgeIdentityRecoveryData } from "./identity-recovery";
import { deleteIdentityMedia } from "./identity-media-cleanup";

let initializing: Promise<void> | null = null;
const IDENTITIES = "ai_phone_user_identities_v1";
const BINDINGS = "ai_phone_bindings_v1";
function parse<T>(raw: string | undefined | null, fallback: T): T { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }

export function initializePhoneIdentity(cache: Map<string, string>): Promise<void> {
  if (readIdentityRuntime()) return Promise.resolve();
  if (initializing) return initializing;
  initializing = (async () => {
    if (!(await listIdentityRecoveryPoints()).length) await createIdentityRecoveryPoint();
    const identities = parse<Array<{ id: string }>>(cache.get(IDENTITIES), []);
    if (!identities.length) {
      const identity = newDefaultIdentity();
      identities.push(identity);
      const { kvSetAsync } = await import("./kv-db");
      await kvSetAsync(IDENTITIES, JSON.stringify(identities));
    }
    const binding = parse<{ globalDefaults?: Record<string, unknown>; characterBindings?: Array<{ characterId: string; defaults?: { userIdentityId?: string } }> }>(cache.get(BINDINGS), {});
    const initial = initializeIdentitySpace(identities.map(identity => identity.id), binding.globalDefaults?.userIdentityId as string | undefined);
    const { kvSetAsync } = await import("./kv-db");
    const baseline = { ...binding, globalDefaults: { ...binding.globalDefaults, userIdentityId: undefined }, characterBindings: [] };
    await kvSetAsync(IDENTITY_BASE_BINDING_KEY, JSON.stringify(baseline));
    const access = Object.fromEntries((binding.characterBindings ?? []).filter(row => row.defaults?.userIdentityId)
      .map(row => [row.characterId, [row.defaults!.userIdentityId!]]));
    await kvSetAsync(IDENTITY_ACCESS_KEY, JSON.stringify(access));
    installIdentityRuntime(initial);
  })();
  return initializing;
}

function newDefaultIdentity() {
  return { id: `identity-${createIdentityId()}`, name: "默认身份", bio: "", gender: "保密", age: "", occupation: "", customSettings: "" };
}

async function suspendCloud(): Promise<void> {
  const { isPersonalPushCloudActive, setPersonalPushCloudScheduled, personalPushFetch } = await import("./personal-push-cloud");
  if (isPersonalPushCloudActive()) {
    await setPersonalPushCloudScheduled(false, true);
    for (const triggerPrefix of ["reply:", "followup:", "idle:", "timedwake:", "periodcare:"]) {
      const response = await personalPushFetch("jobs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ triggerPrefix }) }, undefined, true);
      if (!response.ok) throw new Error("无法撤销旧身份的云端任务");
    }
    const { loadBridgeRules } = await import("./reality-bridge/storage");
    const { SCREEN_CHAT_SNAPSHOT_ID } = await import("./push-bridge-shared");
    const response = await personalPushFetch("bridge-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules: [], snapshots: [], deleteRuleIds: [...loadBridgeRules().map(rule => rule.id), SCREEN_CHAT_SNAPSHOT_ID], shortcutActions: [], ruleRuns: {} }) }, undefined, true);
    if (!response.ok) throw new Error("无法暂停旧身份的云端联动");
  }
  const { hasAccountPushSubscription, disableOfflinePush } = await import("./push-client");
  if (await hasAccountPushSubscription()) {
    const result = await disableOfflinePush(true);
    if (!result.ok) throw new Error(result.error || "无法暂停旧身份的离线推送");
  }
}

let transition: Promise<void> | null = null;
export function switchPhoneIdentity(userId: string): Promise<void> {
  if (transition) return transition;
  transition = (async () => {
    const state = readIdentityRuntime();
    if (!state) throw new Error("身份空间尚未初始化");
    if (state.activeUserId === userId) return;
    const next = switchIdentitySpace(state, userId);
    // Failed backup/cloud pause leaves the active identity unchanged.
    if (!(await listIdentityRecoveryPoints()).length) await createIdentityRecoveryPoint();
    pauseIdentityDispatch(true);
    await suspendCloud();
    await retireScheduledWork();
    silenceIdentityRuntime();
    installIdentityRuntime(next);
    window.location.reload();
  })().finally(() => { transition = null; pauseIdentityDispatch(false); });
  return transition;
}

async function retireScheduledWork(): Promise<void> {
  const { kvGet, kvSetAsync } = await import("./kv-db");
  for (const key of ["ai_phone_followup_schedules_v1", "ai_phone_moments_ai_schedule_v1", "ai_phone_moments_pending_reactions_v1", "ai_phone_timed_wake_schedules_v1"]) {
    await kvSetAsync(key, "[]");
  }
  const idle = parse<Array<Record<string, unknown>>>(kvGet("ai_phone_idle_reconnect_rules_v1"), []);
  await kvSetAsync("ai_phone_idle_reconnect_rules_v1", JSON.stringify(idle.map(rule => ({ ...rule, consecutiveCount: 3, lastFiredAt: Date.now() }))));
}

export function updateIdentityDirectory(identities: Array<{ id: string }>): void {
  const state = readIdentityRuntime();
  if (!state) return;
  const ids = identities.map(identity => identity.id);
  // Editing names/profiles preserves revision and running requests. Deletion uses the dedicated workflow.
  installIdentityRuntime({ ...state, userIds: [...new Set(ids)] });
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("其他页面仍在使用身份数据，请关闭该页面后重试"));
  });
}

export function deletePhoneIdentity(userId: string): Promise<void> {
  if (transition) return transition;
  transition = deletePhoneIdentityOnce(userId).finally(() => { transition = null; pauseIdentityDispatch(false); });
  return transition;
}
async function deletePhoneIdentityOnce(userId: string): Promise<void> {
  const state = readIdentityRuntime();
  if (!state) throw new Error("身份空间尚未初始化");
  pauseIdentityDispatch(true);
  await suspendCloud();
  const deleting = beginIdentityDeletion(state, userId);
  silenceIdentityRuntime();
  installIdentityRuntime(deleting);
  const kv = new Dexie("AiPhoneKvDB"); kv.version(1).stores({ entries: "key" });
  try {
    const rows = await kv.table<{ key: string; value: string }>("entries").toArray();
    const prefix = `identity:${encodeURIComponent(userId)}:`;
    const owns = (key: string) => userId === state.legacyOwnerId
      ? !key.startsWith("identity:") && !isSharedIdentityKey(key) : key.startsWith(prefix);
    const removedAssets = await deleteIdentityMedia(userId, state.legacyOwnerId, rows, owns);
    await purgeIdentityRecoveryData(userId, state.legacyOwnerId, removedAssets);
    const databases = await indexedDB.databases();
    for (const entry of databases) {
      if (!entry.name || identityDatabaseIsShared(entry.name)) continue;
      const owned = userId === state.legacyOwnerId ? !entry.name.includes("::identity:")
        : entry.name.endsWith(`::identity:${encodeURIComponent(userId)}`);
      if (owned) await deleteDatabase(entry.name);
    }
    await kv.table("entries").bulkDelete(rows.filter(row => owns(row.key)).map(row => row.key));
    for (const key of Object.keys(window.localStorage)) if (owns(key) && key !== "float_identity_runtime_v1") window.localStorage.removeItem(key);
    const identities = parse<Array<{ id: string }>>(rows.find(row => row.key === IDENTITIES)?.value, []).filter(identity => identity.id !== userId);
    if (!identities.length) identities.push(newDefaultIdentity());
    const policies = parse<Record<string, string[]>>(rows.find(row => row.key === IDENTITY_ACCESS_KEY)?.value, {});
    await kv.table("entries").bulkPut([
      { key: IDENTITIES, value: JSON.stringify(identities) },
      { key: IDENTITY_ACCESS_KEY, value: JSON.stringify(Object.fromEntries(Object.entries(policies).map(([charId, ids]) => [charId, ids.filter(id => id !== userId)]))) },
    ]);
    const finished = finishIdentityDeletion(deleting, userId);
    installIdentityRuntime({ ...finished, userIds: identities.map(identity => identity.id), activeUserId: finished.activeUserId ?? identities[0].id });
    window.location.reload();
  } finally { kv.close(); }
}

export function currentIdentityMatches(id: string): boolean { return getCurrentIdentityId() === id; }
