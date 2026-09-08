import { getTapbackGlyph, getTapbackLabel } from "@/lib/chat-tapback";

interface IMessageTapbackBadgeProps {
    tapback: string;
    tapbackBy?: "user" | "assistant";
}

export function IMessageTapbackBadge({ tapback, tapbackBy = "user" }: IMessageTapbackBadgeProps) {
    return (
        <span
            className="imessage-tapback-badge"
            data-tapback={tapback}
            data-tapback-by={tapbackBy}
            role="img"
            aria-label={`Tapback：${getTapbackLabel(tapback)}`}
        >
            <svg
                className="imessage-tapback-shape"
                viewBox="-1 -1 35 40"
                aria-hidden="true"
            >
                <path d="M15.258 0C23.684 0 30.516 6.831 30.516 15.258C30.516 18.887 29.246 22.22 27.13 24.839C28.468 25.645 29.363 27.112 29.363 28.788C29.363 31.332 27.301 33.393 24.758 33.394C22.52 33.394 20.655 31.798 20.238 29.683C18.677 30.222 17.002 30.516 15.258 30.516C6.831 30.516 0 23.684 0 15.258C0 6.831 6.831 0 15.258 0Z" />
                <circle cx="30.515" cy="35.697" r="2.591" />
            </svg>
            <span className="imessage-tapback-glyph" aria-hidden="true">
                {getTapbackGlyph(tapback)}
            </span>
        </span>
    );
}
