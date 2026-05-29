import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { parse as parseYaml } from './yaml-lite';

export class HermesAdapter implements AgentAdapter {
  readonly id: AgentId = 'hermes';
  readonly name = 'Hermes';
  readonly configPaths = [join(homedir(), '.hermes', 'config.yaml')];

  private getConfigPath(): string {
    return join(homedir(), '.hermes', 'config.yaml');
  }

  async readConfig(): Promise<AgentConfig> {
    const raw: Record<string, unknown> = {};
    try {
      const content = await readFile(this.getConfigPath(), 'utf-8');
      const parsed = parseYaml(content);
      Object.assign(raw, parsed);
    } catch {
      // 文件不存在时返回空配置
    }

    return {
      model: raw.model as string | undefined,
      mcpTools: raw.mcpServers ? Object.keys(raw.mcpServers as Record<string, unknown>) : undefined,
      systemPrompt: raw.system_prompt as string | undefined,
      raw,
    };
  }

  async writeConfig(_config: AgentConfig): Promise<void> {
    // Phase 2 实现
    console.warn('[hermes] writeConfig not yet implemented');
  }

  async readRecentSessions(_limit = 20): Promise<AgentSession[]> {
    // Phase 2: 读取 ~/.hermes/sessions/
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
