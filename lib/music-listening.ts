import type { MusicControlSnapshot } from "./music-control-bridge";

export type TimedLyric = { time: number; text: string };
export type MusicListeningContext = {
    version: 1;
    identityId: string | null;
    capturedAt: string;
    trackId: string;
    title: string;
    artist: string;
    position: number;
    isPlaying: boolean;
    lines: TimedLyric[];
    reference?: TimedLyric;
};

export const MUSIC_LISTENING_INSTRUCTION = "回应用户正在做的沟通动作，而不是逐项回应附带的音乐数据。先识别这句话是在表达需求、情绪、亲近、玩笑还是推进事情，以此确定回应重点。歌曲持续播放、进度变化或仍显示同一歌名，不算新的聊天事件；用户转移话题后，音乐退回背景，不反复确认、点评或拉回音乐。只有用户主动谈音乐，或歌曲与角色具体经历、正在发生的事形成有意义的联系时，才考虑提及；即使有关联，也按角色当下的注意力、情绪和表达习惯决定是否说出口。\n将观察与推测分开：选了什么歌、引用了哪句、附了什么话是可见线索；借歌示爱、试探或表达不满是推测。结合双方近期发生的具体事情与用户措辞判断，单个歌名或歌词不能坐实动机。线索不足时回应明确表达的部分，不替用户确认心意，也不为完成音乐解读而追问。角色可以因自身经历产生偏见或误会，但要体现为角色的主观看法，后续可随用户反馈修正。\n校准示例：音乐仍在播放时用户说“到家了”，先回应到家这件事，不顺带点评歌曲；争执后分享歌曲却没附解释，不自动认定为道歉，可延续未解决的问题；主动引用一句歌词并说“像我们那天”，才沿那次共同经历回应；一首歌唤起角色已有的私人记忆，也可以只影响语气或选择，不必把联想说出来。例子用于迁移判断，不套用台词。\n用户明确谈歌词时，以选中引用为准；没有引用，则结合消息中的词与含义，在发送瞬间的当前句及前两句内定位，不用回复时的播放位置改写所指。\n角色的音乐认知由生活年代、文化环境、个人经历、社交圈、兴趣及已有听歌记录共同形成。分别判断是否认识歌手、是否听过此曲、熟悉到什么程度、是否喜欢；模型掌握的知识不自动属于角色，缺少依据时允许陌生或只知道一部分，不补造听歌经历。年龄、职业和性格都不能单独决定音乐偏好。\n判断案例：偏爱怀旧可能源于某段经历，也可能只是喜欢一种编曲，并不排斥新歌；喜欢朋克可能在意能量、现场或表达方式，不代表处处反叛；关注当代流行或新兴风格的人也可能只熟悉某个圈层，不必认识所有新歌手；沉稳年长者可能一直追新，年轻人也可能偏爱旧唱片。迁移这些判断方式，不把案例分配成人物模板。\n偏好可以多元并存，随情境、接触与关系逐步发展；已有具体经历和选择优先于标签。陌生、熟悉、喜欢、欣赏某一点与愿意陪用户听是不同状态；不因一次分享立刻改写长期品味，也不为迎合用户假装熟悉或喜欢。只表达这次互动真正需要的部分，不输出上述分析过程。";

const cache = new Map<string, TimedLyric[]>();
export function parseTimedLyrics(lrc: string): TimedLyric[] {
    const cached = cache.get(lrc);
    if (cached) return cached;
    const offset = Number(lrc.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
    const lines: TimedLyric[] = [];
    for (const row of lrc.split(/\r?\n/)) {
        const stamps = [...row.matchAll(/\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g)];
        if (!stamps.length) continue;
        const text = row.replace(/\[[^\]]*\]/g, "").trim();
        for (const stamp of stamps) {
            lines.push({ time: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) - offset), text });
        }
    }
    lines.sort((a, b) => a.time - b.time);
    const unique = lines.filter((line, i) => !i || line.time !== lines[i - 1].time || line.text !== lines[i - 1].text);
    if (cache.size >= 4) cache.delete(cache.keys().next().value!);
    cache.set(lrc, unique);
    return unique;
}

const compact = (text: string, limit: number) => text.replace(/\s+/g, " ").trim().slice(0, limit);
export function createMusicListeningContext(
    snapshot: MusicControlSnapshot, identityId: string | null, capturedAt: string,
    reference?: TimedLyric,
): MusicListeningContext | undefined {
    const track = snapshot.currentTrack;
    if (!track || !Number.isFinite(snapshot.currentTime)) return;
    const lyrics = parseTimedLyrics(track.lyrics || "");
    let index = lyrics.length - 1;
    while (index >= 0 && lyrics[index].time > snapshot.currentTime) index--;
    // Keep blank timestamps: instrumental gaps must not be labelled as singing.
    const lines = index < 0 ? [] : [...lyrics.slice(0, index).filter(line => line.text).slice(-2), lyrics[index]];
    if (!lines.length && !reference) return;
    return {
        version: 1, identityId, capturedAt, trackId: track.id,
        title: compact(track.title, 100), artist: compact(track.artist, 100),
        position: Math.max(0, snapshot.currentTime), isPlaying: snapshot.isPlaying,
        lines: lines.map(line => ({ time: line.time, text: compact(line.text, 240) })),
        ...(reference ? { reference: { time: reference.time, text: compact(reference.text, 240) } } : {}),
    };
}

export function lyricTimestamp(time: number): string {
    const seconds = Math.max(0, Math.floor(time));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function musicListeningHistoryText(message: { role: string; listeningContext?: MusicListeningContext | null }, body: string): string {
    const context = message.listeningContext;
    if (message.role !== "user" || !context) return body;
    const heading = `[发言时音乐：${compact(context.title, 100)} · ${compact(context.artist, 100)}；${lyricTimestamp(context.position)}${context.isPlaying ? "" : "，暂停"}]`;
    const reference = context.reference;
    const lines = reference
        ? [`明确引用 ${lyricTimestamp(reference.time)}：${compact(reference.text, 240)}`]
        : context.lines.slice(-3).map((line, i, list) => `${i === list.length - 1 ? "当前" : "前" + (list.length - 1 - i) + "句"} ${lyricTimestamp(line.time)}：${compact(line.text, 240) || "（间奏／空白）"}`);
    return `${body}\n${heading}\n${lines.join("\n")}`;
}
