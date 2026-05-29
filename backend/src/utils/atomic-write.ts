import { writeFile, rename } from 'fs/promises';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

/**
 * 原子写入文件
 * 先写入临时文件再 rename，避免写入中途崩溃导致文件损坏
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  // 确保目标目录存在
  await mkdir(dirname(filePath), { recursive: true });

  // 生成临时文件路径（同目录确保跨设备 rename 成功）
  const tmpPath = join(dirname(filePath), `.tmp-${randomUUID()}`);

  try {
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, filePath);
  } catch (err) {
    // 清理临时文件
    try { await import('fs/promises').then((fs) => fs.unlink(tmpPath)); } catch { /* ignore */ }
    throw err;
  }
}
