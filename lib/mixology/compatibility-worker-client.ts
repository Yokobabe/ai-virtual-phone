import { buildCompatibilityMessages } from "./compatibility-runtime";
import { transformCompatibilityText, type CompatibilityTextInput } from "./compatibility-text";

export async function buildCompatibilityRequest(input: Parameters<typeof buildCompatibilityMessages>[0]) {
    if (!Object.values(input.active).flat().some(m => m.compatibility) && !input.card.compatibility) return null;
    if (typeof Worker === "undefined") return buildCompatibilityMessages(input);
    const { runCompatibilityWorker } = await import("./compatibility-worker-browser");
    return await runCompatibilityWorker("messages", input) as ReturnType<typeof buildCompatibilityMessages>;
}
export async function formatCompatibilityText(input: CompatibilityTextInput): Promise<string> {
    if (typeof Worker === "undefined") return transformCompatibilityText(input);
    const { runCompatibilityWorker } = await import("./compatibility-worker-browser");
    return await runCompatibilityWorker("text", input) as string;
}
