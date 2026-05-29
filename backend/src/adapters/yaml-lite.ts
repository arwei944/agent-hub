/**
 * 极简 YAML 解析器（仅解析 Hermes 配置文件所需结构）
 * 只处理 key: value / key:\n  - item 两种嵌套层级
 */
export function parse(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');

  let currentKey: string | null = null;
  let currentList: unknown[] | null = null;

  for (const raw of lines) {
    const trimmed = raw.trimEnd();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 数组项:  "  - value"
    const listMatch = trimmed.match(/^(\s+)- (.+)$/);
    if (listMatch && currentKey && listMatch[1].length >= 2) {
      if (!currentList) {
        currentList = [];
        result[currentKey] = currentList;
      }
      currentList.push(parseValue(listMatch[2]));
      continue;
    }

    // 新项: "key: value" 或 "key:"
    const kvMatch = trimmed.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === '' || val === '|') {
        // 多行值或对象开始，暂存空值
        currentList = null;
        result[currentKey] = val;
      } else {
        currentList = null;
        result[currentKey] = parseValue(val);
      }
    }
  }

  return result;
}

function parseValue(raw: string): unknown {
  // 去掉引号
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  // 布尔值
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  // 尝试数字
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return trimmed;
}
