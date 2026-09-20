"use client";

import { record, records, string, type CompatRecord } from "@/lib/mixology/compatibility";

export function CompatibilityPresetEditor({ data, onChange }: { data: CompatRecord; onChange: (data: CompatRecord) => void }) {
    const prompts = records(data.prompts);
    const orders = records(data.prompt_order);
    const selected = orders.findIndex(o => o.character_id === 100001);
    const index = selected >= 0 ? selected : 0;
    const order = orders[index] ? records(orders[index].order) : prompts.map(p => ({ identifier: p.identifier, enabled: p.enabled !== false }));
    const changeOrder = (next: CompatRecord[]) => {
        const updated = [...orders];
        updated[index] = { ...record(updated[index]), character_id: updated[index]?.character_id ?? 100001, order: next };
        onChange({ ...data, prompt_order: updated });
    };
    return <div className="mix-compat-editor">
        <p className="mix-import-note">这份预设控制提示词顺序。每杯只选一份；如果想沿用它的长篇文风，可以移除原生「杯型」中每轮 2～4 段的要求。</p>
        <div className="mix-compat-params">
            <label>温度<input className="mix-input" type="number" min="0" max="2" step="0.05" value={typeof data.temperature === "number" ? data.temperature : 1} onChange={e => onChange({ ...data, temperature: Number(e.target.value) })} /></label>
            <label>单次输出上限<input className="mix-input" type="number" min="1" max="8192" step="1" value={Math.min(8192, typeof data.openai_max_tokens === "number" ? data.openai_max_tokens : 4096)} onChange={e => onChange({ ...data, openai_max_tokens: Math.max(1, Math.min(8192, Number(e.target.value))) })} /></label>
        </div>
        <p className="mix-import-note">{order.filter(p => p.enabled === true).length} / {order.length} 项已启用 · 展开条目可编辑正文</p>
        {order.map((entry, i) => {
            const promptIndex = prompts.findIndex(p => p.identifier === entry.identifier);
            const prompt = prompts[promptIndex];
            if (!prompt) return null;
            return <details className="mix-compat-prompt" key={`${string(entry.identifier)}-${i}`}>
                <summary>{string(prompt.name) || string(prompt.identifier)} · {entry.enabled ? "已启用" : "已停用"}</summary>
                <div className="mix-compat-actions">
                    <label><input type="checkbox" checked={entry.enabled === true} onChange={e => changeOrder(order.map((p, j) => i === j ? { ...p, enabled: e.target.checked } : p))} /> 启用</label>
                    <button type="button" disabled={i === 0} onClick={() => { const next = [...order]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; changeOrder(next); }}>上移</button>
                    <button type="button" disabled={i === order.length - 1} onClick={() => { const next = [...order]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; changeOrder(next); }}>下移</button>
                </div>
                {prompt.marker ? <p className="mix-import-note">此位置自动放入角色资料、世界书或聊天历史。</p> : <textarea className="mix-textarea" aria-label={`${string(prompt.name) || string(prompt.identifier)}正文`} value={string(prompt.content)} onChange={e => onChange({ ...data, prompts: prompts.map((p, j) => j === promptIndex ? { ...p, content: e.target.value } : p) })} />}
            </details>;
        })}
    </div>;
}
