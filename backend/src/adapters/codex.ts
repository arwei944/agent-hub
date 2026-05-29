import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { parse as parseToml } from './toml-lite';

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

  async writeConfig(_config: AgentConfig): Promise<void> {
    console.warn('[codex] writeConfig not yet implemented');
  }

  async readRecentSessions(_limit = 20): Promise<AgentSession[]> {
    // Phase 2: 读取 ~/.codex/archived_sessions/ (JSONL)
    return [];
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
