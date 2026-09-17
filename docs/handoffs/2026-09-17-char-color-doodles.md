# Char 多色涂鸦

- 需求：参考彩色涂鸦，支持颜色、粗细、填色、多笔组合和自由曲线；不接入生图。
- 分支/基准：feat/imessage-private-chat / 9d1ac2f。保留共享目录其他未提交改动。
- 文件：lib/photo-doodle.ts、lib/chat-storage.ts、lib/rich-message-parser.ts、lib/chat-photo-markup.ts、lib/llm-prompt-assembler.ts、components/chat/message-bubble.tsx；测试 scripts/check-photo-doodle.cjs。
- 新增结构化照片涂鸦协议；解析颜色、填色、透明度、线宽、曲线及目标照片序号。多笔一次落库，以 compositionId 关联，持久化创作意图、执行者、目标照片和具体操作。私聊/群聊提示词提供能力。
- 使用固定 seed 的 Rough.js 生成路径；显示层与提供模型的合成图支持多色填色与自由曲线。保留原有手绘和 Emoji。
- 检查：tsc --noEmit 通过；check-photo-doodle.cjs 通过（颜色、填色、线宽、透明度、索引、非法输入、固定 seed）；check-photo-editor.cjs 通过（原生 Emoji、拖动、双指缩放旋转、不重复、空白保留、确认/返回）。
- 遗留：真实模型是否合理选择位置、配色和曲线及真机效果待用户长期验收，未调用付费模型。文字仍依赖设备字体，并非真正手写字形。自由路径只允许 SVG 路径数据，不接受任意 SVG/脚本。
- 未 commit、未 push、未部署。
