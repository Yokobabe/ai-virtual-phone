"use client";
import { useEffect, useState } from "react";
import { formatCompatibilityText } from "@/lib/mixology/compatibility-worker-client";
import { compatibilityRegexRules } from "@/lib/mixology/compatibility-regex";
import type { CompatibilityTextInput } from "@/lib/mixology/compatibility-text";
import { MixProseView, type MixProseDialogue } from "./prose-view";

export function CompatibilityProse({ input, dialogue }: { input: CompatibilityTextInput; dialogue?: MixProseDialogue }) {
    const key = JSON.stringify(input);
    const [result, setResult] = useState<{ key: string; text?: string; error?: string }>();
    const hasRules = compatibilityRegexRules(input.active).length > 0;
    useEffect(() => {
        if (!hasRules) return;
        let cancelled = false;
        const timer = setTimeout(() => { void formatCompatibilityText(input).then(text => { if (!cancelled) setResult({ key, text }); }, error => { if (!cancelled) setResult({ key, error: error.message }); }); }, input.streaming ? 80 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
        // The serialized key includes all rule/text/depth changes, including in-place edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, hasRules]);
    const external = Object.values(input.active).flat().some(m => m.compatibility);
    if (!hasRules && input.placement === 1) return <>{input.text}</>;
    if (!hasRules) return <MixProseView text={input.text} dialogue={dialogue} streaming={input.streaming} safeHtml={external} />;
    if (result?.key !== key && !input.streaming) return <span aria-label="整理正文中" />;
    if (result?.error) return <p role="alert">{result.error}</p>;
    return result?.text ? <MixProseView text={result.text} dialogue={dialogue} streaming={input.streaming} safeHtml /> : <span aria-label="整理正文中" />;
}
