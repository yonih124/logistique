#!/bin/sh
# Exécuté une seule fois, à la création du volume PostgreSQL.
# Crée le compte en lecture seule utilisé par le service IA.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v ai_user="$AI_DB_USER" -v ai_password="$AI_DB_PASSWORD" -v owner="$POSTGRES_USER" -v db="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"ai_user" LOGIN PASSWORD :'ai_password';
GRANT CONNECT ON DATABASE :"db" TO :"ai_user";
GRANT USAGE ON SCHEMA public TO :"ai_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"ai_user";
-- Les tables créées plus tard par les migrations Prisma seront aussi lisibles.
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public GRANT SELECT ON TABLES TO :"ai_user";
SQL
