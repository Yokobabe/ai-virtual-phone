# 钱包币种选择器与统一设计约束

- 需求：修正钱包新增原生下拉框，后续新增 UI 默认按统一 Apple 风格，用户指定风格时例外。
- 分支/基准：feat/imessage-private-chat / 3f76c07；保留现有未提交改动。
- 参考：本机 ios27kit 的 Clear、Regular Small、Light/Dark SVG 材质；读取 pinpoint、emil-design-eng、design-lib。
- 改动：components/chat/wallet-panel.tsx 用可折叠设置行与自定义圆角菜单取代 select；十个币种、选中勾、限制高度滚动、外部关闭、Escape 焦点恢复、系统日夜。兑换逻辑保留。版本备份 components/chat/versions/wallet-panel.currency-picker-v1.tsx.bak。
- scripts/check-wallet-currency-ui.cjs 检查自定义菜单展开态、10 个选项、USD 选中与 320/390/430px 日夜；隔离截图已查看。该 fixture 使用简化外部布局 CSS，不能代表实际钱包完整页面美化；未操作真实钱包或联网兑换。
- AGENTS.md、docs/PROJECT.md 固化用户要求，docs/TODO.md 登记验收。
- 遗留：真实页面、键盘事件的客户端运行与真机验收。无付费调用。未 commit/push。
