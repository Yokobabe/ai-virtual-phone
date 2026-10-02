# 群聊往返与连续署名优化

- 用户授权优化上轮讨论的群聊接话、SP连续BARON重复署名及emoji换行；只处理这些范围。
- 分支feat/imessage-private-chat / 基准2f60500；保留已有导演旁白、文本及其他窗口未提交改动，未commit/push。
- 新增lib/group-dialogue-flow.ts；lib/group-chat-engine.ts在实际线上group_chat提示组装中补系统互动规则，不依赖可编辑预设，不增加API调用。不作用于线下及独立自定义APP。先确定互动方向、直接输出消息，不输出预演或分析；角色可反复回应、有人不发言，不固定顺序/强造冲突/人人出场，不提前知道后续消息。接话仍由模型选择，解析器已支持任意有效成员顺序。
- components/chat/chat-room.tsx的SP群聊署名按可见消息连续性判断；同角色跨批次连发不再重显头像名字，其他人插话或时间分组后再显示。私聊逻辑不变，不合并/删除消息和内心、重试批次数据。
- lib/chat-text-layout.ts仅对普通assistant展示文本将句尾emoji前空格换为不换行空格，减少孤立emoji行；普通软换行清理保留，明确Markdown/诗歌/代码等布局不改。气泡最大宽度、颜色、大小不动，历史和API原文不重写。
- Pinpoint用于限制局部改动；备份chat-room.group-flow-v1.tsx.bak及chat-text-layout.emoji-v1.ts.bak。
- 检查通过：限定聊天tsc、check-group-spectator-context.cjs生产组装普通/围观/线上线下隔离、check-group-dialogue-flow.cjs分组与320/390/430浏览器emoji坐标、check-chat-text-layout.cjs三预设文字、check-group-director-note.cjs旁白身份隔离。无真实付费模型调用，无用户浏览器存储变动。
- 限制：未核对截图对应存储原文；这次修复结构性重复署名和末尾emoji孤行，不宣称所有硬换行都应删除。真实模型接话质量、手机视觉待验收；单次调用内编排是提示策略，不是额外调度模型。
