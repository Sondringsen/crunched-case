#!/bin/bash
# Run uvicorn with HTTPS using the mkcert certs
CERT_DIR="../certs"
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ssl-keyfile "$CERT_DIR/localhost-key.pem" \
  --ssl-certfile "$CERT_DIR/localhost.pem" \
  --reload
