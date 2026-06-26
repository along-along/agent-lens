# -*- coding: utf-8 -*-
"""
AgentLens (AI探针) - Proxy v1.2
The DevTools for AI Agents.

Intercept AI Agent API requests, save to data/requests.jsonl.
Correctly handles SSE streaming + request context lifecycle.

Usage: python proxy.py
Then: set ANTHROPIC_BASE_URL=http://localhost:8899
"""

import os
import sys
import json
import time
import threading
from datetime import datetime

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from flask import Flask, request, Response
import requests as http_client

# Config
LISTEN_PORT = int(os.environ.get("PROXY_PORT", "8899"))
TARGET_BASE = os.environ.get("PROXY_TARGET", "https://api.deepseek.com/anthropic")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
JSONL_FILE = os.path.join(DATA_DIR, "requests.jsonl")

os.makedirs(DATA_DIR, exist_ok=True)

# Counter
_lock = threading.Lock()
_counter = 0


def _next_id():
    global _counter
    with _lock:
        _counter += 1
        return _counter


def _init_counter():
    global _counter
    if os.path.exists(JSONL_FILE):
        try:
            with open(JSONL_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            record = json.loads(line)
                            _counter = max(_counter, record.get("id", 0))
                        except json.JSONDecodeError:
                            pass
        except Exception:
            pass


_init_counter()

# Flask
app = Flask(__name__)

import logging
logging.getLogger("werkzeug").setLevel(logging.WARNING)

SENSITIVE_HEADERS = {
    "x-api-key", "authorization", "anthropic-auth-token",
    "x-mcp-token", "cookie", "x-auth-token"
}


def redact_headers(headers):
    return {
        k: ("***REDACTED***" if k.lower() in SENSITIVE_HEADERS else v)
        for k, v in headers.items()
    }


def parse_body(body_bytes):
    if not body_bytes:
        return None
    for enc in ("utf-8", "gbk", "utf-8-sig", "latin-1"):
        try:
            text = body_bytes.decode(enc)
            return json.loads(text)
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    return body_bytes.decode("utf-8", errors="replace")


def save_record(record):
    with _lock:
        with open(JSONL_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def extract_model(body):
    if isinstance(body, dict):
        return body.get("model", "unknown")
    return "unknown"


@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def proxy_handler(path):
    target_url = f"{TARGET_BASE}/{path}" if path else TARGET_BASE
    body_bytes = request.get_data()
    body = parse_body(body_bytes)
    start_time = time.time()

    # Capture request context BEFORE entering generator
    req_method = request.method
    req_path = path
    req_headers = dict(request.headers)

    # Forward headers (strip hop-by-hop)
    forward_headers = {}
    for k, v in request.headers:
        if k.lower() in ("host", "content-length", "transfer-encoding", "connection"):
            continue
        forward_headers[k] = v

    # Forward request to upstream
    try:
        resp = http_client.request(
            method=req_method,
            url=target_url,
            headers=forward_headers,
            data=body_bytes,
            stream=True,
            timeout=600,
        )
    except http_client.exceptions.RequestException as e:
        print(f"[Proxy] Error: {e}")
        return {"error": str(e)}, 502

    # Detect if this is an SSE streaming response
    content_type = resp.headers.get("content-type", "")
    is_sse = "text/event-stream" in content_type

    # Collect response for logging
    response_chunks = []
    resp_headers_dict = dict(resp.headers)
    resp_status = resp.status_code

    def generate():
        try:
            if is_sse:
                # SSE: iterate line by line for immediate delivery
                for line in resp.iter_lines(decode_unicode=False):
                    response_chunks.append(line + b"\n")
                    yield line + b"\n\n"
            else:
                # Non-streaming
                for chunk in resp.iter_content(chunk_size=4096):
                    if chunk:
                        response_chunks.append(chunk)
                        yield chunk
        except Exception as e:
            print(f"[Proxy] Stream error: {e}")
        finally:
            resp.close()
            # Save log in background (uses captured variables, not request context)
            if req_method == "POST" and "messages" in req_path:
                threading.Thread(
                    target=_save_record_async,
                    args=(body, req_method, req_path, req_headers,
                          start_time, resp_status, resp_headers_dict,
                          list(response_chunks)),
                    daemon=True
                ).start()

    def _save_record_async(req_body, method, r_path, r_headers,
                           t_start, status_code, r_resp_headers, chunks):
        elapsed_ms = int((time.time() - t_start) * 1000)
        response_body = None
        try:
            full_resp = b"".join(chunks)
            resp_text = full_resp.decode("utf-8", errors="replace")
            if "data:" in resp_text:
                events = []
                for resp_line in resp_text.split("\n"):
                    if resp_line.startswith("data: "):
                        data_str = resp_line[6:].strip()
                        if data_str and data_str != "[DONE]":
                            try:
                                events.append(json.loads(data_str))
                            except json.JSONDecodeError:
                                pass
                response_body = {"_streaming": True, "events": events}
            else:
                try:
                    response_body = json.loads(resp_text)
                except json.JSONDecodeError:
                    response_body = {"_raw": resp_text[:5000]}
        except Exception:
            pass

        usage = {
            "input_tokens": r_resp_headers.get("x-usage-input-tokens", ""),
            "output_tokens": r_resp_headers.get("x-usage-output-tokens", ""),
        }

        record = {
            "id": _next_id(),
            "timestamp": datetime.now().isoformat(),
            "method": method,
            "path": r_path,
            "model": extract_model(req_body) if isinstance(req_body, dict) else "unknown",
            "elapsed_ms": elapsed_ms,
            "status": status_code,
            "usage": usage,
            "request": {
                "headers": redact_headers(r_headers),
                "body": req_body,
            },
            "response": {
                "headers": r_resp_headers,
                "body": response_body,
                "status": status_code,
            },
        }

        save_record(record)
        model_name = record["model"]
        input_t = usage.get("input_tokens", "?")
        output_t = usage.get("output_tokens", "?")
        print(f"[Proxy] #{record['id']} | {model_name} | {input_t}->{output_t} | {elapsed_ms}ms")

    # Build response headers (transparent proxy)
    out_headers = {}
    for k, v in resp.headers.items():
        if k.lower() in ("transfer-encoding", "connection", "keep-alive", "content-encoding"):
            continue
        out_headers[k] = v

    return Response(
        generate(),
        status=resp.status_code,
        headers=out_headers,
        direct_passthrough=True,
    )


if __name__ == "__main__":
    print("=" * 55)
    print("  AgentLens (AI探针) - Proxy v1.2")
    print("  The DevTools for AI Agents.")
    print("=" * 55)
    print(f"  Listen : http://localhost:{LISTEN_PORT}")
    print(f"  Target : {TARGET_BASE}")
    print(f"  Data   : {JSONL_FILE}")
    print("=" * 55)
    print(f"  Usage:")
    print(f"    set ANTHROPIC_BASE_URL=http://localhost:{LISTEN_PORT}")
    print(f"    claude")
    print("=" * 55)
    app.run(host="127.0.0.1", port=LISTEN_PORT, debug=False, threaded=True)
