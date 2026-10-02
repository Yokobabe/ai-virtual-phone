# SP 未读数量胶囊

- 用户要求将只有圆点的 SP 未读提示改为实际数量胶囊。
- 分支 `feat/imessage-private-chat`，HEAD `ddaddba`；保留共享未提交改动，不 commit/push。
- `components/chat/sp-chat-header.tsx` 去掉 dotOnly，复用已有其他会话未读数汇总与已读更新事件，不更改统计逻辑。
- `styles/chat-sp.css` 对齐 NJJ：16px 高蓝底白字胶囊，9px字/650字重，跟随返回箭头水平排列；返回按钮按数量自然增宽。
- 0 未读隐藏，1–99显示数字，超过99显示99+；经典/玻璃不改。
- 编辑前备份 sp-chat-header.unread-v1.tsx.bak 与 chat-sp.unread-v1.css.bak。
- 隔离真实 ChatRoom 回归：3、12、123→99+、0隐藏、320/390/430顶栏不越界、原SP其余功能与经典/玻璃切换通过；截图已查看。测试只使用一次性浏览器数据，不触发模型。
- 当前源码类型检查通过；真机待用户验收。
