"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Drama, Globe2, LogOut, MessagesSquare } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { loadCharacters } from "@/lib/character-storage";
import type { Character } from "@/lib/character-types";
import {
    createOrGetNpcRoleplaySession,
    getChatMessagePreview,
    getLastVisibleSessionMessage,
    getChatSessionTargetCharacterId,
    loadChatSessions,
    type ChatSession,
} from "@/lib/chat-storage";
import {
    getNpcRoleplayActors,
    getNpcRoleplayTargets,
    getNpcRoleplayWorlds,
} from "@/lib/npc-roleplay";
import { formatChatUiTime } from "@/lib/chat-time";
import { ChatFallbackAvatar } from "./chat-fallback-avatar";

function Avatar({ character, size = 44 }: { character: Character; size?: number }) {
    return (
        <div className="overflow-hidden rounded-full bg-[var(--c-input)] flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            {character.avatar
                ? <img src={character.avatar} alt="" className="w-full h-full object-cover" />
                : <ChatFallbackAvatar />}
        </div>
    );
}

export function NpcRoleplayMaskPicker({
    currentActorId,
    onSelectActor,
    onExitToUser,
    onClose,
}: {
    currentActorId: string | null;
    onSelectActor: (actorId: string) => void;
    onExitToUser: () => void;
    onClose: () => void;
}) {
    const [worldId, setWorldId] = useState<string | null>(null);
    const worlds = useMemo(() => getNpcRoleplayWorlds(), []);
    const actors = worldId ? getNpcRoleplayActors(worldId) : [];

    if (worldId) {
        const world = worlds.find(item => item.id === worldId);
        return (
            <PageShell title={world?.name || "选择 NPC"} onBack={() => setWorldId(null)}>
                <div className="page-menu">
                    <p className="menu-group-desc mx-0">选择要戴上的面具</p>
                    <div className="menu-group">
                        {actors.map(actor => (
                            <button key={actor.id} type="button" className="menu-item" onClick={() => onSelectActor(actor.id)}>
                                <Avatar character={actor} />
                                <div className="menu-label-group min-w-0">
                                    <span className="menu-label">{actor.name}{actor.id === currentActorId ? " · 当前" : ""}</span>
                                    <span className="menu-desc line-clamp-2">{actor.briefPersona || actor.persona || "已存在的 NPC"}</span>
                                </div>
                                <Drama size={19} strokeWidth={1.5} className="text-[var(--c-icon)] shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell title="选择身份" onBack={onClose}>
            <div className="page-menu">
                <div className="menu-group">
                    <button type="button" className="menu-item" onClick={onExitToUser}>
                        <div className="menu-icon"><LogOut size={20} strokeWidth={1.5} /></div>
                        <div className="menu-label-group">
                            <span className="menu-label">回到 user</span>
                            <span className="menu-desc">摘下面具，回到原本的聊天主页</span>
                        </div>
                    </button>
                </div>
                <p className="menu-group-desc mx-0">先选择 NPC 所在的世界</p>
                <div className="menu-group">
                    {worlds.map(world => {
                        const count = getNpcRoleplayActors(world.id).length;
                        return (
                            <button key={world.id} type="button" className="menu-item" onClick={() => setWorldId(world.id)}>
                                <div className="menu-icon"><Globe2 size={20} strokeWidth={1.5} /></div>
                                <div className="menu-label-group">
                                    <span className="menu-label">{world.name}</span>
                                    <span className="menu-desc">{count} 个可扮演 NPC{world.description ? ` · ${world.description}` : ""}</span>
                                </div>
                            </button>
                        );
                    })}
                    {worlds.length === 0 && <div className="menu-item"><span className="menu-desc">还没有带“配角”标签的 NPC</span></div>}
                </div>
            </div>
        </PageShell>
    );
}

export function NpcRoleplayHome({
    actorId,
    onCloseApp,
    onOpenPicker,
    onSelectSession,
}: {
    actorId: string;
    onCloseApp: () => void;
    onOpenPicker: () => void;
    onSelectSession: (session: ChatSession) => void;
}) {
    const actor = loadCharacters().find(character => character.id === actorId) || null;
    const targets = useMemo(() => getNpcRoleplayTargets(actorId), [actorId]);
    const world = getNpcRoleplayWorlds().find(item => item.memberIds.includes(actorId));
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const refresh = () => setRevision(value => value + 1);
        window.addEventListener("chat-messages-updated", refresh);
        window.addEventListener("weixin-messages-updated", refresh);
        return () => {
            window.removeEventListener("chat-messages-updated", refresh);
            window.removeEventListener("weixin-messages-updated", refresh);
        };
    }, []);

    const sessions = useMemo(() => loadChatSessions(), [actorId, revision]);
    if (!actor || !world) return null;

    return (
        <PageShell
            leftAction={
                <div className="flex items-center min-w-max">
                    <button className="page-back-btn shrink-0 mr-2" type="button" onClick={onCloseApp} aria-label="返回">
                        <ChevronLeft size={24} strokeWidth={1.5} />
                    </button>
                    <button type="button" className="flex items-center gap-[10px] text-left" onClick={onOpenPicker} aria-label="切换扮演身份">
                        <Avatar character={actor} size={36} />
                        <span className="flex flex-col whitespace-nowrap">
                            <span className="ts-16 font-bold text-[var(--c-text-title)] leading-tight">{actor.name}</span>
                            <span className="ts-10 text-[var(--c-icon)] font-medium mt-1">扮演中 · {world.name}</span>
                        </span>
                    </button>
                </div>
            }
            rightAction={<Drama size={21} strokeWidth={1.5} className="text-[var(--c-icon-active)]" />}
        >
            <div className="px-5 pt-4 pb-2">
                <div className="flex items-center gap-2 text-[var(--c-icon)] ts-12">
                    <MessagesSquare size={16} strokeWidth={1.5} />
                    只显示与 {actor.name} 有直接关系的人
                </div>
            </div>
            <div className="px-5 flex flex-col">
                {targets.map(target => {
                    const session = sessions.find(item => item.roleplayActorCharacterId === actorId && getChatSessionTargetCharacterId(item) === target.character.id);
                    const last = session ? getLastVisibleSessionMessage(session.id) : null;
                    return (
                        <button
                            key={target.character.id}
                            type="button"
                            className="minimal-list-item text-left"
                            onClick={() => onSelectSession(createOrGetNpcRoleplaySession(actorId, target.character.id, world.id))}
                        >
                            <Avatar character={target.character} />
                            <div className="flex-1 min-w-0 ml-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="ts-16 font-semibold text-[var(--c-text-title)] truncate">{target.character.name}</span>
                                    {last && <span className="ts-10 text-[var(--c-icon)] shrink-0">{formatChatUiTime(last.createdAt)}</span>}
                                </div>
                                <div className="ts-12 text-[var(--c-icon)] truncate mt-1">
                                    {last ? (getChatMessagePreview(last) || last.content) : target.relationText}
                                </div>
                            </div>
                        </button>
                    );
                })}
                {targets.length === 0 && (
                    <div className="px-5 py-12 text-center text-[var(--c-icon)] ts-14">
                        这个 NPC 还没有关系连线，暂时不能联系任何人
                    </div>
                )}
            </div>
        </PageShell>
    );
}
