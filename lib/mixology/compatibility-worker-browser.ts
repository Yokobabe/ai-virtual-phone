let worker: Worker | undefined;
let ready = false;
let nextId = 0;
const jobs = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; payload: unknown }>();
let timer: ReturnType<typeof setTimeout> | undefined;
function fail(message: string) {
    worker?.terminate(); worker = undefined; ready = false; clearTimeout(timer);
    for (const job of jobs.values()) job.reject(new Error(message));
    jobs.clear();
}
function schedule() {
    clearTimeout(timer);
    if (jobs.size) timer = setTimeout(() => fail("正则或世界书处理超时，已停止本次处理。请检查兼容设置中的规则。"), 3000);
}
export function runCompatibilityWorker(type: "messages" | "text", input: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const id = ++nextId, payload = { id, type, input };
        jobs.set(id, { resolve, reject, payload });
        if (!worker) {
            worker = new Worker(new URL("./compatibility-worker.ts", import.meta.url));
            timer = setTimeout(() => fail("兼容处理器加载超时，请重试。"), 20000);
            worker.onerror = () => fail("兼容处理器无法加载，请刷新后重试。");
            worker.onmessage = event => {
                if (event.data.ready) { ready = true; for (const job of jobs.values()) worker!.postMessage(job.payload); schedule(); return; }
                const job = jobs.get(event.data.id);
                jobs.delete(event.data.id);
                if (event.data.error) job?.reject(new Error(event.data.error)); else job?.resolve(event.data.result);
                schedule();
            };
        } else if (ready) { worker.postMessage(payload); if (jobs.size === 1) schedule(); }
    });
}
