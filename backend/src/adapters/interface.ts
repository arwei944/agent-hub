import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';

/**
 * Agent 适配器接口
 * 每个 Agent 实现一个适配器，负责读写其配置文件和会话数据
 */
export interface AgentAdapter {
  /** Agent 唯一标识 */
  readonly id: AgentId;
  /** 显示名称 */
  readonly name: string;
  /** 配置文件的 glob 路径模式 */
  readonly configPaths: string[];

  /** 读取配置文件 → 统一格式 */
  readConfig(): Promise<AgentConfig>;
  /** 写入配置文件（将统一格式转回 Agent 原生格式） */
  writeConfig(config: AgentConfig): Promise<void>;
  /** 读取最近的会话列表 */
  readRecentSessions(limit?: number): Promise<AgentSession[]>;
  /** 读取完整 Agent 状态 */
  readState(): Promise<AgentState>;
  /** 检测 Agent 是否在线（进程是否存在/配置可达） */
  ping(): Promise<boolean>;
}
