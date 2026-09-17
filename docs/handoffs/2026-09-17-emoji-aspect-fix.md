# Emoji 拉伸修复

- 分支 feat/imessage-private-chat；基准 9d1ac2f。未提交、未推送。
- 原因：照片标记 SVG 的 preserveAspectRatio=none 使文字随长方形容器非等比例伸缩。
- message-bubble.tsx：ResizeObserver 读取标记层实际长宽，对 Emoji 局部坐标做纵向补偿，再绕自身中心旋转；坐标位置不变，选择圈同样补偿。适用于旧数据及 User/Char 贴图。
- chat-photo-markup.ts：合成图字号与显示统一为图宽的 12% 乘 scale。
- check-photo-editor.cjs 改为使用实际 PhotoAnnotationLayer，验证旋转后屏幕变换 X/Y 缩放相等及横竖屏切换；手势与保存回归通过。TypeScript 检查通过。
- 真机最终观感待用户验收。
