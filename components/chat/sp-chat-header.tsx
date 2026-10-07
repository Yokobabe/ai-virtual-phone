import type { ReactNode } from "react";
import { Phone, Video, LayoutGrid } from "lucide-react";
import { ChatUnreadPill } from "./chat-unread-pill";

export function SpChatHeader({ sessionId, name, avatar, onBack, onSettings, onVoice, onVideo }: {
    sessionId: string; name: string; avatar: ReactNode; onBack: () => void;
    onSettings: () => void; onVoice: () => void; onVideo: () => void;
}) {
    return <div className="sp-chat-header">
        <ChatUnreadPill sessionId={sessionId} onBack={onBack} />
        <div className="sp-header-profile">
            <span className="sp-header-avatar">{avatar}</span>
            <span className="sp-header-name"><span className="sp-header-name-text" title={name}>{name}</span><span className="sp-verified" aria-hidden="true" /></span>
        </div>
        <div className="sp-header-actions">
            <button type="button" onClick={onVoice} aria-label="语音通话">
                <Phone className="sp-action-icon sp-action-phone" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button type="button" onClick={onVideo} aria-label="视频通话"><Video className="sp-action-icon sp-action-video" strokeWidth={1.8} aria-hidden="true" /></button>
            <button type="button" onClick={onSettings} aria-label="聊天设置"><LayoutGrid className="sp-action-icon sp-action-settings" strokeWidth={1.8} aria-hidden="true" /></button>
        </div>
    </div>;
}
