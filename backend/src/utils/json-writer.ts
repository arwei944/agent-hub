/**
 * JSON 配置写入工具
 * 将 Record 序列化为格式化的 JSON
 */
export function serializeJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2) + '\n';
}

/**
 * JSONC 配置写入（不带注释的 JSON 格式）
 * 注意：写入后会丢失原有注释，但功能等价
 */
export const serializeJsonc = serializeJson;
