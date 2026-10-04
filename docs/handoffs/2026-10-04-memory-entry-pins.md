# 记忆入口精简、排序与置顶

日期：2026-10-04。分支：`feat/imessage-private-chat`；HEAD：`c3cd2d3`。叠加在尚未提交的记忆入口/认知实现上，保留其他工作区变更。

## 需求与最终行为

- 第一层 header 改为 Memory · Link，主页面不再重复品牌标题。
- 当前用户身份区保留头像、名字；删除说明小字和三个仅装饰的 SVG。角色内栏目页面、其他页面标题不变。
- 默认根据现有展示计数（短期＋长期＋核心）降序排列；置顶组排在前面，组内也按记忆条数降序，相同数量保留原有稳定顺序。异步计数补齐时重新排序。
- 卡片按住 500ms 打开操作弹窗：置顶／取消置顶。桌面右键及键盘 Shift+F10/ContextMenu 键可打开相同菜单；单击/回车仍进入角色记忆。
- 位移超过 10px、离开、取消、多触点或组件卸载会取消长按计时。兼容长按松手产生的点击，避免误入详情、误关闭菜单或误执行操作。
- 弹窗支持 Escape、Tab 焦点循环与关闭后回到卡片；使用项目现有 ContentDialog 视觉及日夜材质。成功保存后排序更新，失败显示反馈。
- 置顶只保存稳定 charId 列表。通过现有 KV 身份机制保存到当前用户私有空间，同一 char 在另一 user 下不继承置顶；删除身份的既有私有 KV 清理覆盖该键。权限仍来自原可互动角色列表，置顶不扩展权限。

## 改动文件

- `components/phone-resources-app.tsx`：第一层 header 文案/字样。
- `components/memory/memory-garden.tsx`：身份区精简、排序、长按菜单及键盘/点击兼容。
- `components/memory/memory-garden.module.css`：身份区间距、置顶标记、弹窗容器和夜间变量。
- `lib/memory-entry-preferences.ts`：新增 UI 私有置顶 KV 配置，逻辑键 `ai_phone_memory_entry_pins_v1`。
- `scripts/check-memory-ui.cjs`：三角色不同计数、排序/置顶与触屏回归。
- `docs/TODO.md`、本交接。

按 pinpoint skill 要求，修改前局部快照保留在 `components/memory/versions/`：memory-garden.before-pins-v1.tsx.bak、memory-garden.before-pins-v1.css.bak、phone-resources.before-memory-header-v1.tsx.bak。不是自动提交或回退。

## 验证

- 限定类型检查通过：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`；范围 app/components/lib，排除 Deno functions、备份和 tmp，非全仓库生产构建。
- 3003 实际页面独立浏览器回归：默认 3/1/0 条顺序、0 条角色置顶优先、取消后恢复降序、触屏长按后松手仍留在菜单、触屏移动取消、键盘菜单/Escape/焦点返回/Tab、刷新持久化、A 置顶不出现在 B、320/390 系统 light/dark 列表和窄屏夜间菜单边界。原五栏目、Facts 切换、分层返回、证据、事项持久化与身份认知隔离继续覆盖。
- 开展截图视觉复核：`tmp/memory-characters-390-light.png`、`tmp/memory-characters-320-dark.png`、`tmp/memory-pin-dialog-390-light.png`、`tmp/memory-pin-dialog-320-dark.png`。弹窗截图等待入场动画完成；夜间背景为 rgba(39,40,53,.96)、opacity 1。
- 早期浏览器检查暴露长按松手的兼容点击和弹窗语义容器零高度，已修复并通过真实 touchStart/touchEnd 回归。
- 开发环境已有大 JS chunk 偶发传输/热编译异常，本轮也捕获 layout.js 的 Invalid token。测试改为先取得 HTTP 200，再完整缓冲本地 chunk、校验 JS 语法后交给浏览器；语法失败最多读三次仍失败则测试失败，运行时错误断言保留。该措施仅在测试浏览器，不改变 3003 服务、构建配置或用户浏览器。
- 使用新浏览器及合成数据，不读写用户浏览器存储；阻断外网/API，不调用付费模型、TTS。
- 修改前后 SHA-256 比较确认 7 个记忆底层文件完全相同：memory-cognition、memory-summarizer、memory-service、memory-storage、memory-types、llm-prompt-assembler、core-memory-builder。本次 UI 配置不参与模型请求。

## 状态

真机触摸与实际个人头像仍待用户验收。记忆认知规则的真实聊天验收继续保留原待办。本次未 commit、未 push、未部署，未启动其他任务。
