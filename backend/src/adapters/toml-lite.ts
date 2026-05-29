/**
 * 极简 TOML 解析器（仅解析 Codex/Grok 配置文件所需结构）
 * 支持 key = value, [section], 字符串, 数字, 布尔, 数组（单行）
 */
export function parse(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentSection: string | null = null;
  let currentObj = result;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // [section] 或 [section.sub]
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      setNested(result, currentSection, {});
      currentObj = getNested(result, currentSection) as Record<string, unknown>;
      continue;
    }

    // key = value
    const kvMatch = trimmed.match(/^([\w_.-]+)\s*=\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].trim();
      currentObj[key] = parseTomlValue(val);
    }
  }

  return result;
}

function parseTomlValue(raw: string): unknown {
  // 字符串 (单引号或双引号)
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // 数组 [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1);
    if (!inner.trim()) return [];
    return inner.split(',').map((s) => parseTomlValue(s.trim()));
  }
  // 布尔
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // 数字
  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;
  return raw;
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      current[keys[i]] = value;
    } else {
      if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
  }
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}
