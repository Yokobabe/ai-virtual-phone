const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

// floatNO2 改造：自托管（单机）模式默认开启。
// 未设置或留空 NEXT_PUBLIC_SELF_HOSTED_MODE 即视为自托管，跳过账号/激活码门禁，
// 应用自动以本地账号（local_user）运行，无需任何环境变量、无需登录。
// 仅在显式写为 false / no / off / 0 时才关闭自托管、启用账号门禁（如要接作者官方账号系统）。
export function isSelfHostedModeEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_SELF_HOSTED_MODE;
  if (raw === undefined || raw.trim() === "") return true;
  const lowered = raw.trim().toLowerCase();
  if (FALSE_VALUES.has(lowered)) return false;
  return TRUE_VALUES.has(lowered);
}
