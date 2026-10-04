# 个人主页隐藏内部身份 ID

日期：2026-10-04。分支：feat/imessage-private-chat；基准：f82bf66。

需求：身份 ID 只用于内部识别，不在个人主页展示。
改动：components/chat/user-profile-panel.tsx 删除 ID 文本行，头像/名字/统计和内部 userId 不变；docs/TODO.md 记录完成。修改前副本保存在 components/chat/versions/user-profile-panel.before-hide-id.2026-10-04.tsx。

验证：源码差异仅删除展示行，TSX 转译与差异检查通过；浏览器/真机未验收。没有新增控件或修改日夜主题。未 commit、push 或部署；其他未提交内容保留。
