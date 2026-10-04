# 记忆页面色板、分类布局及图形精修

日期：2026-10-04。分支：`feat/imessage-private-chat`；HEAD：`c3cd2d3`。叠加在本窗口已有未提交的记忆功能/UI 上，不改变其他任务文件。

## 本轮需求与设计

用户要求统一 iOS 字体色、拉长头像渐变、改善分类页 SVG，并补充两张参考：第一张粉白绿配色，第二张左侧小方块＋右侧文字卡布局。本轮采用第一张配色与第二张结构，实际字体保持清晰的 iOS 灰色层级。

- 色板：Cherry Blossom `#F0B3BB`、Soft Blush `#F9DADE`、Porcelain `#FAF8F2`、Ivory `#F7F9EA`、Honeydew `#DDECD9`。奶白/象牙作为背景，粉绿用于五栏目卡片；夜间转换为低亮粉绿材质。
- 主文字 `#1C1C1E`，次级文字 `#636366`；夜间主文字 `#F5F5F7`、次级 `#B1B1B8`。栏目标题减少过大字距，英文与说明改为统一系统字体层级，计数使用等宽数字。
- 分类入口由整条横幅＋左右重复线框，改为左侧独立方块＋右侧文字卡。各类只保留一个自绘双色图形：事实纸页、核心星光、未了清单、镜子立镜、凝视眼睛。图形统一 32px 画布，轻边缘高光，无新增图片资源/字体依赖。
- 角色列表保留头像横幅；图像区域从 46% 扩到 72%，使用多段 alpha mask 拉长过渡，移除原头像区域叠加的短白色遮罩。角色名字、身份、入口、计数与置顶行为保留。
- 原来装饰性粉紫正文改为主次灰，操作与模型规则均不变。

## 文件

- `components/memory/memory-garden.tsx`：栏目单图形绘制和两块式入口结构。
- `components/memory/memory-garden.module.css`：色板、字体层级、渐隐、栏目与夜间材质。
- `scripts/check-memory-ui.cjs`：增加五类单图形、不再重复 banner 和日夜主文字颜色验证，更新新背景断言；保留功能回归。
- `docs/TODO.md`、本交接。

使用 pinpoint/screenshot 渲染对照流程，参考本机 ios27kit 的 label 与材质文件（Secondary Label Color 为 `#3C3C43`、opacity .6）。变更前 UI 快照为 `components/memory/versions/memory-garden.before-pastel-v2.tsx.bak` 和同名前缀 `.css.bak`。

## 验证与运行状态

- 限定类型检查通过：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`，范围 app/components/lib，非全仓库生产构建。
- `node scripts/check-memory-ui.cjs` 通过：现有 3003 页面独立合成数据，320/390 系统日夜、五类单图形与主文字颜色、边界、事实导航、返回层级、触屏长按及滚动取消、置顶/取消/持久化/身份私有、原话依据与事项状态回归；未调用 API/TTS/外部服务。
- 实际页面渲染截图已查看：`tmp/memory-garden-390-light.png`、`tmp/memory-garden-320-dark.png`、`tmp/memory-characters-390-light.png`，确认布局、颜色与头像淡入连续性。截图是合成数据，不等同真机效果。
- 开始浏览器验证时 3003 无监听、原预览进程已不存在；确认端口空闲后在同一仓库恢复统一入口，`NEXT_DIST_DIR=.next-3003`、Node 8GB，监听 `0.0.0.0:3003`。本轮进程 PID 71548，日志 `tmp/memory-pastel-preview.out.log`/`.err.log`。未停止其他预览服务，未修改部署配置或清用户存储。
- 变更前后 SHA-256 对比确认 8 个底层文件完全不变：memory-cognition、memory-summarizer、memory-service、memory-storage、memory-types、llm-prompt-assembler、core-memory-builder、memory-entry-preferences。本轮不修改记忆生成、召回、存储、注入或置顶数据逻辑。

## 遗留与提交

真实头像、用户真机视觉和此前记忆规则效果仍待用户验收。未 commit、未 push、未部署；其他待办未开工。
