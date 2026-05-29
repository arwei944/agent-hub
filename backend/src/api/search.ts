import { AdapterRegistry } from '../adapters/registry';

/** 搜索结果 */
export interface SearchResult {
  agentId: string;
  sessionId: string;
  match: string;
  lineNumber: number;
  context: string;
}

/**
 * 全文搜索引擎
 * 跨所有 Agent 的会话文件搜索文本内容
 */
export class SearchEngine {
  constructor(private registry: AdapterRegistry) {}

  /**
   * 在所有 Agent 的最近会话中搜索关键词
   */
  async search(query: string, options?: {
    agentId?: string;
    limit?: number;
  }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const maxResults = options?.limit || 50;

    const adapters = options?.agentId
      ? [this.registry.get(options.agentId)].filter(Boolean)
      : Array.from(this.registry.getAll().values());

    for (const adapter of adapters) {
      if (!adapter) continue;

      const sessions = await adapter.readRecentSessions(30).catch(() => []);
      for (const session of sessions) {
        // 搜索会话标题和项目名
        if (session.title?.toLowerCase().includes(lowerQuery)) {
          results.push({
            agentId: adapter.id,
            sessionId: session.id,
            match: session.title,
            lineNumber: 0,
            context: `标题匹配：${session.title}`,
          });
          if (results.length >= maxResults) return results;
        }

        if (session.project?.toLowerCase().includes(lowerQuery)) {
          results.push({
            agentId: adapter.id,
            sessionId: session.id,
            match: session.project,
            lineNumber: 0,
            context: `项目匹配：${session.project}`,
          });
          if (results.length >= maxResults) return results;
        }
      }
    }

    return results;
  }
}
