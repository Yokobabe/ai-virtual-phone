# 导演旁白局域网HTTP兼容修复

- 用户截图：提交导演旁白时crypto.randomUUID is not a function。基准feat/imessage-private-chat / 2f60500，保留现有所有未提交改动。
- 原因：新增旁白ID直接使用仅安全上下文支持的randomUUID，局域网HTTP环境不可用；上轮测试伪造了该函数，遗漏实际HTTP兼容。报错在saveChatSessions之前，尚未保存旁白/生成，不是写成user消息。
- lib/group-director-note.ts复用chat-storage现有createResponseRoundId并增加director前缀；这是本地记录标识，不是凭证。无secure context依赖，不改旁白身份、存储与提示逻辑。
- scripts/check-group-director-note.cjs不再mockrandomUUID，实际执行生产ID函数；500连续ID、保留待用指引/按ID消费等回归。新增scripts/check-director-lan-http.cjs在真实http://192.168.101.2:3003来源的拦截空白fixture执行生产函数，明确isSecureContext=false/randomUUID不存在，使用隔离内存存储，无真实模型与用户数据。
- 检查：上述回归、群提示组装、限定聊天类型检查；真机待用户重试。
- 未commit/push，不重启或清除3003及聊天数据。
