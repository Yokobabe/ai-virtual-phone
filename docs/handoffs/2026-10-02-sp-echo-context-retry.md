# SP回声/底部菜单、玻璃菜单与重试指导

- 分支/基准feat/imessage-private-chat / ddaddba。共享目录原SP/绘图等改动保留。
- 用户要求：SP回声无尾巴；底部气泡能长按打开菜单；玻璃子菜单可读；重试先填写指导，并送入下一轮AI上下文。
- lib/message-effects/capture.ts：DOM保留尾巴标记但SP CSS隐藏，截图层此前仍照标记画尾巴；两种截图函数对SP禁用尾巴。数量、尺寸归一化、动画轨迹及时间均不改。
- styles/chat-sp.css：SP滚动区底部增加输入栏预留，末条消息不会被常驻输入区覆盖。原焦点菜单自动移位仍使用原逻辑。
- components/chat/use-glass-contrast.ts与styles/imessage26.css：局部采样包含反应栏/动作菜单，分别提供浅面深字/深面浅字，去掉固定白字阴影。普通/SP菜单原材质不改。
- 新增components/chat/retry-guidance-dialog.tsx、lib/chat-retry-guidance.ts；chat-room.tsx只接入重试目标、弹窗及指导上下文。
- 点击“重试一下”仅打开弹窗，不删消息或调用模型；取消不改历史。确认后沿用原“所选及之后重生成”语义，指导可留空，最大2000字。
- 指导以仅请求内system_instruction消息附于截断后的上下文；不持久化、不假装用户对角色新说话。私聊、群聊共用受管理生成路径，线下重试也使用同一辅助函数；生成中在线重试先拒绝，避免删历史。
- dialog使用当前预设变量，SP蓝色确认键，圆角表面；焦点进入、Tab限制、Escape/取消关闭。没有新增模型调用或自动重试。
- 检查：当前源码TypeScript通过；check-chat-context-retry.cjs隔离浏览器通过（真实底部长按/菜单边界、SP两种截图无尾且同尺寸、玻璃日夜字色、弹窗取消不删历史、临时指令与长度）；check-echo-size.cjs通过，保持已验收尺寸。新增截图已检查。
- 真机长按/键盘/角色如何遵守指导待验收，不调用真实付费模型、不使用用户浏览器数据库。
- 备份：chat-room.context-retry-v1.tsx.bak、imessage26.context-retry-v1.css.bak、capture.sp-tail-v1.ts.bak（各自versions目录）。
- 未commit/push/部署。
