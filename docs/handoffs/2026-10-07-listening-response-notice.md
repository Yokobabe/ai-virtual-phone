# 一起听回应使用状态提醒

- 分支/基准：feat/imessage-private-chat / 8de5fb7；未提交、未push。
- 用户要求：接受邀请等操作结果不伪装成 user 发言。
- lib/listen-together.ts：接受/暂不接受产生 system 状态消息，复用聊天室居中提醒；保留邀请卡状态、播放连接、角色回应事件。音乐分享手写附言不受影响。
- scripts/check-listen-together.cjs：增加接受/拒绝提醒角色与内容断言；全组离线回归通过，未调用真实模型。差异空白检查通过。
- 未操作真实邀请或进行真机验收。已存的旧 user 回应不批量改写；新操作使用系统提醒。
