import { AgentAdapter } from './interface';

export class AdapterRegistry {
  private adapters = new Map<string, AgentAdapter>();

  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): AgentAdapter | undefined {
    return this.adapters.get(id);
  }

  getAll(): Map<string, AgentAdapter> {
    return this.adapters;
  }
}
