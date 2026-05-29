import { watch } from 'fs';
import { dirname } from 'path';
import { AgentAdapter } from '../adapters/interface';

const DEBOUNCE_MS = 300; // 300ms 去重窗口

/**
 * 文件系统实时监听器
 * 监听所有 Agent 配置文件/目录变更，触发重读和广播
 */
export class FileWatcher {
  private watchers: import('fs').FSWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private onChange: (agentId: string) => void;

  constructor(adapters: Map<string, AgentAdapter>, onChange: (agentId: string) => void) {
    this.onChange = onChange;

    for (const adapter of adapters.values()) {
      this.watchAdapter(adapter);
    }
  }

  private watchAdapter(adapter: AgentAdapter): void {
    for (const configPath of adapter.configPaths) {
      try {
        // 监听配置文件所在目录
        const dir = dirname(configPath);
        const watcher = watch(dir, { recursive: false }, (eventType, filename) => {
          if (!filename) return;

          // 只关心该适配器的配置文件
          const matches = adapter.configPaths.some((p) =>
            p.endsWith(filename as string)
          );

          if (!matches) {
            // 也匹配会话目录下的变化
            const isSessionFile = typeof filename === 'string' &&
              (filename.endsWith('.jsonl') || filename.endsWith('.json'));
            if (!isSessionFile) return;
          }

          this.debounce(adapter.id);
        });

        this.watchers.push(watcher);
        console.log(`[watcher] watching ${dir} for ${adapter.name}`);
      } catch (err) {
        console.warn(`[watcher] failed to watch ${adapter.name}:`, (err as Error).message);
      }
    }
  }

  private debounce(agentId: string): void {
    const existing = this.debounceTimers.get(agentId);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      agentId,
      setTimeout(() => {
        this.debounceTimers.delete(agentId);
        console.log(`[watcher] change detected for ${agentId}, triggering re-read`);
        this.onChange(agentId);
      }, DEBOUNCE_MS)
    );
  }

  close(): void {
    for (const w of this.watchers) {
      w.close();
    }
    for (const t of this.debounceTimers.values()) {
      clearTimeout(t);
    }
    this.watchers = [];
    this.debounceTimers.clear();
  }
}
