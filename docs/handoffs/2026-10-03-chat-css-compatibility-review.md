# 聊天美化兼容性诊断

- 需求：检查原版美化兼容性，评估经典预设打底、外部 CSS 局部覆盖。仅诊断，未授权实现。
- 分支/基准：feat/imessage-private-chat，HEAD 3f76c07；比较本地 main 784c238，不代表最新上游。
- 保留原有未提交改动；只新增本交接并更新 TODO。
- 仍保留 session 作用域、SessionCustomCSS、chat-msg-wrapper、chat-bubble-role-user/assistant、chat-input-bar、data-ui 等主要入口；CSS 注入器及 scoper 相对本地 main 无提交差异。
- 差异：所有经典/玻璃/SP 聊天仍带 data-imessage-private。输入框、顶栏、引用结构已变化；普通气泡增加 imessage-bubble-surface 子层，imessage26.css 102-103 强制外层背景透明及禁用外层 before。仅覆盖旧外层背景或尾巴可能失效。
- 结论：用户提出的按属性覆盖、未写属性保留基础预设可行；当前不能保证原版主题直接兼容。后续需明确可覆盖优先级、原版选择器与视觉层映射，避免全局关掉新增层或全局追加 important。
- 验证：静态代码比较；未提供具体外部主题，未浏览器/真机验证，未代码修改、commit/push/部署。
