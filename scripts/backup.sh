#!/usr/bin/env bash
# Sauvegarde de la base PostgreSQL et des fichiers envoyés (photos).
# Exemple de cron quotidien à 2 h :  0 2 * * * /opt/optistock/scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

stamp=$(date +%Y-%m-%d_%H%M)
mkdir -p backups
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-optistock}" -d "${POSTGRES_DB:-optistock}" --format=custom > "backups/db_${stamp}.dump"
docker compose run --rm --no-deps --user root -v "$(pwd)/backups:/backups" --entrypoint tar backend czf "/backups/uploads_${stamp}.tar.gz" -C /app uploads
# Conserver 14 jours de sauvegardes
find backups -type f -mtime +14 -delete
echo "Sauvegarde terminée : backups/db_${stamp}.dump et backups/uploads_${stamp}.tar.gz"
