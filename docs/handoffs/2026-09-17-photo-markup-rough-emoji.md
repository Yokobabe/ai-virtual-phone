# 照片手绘与 Emoji 二创交接

## 需求

- User 与 Char 共用照片二创能力：保留手绘，也保留 Emoji 贴图。
- Emoji 支持位置、缩放和旋转。
- Char 必须记得看到的原图内容、自己/他人做过的操作；多图必须记住具体第几张。
- 暂不接入生图二创。

## 分支与状态

- 分支：`feat/imessage-private-chat`
- 基准：`9d1ac2f`
- 本轮未 commit、未 push。

## 实现

- 新增本地依赖 `roughjs@4.6.6`，不使用 CDN。
- `ChatPhotoAnnotation` 扩展 `rough_shape` 与 `emoji`，保存 shape、seed、roughness、bowing、scale、rotation、actor 等稳定字段。
- Char 的爱心、星星、圈、箭头、方框、下划线不再使用旧的规则点列，改由 Rough.js 按固定 seed 渲染；重开页面不会改变线条。
- 新增 Char 协议：`[照片贴图:第N张:x:y:缩放:旋转:emoji:意图]`，省略第 N 张时使用当前首图。
- User 标记编辑器新增“画笔 / Emoji”切换；可输入或粘贴任意 Emoji，快捷列表仅作为候选。点击照片放置后支持单指拖动，双指同时缩放和旋转，并用虚线选择框标示当前对象。Char 不显示操作 UI，继续由模型协议直接控制。
- 用户新标记补齐 actor 信息；User/Char 的事件均保存目标照片 label、照片组数量、组内序号和二创摘要。
- 历史上下文把事件表达为“原图内容 + 第 N/总数张 + 实际操作”；照片现有 annotations 也会说明是谁留下的。
- 私聊、群聊运行时能力与内置预设同步更新，删除“禁止 Emoji”的旧冲突规则。

## 检查

- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- Next 首页：成功编译，`GET / 200`。
- `git diff --check`：通过，仅有工作区既有 CRLF 提示。
- 3003：通过 `node scripts/local-next-server.mjs --dev` 启动并监听 `0.0.0.0:3003`。

## 待真机验收

- Char 的 Rough.js 爱心、星星、圈、箭头是否具有自然手绘感。
- User Emoji 输入、落点、单指拖动及双指缩放/旋转是否适合手机操作。
- Char 是否能依据实际画面把帽子、幽灵等放到合理位置。
- 多角色/多图对话中，后续回复是否准确记得执行者和第几张照片。
- 旧 stroke/text annotations 是否继续正常显示。

## 未包含

- 生图/局部重绘。
- 自动视觉锚点检测和落点拖动后的二次编辑。
