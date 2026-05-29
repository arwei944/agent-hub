import { AgentId } from './agent';

/** 项目模型 */
export interface Project {
  id: string;
  name: string;
  path?: string;
  agents: AgentId[];
  sessionCount: number;
  lastActivity: string;
  createdAt: string;
}

/** 项目创建请求 */
export interface CreateProjectRequest {
  name: string;
  path?: string;
}

/** 项目更新请求 */
export interface UpdateProjectRequest {
  name?: string;
  path?: string;
}
