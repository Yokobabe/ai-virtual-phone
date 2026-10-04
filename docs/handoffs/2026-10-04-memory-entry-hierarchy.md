# 记忆入口层级与命名纠正

日期：2026-10-04。分支：`feat/imessage-private-chat`；HEAD 基准：`c3cd2d3`。本任务叠加在尚未提交的记忆认知第一版及其他工作区改动上，保留其他任务文件。

## 需求与边界

用户明确横幅参考属于记忆库第一层：顶部提示当前全局用户身份，一行一位 char，右侧使用该 char 头像。点击角色进入第二层，分为 Facts（短期、长期）、Core、List、Mirror、Gaze。上一轮模型规则尚未验收，本次只改页面，不调整总结、召回、注入、数据模型或身份隔离规则。

## 最终页面

- 第一层：Memory · Link、当前用户头像/名字及身份提示，下方角色横幅。直接点击进入，无需先选角色再点确认。只沿用现有可互动角色列表；不显示内部 userId/charId。没有头像时显示名字首字。
- 第二层：Facts／事实、Core／核心、List／未了事项、Mirror／镜子、Gaze／凝视。分类右侧改为分类图标，避免重复将 char 头像用于所有类别。
- Facts 内有短期、长期分段切换；“共同经历”仍保留在短期中，并能切回长期。内部 short/long/core/open/mirror/gaze 键与数据类型保持原样。
- 顶部返回：分类内容 → 角色栏目 → 全部角色；“记忆入口”也可从分类内容返回角色栏目。进入新角色重置分类位置。
- 沿用用户指定浅蓝、粉色横幅方向和现有卡片轮廓，适配系统夜间；保留原话依据、更新和事项状态操作。

## 改动文件

- `components/memory/memory-garden.tsx`：新增角色列表入口，复用身份 hero，统一五栏目名称与分类页标题，新增 Facts 分段控件。
- `components/memory/memory-garden.module.css`：角色横幅、分类概览和分段控件样式。
- `components/memory/memory-bank-page.tsx`：替换旧角色选择页，将 Facts 映射到原短期/长期视图。
- `components/phone-resources-app.tsx`：角色选择时重置返回状态；角色不存在时不跳入详情。
- `scripts/check-memory-ui.cjs`：更新当前身份、两个角色入口、五栏目及 Facts/返回路径回归。
- 本交接及 `docs/TODO.md`。

## 验证

- 类型检查通过：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`。范围 app/components/lib，排除版本备份、tmp 和 Deno functions，非全仓库生产构建。
- `node scripts/check-memory-ui.cjs` 最终通过：使用现有 3003 页面、新浏览器与独立合成数据，阻断外部和 API 请求。验证当前身份 A/B 展示、两个 char 直接进入、五类中英文一致、Facts 短期/长期/共同经历、分层返回、键盘进入、依据展开、事项状态重载后保留及 B 不读取 A 的凝视。
- 320/390 CSS 像素、系统 light/dark 两层页面边界检查通过；已查看实际页面截图，包括 `tmp/memory-characters-390-light.png` 与 `tmp/memory-garden-320-dark.png`。截图为独立合成数据，不等同用户真机验收。
- UI 回归早期捕获开发服务热编译清单异常（manifest 缺失/JSON 未完整生成）。测试增加进入前 HTTP 200 就绪检查后最终运行无浏览器异常；仍保留运行时错误断言，未清缓存、停止或替换 3003。既有开发大 chunk 传输在测试浏览器中沿用 identity 编码请求。
- 修改前后 SHA-256 核对以下 7 个底层文件完全相同：memory-cognition、memory-summarizer、memory-service、memory-storage、memory-types、llm-prompt-assembler、core-memory-builder。未触发模型或 TTS，未改变底层规则；无需以本次 UI 检查替代记忆质量验收。
- `git diff --check`（本次已跟踪的 UI 文件）通过。

## 遗留与状态

用户真机、真实头像素材及上一轮记忆规则的真实聊天效果仍待验收。第一版记忆实现详见 `2026-10-04-memory-cognition-implementation.md`。所有本次变更未 commit、未 push、未部署；未处理其他任务或待办。
