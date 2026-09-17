# 照片编辑流程重做

- 分支 `feat/imessage-private-chat`，基准 `9d1ac2f`。未提交、未推送。
- 用户最新要求取代之前的边缘返回方案：数量按钮进入总览，点具体图片进入编辑；安全区内玻璃圆形返回、确认；空白不退出；返回丢弃草稿，确认保存。

## 实现

- 新增 `components/chat/photo-markup-editor.tsx` 与 `styles/photo-editor.css`，通过 `app/globals.css` 加载。系统主题背景、图片 contain 缩放、预留上下工具空间。
- 下方画笔/Emoji 胶囊支持点击和横滑。画笔显示六色、三档粗细及撤回；Emoji 仅弹小输入框，点外部提交输入后关闭键盘，不退出页面。
- 手势采用屏幕像素计算距离与角度；两指使用初始中心偏移，避免跳到两指中点；手指数变化重建基准；不再在第二指落下时创建或换选贴图。
- `message-bubble.tsx` 删除原编辑器和中间黑色聚焦页；总览点图直接编辑。当前叠图反应只展示当前照片记录。
- `chat-room.tsx` Tapback 按当前首图 ID 写入；菜单也读取该图状态。`chat-storage.ts` 的组内投影包含每张照片的反应。
- `llm-prompt-assembler.ts` 私聊/群聊均补充中心点百分比、缩放尺寸语义、旋转正负方向和实例。

## 验证

- TypeScript 全仓检查通过。
- `scripts/check-photo-editor.cjs` 使用独立浏览器、390x844 触屏模拟和合成数据；通过任意 Emoji、拖动、双指缩放旋转45度、不重复创建、空白不退出、确认保存、返回动作测试。测试图标用 SVG 替身；布局截图已检查。
- 3003 首页 HTTP 200。
- 真机 Safari 手感、逐图 Tapback、真实模型定位尚待用户验收；没有调用付费模型。
