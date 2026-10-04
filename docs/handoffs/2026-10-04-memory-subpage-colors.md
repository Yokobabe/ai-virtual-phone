# 记忆子页面颜色统一

日期：2026-10-04。分支 `feat/imessage-private-chat`；基准 HEAD `c3cd2d3`。用户要求记忆内所有子页及功能键与已验收头像色卡统一。本次只改 UI 颜色，保留原有未提交改动。

## 行为

- FACTS（短期／长期／共同经历）、CORE、LIST、MIRROR、GAZE 的按钮与内容卡片采用对应入口的头像色板；正文保留日夜主次灰。原有白色／深色页面背景、五层入口和第一层头像横幅保持。
- 整理更新、事项操作、新增与保存、空页新增、更多菜单、共同经历入口、时间线来源标签／记录气泡／加载按钮、原话依据线条、条目标签与编辑弹窗统一颜色。
- 设置里的总结／重建按钮、来源选择（选中与关闭）、开关、滑杆、提示词保存、图标与底部弹层采用同一色系。角色设置使用该 char 档案头像；无角色／无头像的页面使用原默认蓝／奶白色板。
- 第一层置顶弹窗也使用默认记忆色系；未改变身份头像、角色横幅、长按、排序或存储。删除／清空／恢复默认等危险操作继续保留原警示色。
- `MemorySurface` 通过 `display: contents` 提供局部颜色变量；未写 document/root 的全局主题。共用组件的样式只在该局部作用域覆盖，其他应用与真实聊天气泡不受影响。
- 将上轮头像取色 React hook 提取为 `useMemoryPalette`，入口与子页共用，继续遵循头像源匹配、缓存、晚到请求保护与系统日夜。取色算法本身不变，不增加模型调用。

## 文件

- 新增 `components/memory/memory-surface.tsx`、`memory-surface.module.css`：共享取色 hook、局部色板与控件样式。
- `components/memory/memory-bank-page.tsx`：详情／设置／列表接入局部主题、设置图标去掉固定业务色；生成、存储、事件处理逻辑保留。
- `components/memory/memory-garden.tsx`：入口复用共享 hook。
- `components/memory/memory-garden.module.css`：Facts 选中态、认知按钮／内容、证据线与焦点颜色。
- `components/memory/memory-timeline.tsx`：REPORT 装饰标签改为主题色，不再占用删除警示色；时间线解析不变。
- `scripts/check-memory-ui.cjs`：在既有独立浏览器回归里补充真实时间线、五栏子页、编辑／保存、来源展开／关闭、总结范围展开、设置滑杆焦点、默认回退及全局主题未被改写断言。
- 修改前快照见 `components/memory/versions/`：`memory-bank-page.before-subpage-colors-v1.tsx.bak`、`memory-garden.before-subpage-colors-v5.tsx.bak`／`.css.bak`、`memory-timeline.before-subpage-colors-v1.tsx.bak`。
- `docs/TODO.md`、本交接。

## 验证与边界

- 限定源码类型检查通过：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`。不等同完整构建。
- `node scripts/check-memory-ui.cjs`：3003 实际 React 页，320／390 日夜；按钮与对应栏色板一致、普通按钮文字对比度 ≥4.5；真实时间线气泡、编辑／保存弹窗、来源开关展开、总结范围、设置焦点与窄屏、删除警示、默认回退及 document 全局主题不变；原排序／长按／置顶／键盘／导航／证据／A-B 隔离回归保留。使用全新浏览器合成资料，模型 API 与外部请求拦截；不点击真实总结／重建，不改用户数据。
- 已查看日夜子页、编辑弹窗和 320px 来源／设置截图；实际设备仍待用户验收。
- 11 个底层文件 SHA256 与开始前一致：记忆认知／总结／服务／存储／类型／prompt 组装／核心构建／置顶存储、公共头像取色／聊天气泡配色、记忆入口取色算法。未修改模型指令与记忆规则。

3003 服务保持原进程／端口，未 commit／push／部署。可在原验收入口的资源库 → 记忆库查看；本轮不开展其他待办。
