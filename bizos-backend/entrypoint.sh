#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec gunicorn main:app \
    --bind 0.0.0.0:8000 \
    --workers "${WEB_CONCURRENCY:-4}" \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120 \
    --keepalive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level warning
