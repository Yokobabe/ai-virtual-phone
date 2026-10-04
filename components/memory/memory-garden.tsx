"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, Sparkles, Pin } from "lucide-react";
import { ContentDialog } from "@/components/ui/modal";
import { loadMemoryEntryPins, saveMemoryEntryPins } from "@/lib/memory-entry-preferences";
import { memoryPaletteText } from "@/lib/memory-entry-palette";
import { useMemoryPalette } from "./memory-surface";
import type { Character } from "@/lib/character-types";
import type { MemoryCognition, CognitionFacet, MemoryEvidence } from "@/lib/memory-cognition";
import type { MemoryRecallInfo } from "@/lib/memory-service";
import { loadCognitionHistory } from "@/lib/memory-storage";
import { cognitionRevision, type CognitionRevision, type CognitionHistoryFacet } from "@/lib/memory-cognition-history";
import styles from "./memory-garden.module.css";

export type MemoryGardenTab = "facts" | "core" | "open" | "mirror" | "gaze";
const sections = [
    { key: "facts", title: "事实", english: "Facts", desc: "短期与长期，记得共同经历" },
    { key: "core", title: "核心", english: "Core", desc: "永远不会忘记的事" },
    { key: "open", title: "未了事项", english: "List", desc: "约定、期待，还有悬而未决" },
    { key: "mirror", title: "镜子", english: "Mirror", desc: "他如何理解自己与此刻的心境" },
    { key: "gaze", title: "凝视", english: "Gaze", desc: "他眼中的你，与这段关系" },
] as const;

function MemoryHero({ name, avatar }: { name: string; avatar?: string }) {
    return <header className={styles.hero}>
        <div className={styles.avatar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} alt="" /> : <span>{name.slice(0, 1)}</span>}
        </div>
        <h2>{name}</h2>
    </header>;
}

export function MemoryCharacterGarden({ identity, characters, onOpen }: {
    identity: { name: string; avatarUrl?: string };
    characters: { character: Character; shortTermCount: number; longTermCount: number; coreCount: number }[];
    onOpen: (character: Character) => void;
}) {
    const [pins, setPins] = useState(loadMemoryEntryPins);
    const [menuCharacter, setMenuCharacter] = useState<Character | null>(null);
    const [pinError, setPinError] = useState("");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const press = useRef<{ pointerId: number; x: number; y: number } | null>(null);
    const suppressClick = useRef(false);
    const ignoreReleaseClick = useRef(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const saving = useRef(false);
    const mounted = useRef(true);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const cancelPress = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        press.current = null;
    };
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; cancelPress(); };
    }, []);
    useEffect(() => {
        if (!menuCharacter) return;
        menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
        return () => { triggerRef.current?.focus({ preventScroll: true }); };
    }, [menuCharacter]);
    const openMenu = (character: Character, element: HTMLButtonElement, fromLongPress = false) => {
        cancelPress();
        suppressClick.current = true;
        ignoreReleaseClick.current = fromLongPress;
        triggerRef.current = element;
        setMenuCharacter(character);
    };
    const togglePin = async () => {
        if (!menuCharacter || saving.current) return;
        saving.current = true;
        const next = pins.includes(menuCharacter.id) ? pins.filter(id => id !== menuCharacter.id) : [...pins, menuCharacter.id];
        try {
            await saveMemoryEntryPins(next);
            if (mounted.current) { setPins(next); setPinError(""); setMenuCharacter(null); }
        } catch {
            if (mounted.current) setPinError("置顶保存失败，请重试");
        } finally { saving.current = false; }
    };
    const count = (item: (typeof characters)[number]) => item.shortTermCount + item.longTermCount + item.coreCount;
    const orderedCharacters = [...characters].sort((a, b) =>
        Number(pins.includes(b.character.id)) - Number(pins.includes(a.character.id)) || count(b) - count(a));
    return <div className={styles.garden}>
        <MemoryHero name={identity.name} avatar={identity.avatarUrl} />
        <nav className={styles.cards} aria-label="角色记忆入口">
            {orderedCharacters.map(({ character, shortTermCount, longTermCount, coreCount }) => <button key={character.id}
                type="button" className={`${styles.linkCard} ${styles.characterCard}`} aria-haspopup="dialog" aria-keyshortcuts="Shift+F10"
                onPointerDown={event => {
                    cancelPress();
                    if (!event.isPrimary || event.button !== 0) return;
                    suppressClick.current = false;
                    press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
                    const element = event.currentTarget;
                    timer.current = setTimeout(() => openMenu(character, element, true), 500);
                }}
                onPointerMove={event => {
                    if (!press.current || event.pointerId !== press.current.pointerId) return;
                    if (Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10) {
                        suppressClick.current = true;
                        cancelPress();
                    }
                }}
                onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}
                onContextMenu={event => { event.preventDefault(); openMenu(character, event.currentTarget); }}
                onKeyDown={event => {
                    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                        event.preventDefault(); openMenu(character, event.currentTarget);
                    }
                }}
                onClick={event => {
                    if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
                    onOpen(character);
                }}>
                <span className={styles.cardCopy}>
                    <span className={styles.cardTitle}>{character.name}{pins.includes(character.id) && <small className={styles.pinBadge}><Pin size={10} />置顶</small>}</span>
                    <span className={styles.cardEnglish}>Memory</span>
                    <span className={styles.cardDesc}>与你的记忆 · {shortTermCount + longTermCount + coreCount} 条</span>
                </span>
                <span className={styles.banner} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {character.avatar ? <img src={character.avatar} alt="" draggable={false} /> : <span className={styles.avatarInitial}>{character.name.slice(0, 1)}</span>}
                </span>
                <ChevronRight className={styles.cardArrow} size={16} />
            </button>)}
        </nav>
        {!characters.length && <p className={styles.empty}>当前身份还没有可查看的角色。</p>}
        <p className={styles.footnote}>每一段相处，都有自己的来处。</p>
        {menuCharacter && <div className={styles.pinDialog} ref={menuRef} role="dialog" aria-modal="true" aria-label={`${menuCharacter.name}的记忆卡片操作`}
            onPointerDownCapture={() => { ignoreReleaseClick.current = false; }}
            onClickCapture={event => {
                if (ignoreReleaseClick.current && event.detail !== 0) {
                    ignoreReleaseClick.current = false;
                    event.preventDefault(); event.stopPropagation();
                }
            }}
            onKeyDown={event => {
                ignoreReleaseClick.current = false;
                if (event.key === "Escape") { event.preventDefault(); setMenuCharacter(null); }
                if (event.key === "Tab") {
                    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>("button");
                    if (!buttons?.length) return;
                    const first = buttons[0], last = buttons[buttons.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            }}>
            <ContentDialog title={menuCharacter.name} confirmLabel={pins.includes(menuCharacter.id) ? "取消置顶" : "置顶"}
                onConfirm={() => void togglePin()} onCancel={() => setMenuCharacter(null)}>
                <p className={styles.pinPrompt}>{pinError || (pins.includes(menuCharacter.id) ? "恢复按记忆条数排列" : "将这位角色放在记忆列表顶部")}</p>
            </ContentDialog>
        </div>}
    </div>;
}

export function MemoryGarden({ character, userName, counts, onOpen }: {
    character: Character; userName: string; counts: Partial<Record<MemoryGardenTab, number>>; onOpen: (tab: MemoryGardenTab) => void;
}) {
    const { palette, dark } = useMemoryPalette(character.avatar);
    return <div className={`${styles.garden} ${styles.sectionGarden}`}>
        <header className={styles.detailHero}><h2>{character.name} 的记忆</h2><p>与 {userName}</p></header>
        <nav className={`${styles.cards} ${styles.sectionCards}`} aria-label="记忆栏目">
            {sections.map((section, index) => {
                const color = palette[index], labels = memoryPaletteText(color, dark);
                return <button key={section.key} type="button" className={`${styles.linkCard} ${styles.sectionCard}`} data-section={section.key}
                    style={{ "--section-paper": color, "--section-ink": labels.text, "--section-muted": labels.muted } as CSSProperties}
                    onClick={() => onOpen(section.key)}>
                    <span className={styles.cardCopy}>
                        <span className={styles.sectionHeading}>
                            <span className={styles.cardEnglish}>{section.english.toUpperCase()}</span>
                            {counts[section.key] !== undefined && <span className={styles.sectionCount}>{counts[section.key]}</span>}
                        </span>
                        <span className={styles.cardDesc}>{section.desc}</span>
                    </span>
                    <ChevronRight className={styles.cardArrow} size={14} />
                </button>;
            })}
        </nav>
        <p className={styles.footnote}>每一段相处，都有自己的来处。</p>
    </div>;
}

export function MemorySectionHeader({ tab }: { tab: string }) {
    const section = sections.find(s => s.key === (["short", "long", "shared"].includes(tab) ? "facts" : tab));
    return <div className={styles.sectionHeader}><h2><em>{section?.english.toUpperCase()}</em></h2></div>;
}

export function MemoryFactsTabs({ tab, onChange }: { tab: "short" | "long" | "shared"; onChange: (tab: "short" | "long") => void }) {
    return <div className={styles.factsTabs} role="group" aria-label="事实记忆类型">
        <button type="button" aria-pressed={tab !== "long"} onClick={() => onChange("short")}>短期</button>
        <button type="button" aria-pressed={tab === "long"} onClick={() => onChange("long")}>长期</button>
    </div>;
}

export function MemoryEvidenceList({ evidence }: { evidence: MemoryEvidence[] }) {
    if (!evidence?.length) return null;
    return <details className={styles.evidence}><summary>原话依据 · {evidence.length}</summary><div>
        {evidence.map(e => <blockquote key={e.id}><small>{new Date(e.timestamp).toLocaleString("zh-CN")} · {e.sourceApp}</small><p>{e.excerpt}</p></blockquote>)}
    </div></details>;
}

function Facet({ title, value }: { title: string; value?: CognitionFacet }) {
    return <article className={styles.facet}><h3>{title}</h3>
        <p>{value?.text || "还没有整理到这里。新的相处与记忆总结会慢慢留下轮廓。"}</p>
        {value && <><small>依据截至 {new Date(value.updatedAt).toLocaleString("zh-CN")}</small><MemoryEvidenceList evidence={value.evidence} /></>}
    </article>;
}

function CognitionHistory({ state, facet }: { state: MemoryCognition; facet: CognitionHistoryFacet }) {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState<{ revisions: CognitionRevision[]; before?: [string, string] }>({ revisions: [] });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const generation = useRef(0);
    const currentId = cognitionRevision(state, facet)?.id;
    const revisionStamp = state[facet]?.revisionId || state[facet]?.updatedAt;
    useEffect(() => {
        const ticket = ++generation.current;
        if (!open) return;
        setBusy(true); setError(""); setPage({ revisions: [] });
        loadCognitionHistory(state.characterId, facet).then(result => {
            if (ticket === generation.current) setPage(result);
        }).catch(() => { if (ticket === generation.current) setError("历史暂未读取成功，请收起后重试。"); })
            .finally(() => { if (ticket === generation.current) setBusy(false); });
        return () => { generation.current++; };
    }, [open, state.characterId, facet, revisionStamp]);
    const more = async () => {
        if (busy || !page.before) return;
        const ticket = generation.current;
        setBusy(true); setError("");
        try {
            const next = await loadCognitionHistory(state.characterId, facet, { before: page.before });
            if (ticket === generation.current) setPage(previous => ({ revisions: [...previous.revisions, ...next.revisions], before: next.before }));
        } catch { if (ticket === generation.current) setError("读取失败，可再次加载。"); }
        finally { if (ticket === generation.current) setBusy(false); }
    };
    return <section className={styles.history} aria-label={facet === "mirror" ? "镜子历史" : "凝视历史"}>
        <button type="button" className={styles.historyToggle} aria-expanded={open} onClick={() => setOpen(value => !value)}>
            <span>{open ? "收起" : "查看"}历次{facet === "mirror" ? "镜子" : "凝视"}</span><ChevronRight size={16} aria-hidden="true" style={{ transform: open ? "rotate(90deg)" : undefined }} />
        </button>
        {open && <div className={styles.historyEntries}>
            <p className={styles.historyNote}>每次认识都留在这里，新版继续融合旧有认识。</p>
            {page.revisions.map(revision => <details key={revision.id} className={styles.historyEntry}>
                <summary><span>{new Date(revision.recordedAt).toLocaleString("zh-CN")}</span><small>{revision.id === currentId ? "当前" : revision.origin === "legacy" ? "原有认知" : "已存档"}</small></summary>
                <div><p>{revision.value.text}</p><small>依据截至 {new Date(revision.value.updatedAt).toLocaleString("zh-CN")}</small>
                    {revision.emotion && <p><strong>当时的情绪</strong><br />{revision.emotion.text}</p>}
                    {revision.mood && <p><strong>当时的心境</strong><br />{revision.mood.text}</p>}
                    <MemoryEvidenceList evidence={revision.value.evidence} />
                </div>
            </details>)}
            {busy && <p role="status" className={styles.historyNote}>读取中…</p>}
            {error && <p role="alert" className={styles.historyNote}>{error}</p>}
            {!busy && !error && !page.revisions.length && <p className={styles.historyNote}>还没有保存过这一部分的认知。</p>}
            {page.before && <button type="button" className={styles.historyMore} disabled={busy} onClick={more}>加载更早的版本</button>}
        </div>}
    </section>;
}

export function MemoryCognitionPanel({ tab, state, recall, busy, onSummarize, onStatusChange }: {
    tab: "mirror" | "gaze" | "open"; state: MemoryCognition; recall: MemoryRecallInfo | null;
    busy: boolean; onSummarize: () => void; onStatusChange: (id: string, status: "completed" | "cancelled" | "open") => void;
}) {
    const labels = { commitment: "约定", plan: "计划", wish: "愿望", tension: "悬而未决" };
    return <div className={styles.panel}>
        <div className={styles.updateRow}><p>随记忆总结增量更新<br /><span>查看不调用模型，整理更新会调用记忆总结模型</span></p>
            <button type="button" disabled={busy} onClick={onSummarize}><Sparkles size={15} />{busy ? "整理中…" : "整理更新"}</button></div>
        {tab !== "open" && <CognitionHistory key={`${state.characterId}:${tab}`} state={state} facet={tab} />}
        {tab === "mirror" ? <><Facet title="人物理解" value={state.mirror} /><Facet title="最近情绪" value={state.emotion} /><Facet title="背景心境" value={state.mood} />
            <article className={styles.facet}><h3>最近一次长期记忆召回</h3>{recall ? <p>{({ all: "少量记忆", vector: "向量与关键词", keyword: "关键词与近期", empty: "未召回" })[recall.mode]} · {recall.selected}/{recall.candidates} 条<br />约 {recall.estimatedTokens} token（长期记忆正文估算）<br /><small>{recall.reason}<br />{new Date(recall.at).toLocaleString("zh-CN")}</small></p> : <p>角色下一次调用记忆后，会在这里显示。这里的估算不是账单用量。</p>}</article>
        </> : tab === "gaze" ? <Facet title="他眼中的你" value={state.gaze} /> : <>
            {!state.openItems.length && <article className={styles.facet}><p>还没有未了事项。明确的约定、计划、愿望和未解的心结会在整理后出现在这里。</p></article>}
            {[...state.openItems].sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || b.updatedAt.localeCompare(a.updatedAt)).map(item => <article key={item.id} className={styles.facet}>
                <h3>{labels[item.kind]}<span className={styles.status}>{({ open: "未了", completed: "已完成", cancelled: "已取消" })[item.status]}</span></h3>
                <p>{item.text}</p>{item.dueAt && <small>约定时间 {new Date(item.dueAt).toLocaleString("zh-CN")}</small>}
                <MemoryEvidenceList evidence={item.evidence} />
                <div className={styles.itemActions}>{item.status === "open" ? <><button type="button" disabled={busy} onClick={() => onStatusChange(item.id, "completed")}>标为完成</button><button type="button" disabled={busy} onClick={() => onStatusChange(item.id, "cancelled")}>取消事项</button></> : <button type="button" disabled={busy} onClick={() => onStatusChange(item.id, "open")}>重新开启</button>}</div>
            </article>)}
        </>}
    </div>;
}
