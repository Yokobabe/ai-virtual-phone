# 四项聊天问题修复

基准：2026-09-14，feat/imessage-private-chat，HEAD 5efb728。已完成本地实现与静态/脚本回归；未调用真实角色 API，真实模型与真机效果仍待验收。用户已授权将本任务指定文件 commit/push，结果以 Git 记录为准。

## 原因与实现

1. 当前头像事实：新增 `lib/chat-current-avatar-context.ts`。每次在线回复组装提示时重新读取 user、当前私聊角色、与其有明确一跳关系的角色，或当前群聊参与者的头像。按会话保存上次快照，用于告知谁自上轮以来换过头像。当前状态明确覆盖旧候选和历史描述；只有本轮实际附带的当前头像图片才允许描述画面。开启视觉时复用现有图片压缩/解析通道，关闭视觉时只提供是否有头像与是否变化的事实，禁止猜图。角色是否主动评论仍由语境决定。
2. 群聊线下入口：移除 `plusMenuItems` 对群聊的排除，复用已经存在的 `generateGroupOfflineChatCompletion` 分支，不改变线下引擎。
3. 线下横排：给线下输入栏增加 `data-offline-input`，把 iMessage 的 `display: contents` 规则限制到在线输入栏，并为线下三个功能键明确恢复横向 flex。
4. 拍一拍：确认通知事件没有“强提醒”专用等级；新增动态使用规则，明确它只是轻微、可选的社交动作，不是催回复或固定吸引注意手段。整轮最多一次；近期历史已有拍一拍时，本轮默认不再使用，仅保留用户明确要求或全新且自然情境的角色判断空间。

## 改动文件

- `components/chat/chat-room.tsx`
- `styles/imessage26.css`
- `lib/chat-current-avatar-context.ts`
- `lib/chat-engine.ts`
- `lib/group-chat-engine.ts`
- `lib/chat-tapback.ts`
- `scripts/check-current-avatar-context.cjs`
- `scripts/check-offline-and-poke-fixes.cjs`

## 验证

- `node scripts/check-current-avatar-context.cjs`：PASS，覆盖私聊本人/user/明确关联角色、群成员范围、无关人物隔离、头像变化检测、附视觉与无视觉的不同表述。
- `node scripts/check-offline-and-poke-fixes.cjs`：PASS，覆盖群聊入口、线下横排选择器、拍一拍非强提醒与近期冷却规则。
- `node scripts/check-chat-avatar-action.cjs`：PASS，既有头像动作、连续多轮、同款与历史换回无回归。
- `node scripts/check-imessage-interactions.cjs`：PASS，既有 Tapback 交互无回归。
- `git diff --check`：无空白错误，仅有工作区 CRLF 提示。
- `tsc --noEmit --pretty false`：本次文件未产生新报错；全量仍被既有 `meshoptimizer`、`three-stdlib` 缺依赖阻断，不能称全项目类型检查通过。
- 3003 后端已恢复：首页编译成功、HTTP 200、页面脚本 HTTP 200 且包含本次线下输入栏标记。自动浏览器打开超时，未完成界面交互验收。恢复过程见 `2026-09-14-preview-recovery.md`。
- 未做 iPhone 真机、真实模型头像识别、群线下生成和实际拍一拍频率验收。

## 遗留验收

- 刷新 3003 后检查群聊加号菜单含“线下模式”，进入后可发送、重生成和返回。
- 私聊/群聊线下输入栏在手机宽度下三个功能键保持横排。
- 更换 user、当前 char、同群 char 头像后发起下一轮，核对模型只描述最新头像；视觉关闭时不得编造内容。
- 连续对话观察拍一拍频率。当前采用提示层冷却而非硬编码禁用；若实际模型仍滥用，再基于复现记录决定是否增加动作解析层硬限频。

## 工作区边界

本任务没有改动像素世界、middleware、Supabase、tsconfig、share、qa 或历史 ledger；这些文件的现有变化属于其他工作，不纳入本任务提交。共享 TODO 保留本地更新，待多窗口集中整合。
