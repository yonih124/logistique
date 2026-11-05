#!/usr/bin/env bash
# Restaure une sauvegarde créée par backup.sh :  ./scripts/restore-db.sh backups/db_AAAA-MM-JJ_HHMM.dump
# ATTENTION : remplace le contenu actuel de la base.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
[ -f "${1:-}" ] || { echo "Usage : $0 backups/db_....dump"; exit 1; }
read -r -p "Remplacer la base ${POSTGRES_DB:-optistock} par $1 ? (oui/non) " answer
[ "$answer" = "oui" ] || exit 1
docker compose stop backend ai
docker compose exec -T db pg_restore -U "${POSTGRES_USER:-optistock}" -d "${POSTGRES_DB:-optistock}" --clean --if-exists --no-owner < "$1"
docker compose start backend ai
