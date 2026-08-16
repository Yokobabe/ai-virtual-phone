import type { UserIdentity } from "@/components/settings/user-identity";
import { loadCharacters } from "./character-storage";
import type { Character } from "./character-types";
import {
    loadCharacterWorldGroups,
    type CharacterWorldGroup,
    type CharacterWorldRelation,
} from "./character-world-storage";
import { kvGet, kvRemove, kvSet, registerKvMigration } from "./kv-db";

const ACTIVE_NPC_ROLEPLAY_ACTOR_KEY = "ai_phone_active_npc_roleplay_actor_v1";
export const NPC_ROLEPLAY_ACTOR_UPDATED_EVENT = "npc-roleplay-actor-updated";

registerKvMigration(ACTIVE_NPC_ROLEPLAY_ACTOR_KEY);

export type NpcRoleplayTarget = {
    character: Character;
    relation: CharacterWorldRelation;
    relationText: string;
};

export function isSupportingNpc(character: Character | null | undefined): character is Character {
    return Boolean(character?.tags?.some(tag => tag.trim() === "配角"));
}

export function characterToRoleplayIdentity(character: Character): UserIdentity {
    return {
        id: `npc-roleplay:${character.id}`,
        name: character.name,
        avatarUrl: character.avatar || undefined,
        bio: character.briefPersona?.trim() || character.persona?.trim() || "",
        gender: "",
        age: "",
        occupation: "",
        customSettings: [character.personality, character.persona].filter(Boolean).join("\n"),
    };
}

export function loadActiveNpcRoleplayActorId(): string | null {
    if (typeof window === "undefined") return null;
    const actorId = kvGet(ACTIVE_NPC_ROLEPLAY_ACTOR_KEY)?.trim();
    if (!actorId) return null;
    const actor = loadCharacters().find(character => character.id === actorId);
    return isSupportingNpc(actor) ? actorId : null;
}

export function setActiveNpcRoleplayActorId(actorId: string | null): void {
    if (typeof window === "undefined") return;
    if (actorId) kvSet(ACTIVE_NPC_ROLEPLAY_ACTOR_KEY, actorId);
    else kvRemove(ACTIVE_NPC_ROLEPLAY_ACTOR_KEY);
    window.dispatchEvent(new CustomEvent(NPC_ROLEPLAY_ACTOR_UPDATED_EVENT, { detail: { actorId } }));
}

export function getNpcRoleplayWorlds(): CharacterWorldGroup[] {
    const npcIds = new Set(loadCharacters().filter(isSupportingNpc).map(character => character.id));
    return loadCharacterWorldGroups().filter(world => world.memberIds.some(id => npcIds.has(id)));
}

export function getNpcRoleplayActors(worldId: string): Character[] {
    const world = loadCharacterWorldGroups().find(item => item.id === worldId);
    if (!world) return [];
    const memberIds = new Set(world.memberIds);
    return loadCharacters().filter(character => memberIds.has(character.id) && isSupportingNpc(character));
}

export function getNpcRoleplayTargets(actorId: string): NpcRoleplayTarget[] {
    const world = loadCharacterWorldGroups().find(item => item.memberIds.includes(actorId));
    if (!world) return [];
    const characters = new Map(loadCharacters().map(character => [character.id, character]));
    const targets = new Map<string, NpcRoleplayTarget>();

    for (const relation of world.relations) {
        const targetId = relation.fromCharacterId === actorId
            ? relation.toCharacterId
            : relation.toCharacterId === actorId
                ? relation.fromCharacterId
                : null;
        if (!targetId || targets.has(targetId)) continue;
        const character = characters.get(targetId);
        if (!character) continue;
        const relationText = relation.fromCharacterId === actorId
            ? `${characters.get(actorId)?.name || "该 NPC"}是${character.name}的${relation.label}`
            : `${character.name}是${characters.get(actorId)?.name || "该 NPC"}的${relation.label}`;
        targets.set(targetId, { character, relation, relationText });
    }

    return [...targets.values()];
}

export function canNpcRoleplayContact(actorId: string, targetId: string, worldId?: string): boolean {
    const world = loadCharacterWorldGroups().find(item => item.memberIds.includes(actorId));
    if (!world || (worldId && world.id !== worldId) || !world.memberIds.includes(targetId)) return false;
    return world.relations.some(relation => (
        relation.fromCharacterId === actorId && relation.toCharacterId === targetId
    ) || (
        relation.toCharacterId === actorId && relation.fromCharacterId === targetId
    ));
}

export function buildNpcRoleplayPromptContext(actor: Character, target: Character, worldId?: string): string {
    const world = loadCharacterWorldGroups().find(item => item.memberIds.includes(actor.id));
    if (!world || (worldId && world.id !== worldId)) return "";
    const relationLines = world.relations
        .filter(relation => relation.fromCharacterId === actor.id || relation.toCharacterId === actor.id)
        .map(relation => {
            const characters = new Map(loadCharacters().map(character => [character.id, character.name]));
            const fromName = characters.get(relation.fromCharacterId);
            const toName = characters.get(relation.toCharacterId);
            return fromName && toName ? `${fromName}是${toName}的${relation.label}。` : "";
        })
        .filter(Boolean);

    return [
        "### NPC 身份扮演（最高优先级身份规则）",
        `当前与你私聊的人是 NPC「${actor.name}」，不是 user，也不是真人用户。`,
        `本会话中所有 role=user 的消息，发言者都应被理解为「${actor.name}」。这些话是 ${actor.name} 亲自说过、问过和做过的。`,
        `你是「${target.name}」，请只从你与 ${actor.name} 的关系和共同经历出发回应；不要提及面具、扮演者、操作者或系统。`,
        `世界：${world.name}${world.description ? `。${world.description}` : ""}`,
        ...relationLines,
        actor.briefPersona?.trim() ? `${actor.name}简介：${actor.briefPersona.trim()}` : "",
        actor.persona?.trim() ? `${actor.name}设定：${actor.persona.trim()}` : "",
    ].filter(Boolean).join("\n");
}
