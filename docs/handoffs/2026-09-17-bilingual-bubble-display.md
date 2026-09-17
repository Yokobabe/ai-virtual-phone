# 双语气泡显示优化交接

## 需求

- 自动展开翻译：不显示“译文”，直接按原文、分割线、中文排列。
- 分割线按原文实际渲染宽度绘制，不使用固定长度。
- 点击翻译：不向下展开、不显示标签，单击气泡后由中文顶替原文，再点切回。

## 改动

- `components/chat/message-bubble.tsx`
  - 自动模式使用 `ResizeObserver` 测量原文块宽度，并把宽度用于分割线。
  - 点击模式改为原文/译文单层切换。
  - Markdown 内部链接、按钮和表单控件不会误触翻译切换。
  - 增加键盘 Enter/Space 切换支持。
- `styles/chat.css`
  - 双语容器改为 `inline-flex`、`fit-content`，移动端最大宽度进一步收窄为 `min(70vw, 320px)`，让长外语自然换行。
  - 原文、分割线与译文之间的 gap 收紧到 2px。
  - 删除旧“译文/收起译文”按钮样式。

## 检查

- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- `git diff --check`：通过。
- `http://127.0.0.1:3003/`：HTTP 200。

## 状态

- 未 commit。
- 未 push。
- 待手机验证自动模式的原文最长行宽、长文本换行，以及点击模式的切换手感。
