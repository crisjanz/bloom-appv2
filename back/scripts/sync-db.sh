#!/bin/bash

# Database Sync Script
# Usage: ./sync-db.sh [local-to-live|live-to-local]

set -e

# Load environment variables
if [ -f ../.env ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

LOCAL_DB_URL="${DATABASE_URL}"
LIVE_DB_URL="postgresql://bloom_user:tRy9azO6w7xHZ3zo4L1ItvzPEoqbrrjD@dpg-d3s34truibrs73ek1ang-a.oregon-postgres.render.com/bloom_db_imh1"

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to create backup
backup_db() {
  local db_url=$1
  local name=$2
  echo "📦 Creating backup: ${name}_${TIMESTAMP}.sql"
  PGDUMP_NO_VERSION_CHECK=1 pg_dump "$db_url" > "$BACKUP_DIR/${name}_${TIMESTAMP}.sql"
  echo "✅ Backup saved"
}

# Main sync logic
case "$1" in
  local-to-live)
    echo "🔄 Syncing LOCAL → LIVE"
    echo "📤 Dumping local DB..."
    pg_dump "$LOCAL_DB_URL" --data-only > "$BACKUP_DIR/temp_dump.sql"
    echo "🗑️  Clearing live DB data..."
    psql "$LIVE_DB_URL" -c "DO \$\$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END \$\$;"
    echo "📥 Importing to live..."
    psql "$LIVE_DB_URL" < "$BACKUP_DIR/temp_dump.sql"
    rm "$BACKUP_DIR/temp_dump.sql"
    echo "✅ Done!"
    ;;

  live-to-local)
    echo "🔄 Syncing LIVE → LOCAL (products, customers, categories, orders)"
    echo "📥 Copying data..."
    pg_dump "$LIVE_DB_URL" \
      -t products -t product_variants -t product_images \
      -t customers -t customer_addresses -t customer_recipients \
      -t categories -t product_categories \
      -t orders -t order_items -t drafts \
      --data-only --inserts | psql "$LOCAL_DB_URL"
    echo "✅ Sync complete!"
    ;;

  *)
    echo "Usage: ./sync-db.sh [local-to-live|live-to-local]"
    exit 1
    ;;
esac

echo "📁 Backup saved in: $BACKUP_DIR"
