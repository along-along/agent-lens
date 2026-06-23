# -*- coding: utf-8 -*-
"""
AgentLens (AI探针) - Web Server v1.0
The DevTools for AI Agents.
Provides REST API + static file serving for the viewer UI.
Port: 8900 (configurable via VIEWER_PORT env var)
"""

import os
import sys
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Config
VIEWER_PORT = int(os.environ.get("VIEWER_PORT", "8900"))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
JSONL_FILE = os.path.join(DATA_DIR, "requests.jsonl")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# Flask
app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app)

import logging
logging.getLogger("werkzeug").setLevel(logging.WARNING)


def load_all_records():
    records = []
    if not os.path.exists(JSONL_FILE):
        return records
    with open(JSONL_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return records


def load_record_by_id(record_id):
    if not os.path.exists(JSONL_FILE):
        return None
    with open(JSONL_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    record = json.loads(line)
                    if record.get("id") == record_id:
                        return record
                except json.JSONDecodeError:
                    pass
    return None


def classify_request(body):
    """Classify request type: main, tool_call, recap"""
    if not isinstance(body, dict):
        return "unknown"
    system = body.get("system", [])
    messages = body.get("messages", [])
    # Tool sub-call: lightweight system prompt with "performing a web search"
    if isinstance(system, list):
        for s in system:
            text = s.get("text", "") if isinstance(s, dict) else str(s)
            if "performing a web search" in text or "performing a tool" in text:
                return "tool_call"
    # Recap: last message contains "stepped away"
    if messages:
        last_msg = messages[-1]
        content = last_msg.get("content", "")
        if isinstance(content, str) and "stepped away" in content:
            return "recap"
    # Main request: has full tools list (>5 tools)
    tools = body.get("tools", [])
    if len(tools) > 5:
        return "main"
    if len(tools) > 0:
        return "main"
    return "main"


def extract_preview(body):
    """Extract user message preview text"""
    if not isinstance(body, dict):
        return ""
    messages = body.get("messages", [])
    # Find the last user message
    for msg in reversed(messages):
        if msg.get("role") != "user":
            continue
        content = msg.get("content", "")
        if isinstance(content, str):
            # Skip tool_result messages and recap
            if "stepped away" in content:
                return "[Recap]"
            text = content.strip()
        elif isinstance(content, list):
            # Extract text parts
            parts = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        t = item.get("text", "").strip()
                        # Skip system-reminder blocks
                        if t.startswith("<system-reminder>"):
                            continue
                        if t:
                            parts.append(t)
                    elif item.get("type") == "tool_result":
                        return "[Tool Result]"
            text = " ".join(parts)
        else:
            continue
        # Truncate
        if text and len(text) > 40:
            return text[:40] + "..."
        return text
    return ""


@app.route("/api/requests")
def api_requests():
    records = load_all_records()
    offset = request.args.get("offset", 0, type=int)
    limit = request.args.get("limit", 50, type=int)
    records.reverse()

    summaries = []
    for r in records[offset:offset + limit]:
        body = r.get("request", {}).get("body", {})
        context_chars = len(json.dumps(body, ensure_ascii=False)) if isinstance(body, dict) else 0

        summary = {
            "id": r.get("id"),
            "timestamp": r.get("timestamp"),
            "model": r.get("model", "unknown"),
            "elapsed_ms": r.get("elapsed_ms", 0),
            "status": r.get("status"),
            "usage": r.get("usage", {}),
            "context_chars": context_chars,
            "message_count": len(body.get("messages", [])) if isinstance(body, dict) else 0,
            "tool_count": len(body.get("tools", [])) if isinstance(body, dict) else 0,
            "request_type": classify_request(body),
            "preview": extract_preview(body),
            "session_id": r.get("request", {}).get("headers", {}).get("X-Claude-Code-Session-Id", "")[:8],
        }
        summaries.append(summary)

    return jsonify({
        "total": len(records),
        "offset": offset,
        "limit": limit,
        "requests": summaries,
    })


@app.route("/api/requests/<int:record_id>")
def api_request_detail(record_id):
    record = load_record_by_id(record_id)
    if not record:
        return jsonify({"error": "not found"}), 404
    return jsonify(record)


def _smart_system_label(text, index):
    """Generate a meaningful label for system prompt sections"""
    if not text:
        return f"System Prompt #{index+1}", False
    if "billing-header" in text or "x-anthropic-billing" in text:
        return "计费标记（固定）", True
    if "You are Claude Code" in text and len(text) < 200:
        return "身份声明（固定）", True
    if "You are an interactive agent" in text or "# Harness" in text:
        return "核心指令（固定）", True
    if "performing a web search" in text:
        return "工具辅助指令（固定）", True
    if len(text) > 5000:
        return "核心指令（固定）", True
    return f"System #{index+1}", False


def _extract_breakdown(body, messages):
    """Extract detailed breakdown: CLAUDE.md, Rules, Memory, Skills, History, etc."""
    breakdown = {
        "claude_md": None,
        "rules": [],
        "memory": None,
        "skills": [],
        "history_turns": 0,
        "tool_results": [],
        "model_params": {},
    }

    # Model params
    breakdown["model_params"] = {
        "model": body.get("model", "?"),
        "max_tokens": body.get("max_tokens"),
        "stream": body.get("stream", False),
        "thinking": body.get("thinking"),
        "effort": body.get("output_config", {}).get("effort") if body.get("output_config") else None,
    }

    # Parse system-reminder content from messages
    for msg in messages:
        if msg.get("role") != "user":
            continue
        content = msg.get("content", "")
        text = ""
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text += item.get("text", "")
        elif isinstance(content, str):
            text = content

        if "<system-reminder>" not in text:
            continue

        # Extract CLAUDE.md
        import re
        # Find CLAUDE.md sections
        claude_md_matches = re.findall(r'Contents of ([^\n]+CLAUDE\.md)[^\n]*:\n\n(.*?)(?=\nContents of |\n      IMPORTANT:)', text, re.DOTALL)
        for path, content_text in claude_md_matches:
            if breakdown["claude_md"] is None:
                breakdown["claude_md"] = {"path": path.strip(), "content": content_text.strip(), "chars": len(content_text.strip())}
            else:
                breakdown["rules"].append({"path": path.strip(), "content": content_text.strip(), "chars": len(content_text.strip())})

        # Find rules
        rules_matches = re.findall(r'Contents of ([^\n]+rules[/\\][^\n]+):\n\n(.*?)(?=\nContents of |\n      IMPORTANT:)', text, re.DOTALL | re.IGNORECASE)
        for path, content_text in rules_matches:
            breakdown["rules"].append({"path": path.strip(), "content": content_text.strip(), "chars": len(content_text.strip())})

        # Find Memory
        memory_matches = re.findall(r'Contents of ([^\n]+MEMORY\.md)[^\n]*:\n\n(.*?)(?=\n# |\n      IMPORTANT:)', text, re.DOTALL)
        for path, content_text in memory_matches:
            breakdown["memory"] = {"path": path.strip(), "content": content_text.strip(), "chars": len(content_text.strip())}

    # 提取技能 — 只从 "skills are available" 段落中提取
    for msg in messages:
        if msg.get("role") != "user":
            continue
        content = msg.get("content", "")
        text = ""
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text += item.get("text", "")
        elif isinstance(content, str):
            text = content

        # 必须明确包含 "skills are available" 才进入
        if "skills are available" not in text.lower():
            continue

        # 截断：取 "skills are available" 之后、"Available agent types" 之前的部分
        skill_start = text.lower().find("skills are available")
        if skill_start == -1:
            continue
        skill_block = text[skill_start:]
        agent_cut = skill_block.lower().find("available agent types")
        if agent_cut != -1:
            skill_block = skill_block[:agent_cut]

        # 从技能块中提取 - name: description 格式的行
        import re
        skill_matches = re.findall(r'^- (\S+?):', skill_block, re.MULTILINE)
        for s in skill_matches:
            if s and not s.startswith('-') and len(s) < 80:
                breakdown["skills"].append(s)

    # Count history turns (assistant+user pairs, excluding first user msg)
    turn_count = 0
    for msg in messages:
        if msg.get("role") == "assistant":
            turn_count += 1
    breakdown["history_turns"] = turn_count

    # Extract tool results
    for msg in messages:
        if msg.get("role") != "user":
            continue
        content = msg.get("content", "")
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get("type") == "tool_result":
                    tr_content = item.get("content", "")
                    preview = tr_content[:100] if isinstance(tr_content, str) else str(tr_content)[:100]
                    breakdown["tool_results"].append({
                        "tool_use_id": item.get("tool_use_id", ""),
                        "preview": preview,
                    })

    return breakdown


@app.route("/api/requests/<int:record_id>/context")
def api_request_context(record_id):
    record = load_record_by_id(record_id)
    if not record:
        return jsonify({"error": "not found"}), 404

    body = record.get("request", {}).get("body", {})
    if not isinstance(body, dict):
        return jsonify({"sections": [], "total_chars": 0, "breakdown": {}})

    sections = []

    # System Prompt
    system = body.get("system", "")
    if isinstance(system, list):
        for i, s in enumerate(system):
            if isinstance(s, dict):
                text = s.get("text", "")
                label, is_fixed = _smart_system_label(text, i)
                sections.append({
                    "type": "system",
                    "label": label,
                    "chars": len(text),
                    "content": text,
                    "is_fixed": is_fixed,
                })
            elif isinstance(s, str):
                sections.append({
                    "type": "system",
                    "label": f"System Prompt #{i+1}",
                    "chars": len(s),
                    "content": s,
                })
    elif isinstance(system, str) and system:
        sections.append({
            "type": "system",
            "label": "System Prompt",
            "chars": len(system),
            "content": system,
        })

    # Messages
    messages = body.get("messages", [])
    for i, msg in enumerate(messages):
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if isinstance(content, list):
            text = json.dumps(content, ensure_ascii=False)
        elif isinstance(content, str):
            text = content
        else:
            text = str(content)

        # Smart label for messages
        label = f"[{role}] Message #{i+1}"
        is_fixed = False
        if role == "user" and "system-reminder" in text:
            label = "[user] CLAUDE.md + Memory + Rules"
        elif role == "user" and "tool_result" in text:
            label = "[user] Tool Result"
        elif role == "user" and "stepped away" in text:
            label = "[user] Recap Request"
        elif role == "system" and "Available agent" in text:
            label = "[system] Agent 类型 + Skills 列表（半固定）"
            is_fixed = True
        elif role == "assistant" and "tool_use" in text:
            label = "[assistant] Tool Call"
        elif role == "assistant":
            label = "[assistant] Response"

        sections.append({
            "type": "message",
            "label": label,
            "role": role,
            "chars": len(text),
            "content": text,
            "is_fixed": is_fixed,
        })

    # Tools
    tools = body.get("tools", [])
    if tools:
        tools_text = json.dumps(tools, ensure_ascii=False)
        sections.append({
            "type": "tools",
            "label": f"Tools 定义（{len(tools)} 个，固定）",
            "chars": len(tools_text),
            "content": tools_text,
            "tool_names": [t.get("name", "?") for t in tools],
            "is_fixed": True,
        })

    total_chars = sum(s["chars"] for s in sections)

    # === Detailed breakdown ===
    breakdown = _extract_breakdown(body, messages)

    return jsonify({
        "sections": sections,
        "total_chars": total_chars,
        "total_tokens_estimate": total_chars // 4,
        "breakdown": breakdown,
    })


@app.route("/api/stats")
def api_stats():
    records = load_all_records()
    total = len(records)
    if total == 0:
        return jsonify({"total": 0, "models": {}, "avg_elapsed_ms": 0})

    models = {}
    total_elapsed = 0
    for r in records:
        model = r.get("model", "unknown")
        models[model] = models.get(model, 0) + 1
        total_elapsed += r.get("elapsed_ms", 0)

    return jsonify({
        "total": total,
        "models": models,
        "avg_elapsed_ms": total_elapsed // total if total else 0,
    })


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    # SPA fallback: serve index.html for client-side routes
    file_path = os.path.join(STATIC_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(STATIC_DIR, filename)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    print("")
    print("  [AgentLens / AI探针] Web 服务已启动！")
    print(f"  请在浏览器访问: http://localhost:{VIEWER_PORT}")
    print("")
    print("  提示: 此窗口可最小化到后台，不要关闭。")
    print("")
    app.run(host="127.0.0.1", port=VIEWER_PORT, debug=False, threaded=True)
