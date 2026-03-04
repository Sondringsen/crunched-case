#!/bin/bash
# Backend runs on plain HTTP — Next.js proxies /api/* to it server-side,
# so the task pane never makes a direct cross-origin HTTPS call.
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload
