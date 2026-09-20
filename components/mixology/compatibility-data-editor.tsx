"use client";
import { useState } from "react";
import { compatibilityWarnings, record, records, string, type MixCompatibility } from "@/lib/mixology/compatibility";
import { parseCompatibilityRegex } from "@/lib/mixology/compatibility-regex";
import type { MixMaterial } from "@/lib/mixology/types";

export function CompatibilityDataEditor({ value, onChange }: { value: MixCompatibility; onChange: (value: MixCompatibility) => void }) {
    const ext = record(value.data.extensions);
    const regex = records(ext.regex_scripts);
    const book = value.format === "worldbook" ? value.data : record(value.data.character_book);
    const entries = Array.isArray(book.entries) ? records(book.entries) : Object.values(record(book.entries)).map(record);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    const updateRegex = (i: number, patch: Record<string, unknown>) => onChange({ ...value, data: { ...value.data, extensions: { ...ext, regex_scripts: regex.map((r, j) => j === i ? { ...r, ...patch } : r) } } });
    const updateBook = (next: Record<string, unknown>) => onChange({ ...value, data: value.format === "worldbook" ? next : { ...value.data, character_book: next } });
    return <div>
        <details className="mix-compat-prompt"><summary>兼容说明</summary><ul>{compatibilityWarnings([{ compatibility: value } as MixMaterial]).map(w => <li key={w}>{w}</li>)}</ul></details>
        {regex.length ? <details className="mix-compat-prompt"><summary>酒馆正则 · {regex.filter(r => !r.disabled).length} / {regex.length} 已启用</summary>
            {regex.map((r, i) => <details className="mix-compat-prompt" key={i}><summary>{string(r.scriptName) || `规则 ${i + 1}`}</summary>
                <label><input type="checkbox" checked={!r.disabled} onChange={e => updateRegex(i, { disabled: !e.target.checked })} /> 启用</label>
                <p className="mix-import-note">{r.markdownOnly ? "显示 " : ""}{r.promptOnly ? "模型上下文 " : ""}{!r.markdownOnly && !r.promptOnly ? "文本处理（保留原文）" : ""} · 深度 {typeof r.minDepth === "number" ? r.minDepth : "不限"} ～ {typeof r.maxDepth === "number" ? r.maxDepth : "不限"}</p>
                <label>查找表达式<textarea className="mix-textarea" value={string(r.findRegex)} onChange={e => updateRegex(i, { findRegex: e.target.value })} /></label>
                <label>替换内容<textarea className="mix-textarea" value={string(r.replaceString)} onChange={e => updateRegex(i, { replaceString: e.target.value })} /></label>
            </details>)}
        </details> : null}
        {entries.length ? <details className="mix-compat-prompt"><summary>世界书 · {entries.filter(e => e.enabled !== false && !e.disable).length} / {entries.length} 已启用</summary>
            <label><input type="checkbox" checked={book.recursive_scanning === true || book.recursive === true} onChange={e => updateBook({ ...book, recursive_scanning: e.target.checked, recursive: e.target.checked })} /> 递归扫描</label>
            <p className="mix-import-note">每轮对话下方可查看实际触发情况。预算、扫描深度及各条目参数可在下方高级数据中修改。</p>
            {entries.map((entry, i) => <label key={i} style={{ display: "block", margin: "10px 0" }}><input type="checkbox" checked={entry.enabled !== false && !entry.disable} onChange={e => {
                const changed = { ...entry, enabled: e.target.checked, disable: !e.target.checked };
                const next = Array.isArray(book.entries) ? entries.map((v, j) => j === i ? changed : v) : Object.fromEntries(Object.entries(record(book.entries)).map(([key, v], j) => [key, j === i ? changed : v]));
                updateBook({ ...book, entries: next });
            }} /> {string(entry.comment) || string(entry.name) || `条目 ${i + 1}`}</label>)}
        </details> : null}
        <details className="mix-compat-prompt" onToggle={e => { if (e.currentTarget.open) setDraft(JSON.stringify(value.data, null, 2)); }}><summary>高级兼容数据</summary>
            <p className="mix-import-note">编辑卡片系统指令、正则范围/深度、世界书内容及触发参数。点击应用后，再保存入柜。这里的脚本扩展只保留，不运行。</p>
            <textarea className="mix-textarea" aria-label="高级兼容数据 JSON" value={draft} onChange={e => setDraft(e.target.value)} style={{ minHeight: 240 }} />
            <button type="button" className="mix-brew-btn" onClick={() => { try {
                const parsed = JSON.parse(draft);
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("需要 JSON 对象。");
                for (const r of records(record(parsed.extensions).regex_scripts)) if (!r.disabled && string(r.findRegex)) parseCompatibilityRegex(string(r.findRegex));
                onChange({ ...value, data: parsed }); setError("");
            } catch (e) { setError(e instanceof Error ? e.message : "数据格式有误"); } }}>应用高级数据</button>
            {error ? <p role="alert">{error}</p> : null}
        </details>
    </div>;
}
