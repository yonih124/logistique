#!/usr/bin/env bash
# Mise à jour sur le serveur : récupère le code, reconstruit et redémarre les conteneurs.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Fichier .env manquant : cp .env.example .env puis complétez-le."; exit 1; }
if grep -q "changez-moi" .env; then echo "Le fichier .env contient encore des valeurs « changez-moi »."; exit 1; fi

if [ -d .git ]; then git pull --ff-only; fi
docker compose build --pull
docker compose up -d --remove-orphans
docker image prune -f
docker compose ps
