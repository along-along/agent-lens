# -*- coding: utf-8 -*-
"""Migrate old ccMonitor logs to new JSONL format."""
import os
import sys
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OLD_LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ccMonitor", "ccMonitor_logs")
NEW_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
JSONL_FILE = os.path.join(NEW_DATA_DIR, "requests.jsonl")


def migrate():
    os.makedirs(NEW_DATA_DIR, exist_ok=True)
    if not os.path.exists(OLD_LOG_DIR):
        print("Old log dir not found: " + OLD_LOG_DIR)
        return
    req_files = []
    for date_dir in sorted(os.listdir(OLD_LOG_DIR)):
        dir_path = os.path.join(OLD_LOG_DIR, date_dir)
        if not os.path.isdir(dir_path):
            continue
        for f in sorted(os.listdir(dir_path)):
            if f.endswith("-req.json"):
                req_files.append(os.path.join(dir_path, f))
    if not req_files:
        print("No old log files found")
        return
    count = 0
    with open(JSONL_FILE, "w", encoding="utf-8") as out:
        for filepath in req_files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                body = data.get("body", {})
                if not isinstance(body, dict):
                    continue
                if "messages" not in data.get("path", ""):
                    continue
                count += 1
                record = {
                    "id": count,
                    "timestamp": data.get("timestamp", ""),
                    "method": data.get("method", "POST"),
                    "path": data.get("path", ""),
                    "model": body.get("model", "unknown"),
                    "elapsed_ms": 0,
                    "status": 200,
                    "usage": {},
                    "request": {"headers": data.get("headers", {}), "body": body},
                    "response": None,
                }
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
            except Exception as e:
                print("Skip: " + str(e))
    print("Done: " + str(count) + " records -> " + JSONL_FILE)


if __name__ == "__main__":
    migrate()
