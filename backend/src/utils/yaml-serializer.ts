/**
 * 极简 YAML 序列化器
 * 将 Record<string, unknown> 写回 YAML 格式
 * 支持 string / number / boolean / string[] / 嵌套对象
 */
export function serializeYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) continue;

    if (Array.isArray(val)) {
      // 数组:  key:\n  - item
      lines.push(`${key}:`);
      for (const item of val) {
        lines.push(`  - ${renderYamlValue(item)}`);
      }
    } else if (typeof val === 'object') {
      // 嵌套对象:  key:\n  subkey: value
      lines.push(`${key}:`);
      for (const [sk, sv] of Object.entries(val as Record<string, unknown>)) {
        if (sv === null || sv === undefined) continue;
        if (Array.isArray(sv)) {
          lines.push(`  ${sk}:`);
          for (const item of sv) {
            lines.push(`    - ${renderYamlValue(item)}`);
          }
        } else {
          lines.push(`  ${sk}: ${renderYamlValue(sv)}`);
        }
      }
    } else {
      // 标量:  key: value
      lines.push(`${key}: ${renderYamlValue(val)}`);
    }
  }

  return lines.join('\n') + '\n';
}

function renderYamlValue(val: unknown): string {
  if (typeof val === 'string') {
    // 含特殊字符时加引号
    if (/[:\{\}\[\],&\*\?\|<>=!%@`#]/.test(val) || val === '' || val.startsWith(' ') || val.endsWith(' ')) {
      return JSON.stringify(val);
    }
    return val;
  }
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return String(val);
}
