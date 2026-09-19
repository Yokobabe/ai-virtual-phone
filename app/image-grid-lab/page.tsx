"use client";

import { ChangeEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { generateImageFromConfiguredApi } from "@/lib/image-generation-service";
import { loadImageGenerationSettings } from "@/lib/settings-storage";
import type { ImageGenerationSettings } from "@/lib/settings-types";
import type { ChatMessage } from "@/lib/chat-storage";
import { MessageBubble } from "@/components/chat/message-bubble";
import {
  MULTI_IMAGE_TARGET_CELL_ASPECT_RATIO,
  buildMultiImageSheetPrompt,
  createMultiImageCanvasGuidance,
  createPhotoGroupPlan,
  resolveMultiImageGenerationSize,
} from "@/lib/image-delivery-protocol";
import {
  IMAGE_GRID_LAYOUTS,
  describeImageGridLayout,
  getImageGridLayout,
  imageBlobToDataUrl,
  splitImageGrid,
  type ImageGridCount,
} from "@/lib/image-grid-split";
import styles from "./page.module.css";

type Preview = { url: string; label: string; aspectRatio?: number };

const DEFAULT_PROMPT = "同一角色今天出门时拍的四次 OOTD 自拍；四张照片的动作、面部表情、眼神和拍摄角度都要明显不同，但仍然能看出是同一个人";

function loadImageAspectRatio(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 0.82);
    image.onerror = () => reject(new Error("无法读取切片尺寸"));
    image.src = url;
  });
}

const PHOTO_STACK_MAX_CROP_FRACTION = 0.3;

function getPhotoStackAspectRatio(aspectRatio: number | undefined): number {
  const sourceRatio = aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0
    ? aspectRatio
    : MULTI_IMAGE_TARGET_CELL_ASPECT_RATIO;
  const minRatio = sourceRatio * (1 - PHOTO_STACK_MAX_CROP_FRACTION);
  const maxRatio = sourceRatio / (1 - PHOTO_STACK_MAX_CROP_FRACTION);
  return Math.max(minRatio, Math.min(MULTI_IMAGE_TARGET_CELL_ASPECT_RATIO, maxRatio));
}

function createPhotoGroupMessage(pieces: Preview[]): ChatMessage {
  const groupId = "image-grid-lab-photo-group";
  return {
    id: `${groupId}-lead`,
    sessionId: "image-grid-lab-preview",
    role: "assistant",
    content: "",
    status: "sent",
    createdAt: "2026-09-18T12:00:00.000Z",
    mediaType: "image",
    mediaUrl: pieces[0]?.url,
    senderName: "Char",
    mediaData: {
      label: pieces[0]?.label,
      photoKind: "photo",
      photoGroupId: groupId,
      photoGroupIndex: 0,
      photoGroupCount: pieces.length,
      photoGroupActiveIndex: 0,
      photoGroupItems: pieces.map((piece, index) => ({
        messageId: `${groupId}-${index}`,
        mediaUrl: piece.url,
        label: piece.label,
        photoKind: "photo",
      })),
    },
  };
}

export default function ImageGridLabPage() {
  const [count, setCount] = useState<ImageGridCount>(4);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [source, setSource] = useState<Preview | null>(null);
  const [pieces, setPieces] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("先选择本地图片测试切割，或直接调用当前生图配置。");
  const [settingsSummary, setSettingsSummary] = useState("正在读取生图配置…");
  const [api, setApi] = useState(() => loadImageGenerationSettings());
  const [showApi, setShowApi] = useState(false);

  const layout = useMemo(() => getImageGridLayout(count), [count]);
  const canvasGuidance = useMemo(() => layout ? createMultiImageCanvasGuidance(layout) : null, [layout]);
  const automaticSize = useMemo(() => canvasGuidance
    ? resolveMultiImageGenerationSize(canvasGuidance, { model: api.model, configuredSize: api.size })
    : null, [api.model, api.size, canvasGuidance]);

  useEffect(() => {
    const settings = loadImageGenerationSettings();
    setApi(settings);
    setSettingsSummary(settings.enabled
      ? `已启用 · ${settings.model || "未填写模型"} · ${settings.requestMode === "direct" ? "浏览器直连" : "服务端/代理"}`
      : "未启用（可先使用本地图片切割测试）");
  }, []);

  const updateApi = <K extends keyof ImageGenerationSettings>(key: K, value: ImageGenerationSettings[K]) => {
    setApi(previous => ({ ...previous, [key]: value }));
  };

  const showSplitResult = async (blob: Blob, label: string) => {
    if (!layout) throw new Error("当前数量没有可用的网格布局");
    const sourceUrl = await imageBlobToDataUrl(blob);
    const output = await splitImageGrid(blob, layout, { outputAspectRatio: MULTI_IMAGE_TARGET_CELL_ASPECT_RATIO });
    const previews = await Promise.all(output.map(async (piece, index) => {
      const url = await imageBlobToDataUrl(piece);
      return {
        url,
        label: `${label} · 第 ${index + 1} 张`,
        aspectRatio: await loadImageAspectRatio(url),
      };
    }));
    setSource({ url: sourceUrl, label });
    setPieces(previews);
    setMessage(`切割完成：${describeImageGridLayout(layout)}，共 ${previews.length} 张。`);
  };

  const handleLocalFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage("正在切割本地图片…");
    try {
      await showSplitResult(file, file.name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!layout || !prompt.trim()) return;
    setBusy(true);
    setPieces([]);
    setMessage("正在调用一次生图 API…");
    try {
      const plan = createPhotoGroupPlan(count, prompt);
      const generatedPrompt = buildMultiImageSheetPrompt(plan);
      const sizePlan = resolveMultiImageGenerationSize(generatedPrompt.canvasGuidance, {
        model: api.model,
        configuredSize: api.size,
      });
      setMessage(`正在调用一次生图 API… 多图画布自动使用 ${sizePlan.size}`);
      const generated = await generateImageFromConfiguredApi({
        description: generatedPrompt.prompt,
        settings: { ...api, enabled: true, size: sizePlan.size },
      });
      if (!generated) throw new Error("生图配置未启用或不完整");
      await showSplitResult(generated.blob, `API 原图 · ${count} 张照片组`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>FLOAT · IMAGE GRID LAB</div>
        <h1>多图生成切割实验</h1>
        <p className={styles.intro}>先验证“一次生图 → 切成多张”的效果，不会写入正式聊天记录。</p>

        <div className={styles.controls}>
          <label>
            <span>照片数量</span>
            <select value={count} onChange={event => setCount(Number(event.target.value) as ImageGridCount)} disabled={busy}>
              {Object.keys(IMAGE_GRID_LAYOUTS).map(value => {
                const number = Number(value) as ImageGridCount;
                const currentLayout = IMAGE_GRID_LAYOUTS[number];
                return <option key={value} value={value}>{number} 张 · {describeImageGridLayout(currentLayout)}</option>;
              })}
            </select>
          </label>
          <label className={styles.promptField}>
            <span>主题描述</span>
            <textarea value={prompt} onChange={event => setPrompt(event.target.value)} rows={3} disabled={busy} />
          </label>
        </div>

        <div className={styles.settings}>{settingsSummary}{automaticSize ? ` · 多图画布自动 ${automaticSize.size}` : ""}</div>
        <button type="button" className={styles.apiToggle} onClick={() => setShowApi(value => !value)}>
          {showApi ? "收起临时 API 配置" : "展开临时 API 配置"}
        </button>
        {showApi && <div className={styles.apiPanel}>
          <p className={styles.apiHint}>仅本页内存使用，不会保存到正式设置、聊天记录或日志。多图会按布局自动调整 Size；这里的 Size 只作为接口兼容基准。</p>
          <label><span>Base URL</span><input value={api.baseUrl} onChange={event => updateApi("baseUrl", event.target.value)} placeholder="https://api.example.com/v1" /></label>
          <label><span>API Key</span><input type="password" value={api.apiKey} onChange={event => updateApi("apiKey", event.target.value)} placeholder="临时填写，不会保存" /></label>
          <label><span>Model</span><input value={api.model} onChange={event => updateApi("model", event.target.value)} placeholder="模型名称" /></label>
          <div className={styles.apiRow}>
            <label><span>请求方式</span><select value={api.requestMode} onChange={event => updateApi("requestMode", event.target.value as ImageGenerationSettings["requestMode"])}><option value="direct">浏览器直连</option><option value="server">服务端/代理</option></select></label>
            <label><span>兼容基准 Size</span><input value={api.size} onChange={event => updateApi("size", event.target.value)} placeholder="auto / 1024x1024" /></label>
            <label><span>Quality</span><input value={api.quality} onChange={event => updateApi("quality", event.target.value)} placeholder="auto / low / high" /></label>
          </div>
        </div>}
        <div className={styles.actions}>
          <label className={styles.secondaryButton}>
            选择本地合成图
            <input type="file" accept="image/*" onChange={handleLocalFile} disabled={busy} />
          </label>
          <button type="button" onClick={() => void handleGenerate()} disabled={busy || !layout || !prompt.trim()}>
            {busy ? "处理中…" : "调用一次生图 API"}
          </button>
        </div>

        <div className={styles.status} aria-live="polite">{message}</div>

        {source && (
          <section className={styles.resultSection}>
            <div className={styles.sectionTitle}>合成原图</div>
            <div className={styles.sourcePreview}><img src={source.url} alt={source.label} /></div>
          </section>
        )}

        {pieces.length > 0 && (
          <section className={styles.resultSection}>
            <div className={styles.sectionTitle}>Char 发送效果 · 照片组叠图</div>
            <div className={styles.chatPreview}>
              <div className={styles.chatAvatar}>C</div>
              <div className={styles.chatColumn}>
                <div className={styles.chatName}>Char</div>
                <div
                  className={styles.chatBubble}
                  style={{ "--lab-photo-aspect": String(getPhotoStackAspectRatio(pieces[0]?.aspectRatio)) } as CSSProperties}
                >
                  <MessageBubble msg={createPhotoGroupMessage(pieces)} charName="Char" />
                </div>
                <div className={styles.chatMeta}>刚刚 · 一次发送 {pieces.length} 张照片</div>
              </div>
            </div>
            <div className={`${styles.sectionTitle} ${styles.debugTitle}`}>切割结果 · {pieces.length} 张（调试对照）</div>
            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${layout?.cols ?? 3}, minmax(0, 1fr))` }}>
              {pieces.map(piece => <figure key={piece.label}><img src={piece.url} alt={piece.label} /><figcaption>{piece.label}</figcaption></figure>)}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
