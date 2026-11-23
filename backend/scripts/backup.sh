#!/usr/bin/env sh
# Usage: MONGO_URI=... ./scripts/backup.sh   (cron: 0 3 * * * cd /opt/qr/backend && ./scripts/backup.sh)
set -e
DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DIR"
mongodump --uri="$MONGO_URI" --archive="$DIR/qr-$(date +%F-%H%M).gz" --gzip
find "$DIR" -name 'qr-*.gz' -mtime +14 -delete
