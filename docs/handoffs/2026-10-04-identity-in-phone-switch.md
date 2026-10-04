# 身份切换在手机内部完成

## 需求与基准

- 用户授权优化身份切换：外层网页保持原位，手机内部准备新身份，直接进入其桌面，不重复启动页。
- 分支 `feat/imessage-private-chat`，基准 `c3cd2d3`。已有记忆改造、桌面/组件等其他窗口未提交内容保留；未合并 main、未清除用户数据。
- 原有唯一 ID、私有命名空间、专绑权限、编辑与切换的区别保持。

## 实现

- `lib/phone-session-protocol.ts`：可取消的内部重建事件；没有手机宿主的独立工具保留冷刷新兜底。第三方应用的 iframe 不接入此宿主协议。
- `components/phone-session-host.tsx` / `.module.css`：第一次切换后，在同源 iframe 内创建独立手机运行环境；外层页面保留。后续替换同一层运行环境，校验消息源与 origin，按身份/版本去重，不叠套手机 iframe。复用现有手机壳显示加载/弱网重试；日夜、焦点与降低动态效果一致。
- `lib/identity-runtime.ts` / `identity-lifecycle.ts`：切换和删除完成、其他标签页的身份变化走内部重建。boot 身份仍不可变；旧任务取消、连接关闭、迟到写入拒绝、云暂停失败不切身份等边界保持，不能将旧回调重新绑定到新身份。
- `app/page.tsx` / `components/main-app.tsx`：接入宿主；内部恢复从服务端首屏即跳过启动动画，数据加载完成后进入桌面，初次正常启动保留原流程。移动端全屏请求作用于外层 document，避免再次切换卸载 frame 时退出全屏。参数只影响启动显示，不跳过 AccountGate 校验。
- `app/layout.tsx` / `components/identity-runtime-bootstrap.tsx` / `chat-plugin-bootstrap.tsx` / `lib/chat-plugin-runtime.ts`：退休身份卸载 DOM 控制器，停止插件注册资源与 cleanup；异步 setup 晚返回时立即清理、不恢复旧插件。MusicProvider 随旧手机卸载，沿用其音频暂停/资源释放。
- `lib/phone-session-viewport.ts` / `pwa-display-mode.ts`：内部手机继承外层 PWA 显示模式与设备安全区；将可访问样式表中的 safe-area 环境表达式映射为实测外层变量，保留 calc、fallback、优先级、媒体分支和动态样式。第三方 iframe 的宿主安全区协议保持。
- 运行区移除前显式退休、非 BFCache pagehide 时兜底清理安全区 probe 和外层 resize/pageshow/fullscreen 监听；iframe 卸载不能依赖 React cleanup，避免旧窗口被父窗口监听器留住。重复清理幂等。
- `components/desktop-shell.tsx`：仅增加宿主辅助导入及 Android 键盘 visualViewport 来源调整；其余原有未提交桌面改动保留。
- `lib/push-outbox-client.ts`：退休环境的消息/前台回调不再执行；宿主仅转发 SW 选定窗口的快捷指令，广播的来电/消息由新手机直接接收，避免双重转发。
- `components/settings/binding-manager.tsx`：选择当前身份直接结束，不进入切换忙状态。
- 外层 `open-app`、热启动 hash 入口转发到当前运行区；新身份不会带入旧身份冷启动来电参数。

## 检查

- 限定应用 TypeScript 检查：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`，通过。范围包含 app/components/lib，排除备份、实验临时目录与 Deno；不是完整发布构建。
- `scripts/check-identity-runtime.cjs`：真实 IDB/KV、生产模块，模拟云端；切换/删除内部事件被宿主消费，boot lease 不变、旧请求中止、迟到写入拒绝、同身份不重建、A/B 返回与删除边界、最后删除新默认卡、无宿主兜底均通过。
- `scripts/check-phone-session.cjs`：Chromium/WebKit 生产桥接模块；PWA 模式继承，合成 44/34px 与变化后的设备安全区，calc/important/媒体与动态样式、probe 清理、迟到插件 setup 清理均通过。
- 实际 3003 WebKit：独立合成 A/B/C 与 SDK 测试应用；A→B→A、跨标签页切换、外层 document 保持/无导航请求、不重复启动页、不叠套/重复运行区、当前身份重复选择无重建、旧应用 localStorage 与 SDK 数据隔离、320/390 日夜专绑选择器均通过。WebKit 测试等待新 iframe 实际桌面再取得 Frame，规避 about:blank 临时 Frame 的替换；测试应用按钮避开 Next 开发指示器。
- 实际 3003 Chromium 同一套检查通过；两种引擎也检查连续/跨标签页切换后安全区 probe 始终只有一个，无旧运行区累积。跨标签页测试在写入后关闭合成来源页、返回目标页，等待 SDK 脚本就绪再点击，避免后台临时 iframe 的加载/输入时机影响测试。
- 内部恢复页面实际服务端 HTML 不包含 Enter 启动按钮，校验通过。
- 所有浏览器数据为隔离临时 profile 的合成数据；拦截模型/API/外部请求。未用真实付费模型、TTS、用户账号操作或真实推送。

## 验收与状态

- 3003 保持原仓库、原端口和服务。用户手机待实测：A→B→A 不离开网页、不出现启动箭头，回到各自桌面，打开聊天/记忆可见各自数据；iPhone/Android 真机的键盘、安全区、音频与摄像头权限仍需设备验收。浏览器引擎检查不替代真机。
- 没有对真实账号推送、弱网账号校验、第三方任意绕过 SDK 的代码做付费/账号操作验收；使用原权限与 SDK 隔离协议。
- 首次正常打开仍在顶层手机环境；第一次切换后手机 UI 在 `iframe[data-phone-session]`。自动化应等待该 iframe 的实际桌面后选择其 Frame，外层 `open-app` 事件仍兼容。
- 改动前源文件已复制到相邻 `versions/*before-internal-identity-v1.bak`；恢复时只回退本任务差异，尤其不能整份覆盖其他窗口的 `desktop-shell.tsx`。
- 未 commit、未 push、未部署。当前优化不修改数据结构，不替换此前记忆或隔离检查点。
