"""
Hermes Agent-Hub Bridge Plugin
用于 Hermes 的 pre/post tool_call hooks，实时上报事件到 agent-hub。
"""
from .bridge import AgentHubBridge, get_bridge

__all__ = ["AgentHubBridge", "get_bridge"]
