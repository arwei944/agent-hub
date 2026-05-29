import { Project, CreateProjectRequest } from '../models/project';

/**
 * 内存项目存储
 */
export class ProjectStore {
  private projects = new Map<string, Project>();
  private nameIndex = new Map<string, string>(); // name → id

  /** 获取所有项目 */
  list(): Project[] {
    return Array.from(this.projects.values())
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }

  /** 按 ID 获取 */
  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /** 创建项目 */
  create(req: CreateProjectRequest): Project {
    const id = this.generateId(req.name);
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: req.name,
      path: req.path,
      agents: [],
      sessionCount: 0,
      lastActivity: now,
      createdAt: now,
    };
    this.projects.set(id, project);
    this.nameIndex.set(req.name, id);
    return project;
  }

  /** 确保项目存在（如已存在则返回现有） */
  ensure(name: string, path?: string): Project {
    const existingId = this.nameIndex.get(name);
    if (existingId) {
      const existing = this.projects.get(existingId)!;
      if (path && !existing.path) {
        existing.path = path;
      }
      return existing;
    }
    return this.create({ name, path });
  }

  /** 更新项目 */
  update(id: string, updates: Partial<Project>): Project | undefined {
    const project = this.projects.get(id);
    if (!project) return undefined;

    if (updates.name && updates.name !== project.name) {
      this.nameIndex.delete(project.name);
      this.nameIndex.set(updates.name, id);
    }

    Object.assign(project, updates);
    project.lastActivity = new Date().toISOString();
    return project;
  }

  /** 删除项目 */
  delete(id: string): boolean {
    const project = this.projects.get(id);
    if (!project) return false;
    this.nameIndex.delete(project.name);
    return this.projects.delete(id);
  }

  /** 记录 Agent 活动（更新 lastActivity + agents 列表） */
  recordActivity(projectId: string, agentId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    project.lastActivity = new Date().toISOString();
    if (!project.agents.includes(agentId as any)) {
      project.agents.push(agentId as any);
    }
  }

  /** 增加会话计数 */
  incrementSessions(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.sessionCount++;
      project.lastActivity = new Date().toISOString();
    }
  }

  private generateId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `project-${Date.now()}`;
  }
}
