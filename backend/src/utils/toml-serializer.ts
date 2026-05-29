/**
 * 极简 TOML 序列化器
 * 将 Record<string, unknown> 写回 TOML 格式
 * 支持扁平 key 和 [section] 嵌套（section.key 语法）
 */
export function serializeToml(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  const sections = new Map<string, Record<string, unknown>>();
  const rootKeys: Record<string, unknown> = {};

  // 根据 key 是否含 `.` 分离根键和 section
  for (const [key, val] of Object.entries(obj)) {
    if (key.includes('.') || (typeof val === 'object' && val !== null && !Array.isArray(val))) {
      const sectionKeys = key.includes('.') ? key : '';
      if (sectionKeys) {
        if (!sections.has(sectionKeys)) {
          sections.set(sectionKeys, {});
        }
        const sub = val as Record<string, unknown>;
        for (const [sk, sv] of Object.entries(sub)) {
          sections.get(sectionKeys)![sk] = sv;
        }
      }
    } else {
      rootKeys[key] = val;
    }
  }

  // 写根键
  for (const [key, val] of Object.entries(rootKeys)) {
    const line = tomlValue(key, val);
    if (line) lines.push(line);
  }

  // 写 section
  for (const [section, kv] of sections.entries()) {
    if (Object.keys(kv).length === 0) continue;
    lines.push('', `[${section}]`);
    for (const [key, val] of Object.entries(kv)) {
      const line = tomlValue(key, val);
      if (line) lines.push(line);
    }
  }

  return lines.join('\n') + '\n';
}

function tomlValue(key: string, val: unknown): string | null {
  const rendered = renderToml(val);
  if (rendered === null) return null;
  return `${key} = ${rendered}`;
}

function renderToml(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return JSON.stringify(val); // 安全转义
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    const items = val.map((v) => renderToml(v)).filter((v) => v !== null);
    return `[${items.join(', ')}]`;
  }
  return null;
}
