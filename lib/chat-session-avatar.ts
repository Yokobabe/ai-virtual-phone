import type { Character, CharacterAvatarHistoryEntry } from "./character-types";
import type { ChatSession } from "./chat-storage";

export const CHAT_SESSION_AVATARS_UPDATED_EVENT = "chat-session-avatars-updated";

export function getChatCharacterAvatar(session: Pick<ChatSession, "characterAvatars"> | null | undefined, character: Pick<Character, "id" | "avatar"> | null | undefined): string | null {
    if (!character) return null;
    return Object.prototype.hasOwnProperty.call(session?.characterAvatars || {}, character.id)
        ? session!.characterAvatars![character.id] ?? null
        : character.avatar;
}

export function getChatCharacterAvatarHistory(session: Pick<ChatSession, "characterAvatarHistories"> | null | undefined, characterId: string): CharacterAvatarHistoryEntry[] {
    const value = session?.characterAvatarHistories?.[characterId];
    return Array.isArray(value) ? value : [];
}

export function withChatCharacterAvatar<T extends Pick<Character, "id" | "avatar">>(session: Pick<ChatSession, "characterAvatars"> | null | undefined, character: T): T {
    return { ...character, avatar: getChatCharacterAvatar(session, character) };
}
