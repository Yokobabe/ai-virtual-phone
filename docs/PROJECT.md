# Float 定制项目 · 新窗口从这里开始

更新：2026-09-14。此文件是共享接续入口，不代表所有历史功能均通过真机验收。

## 核心指令：模型输入与用户说明分离

给 AI 模型写预设、提示词、世界书或生成规则，必须专业、精准、高效：围绕用户目的，只写模型完成任务需要的目标、上下文、判断与执行规则、输出协议；消除重复，节省 token。严禁把给用户看的免责声明、效果或兼容性解释混入实际注入。与用户交流可以详细解释，用户说明文档与模型执行版本分别维护。交付前核对真正的请求路径，用户要求查看时展示实际注入原文。完整要求见 `AGENTS.md` 的核心指令。

## 工程身份

- 工程协作要求：主动把用户的产品规则转成可实施的数据模型、接口、兼容与验收方案，核对现有链路及第三方用例，不只逐条改代码；完整要求见 AGENTS.md。

- 本机主仓库：`C:/Users/Effy/Documents/Codex/ai-virtual-phone`。
- GitHub：`Yokobabe/ai-virtual-phone`；定制集成分支：`feat/imessage-private-chat`。
- 2026-09-14 本地核对 HEAD：`5efb728`，`feat(chat): add avatar memory, group mentions and echo effects`；此前已推送。开始新任务仍须重新查 git 状态。
- 线程输出目录 `C:/Users/Effy/Documents/Codex/2026-08-23/link-dom-css-x20` 不是主仓库，不要误当成项目根目录。
- 本地统一验收：`http://192.168.101.2:3003/`（局域网地址可能随网络变化；本次未检查服务是否在线）。
- 在线分支验收：`https://feat-imessage-private-chat--ykvisual.netlify.app/`。不要擅自发布到 main 或替换其他项目。

## 共享资料

- UI 默认规范：新增功能沿用统一 Apple / iOS 材质、圆角、文字层级与系统日夜模式；除非用户另有明确风格要求。参考本机 `C:/Users/Effy/Downloads/ios27kit`，实施前读相关设计 skill，验收涵盖控件展开态。具体约束见 `AGENTS.md`。

- `AGENTS.md`：新任务协作约定。
- `docs/TODO.md`：精简待办与状态。
- `docs/pixel-world-todo.md`：像素世界定位、已验证能力与分阶段待办；美术可行性实验已按用户决定结束，下一步建议补世界与互动结构。
- `docs/float-customization-ledger.md`：详细历史、设计选择和回归记录。开头的归档说明优先于早期阶段性状态。
- `docs/handoffs/`：每个任务单独写交接；文件在首次交接时创建。

## 已交付基线与边界

- 2026-10-03 身份隔离已接入：全局 ID 决定整部手机私有数据空间，角色档案/资源/外观共享，角色专绑多选控制互动；最后身份删除生成新默认卡。测试、恢复、云部署及验收边界见 `handoffs/2026-10-03-identity-isolation-integration.md`。历史“未接入”及“删空不补默认卡”不再是当前实现。

- 最近归档包括角色头像历史/换回、群聊 char-to-char Tapback、群头像尺寸与 @ 候选、文字 Echo 回声特效。
- Echo 最终交互是长按发送键 2 秒发送；短按普通发送；完整排队播放、长句减少密度、重播在气泡菜单中。不要恢复历史预览/拖动图标版本。
- 角色可以换同款、抢头像或拒绝；事实同步与能力提示交给代码，决定交给角色模型。
- 多选图片与叠图已在 `9d1ac2f` 实现，当前处于真机交互和标记稳定性验收阶段；后续修复见 `docs/TODO.md` 与对应 handoff。
- 用户计划进行一周沉浸验收，再讨论下一轮；本次仅建立项目文档，不启动功能开发或定时任务。

## 网易云服务（独立项目）

- 用户另行 fork `Yokobabe/api-enhanced`，在 Vercel Hobby 部署；与 Netlify 上的小手机不是同一个工程。
- 2026-09-13 匿名搜索返回 200、跨域允许在线分支源；未验证用户 VIP 实际播放。不把连接成功视为所有歌曲可播。
- API 地址由用户在音乐设置里按设备保存，不硬编码到分发版本；为减少公开曝光，本文件不记录私人实例域名。
- 当前没有自定义访问密钥输入/鉴权。CORS 不是访问控制；公开 GitHub 部署记录可包含部署域名。用户知情后选择暂时保持现状，未授权本次加锁或改部署。
- 已发现音乐客户端将 Cookie 放在 URL 参数中的风险；后续是否改造另行确认。不得收集或输出用户 Cookie。
- 仍保留本机独立 API 服务（原端口 3004），不因整理文档而停止或修改。

## 多窗口使用

1. 在 Codex 添加现有本地文件夹，选择上面的主仓库；显示名可叫“Float 定制”。本次工具无法完成侧栏项目登记，需要用户操作。
2. 讨论/只读任务可读取同一份代码和 MD；同目录文件共享不等于聊天历史自动共享。
3. 同时开发不同功能优先独立 worktree，明确从 `feat/imessage-private-chat` 开始，而不是默认 main。副本隔离可避免即时覆盖，但最终仍可能需要解决合并冲突。
4. 本次新增文档尚未提交。另建 worktree 前需经用户授权提交这些指定文档，或明确只复制这些文档；不要夹带现有未提交功能文件。
5. 各任务报告分支、改动和检查结果，经用户批准整合到定制分支，再用 3003/在线分支统一验收。

新窗口开场可以写：

> 这是 Float 定制项目。先读 AGENTS.md、docs/PROJECT.md、docs/TODO.md，检查当前分支与未提交改动。本窗口只处理【任务】，不要动其他任务，也不要自行 push。

## 当前工作区注意事项

2026-09-14 整理前发现已有变更：历史 ledger、middleware.ts、supabase/functions/weixin-assistant/index.ts、tsconfig.json，以及 qa/、share/、scripts/check-share-char-self-avatar-plugin.cjs。未判定全部归属，本次不改、不删除、不提交这些内容。

技术栈为 Next.js 15 / React 19 / TypeScript；命令以 package.json 为准。相关回归脚本包括 scripts/check-group-mentions.cjs、scripts/check-chat-echo.cjs、scripts/check-echo-send-gesture.cjs、scripts/check-imessage-interactions.cjs。先阅读脚本运行要求，避免误用真实账号数据。过去完整类型检查存在 world-builder 的 meshoptimizer/three-stdlib 缺依赖，需重新核对，不能声称当前全绿。

参考：[Codex worktree](https://learn.chatgpt.com/docs/environments/git-worktrees)、[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
