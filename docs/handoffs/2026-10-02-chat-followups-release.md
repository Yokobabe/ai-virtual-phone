# 聊天后续修复提交推送

- 用户授权：本轮聊天改动 commit + push，明日统一真机验收，不提前标记验收通过。
- 分支/基准：`feat/imessage-private-chat` / `2f60500`。此前已本地提交的 SP、绘图、重试、回声版本随本次推送一并到远端。
- 范围：聊天文本/双语排版与短气泡末尾逗号兜底、线上标点与长短表达提示、群聊围观在场隔离/群说明/非好友候选/导演旁白/合法邀请指令/多角色往返、空发送推进、SP 引用及加号、删除 PWA 顶部实验。
- 产品文件：六个 chat 组件（message-list/room/settings/group-create/message-bubble 与删除的 pwa 实验）；lib 的 bilingual-prompt-defaults/bilingual-text/builtin-preset/chat-engine/chat-storage/group-chat-engine/llm-prompt-assembler，以及 chat-cadence/chat-text-layout/group-dialogue-flow/group-director-note/group-spectator-context；styles/chat-sp.css 和 imessage26.css。
- 排除：桌面、小组件、像素世界、头像插件、微信云服务、middleware、tsconfig、缓存、临时文件及 versions 备份。其他未提交改动保留；不操作 main。
- 检查：cadence、director-note、spectator-context、group-dialogue-flow、empty-send、SP quotes/plus rollback、chat-text-layout 回归通过；限定应用源码 TypeScript 检查通过。隔离浏览器不使用用户数据或真实模型。手机及模型实际遵从留待用户验收。
- 提交/推送结果以本轮 Git 输出与远端 SHA 核对为准；不另行请求部署或调用付费服务。
