# 角色自主修改私聊备注与群名交接

日期：2026-09-16
分支：`feat/imessage-private-chat`
基准：`5024eec fix(chat): refresh avatar context and restore offline controls`

## 需求

- 私聊角色可以自主修改自己在用户手机里的备注。
- 群聊成员可以自主修改当前群聊名称。
- 角色模型保留是否修改、改成什么的决定权；代码只提供当前事实和真实动作能力。

## 实现

- 新增 `[修改备注:新备注]` 与 `[修改群名:新群名]` 两个富媒体动作协议。
- 私聊提示会提供当前备注；群聊提示会提供当前群名。角色决定实际修改时必须输出协议，不能只在文本里声称完成。
- 新增 `lib/chat-rename-action.ts`：清洗并限制名称长度，校验私聊角色所有权、群成员身份，更新 `ChatSession.alias` / `ChatSession.groupName` 并写入简短系统式播报。
- 普通私聊、普通群聊、流式群聊和后台主动消息均会执行动作；只输出改名动作也算作有效回复。
- 名称变更事件进入后续历史，角色能知道现名和此前变更。

## 检查

- `scripts/check-chat-rename-actions.cjs`：通过。覆盖中英文冒号解析、实际持久化、活动会话同步、越权拒绝、前台/流式/主动消息接线和提示注入。
- `scripts/check-chat-multi-photo.cjs`：通过。
- TypeScript：本轮无新增类型错误；完整检查仍只有仓库既存的 `meshoptimizer`、`three-stdlib` 三条 world-builder 缺依赖错误。
- 仍需真机用真实角色模型确认改名频率和措辞自然；本轮不替角色强制选择名称。

## 提交状态

- 已获用户授权与多图/照片标记功能一并提交并推送至 `feat/imessage-private-chat`；未单独部署，Netlify 分支部署状态以平台结果为准。
