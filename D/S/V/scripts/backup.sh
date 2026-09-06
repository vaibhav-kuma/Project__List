#!/bin/bash
set -euo pipefail

# ── Configuration ────────────────────────────────────
BACKUP_DIR="/backups/ninor"
S3_BUCKET="ninor-production-backups"
RETENTION_DAYS=30
DB_CONTAINER="ninor-postgres"
DB_NAME="ninor"
DB_USER="ninor"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ninor_db_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# ── Colors ───────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
info()  { echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn()  { echo -e "${YELLOW}[$(date +%H:%M:%S)] $*${NC}"; }
err()   { echo -e "${RED}[$(date +%H:%M:%S)] $*${NC}"; }

# ── Pre-flight ──────────────────────────────────────
check_prereqs() {
    command -v pg_dump >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || {
        err "Neither pg_dump nor docker found"; exit 1
    }
    command -v aws >/dev/null 2>&1 || { err "AWS CLI required"; exit 1; }
    command -v gpg >/dev/null 2>&1 || { err "GPG required for encryption"; exit 1; }
    mkdir -p "$BACKUP_DIR"
}

# ── Dump database ───────────────────────────────────
dump_db() {
    info "Dumping database ${DB_NAME}..."

    if docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
        docker exec "$DB_CONTAINER" pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose \
            --no-owner \
            --no-acl \
            -f "/tmp/${TIMESTAMP}_backup.dump"

        docker cp "${DB_CONTAINER}:/tmp/${TIMESTAMP}_backup.dump" "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump"
        docker exec "$DB_CONTAINER" rm "/tmp/${TIMESTAMP}_backup.dump"
        info "Database dumped via Docker"
    else
        PGPASSWORD="${DB_PASSWORD}" pg_dump \
            -h "${DB_HOST:-localhost}" \
            -p "${DB_PORT:-5432}" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose \
            --no-owner \
            --no-acl \
            -f "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump"
        info "Database dumped directly"
    fi

    # Also dump global objects (roles, tablespaces)
    if docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
        docker exec "$DB_CONTAINER" pg_dumpall \
            -U "$DB_USER" \
            --globals-only \
            -f "/tmp/${TIMESTAMP}_globals.sql"
        docker cp "${DB_CONTAINER}:/tmp/${TIMESTAMP}_globals.sql" "${BACKUP_DIR}/ninor_globals_${TIMESTAMP}.sql"
        docker exec "$DB_CONTAINER" rm "/tmp/${TIMESTAMP}_globals.sql"
    fi
}

# ── Encrypt ──────────────────────────────────────────
encrypt_backup() {
    info "Encrypting backup..."
    gpg --encrypt \
        --recipient "admin@ninor.app" \
        --trust-model always \
        --output "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg" \
        "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump"
    rm "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump"
    info "Backup encrypted"
}

# ── Upload to S3 ────────────────────────────────────
upload_to_s3() {
    info "Uploading to S3 (${S3_BUCKET})..."

    aws s3 cp "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg" "s3://${S3_BUCKET}/database/${TIMESTAMP}/"
    aws s3 cp "${BACKUP_DIR}/ninor_globals_${TIMESTAMP}.sql" "s3://${S3_BUCKET}/database/${TIMESTAMP}/"

    # Also upload latest copy for quick restore
    aws s3 cp "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg" "s3://${S3_BUCKET}/database/latest.dump.gpg"

    info "Upload complete"
}

# ── Cleanup old backups ─────────────────────────────
cleanup_old() {
    info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "ninor_db_*" -type f -mtime "+${RETENTION_DAYS}" -delete
    find "$BACKUP_DIR" -name "ninor_globals_*" -type f -mtime "+${RETENTION_DAYS}" -delete

    # Remove old S3 backups
    aws s3 ls "s3://${S3_BUCKET}/database/" | while read -r line; do
        create_date=$(echo "$line" | awk '{print $1" "$2}')
        create_ts=$(date -d "$create_date" +%s)
        cutoff_ts=$(date -d "-${RETENTION_DAYS} days" +%s)
        if [ "$create_ts" -lt "$cutoff_ts" ]; then
            folder=$(echo "$line" | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/database/${folder}" --recursive
        fi
    done

    info "Cleanup complete"
}

# ── Verify backup ───────────────────────────────────
verify_backup() {
    info "Verifying backup integrity..."
    if gpg --verify "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg" 2>/dev/null; then
        info "Backup signature verified"
    else
        warn "Backup not signed (backup still saved)"
    fi

    local size
    size=$(stat -f%z "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg" 2>/dev/null || \
           stat -c%s "${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg" 2>/dev/null)
    if [ "$size" -gt 1000 ]; then
        info "Backup size: $(numfmt --to=iec $size)"
    else
        err "Backup too small (${size} bytes)"
        exit 1
    fi
}

# ── Restore ──────────────────────────────────────────
restore() {
    local restore_file="${1:-latest}"
    info "Restoring from: ${restore_file}"

    if [ "$restore_file" = "latest" ]; then
        aws s3 cp "s3://${S3_BUCKET}/database/latest.dump.gpg" "${BACKUP_DIR}/restore.dump.gpg"
        restore_file="${BACKUP_DIR}/restore.dump.gpg"
    fi

    gpg --decrypt "$restore_file" > "${BACKUP_DIR}/restore.dump"

    if docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
        docker cp "${BACKUP_DIR}/restore.dump" "${DB_CONTAINER}:/tmp/restore.dump"
        docker exec "$DB_CONTAINER" pg_restore \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --clean \
            --if-exists \
            --no-owner \
            --no-acl \
            /tmp/restore.dump
    else
        pg_restore \
            -h "${DB_HOST:-localhost}" \
            -p "${DB_PORT:-5432}" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --clean \
            --if-exists \
            --no-owner \
            --no-acl \
            "${BACKUP_DIR}/restore.dump"
    fi

    rm -f "${BACKUP_DIR}/restore.dump" "${BACKUP_DIR}/restore.dump.gpg"
    info "Restore complete"
}

# ── Main ────────────────────────────────────────────
main() {
    echo "═══════════════════════════════════════"
    echo "  Ninor Database Backup"
    echo "  $(date)"
    echo "═══════════════════════════════════════"

    case "${1:-backup}" in
        backup)
            check_prereqs
            dump_db
            encrypt_backup
            upload_to_s3
            verify_backup
            cleanup_old
            info "Backup complete: ${BACKUP_DIR}/ninor_db_${TIMESTAMP}.dump.gpg"
            ;;
        restore)
            check_prereqs
            restore "${2:-latest}"
            ;;
        *)
            echo "Usage: $0 {backup|restore [file]}"
            echo ""
            echo "  backup          Create database backup"
            echo "  restore [file]  Restore from latest or specific file"
            exit 1
            ;;
    esac
}

main "$@"
