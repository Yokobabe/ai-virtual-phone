# 特效、玻璃与聊天细节发布

- 日期：2026-10-01。用户授权三个特效功能、玻璃升级、聊天细节修复一起 commit/push，其他不用。
- 分支/基准：feat/imessage-private-chat / dd4420509d39612a9bd37daeec6d17924524eff5；远端已用临时代理确认同一基准。
- 范围：Echo/Love/Fireworks 正式 Canvas 集成、队列/重播、协议/历史/场景快照，以及现有字号/近景/烟花亮度/语义调整；玻璃 v22、局部壁纸明暗、未读镂空数字、五条语音图标；引用可见语言与币种、头像取色、换背景不即时请求回复、照片 Tapback 朝向。
- 文件：components/chat 中本次相关文件、lib/chat-* 与模型/富消息/流式链路、lib/message-effects 六组模块、styles/imessage26.css 与 photo-editor.css、public/chat-bubble-contour-left.svg、相关 check 脚本；包含两份正式集成交接及本文件。具体名单以提交 diff 为准。
- 排除：像素小屋和桌面入口、share 换头像插件、versions、QA/tmp/缓存、协作总览和历史账本、next-env/tsconfig 本地配置；不改其他工作区内容。
- 检查：三特效实际 React 浏览器整链（协议/队列/快照/隔离/历史/减少动态/窄屏）通过；玻璃六种明暗组合、菜单、回声字号与烟花黑幕浏览器检查通过；引用、取色、特效语义、玻璃控件静态回归通过；当前 app/components/lib/types/middleware 源码类型检查通过。
- 已知未通过：check-echo-near-passes.cjs 对 320px 两行长句测得可读近景 1.95 秒，低于脚本 2.1 秒阈值。当前连续轨迹保留，未为发布擅改已存在视觉参数；不得宣称全部检查通过。
- 真机/iPhone FPS、Safari 与真实模型未验证。未调用真实付费模型或删除用户存储。
- Git 环境：使用运行时 Git 的 mingw64/bin GIT_EXEC_PATH；确认本机 7897 代理在线，只在本次命令临时传入代理，不改全局配置。
- 提交/推送：本文件随指定功能提交；完成后以 git log 与同代理 git ls-remote 的 SHA 核验为准。

- 发布副本复核：由精确暂存树导出独立副本，完整 tsc --noEmit --incremental false 通过；在此副本重跑三特效整链、玻璃浏览器、引用和取色回归通过，未依赖未提交的像素小屋/插件文件。3003 首页 HTTP 200。
