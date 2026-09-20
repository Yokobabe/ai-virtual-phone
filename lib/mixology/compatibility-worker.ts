import { buildCompatibilityMessages } from "./compatibility-runtime";
import { transformCompatibilityText } from "./compatibility-text";
self.onmessage = (event: MessageEvent) => {
    const { id, type, input } = event.data;
    try { self.postMessage({ id, result: type === "messages" ? buildCompatibilityMessages(input) : transformCompatibilityText(input) }); }
    catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : "兼容处理失败" }); }
};
self.postMessage({ ready: true });
