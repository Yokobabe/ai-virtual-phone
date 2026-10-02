# 设置：预设选择菜单与Tapback入口

- 用户指出原生预设下拉框难看，并确认隐藏设置页的Tapback候选入口。
- 分支/基准：feat/imessage-private-chat / ddaddba；共享目录既有SP等改动保留，不切分支。
- 按pinpoint仅处理两处：新增components/chat/beauty-preset-picker.tsx，替换components/chat/chat-settings-panel.tsx中的原生select；styles/chat-settings.css只增加该菜单的局部样式。
- 圆角触发器/菜单、选中勾、44px选项、日夜变量；原三项及会话保存逻辑不变。details语义支持键盘，Escape/外部点击/焦点离开关闭，选择后焦点回触发器。
- 移除Tapback候选设置行，保留底层数据、原编辑组件和反应栏的原位自定义逻辑；独立设置页没有入口，不删除已保存候选。
- scripts/check-chat-sp.cjs改用真实新菜单切换并验证隐藏入口、Escape/外点关闭，以及既有SP/玻璃/经典回归。
- 检查：当前源码TypeScript通过；隔离浏览器SP全回归通过（日夜、320/390/430、预设切换、功能隔离）；实际菜单截图已检查。不调用模型，不改用户浏览器数据；手机待验收。
- 备份：components/chat/versions/chat-settings-panel.preset-picker-v1.tsx.bak、styles/versions/chat-settings.preset-picker-v1.css.bak。
- 未commit/push/部署。
