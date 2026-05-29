"""
Hermes Hook 注册函数
在 Hermes 配置中注册 pre/post tool_call hooks 即可自动上报事件。

使用方法 (config.yaml):
  hooks:
    pre_call:
      - "hermes_hook.hooks.pre_tool_call"
    post_call:
      - "hermes_hook.hooks.post_tool_call"
"""
import time
from .bridge import get_bridge


# 存储每个调用的开始时间
_call_timings: dict = {}


def pre_tool_call(ctx):
    """Tool call 前 hook：开始计时并上报"""
    bridge = get_bridge()
    tool_name = ctx.get("tool", {}).get("name", "unknown")
    _call_timings[tool_name] = time.time_ns()
    bridge.report_session_start(
        session_id=ctx.get("session_id", tool_name),
        model=ctx.get("model", ""),
        project=ctx.get("cwd", ""),
    )
    return ctx


def post_tool_call(ctx):
    """Tool call 后 hook：计算耗时并上报"""
    bridge = get_bridge()
    tool_name = ctx.get("tool", {}).get("name", "unknown")
    start_time = _call_timings.pop(tool_name, None)

    duration_ms = 0
    if start_time:
        duration_ms = (time.time_ns() - start_time) // 1_000_000

    inp = ctx.get("input", "")
    out = ctx.get("output", "")
    success = ctx.get("error") is None

    bridge.report_tool_exec(
        tool=tool_name,
        inp=str(inp),
        out=str(out),
        duration_ms=duration_ms,
        success=success,
    )
    return ctx
