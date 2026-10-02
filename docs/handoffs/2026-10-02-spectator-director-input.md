# 围观群导演旁白

- 需求：围观群输入下一轮幕后指引，留空自主推进，绝不冒充用户在群内说话。长期群说明保留；普通群不改。
- 分支/基准：feat/imessage-private-chat / 2f60500；在已有未提交聊天修改上追加，其他窗口改动保留。
- 改动：components/chat/chat-room.tsx、styles/chat-sp.css、lib/chat-storage.ts、lib/group-chat-engine.ts；新增 lib/group-director-note.ts。
- 线上标题改导演旁白，文本独立提交，不调用handleSendText/user发送插件；SP也显示标题。线下同样开放旁白，传入历史和保存回合的userContent始终为空，不显示假用户气泡。富媒体、语音、贴纸、@参与入口仍锁定。
- pendingGroupDirectorNote仅存会话元数据。生产共享群提示组装器在围观group_chat中注入system指令，开场/续聊、在线/线下及自定义预设均生效；普通群/独立自定义APP不注入。强调第一人称也不是用户台词，不改变成员/知识边界。群说明继续作为长期背景。
- 失败/停止保留待用指引；空白重试沿用尚未完成的指引。成功保存角色结果后才按指引ID清除，防止误清新指引。超过4000字拒绝且保留草稿，不静默截断。完成后的普通重roll不会重新执行已消费指引。
- 记忆与跨群上下文不读取该字段；只保留实际生成的剧情，旁白不会成为role:user来源。这阻断错误身份的数据链路，但不能保证真实模型永远不违背指令。
- 检查：限定聊天类型检查；check-group-director-note.cjs存储/消费/真实输入处理/线下空用户历史；check-group-spectator-context.cjs生产提示组装线上线下system身份/普通群隔离；check-chat-empty-send.cjs隔离React触控，导演有字/空白及SP标题可见。未调用真实模型、未操作用户浏览器数据。
- 待验收：手机三个预设输入及真实模型理解；目前不宣称真实模型通过。
- 未commit/push。局部UI保留版本位于components/chat/versions及styles/versions，不纳入自动提交。
