# 记忆页面细标题入口与单返回

日期：2026-10-04。分支：`feat/imessage-private-chat`；基准 HEAD：`c3cd2d3`。在已有未提交的记忆升级与 UI 上精修；保留其他窗口改动。

## 需求与完成范围

用户指出实际内容页背景仍为白色、分类方块与横幅过大、两个返回入口重复。本轮仅修改这些 UI：

- 将粉／奶白／浅绿渐变放到记忆 PageShell 的 page-body，涵盖角色入口、分类入口及 Facts 等实际内容页面。夜间使用低亮背景。
- 删除五分类的大方块与自绘 SVG，改为约 68px 高的细长文字入口：衬线斜体英文小标题＋中文标题与条数、次级说明、细色线、箭头。保留 Facts／事实、Core／核心、List／未了事项、Mirror／镜子、Gaze／凝视命名。
- 删除内容区“记忆入口”返回按钮，保留顶部返回；沿用现有内容页 → 角色分类 → 角色列表 → 资源页面的返回逻辑。
- 保留角色横幅、头像渐隐、记忆条数排序和身份私有置顶，以及所有生成／召回／存储／注入规则。

## 文件与快照

- `components/memory/memory-garden.tsx`：细标题分类结构及无返回按钮的栏目标题。
- `components/memory/memory-garden.module.css`：紧凑排版、移除大图形、外层渐变及日夜模式。
- `components/memory/memory-bank-page.tsx`：栏目标题不再传递独立返回操作。
- `scripts/check-memory-ui.cjs`：增加紧凑行、无方块、内容背景、唯一返回断言，保留原功能回归。
- `docs/TODO.md`、本交接。

修改前快照在 `components/memory/versions/`：`memory-garden.before-slim-v3.tsx.bak`、`memory-garden.before-slim-v3.css.bak`、`memory-bank.before-single-back-v3.tsx.bak`。

## 验证

- `node scripts/check-memory-ui.cjs` 通过。使用现有 3003 实际页面、独立浏览器 profile 和合成数据；阻断 API／外部请求，不触发付费模型或访问用户数据。验证 320/390 日夜、五分类、紧凑行、无大方块、唯一返回、内容页渐变、Facts 短期／长期／共享入口及分层返回；同时回归长按／滚动取消、键盘菜单／焦点、置顶持久化／身份隔离、依据与事项状态。
- 已查看本轮实际页面截图：`tmp/memory-garden-390-light.png`、`tmp/memory-garden-320-dark.png`、`tmp/memory-facts-single-back-390-light.png`。确认内容区背景有色、标题入口紧凑、顶部单返回；合成数据浏览器截图不代替真机验收。
- 限定类型检查：`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project tmp/tsconfig-currency-check.json --pretty false`；范围 app/components/lib，不是全仓生产构建。
- 八个底层文件前后 SHA-256 一致：memory-cognition、memory-summarizer、memory-service、memory-storage、memory-types、llm-prompt-assembler、core-memory-builder、memory-entry-preferences。

## 状态

3003 统一入口继续运行。真实设备及真实头像效果待用户验收；之前记忆功能的模型效果仍未验收。未 commit／push／部署。
