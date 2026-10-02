# 围观群：在场边界、幕后群说明与非好友成员

## 需求与基准

- 用户确认“不在场”不等于不能引导。角色自行推进，但操作者可通过仅模型可见的群说明左右背景/气氛/走向；不能冒充群内发言或让角色意识到围观者。
- 围观群建群允许选择未加好友的已有角色；普通群聊仍限好友，不自动创建好友关系。
- 分支 `feat/imessage-private-chat`，基准 `2f60500`。共享目录原有文字排版及其他窗口修改保留。

## 实现

- `lib/group-spectator-context.ts`：固定会话事实与自主推进要求，分别处理开场/续聊、线上/线下。用户资料/跨会话记忆不代表在场。另提供幕后说明指令，角色不知其存在，不照抄，不把新指引当成已发生的历史。
- `lib/group-chat-engine.ts`：围观事实在组装前及请求末尾强化，独立于内置/自定义预设；围观群不追加假user空生成续写。线上/线下共用。群说明作为系统指令追加，不新增API调用。
- `lib/llm-prompt-assembler.ts`：用户背景资料保留但明确为未在场人物；普通群聊未开启围观时不改变原有persona。
- `lib/chat-storage.ts`：可选groupDescription随会话持久化，4000字上限，不产生聊天消息；无字段的旧会话无需迁移。
- `components/chat/group-create-modal.tsx`：选成员阶段可开启围观，候选从好友扩为已有角色，标注未加好友；切回普通模式清理非好友选择。名称阶段新增群说明表单，沿用原组件/配色，无新动画。
- `components/chat/chat-message-list.tsx`：建群回调传递说明；开群通知仍仅角色名单。
- `components/chat/chat-settings-panel.tsx`：群聊管理新增群说明编辑与保存，下轮生效，不立刻触发模型/发送群公告。
- UI采用Emil技能的清晰标签与说明、复用现有控件原则，未重做顶栏/功能键/特效。

## 检查

- `scripts/check-group-spectator-context.cjs` 通过：执行真实生产builder、persona注入片段与createGroupSession，数据/外部服务替身隔离；自定义预设缺围观条目、线上/线下×首轮/后续、末尾会话事实、无假user续写、正常群聊和独立custom-app原路径、幕后说明与持久化。
- `scripts/check-group-create-spectator.cjs` 隔离React浏览器通过：普通好友候选、围观非好友选择、说明传入回调、切回普通移除非好友、320/390/430输入不溢出；截图tmp/group-create-spectator.png已查看。
- TypeScript `tsc --noEmit -p tmp/tsconfig-approved-effects.json`：前轮检查通过，最后增补复查结果以运行输出为准。
- 没有真实模型/TTS调用，没有修改真实账号/浏览器存储或建立实际好友关系；手机与真实模型的剧情自然度仍待验收。

## 边界与状态

- 非好友候选是已有Character档案，并不临时生成尚未创建的世界NPC档案。
- “选面具发言”用户仍在考虑，不实现借角色身份发言/夺舍；当前用建群说明及设置编辑提供幕后入口。
- 自定义预设可有矛盾文案，新增会话事实明确其通用user参与规则对围观场景不适用，不重置/覆盖用户预设。模型遵循效果待真机实际测试。
- 说明不会作为角色消息或群公告发送；模型可能自然实现其中的情节，不能承诺输出永远不会泄露提示内容。
- 未commit/push/部署。
