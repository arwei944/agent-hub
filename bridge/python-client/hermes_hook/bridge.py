"""
Agent-Hub WebSocket 桥接客户端
Hermes Hook 插件通过此模块连接 agent-hub 并上报事件。
"""
import json
import threading
import time
from typing import Any, Optional

try:
    import websocket
except ImportError:
    websocket = None  # type: ignore


class AgentHubBridge:
    """Agent → Hub WebSocket 桥接客户端"""

    def __init__(
        self,
        agent_id: str = "hermes",
        name: str = "Hermes",
        hub_url: str = "ws://localhost:3001/ws",
        auto_reconnect: bool = True,
    ):
        self.agent_id = agent_id
        self.name = name
        self.hub_url = hub_url
        self.auto_reconnect = auto_reconnect
        self._ws: Optional[Any] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._connected = False

    # ---- 生命周期 ----

    def start(self):
        """启动后台 WebSocket 连接"""
        if websocket is None:
            print("[agent-hub] websocket-client not installed, skipping bridge")
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        """停止连接"""
        self._running = False
        if self._ws:
            self._ws.close()

    # ---- 事件上报 ----

    def send_event(self, event: str, payload: dict):
        """发送 Agent 事件到 Hub"""
        if not self._connected:
            return
        msg = json.dumps({
            "type": "agent:event",
            "agentId": self.agent_id,
            "event": event,
            "payload": payload,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        })
        try:
            self._ws.send(msg)
        except Exception as e:
            print(f"[agent-hub] send error: {e}")
            self._connected = False

    def report_session_start(self, session_id: str, model: str = "", project: str = ""):
        self.send_event("session:start", {
            "sessionId": session_id,
            "model": model,
            "project": project,
        })

    def report_session_end(self, session_id: str, message_count: int, duration_ms: int):
        self.send_event("session:end", {
            "sessionId": session_id,
            "messageCount": message_count,
            "durationMs": duration_ms,
        })

    def report_model_switch(self, old_model: str, new_model: str):
        self.send_event("model:switch", {
            "from": old_model,
            "to": new_model,
        })

    def report_tool_exec(self, tool: str, inp: str, out: str, duration_ms: int, success: bool = True):
        self.send_event("tool:exec", {
            "tool": tool,
            "input": inp[:500],
            "output": str(out)[:1000],
            "durationMs": duration_ms,
            "success": success,
        })

    # ---- 内部 ----

    def _run(self):
        while self._running:
            try:
                self._ws = websocket.WebSocketApp(
                    self.hub_url,
                    on_open=self._on_open,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close,
                )
                self._ws.run_forever(ping_interval=30, ping_timeout=10)
            except Exception as e:
                print(f"[agent-hub] connection error: {e}")

            if self._running and self.auto_reconnect:
                time.sleep(3)

    def _on_open(self, _ws):
        self._connected = True
        # 注册到 Hub
        _ws.send(json.dumps({
            "type": "agent:register",
            "agentId": self.agent_id,
            "name": self.name,
        }))
        print(f"[agent-hub] connected ({self.agent_id})")

    def _on_message(self, _ws, message: str):
        """处理 Hub 发来的指令"""
        try:
            data = json.loads(message)
            cmd = data.get("type", "")
            if cmd == "cmd:switch_model":
                print(f"[agent-hub] cmd: switch model to {data['payload'].get('model')}")
            elif cmd == "cmd:reload_config":
                print(f"[agent-hub] cmd: reload config")
            elif cmd == "cmd:set_system_prompt":
                print(f"[agent-hub] cmd: set system prompt")
        except json.JSONDecodeError:
            pass

    def _on_error(self, _ws, error):
        self._connected = False
        print(f"[agent-hub] error: {error}")

    def _on_close(self, _ws, close_status_code, close_msg):
        self._connected = False
        print(f"[agent-hub] disconnected (code={close_status_code})")


# 全局单例
_bridge: Optional[AgentHubBridge] = None


def get_bridge(
    agent_id: str = "hermes",
    name: str = "Hermes",
    hub_url: str = "ws://localhost:3001/ws",
) -> AgentHubBridge:
    global _bridge
    if _bridge is None:
        _bridge = AgentHubBridge(agent_id, name, hub_url)
        _bridge.start()
    return _bridge
