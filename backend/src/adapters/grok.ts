import { readFile, access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { parse as parseToml } from './toml-lite';
import { serializeToml } from '../utils/toml-serializer';
import { atomicWrite } from '../utils/atomic-write';
import { stat } from 'fs/promises';

export class GrokAdapter implements AgentAdapter {
  readonly id: AgentId = 'grok';
  readonly name = 'Grok';
  readonly configPaths = [
    join(homedir(), '.grok', 'config.toml'),
  ];

  private getConfigPath(): string {
    return join(homedir(), '.grok', 'config.toml');
  }

  async readConfig(): Promise<AgentConfig> {
    const raw: Record<string, unknown> = {};
    try {
      const content = await readFile(this.getConfigPath(), 'utf-8');
      const parsed = parseToml(content);
      Object.assign(raw, parsed);
    } catch {
      // 配置文件不存在时返回空
    }

    return {
      model: raw.model as string | undefined,
      endpoint: raw.apiBase as string || raw.endpoint as string | undefined,
      mcpTools: undefined, // Grok 不使用 MCP
      raw,
    };
  }

  async writeConfig(config: AgentConfig): Promise<void> {
    const raw = { ...config.raw };
    if (config.model !== undefined) raw.model = config.model;
    if (config.endpoint !== undefined) {
      raw.apiBase = config.endpoint;
      raw.endpoint = config.endpoint;
    }
    await atomicWrite(this.getConfigPath(), serializeToml(raw));
  }

  async readRecentSessions(limit = 20): Promise<AgentSession[]> {
    const sessionsDir = join(homedir(), '.grok', 'sessions');
    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      // Grok 按项目目录组织，每个目录下有 prompt_history.jsonl
      const dirs = entries
        .filter((e) => e.isDirectory())
        .slice(0, limit);

      const sessions: AgentSession[] = [];
      for (const dir of dirs) {
        const promptFile = join(sessionsDir, dir.name, 'prompt_history.jsonl');
        try {
          const records = await readFile(promptFile, 'utf-8').then((c) =>
            c.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
          );
          const fileStat = await stat(promptFile);

          sessions.push({
            id: dir.name,
            title: dir.name,
            project: dir.name,
            createdAt: fileStat.birthtime.toISOString(),
            updatedAt: fileStat.mtime.toISOString(),
            messageCount: records.length,
            stage: undefined,
          });
        } catch {
          // 如果 prompt_history.jsonl 不存在或不可读则跳过
        }
      }
      return sessions;
    } catch {
      return [];
    }
  }

  async ping(): Promise<boolean> {
    try {
      await access(this.getConfigPath());
      return true;
    } catch {
      return false;
    }
  }

  async readState(): Promise<AgentState> {
    const online = await this.ping();
    let config: AgentConfig;
    try {
      config = await this.readConfig();
    } catch {
      config = { raw: {} };
    }
    const sessions = await this.readRecentSessions();

    return {
      id: this.id,
      name: this.name,
      status: online ? 'online' : 'offline',
      config,
      recentSessions: sessions,
      lastUpdated: new Date().toISOString(),
      metadata: {},
    };
  }
}
