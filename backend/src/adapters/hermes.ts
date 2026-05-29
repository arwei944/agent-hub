import { readFile, access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { parse as parseYaml } from './yaml-lite';
import { serializeYaml } from '../utils/yaml-serializer';
import { atomicWrite } from '../utils/atomic-write';
import { stat } from 'fs/promises';

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

  async writeConfig(config: AgentConfig): Promise<void> {
    const raw = { ...config.raw };
    if (config.model !== undefined) raw.model = config.model;
    if (config.systemPrompt !== undefined) raw.system_prompt = config.systemPrompt;
    await atomicWrite(this.getConfigPath(), serializeYaml(raw));
  }

  async readRecentSessions(limit = 20): Promise<AgentSession[]> {
    const sessionsDir = join(homedir(), '.hermes', 'sessions');
    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const dirs = entries
        .filter((e) => e.isDirectory())
        .slice(0, limit);

      const sessions: AgentSession[] = [];
      for (const dir of dirs) {
        const sessionDir = join(sessionsDir, dir.name);
        const sessionFiles = await readdir(sessionDir);
        const jsonFiles = sessionFiles.filter((f) => f.endsWith('.json'));

        let createdAt = '';
        let updatedAt = '';
        let messageCount = 0;

        for (const f of jsonFiles) {
          try {
            const s = await stat(join(sessionDir, f));
            if (!createdAt || s.birthtimeMs < new Date(createdAt).getTime()) {
              createdAt = s.birthtime.toISOString();
            }
            if (!updatedAt || s.mtimeMs > new Date(updatedAt).getTime()) {
              updatedAt = s.mtime.toISOString();
            }
            messageCount++;
          } catch { /* skip */ }
        }

        sessions.push({
          id: dir.name,
          title: dir.name,
          createdAt,
          updatedAt,
          messageCount,
          stage: undefined,
        });
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
