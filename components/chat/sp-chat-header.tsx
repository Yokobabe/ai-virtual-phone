import type { ReactNode } from "react";
import { ChatUnreadPill } from "./chat-unread-pill";

export function SpChatHeader({ sessionId, name, avatar, onBack, onSettings, onVoice, onVideo }: {
    sessionId: string; name: string; avatar: ReactNode; onBack: () => void;
    onSettings: () => void; onVoice: () => void; onVideo: () => void;
}) {
    return <div className="sp-chat-header">
        <ChatUnreadPill sessionId={sessionId} onBack={onBack} />
        <div className="sp-header-profile">
            <span className="sp-header-avatar">{avatar}</span>
            <span className="sp-header-name">{name}<span className="sp-verified" aria-hidden="true" /></span>
        </div>
        <div className="sp-header-actions">
            <button type="button" onClick={onVoice} aria-label="语音通话">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6.1 6.1l1.3-1.3a2 2 0 0 1 2.1-.5l2.8.7a2 2 0 0 1 1.7 2" /></svg>
            </button>
            <button type="button" onClick={onVideo} aria-label="视频通话"><span className="sp-glyph sp-glyph-video" aria-hidden="true" /></button>
            <button type="button" onClick={onSettings} aria-label="聊天设置"><span className="sp-glyph sp-glyph-settings" aria-hidden="true" /></button>
        </div>
    </div>;
}
