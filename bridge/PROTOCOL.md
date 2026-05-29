# Agent-Hub Bridge Protocol

Agent ↔ Hub 双向实时通信协议。

## 连接

Agent 插件通过 WebSocket 连接到 `ws://localhost:3001/ws` 并发送 `register` 消息标识自己。

## Agent → Hub 事件

### Register
```json
{"type": "agent:register", "agentId": "hermes", "name": "Hermes"}
```

### Session Lifecycle
```json
{"type": "agent:event", "agentId": "hermes", "event": "session:start", "payload": {"sessionId": "...", "model": "claude-sonnet-4", "project": "agent-hub"}}
{"type": "agent:event", "agentId": "hermes", "event": "session:end",   "payload": {"sessionId": "...", "messageCount": 12, "durationMs": 340000}}
```

### Model Switch
```json
{"type": "agent:event", "agentId": "opencode", "event": "model:switch", "payload": {"from": "gpt-4", "to": "claude-sonnet-4"}}
```

### Config Change
```json
{"type": "agent:event", "agentId": "opencode", "event": "config:change", "payload": {"key": "model", "oldValue": "gpt-4", "newValue": "claude-sonnet-4"}}
```

### Tool Execution
```json
{"type": "agent:event", "agentId": "hermes", "event": "tool:exec", "payload": {"tool": "bash", "input": "ls -la", "output": "...", "durationMs": 1200, "success": true}}
```

## Hub → Agent 指令

```json
{"type": "cmd:switch_model",  "payload": {"model": "claude-sonnet-4"}}
{"type": "cmd:reload_config", "payload": {}}
{"type": "cmd:set_system_prompt", "payload": {"prompt": "..."}}
```
