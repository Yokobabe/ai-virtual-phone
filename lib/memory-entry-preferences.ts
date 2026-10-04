import { kvGet, kvSetAsync, registerKvMigration } from "./kv-db";

const PINNED_CHARACTERS_KEY = "ai_phone_memory_entry_pins_v1";
registerKvMigration(PINNED_CHARACTERS_KEY);

export function loadMemoryEntryPins(): string[] {
    try {
        const value: unknown = JSON.parse(kvGet(PINNED_CHARACTERS_KEY) || "[]");
        return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
    } catch { return []; }
}

export async function saveMemoryEntryPins(ids: string[]): Promise<void> {
    await kvSetAsync(PINNED_CHARACTERS_KEY, JSON.stringify([...new Set(ids)]));
}
