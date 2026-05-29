import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { parse as parseToml } from './toml-lite';
import { serializeToml } from '../utils/toml-serializer';
import { atomicWrite } from '../utils/atomic-write';
import { listJsonlFiles, readJsonl } from '../utils/jsonl-reader';

export class CodexAdapter implements AgentAdapter {
  readonly id: AgentId = 'codex';
  readonly name = 'Codex';
  readonly configPaths = [
    join(homedir(), '.codex', 'config.toml'),
  ];

  private getConfigPath(): string {
    return join(homedir(), '.codex', 'config.toml');
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

    // Codex 模型在 [inference] 或 [model] 段
    const inference = raw.inference as Record<string, unknown> | undefined;
    const model = raw.model as Record<string, unknown> | undefined;

    return {
      model: (inference?.model as string) || (model?.name as string) || undefined,
      mcpTools: undefined, // Codex 不使用 MCP
      systemPrompt: raw.system_prompt as string | undefined,
      raw,
    };
  }

  async writeConfig(config: AgentConfig): Promise<void> {
    const raw = { ...config.raw };
    if (config.model !== undefined) {
      if (typeof raw.inference === 'object') {
        (raw.inference as Record<string, unknown>).model = config.model;
      }
      if (typeof raw.model === 'object') {
        (raw.model as Record<string, unknown>).name = config.model;
      }
    }
    if (config.systemPrompt !== undefined) raw.system_prompt = config.systemPrompt;
    await atomicWrite(this.getConfigPath(), serializeToml(raw));
  }

  async readRecentSessions(limit = 20): Promise<AgentSession[]> {
    const sessionsDir = join(homedir(), '.codex', 'archived_sessions');
    const files = await listJsonlFiles(sessionsDir, limit);
    const sessions: AgentSession[] = [];

    for (const file of files) {
      try {
        const records = await readJsonl(file);
        if (records.length === 0) continue;

        const first = records[0];
        const last = records[records.length - 1];
        const fileName = file.split(/[/\\]/).pop() || '';

        sessions.push({
          id: fileName.replace(/\.jsonl$/i, ''),
          title: (first.title as string) || (first.session_id as string) || fileName,
          project: (first.project as string) || undefined,
          createdAt: (first.created_at as string) || (first.timestamp as string) || '',
          updatedAt: (last.created_at as string) || (last.timestamp as string) || '',
          messageCount: records.length,
          stage: undefined,
        });
      } catch {
        // skip corrupt files
      }
    }

    return sessions;
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
