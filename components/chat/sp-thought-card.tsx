"use client";
import { useId, useState, type ReactNode } from "react";
import { CHAT_FALLBACK_AVATAR_SRC } from "./chat-fallback-avatar";

/** NJJ's decorative social-profile layout; only children are actual saved thoughts. */
export function SpThoughtCard({ name, avatar, userName, children, stateValues, reasoning, onClose }: {
    name: string; avatar?: string | null; userName: string; children: ReactNode; stateValues?: ReactNode;
    reasoning?: ReactNode; onClose: () => void;
}) {
    const image = avatar || CHAT_FALLBACK_AVATAR_SRC;
    const [tab, setTab] = useState<"tweets" | "replies">("tweets");
    const id = useId();
    return (
        <section className="sp-thought-card" aria-label={`${name}的内心独白`}>
            <div className="sp-thought-cover" aria-hidden="true" />
            <button className="sp-thought-close" type="button" onClick={onClose} aria-label="关闭内心资料卡"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
            <div className="sp-thought-profile">
                <img className="sp-thought-avatar" src={image} alt="" draggable={false} />
                <div className="sp-thought-name">{name}<span className="sp-verified" aria-hidden="true" /></div>
                <div className="sp-thought-handle">taken @{userName}</div>
            </div>
            <div className="sp-thought-decoration" aria-hidden="true" />
            <div className="sp-thought-tabs" role="tablist" aria-label="内心与模型思维">
                {([['tweets', 'Tweets'], ['replies', 'Replies']] as const).map(([key, label]) => <button key={key} role="tab" id={`${id}-${key}`} aria-selected={tab === key} aria-controls={`${id}-panel`} type="button" onClick={() => setTab(key)}>{label}</button>)}
                <span aria-hidden="true">Media</span><span aria-hidden="true">Likes</span>
            </div>
            {tab === "tweets" && <div className="sp-thought-pinned" aria-hidden="true">⌖ Pinned Tweet</div>}
            <div className="sp-thought-tweet-header">
                <img src={image} alt="" draggable={false} />
                <div><div className="sp-thought-name">{name}<span className="sp-verified" aria-hidden="true" /></div><div className="sp-thought-handle">@{userName} ·1sec</div></div>
            </div>
            <div className="sp-thought-content" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>{tab === "tweets" ? <>{stateValues}{children}</> : reasoning}</div>
        </section>
    );
}
