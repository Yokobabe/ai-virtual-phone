# 钱包地区与跨币种结算

- 需求：用户钱包选择地区/币种；角色按人设常住地和财务背景判断原币，未知 CNY；同币不兑换、跨币不限于人民币；购物和查手机资产同步币种要求。用户明确选择切换币种时按汇率保持余额价值。
- 分支/基准：feat/imessage-private-chat / 3f76c07。共享目录保留所有其他未提交改动，未切分支/合并。
- 原实现：exchange-rates 仅原币→CNY；钱包余额/卡无币种；购物汇总与查手机资产汇总写死人民币。
- 钱包：新增 10 个地区/币种选项，旧数据默认 CNY。联网参考汇率换算余额和全部银行卡；历史流水不改金额，保留原币。查询失败或期间钱包发生变化不落库。
- 汇率：任意支持币种对，同币种返回 1 不请求网络；沿用 open.er-api.com 和 8 秒超时，无模型汇率猜测。
- 聊天：单聊/群聊实际提示增加角色币种判断和用户钱包事实；收款按钱包币种换算，冻结收到金额、币种、参考汇率/时间。保留旧 cnyAmount 的 CNY 历史兼容。手动转账扣款按钱包币种换算，默认发送钱包币种；跨币退款按实际扣款币种折算。红包/代付避免异币种数值直接入账/扣款；显示原币及兑换信息。
- 购物：刷新、搜索及提示预览带入用户币种；历史购物车按价格中标明的原币换算，跨币查询失败时禁止支付/发代付请求。总价和代付元数据标注钱包币种。
- 查手机：资产及购物实际请求追加角色地区/币种规则，金额显式 ISO 代码；资产汇总按币种分组，避免不同币种直接相加。不修改旧资产快照、不重做资产页面。旧无币种金额默认 CNY，无法从模糊符号可靠反推历史币种。
- 文件：lib/exchange-rates.ts、currency-context.ts、wallet-types.ts、wallet-storage.ts、chat-storage.ts、transfer-protocol.ts、llm-prompt-assembler.ts、shopping-engine.ts、checkphone-engine.ts；components/chat/wallet-panel.tsx、chat-room.tsx、message-bubble.tsx、rich-input-modals.tsx；components/shopping/shopping-app.tsx；components/checkphone/checkphone-assets-page.tsx；两份 check-wallet-currency 回归脚本及 TODO/交接。
- 代码检查：模拟 KV/汇率回归通过（跨币、同币无请求、历史、失败保护、并发保护、资产分组）。限定 app/components/lib 源码 tsc noEmit 通过，排除 tmp 发布副本及 Supabase Deno；未宣称完整仓库检查通过。diff 检查通过。
- 浏览器检查：真实钱包组件隔离静态渲染，10 选项/USD 当前选择/CNY 历史显示及 320/390/430px 选择器边界通过。使用简化 fixture 样式，不等于完整页面视觉或交互验收；未访问真实账号存储或付费模型。
- 真机与真实模型：待用户验收；提示不能保证模型总能正确推断，未自动改人物设定。联网汇率可用性依赖第三方，金额取两位小数参考值。
- 预览：3003 又因 8GB 堆 OOM 停止；确认空闲后按原配置隐藏恢复，PID 75636。日志 tmp/preview-3003-currency-20261003.*.log；未根治长期内存增长。
- 恢复验证：局域网首页重新返回 HTTP 200。
- 未 commit/push/远端部署。
