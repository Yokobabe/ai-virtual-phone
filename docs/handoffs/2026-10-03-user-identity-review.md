# User Identity 切换诊断

- 需求：大调整前核对现有切换入口与影响；本轮不实现调整。
- 分支/基准：feat/imessage-private-chat，e57d3db。
- 静态检查：身份卡由 components/settings/user-identity.tsx 管理；lib/settings-storage.ts 保存卡片并通过绑定解析。绑定管理支持全局、角色及应用层。
- 实际解析：全局 → 角色默认 → 应用默认 → 角色应用覆盖；无 characterId 时提前返回全局，忽略应用默认。身份不存在时回退第一张卡。
- 模型输入：lib/llm-prompt-assembler.ts 的 buildUserPersonaText 注入姓名、性别、年龄、职业、bio、customSettings；宏使用身份名字与 bio。
- 数据范围：ChatSession 未绑定 userIdentityId，消息按 sessionId、记忆按 characterId，钱包使用单个全局键。切换身份不隔离这些数据。
- 刷新问题：chat-room 的身份加载仅随 session.id effect；绑定更新事件刷新正则而非身份。身份卡保存没有专用更新事件。部分页面 useMemo 空依赖，因此可能要重新进入页面才更新。
- 群聊：room 使用 contactId/chat，设置等页面使用 undefined/group_chat；调用范围不一致，self 仍是同一用户标识。
- 历史影响：部分用户头像/名称用当前身份渲染，已持久化 senderName/操作文本等不会统一重写；可能同时出现旧名、新名。
- 改动文件：仅本交接与 docs/TODO.md；没有更改功能。
- 验证：代码静态核对；未检查浏览器当前绑定、未调用模型、未做真机测试。本轮无功能测试需要。
- 遗留：等待用户确定身份调整目标后再设计迁移与隔离边界。
- 提交/推送：本轮诊断文档未 commit，未 push；其余工作区变更保留。
