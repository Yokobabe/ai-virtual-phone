const CURRENCIES = new Set(["CNY", "USD", "EUR", "GBP", "JPY", "KRW", "HKD", "TWD", "CAD", "AUD"]);
export function normalizeCurrency(value: unknown): string { return String(value || "CNY").trim().toUpperCase(); }
export function currencySymbol(code: string): string { return ({ CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥", KRW: "₩", HKD: "HK$", TWD: "NT$", CAD: "C$", AUD: "A$" } as Record<string,string>)[code] || code; }
export async function fetchCnyRate(currency: string): Promise<number | null> {
    const code = normalizeCurrency(currency); if (code === "CNY") return 1;
    if (!CURRENCIES.has(code)) return null;
    try { const r = await fetch(`https://open.er-api.com/v6/latest/${code}`, { signal: AbortSignal.timeout(8000) }); if (!r.ok) return null; const j = await r.json(); const rate = Number(j?.rates?.CNY); return j.result === "success" && j.base_code === code && Number.isFinite(rate) && rate > 0 ? rate : null; } catch { return null; }
}
export function cnyAmount(amount: number, rate: number): number { return Math.round(amount * rate * 100) / 100; }
