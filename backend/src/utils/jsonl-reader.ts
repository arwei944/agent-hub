import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

/** JSONL 中的单条记录 */
export interface JsonlRecord {
  [key: string]: unknown;
}

/**
 * 读取 JSONL 文件，返回解析后的记录数组
 */
export async function readJsonl(filePath: string): Promise<JsonlRecord[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    return lines.map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * 扫描目录下所有 .jsonl 文件，返回按修改时间降序排列的文件列表
 */
export async function listJsonlFiles(dirPath: string, limit = 50): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith('.jsonl'))
      .map((e) => join(dirPath, e.name));

    // 按修改时间降序排序
    const withStats = await Promise.all(
      files.map(async (f) => {
        try {
          const s = await stat(f);
          return { path: f, mtime: s.mtimeMs };
        } catch {
          return { path: f, mtime: 0 };
        }
      })
    );

    return withStats
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map((f) => f.path);
  } catch {
    return [];
  }
}
