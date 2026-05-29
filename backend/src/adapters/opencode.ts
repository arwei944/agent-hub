import { readFile, access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState, AgentStatus } from '../models/agent';
import { AgentAdapter } from './interface';
import { serializeJsonc } from '../utils/json-writer';
import { atomicWrite } from '../utils/atomic-write';
import { stat } from 'fs/promises';

export class OpenCodeAdapter implements AgentAdapter {
  readonly id: AgentId = 'opencode';
  readonly name = 'OpenCode';
  readonly configPaths = [
    join(homedir(), '.config', 'opencode', 'opencode.json'),
    join(homedir(), '.config', 'opencode', 'opencode.jsonc'),
  ];

  private getConfigPath(): string {
    return join(homedir(), '.config', 'opencode', 'opencode.jsonc');
  }

  async readConfig(): Promise<AgentConfig> {
    const raw: Record<string, unknown> = {};
    try {
      const content = await readFile(this.getConfigPath(), 'utf-8');
      // JSONC 有注释，需要先 strip
      const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const parsed = JSON.parse(cleaned);
      Object.assign(raw, parsed);
    } catch {
      // 文件不存在时返回空配置
    }

    return {
      model: raw.model as string | undefined,
      mcpTools: raw.mcpServers ? Object.keys(raw.mcpServers as Record<string, unknown>) : undefined,
      systemPrompt: raw.systemPrompt as string | undefined,
      raw,
    };
  }

  async writeConfig(config: AgentConfig): Promise<void> {
    const raw = { ...config.raw };
    if (config.model !== undefined) raw.model = config.model;
    if (config.systemPrompt !== undefined) raw.systemPrompt = config.systemPrompt;
    if (config.mcpTools !== undefined && raw.mcpServers) {
      // 保留现有 mcpServers 结构不变
    }
    await atomicWrite(this.getConfigPath(), serializeJsonc(raw));
  }

  async readRecentSessions(limit = 20): Promise<AgentSession[]> {
    const sessionsDir = join(homedir(), '.config', 'opencode', 'sessions');
    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const jsonFiles = entries
        .filter((e) => e.isFile() && (e.name.endsWith('.json') || e.name.endsWith('.jsonc')))
        .slice(0, limit);

      const sessions: AgentSession[] = [];
      for (const file of jsonFiles) {
        try {
          const filePath = join(sessionsDir, file.name);
          const content = await readFile(filePath, 'utf-8');
          const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          const parsed = JSON.parse(cleaned);
          const fileStat = await stat(filePath);

          sessions.push({
            id: file.name.replace(/\.(json|jsonc)$/i, ''),
            title: (parsed.title as string) || (parsed.id as string) || file.name,
            createdAt: fileStat.birthtime.toISOString(),
            updatedAt: fileStat.mtime.toISOString(),
            messageCount: Array.isArray(parsed.messages) ? parsed.messages.length : 1,
            stage: undefined,
          });
        } catch {
          // 跳过无法解析的文件
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
