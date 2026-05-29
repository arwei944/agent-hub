import { ProjectStore } from '../api/project-store';
import { AdapterRegistry } from '../adapters/registry';
import { WsHub } from '../ws/hub';

/**
 * 会话→项目自动关联引擎
 * 定期扫描所有 Agent 的会话，根据 session.project 自动创建/更新项目
 */
export class ProjectAssigner {
  private timer: NodeJS.Timeout | null = null;
  private knownSessions = new Set<string>(); // 已处理过的 session id

  constructor(
    private registry: AdapterRegistry,
    private projects: ProjectStore,
    private wsHub: WsHub,
  ) {}

  start(intervalMs = 60_000): void {
    this.scan();
    this.timer = setInterval(() => this.scan(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scan(): Promise<void> {
    try {
      for (const adapter of this.registry.getAll().values()) {
        const sessions = await adapter.readRecentSessions(50).catch(() => []);
        for (const session of sessions) {
          if (this.knownSessions.has(session.id)) continue;
          this.knownSessions.add(session.id);

          // 获取项目名：优先使用 session.project，其次从 title 推断
          const projectName = session.project || this.inferProject(session.title || session.id);

          if (projectName) {
            const project = this.projects.ensure(projectName);
            this.projects.recordActivity(project.id, adapter.id);
            this.projects.incrementSessions(project.id);

            this.wsHub.broadcast({
              type: 'session:update',
              payload: { agentId: adapter.id, session },
            });
          }
        }
      }
    } catch (err) {
      console.error('[assigner] scan error:', err);
    }
  }

  /** 从标题推断项目名（去掉常见后缀） */
  private inferProject(title: string): string | undefined {
    if (!title || title.length > 100) return undefined;
    // 使用目录名作为项目名（如果包含路径分隔符）
    if (title.includes('/') || title.includes('\\')) {
      const parts = title.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1] || parts[parts.length - 2];
    }
    return undefined;
  }
}
