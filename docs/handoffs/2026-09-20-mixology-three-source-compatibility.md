# 2026-09-20 特调三个来源入口与基础酒馆兼容

## 需求、分支与来源
- 用户授权开始改造：保留特调原生、酒馆兼容、JanitorAI 三个入口，并检查两份新图片是否有角色数据。
- 集成分支：feat/imessage-private-chat，HEAD 1c71ea6，未创建提交。
- 在独立 worktree `C:/Users/Effy/.codex/worktrees/mixology-compatibility/ai-virtual-phone` 开发。以相同 HEAD 加主目录现有特调未提交整合为基线，仅复制明确范围的特调文件及协作说明；没有整合整个上游 main。
- 合回前校验 7 个已有目标文件的 SHA-256 与起始基线一致，确认无并发修改后带回本次版本；4 个新文件也先检查不存在同名冲突。原目标文件备份在该 worktree 父目录的 before-integration 中。

## 图片结论
本轮两份扩展名为 PNG 的附件实际是 JPEG（JFIF 签名）；没有发现标准角色卡字段/数据块，不能作为角色卡导入。它们与之前含 chara/ccv3 数据的 Raymond PNG 不同。没有根据图片编造人物设定。

## 实现
- 酒柜导入按钮打开三个来源标签。原生材料/配方包沿用原流程；第三方先预览名称、开场数量和兼容说明，再确认入柜。普通图片、错误类型、超大文件及截断 PNG 给出错误，不伪造导入成功。
- 酒馆入口解析常见 V1 平面 JSON、V2/V3 data 包装及 PNG 的 chara/ccv3 文本块。JanitorAI 入口接受上述角色卡及具备 name/personality/initial_message 等字段的角色 JSON；不是网页抓取器，也不连接 JanitorAI 模型或同步站内聊天。
- 角色转换：名字、头像（PNG 文件导入）、描述、性格、情境、多开场、常见示例对话、作者及标签；保留额外数据。系统/历史后指令、基础内嵌世界书、depth_prompt 接入请求装配。
- 预设作为基底保存；每杯只允许一份兼容预设。按 prompt_order / enabled、system/user/assistant 角色、marker 与深度装配，支持常用 char/user/description/personality/scenario/persona、setvar/getvar、random/pick、骰子、trim 等宏。
- 使用兼容预设时不额外套入原生人物/示例和强制正文协议；用户主动搭配的原生序言、杯型、契约等仍会追加。未使用兼容材料的原生对局沿用原路径。
- 预设编辑器支持条目启停、顺序、正文、温度与单次输出上限。通用采样参数传入现有模型适配器，输出上限限制为 8192 tokens 并明确提示；不替换 API 凭证和地址。
- 编辑和原生导出/再导入保留兼容元数据。

## 明确限制
- 这是基础叙事兼容，不等于完整 SillyTavern 运行环境。导入说明会列出不支持内容。
- 酒馆正则、tavern_helper/SPreset 等脚本及插件只保留数据，不执行；依赖它们的隐藏文本、摘要清理、动态界面和美化不会自动生效。
- 世界书支持常驻、关键词/次关键词与基础位置/深度；递归、概率、预算、分组、冷却、向量召回、正则关键词等高级语义未实现。未知宏保留原文，复杂宏、工具调用、助手预填充及服务商专用参数未实现。
- 不保证导入预设可以改变服务商的内容边界，不宣称复现 JanitorAI 或原酒馆的模型效果。
- PNG 支持 tEXt / 未压缩 iTXt，未支持压缩文本块。公开角色页面或普通头像不足以恢复完整设定。

## 本次文件
- 新增：lib/mixology/compatibility.ts、lib/mixology/compatibility-runtime.ts、components/mixology/compatibility-preset-editor.tsx、scripts/check-mixology-compatibility.cjs。
- 修改：lib/mixology/types.ts、transfer.ts、assembler.ts、engine.ts；components/mixology/mixology-app.tsx、mixology-editor.tsx；styles/mixology.css。
- 文档：本交接与 docs/TODO.md。
- 没有把用户的第三方预设/角色卡全文加入仓库。

## 检查
- 独立 worktree TypeScript 全量检查通过（另行运行，构建配置会跳过类型和 lint）；生产构建通过，74 个页面含临时 QA 页；执行样式恢复脚本。
- 离线兼容回归通过：导入/错误类型/截断 PNG、宏、角色与顺序、关键词与深度、原生往返、引擎到模拟模型的实际参数。两份用户预设及 Raymond 卡单独和交叉组合的解析/装配通过；没有网络或付费模型调用。
- 原有 check-mixology-upstream.cjs 回归通过，原生提示词、旧配方和钩子行为保留。
- 隔离 Edge 浏览器 430×932 验收通过：三个入口、JPEG 拒收、真实预设和 V3 卡预览/入柜、编辑温度/输出上限/条目开关并重新打开验证保存；无页面异常、无横向溢出，截图检查完成。
- 测试临时地址 127.0.0.1:3021，阻断外部和 /api 请求；只用独立浏览器的本地测试数据。服务已停止；未触碰 3003。临时 QA 页面与构建产物未带回主目录。
- 主目录合回后兼容与原生离线回归再次通过；主目录全量 TypeScript 检查通过。

## 状态与后续
已合回本地定制分支工作区；未 stage、commit、push 或部署。真机、真实模型速度/文笔/格式稳定性尚未验收。正则及高级世界书等能力属于后续兼容范围，不自动视为已支持。
