# Déploiement d'OptiStock sur un VPS Contabo

Architecture (tout tourne dans Docker, un seul port public : 80/443) :

```
Internet ──► Caddy (HTTPS auto) ──► web : Nginx + React ──┬─► /api, /uploads, /ws ──► backend : Node/Express ──► db : PostgreSQL
                                                            └─► fichiers statiques               │
                                                                                                └──► ai : FastAPI (lecture seule sur la base)
```

| Service   | Image / dossier          | Données persistantes (volume) |
| --------- | ------------------------ | ----------------------------- |
| `db`      | postgres:17-alpine       | `db-data`                     |
| `backend` | `backend/Dockerfile`     | `uploads` (photos)            |
| `ai`      | `ai-service/Dockerfile`  | `ai-models`                   |
| `web`     | `frontend/Dockerfile`    | —                             |
| `caddy`   | caddy:2-alpine           | `caddy-data` (certificats)    |

Les migrations Prisma sont appliquées automatiquement au démarrage du backend.

---

## 1. Préparer le serveur (une seule fois)

VPS conseillé : Ubuntu 24.04, 2 vCPU / 4 Go RAM minimum (l'entraînement IA consomme de la mémoire).

```bash
ssh root@IP_DU_SERVEUR

# Mises à jour + pare-feu
apt update && apt upgrade -y
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable

# Docker (script officiel)
curl -fsSL https://get.docker.com | sh
docker compose version
```

> Docker publie ses ports en contournant `ufw` : seul Caddy expose des ports
> (80/443) dans `docker-compose.yml` ; la base n'est jamais exposée.

Conseillé : créer un utilisateur non-root avec accès Docker et une connexion par clé SSH.

## 2. Nom de domaine (pour le HTTPS)

Chez votre registrar, créer un enregistrement DNS **A** :
`optistock.mondomaine.mg → IP_DU_SERVEUR`. Vérifier avec `ping optistock.mondomaine.mg`.

Sans domaine, l'application fonctionne en HTTP par l'IP (voir l'étape 4).

## 3. Envoyer le code

Avec Git (recommandé) :

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/VOTRE_COMPTE/optistock.git
cd optistock
```

Ou depuis Windows, sans Git (PowerShell, dans `C:\projet`) :

```powershell
scp -r .\Logistique root@IP_DU_SERVEUR:/opt/optistock
```

Ne copiez pas les dossiers `node_modules`, `.venv`, ni les fichiers `.env` de développement.

## 4. Configurer

```bash
cd /opt/optistock
cp .env.example .env
nano .env
```

Générer chaque secret avec `openssl rand -hex 32` (valeurs hexadécimales : elles
sont insérées dans des URL PostgreSQL) pour `POSTGRES_PASSWORD`, `AI_DB_PASSWORD`,
`JWT_SECRET` et `AI_SERVICE_TOKEN`.

| Cas              | `SITE_ADDRESS`              | `PUBLIC_URL`                        | `COOKIE_SECURE` |
| ---------------- | --------------------------- | ----------------------------------- | --------------- |
| Avec domaine     | `optistock.mondomaine.mg`   | `https://optistock.mondomaine.mg`   | `true`          |
| IP seule (HTTP)  | `:80`                       | `http://IP_DU_SERVEUR`              | `false`         |

Renseigner aussi `ACME_EMAIL` (alertes Let's Encrypt).

## 5. Lancer

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh          # build + démarrage
docker compose ps            # tous les services doivent être « running » / « healthy »
docker compose logs -f backend
```

Ouvrir `https://optistock.mondomaine.mg` (ou `http://IP_DU_SERVEUR`).

### Premier compte validateur

Les inscriptions doivent être approuvées par un validateur. Pour créer le premier,
inscrivez-vous depuis la page de connexion puis activez le compte dans la base :

```bash
docker compose exec db psql -U optistock -d optistock \
  -c "UPDATE utilisateur SET role='VALIDATEUR', status_utilisateur='actif' WHERE id_utilisateur_im=VOTRE_IM;"
```

## 6. Reprendre les données existantes (optionnel)

Depuis la machine de développement :

```bash
pg_dump -U postgres -d NOM_BASE_LOCALE --format=custom --no-owner > optistock.dump
scp optistock.dump root@IP_DU_SERVEUR:/opt/optistock/backups/
```

Puis sur le serveur : `./scripts/restore-db.sh backups/optistock.dump`.
Copier aussi les photos (dossier `backend/uploads/` envoyé avec le code) :

```bash
docker compose cp backend/uploads/. backend:/app/uploads/
docker compose exec -u root backend chown -R node:node /app/uploads
```

## 7. Exploitation

| Action                    | Commande                                              |
| ------------------------- | ----------------------------------------------------- |
| Mettre à jour             | `./scripts/deploy.sh`                                 |
| Journaux                  | `docker compose logs -f backend` (ou `ai`, `web`, `caddy`) |
| Redémarrer un service     | `docker compose restart backend`                      |
| Sauvegarder               | `./scripts/backup.sh` → dossier `backups/`            |
| Restaurer la base         | `./scripts/restore-db.sh backups/db_….dump`           |
| Console SQL               | `docker compose exec db psql -U optistock -d optistock` |
| Arrêter                   | `docker compose down` (les volumes sont conservés)    |

Sauvegarde automatique quotidienne (`crontab -e`) :

```
0 2 * * * /opt/optistock/scripts/backup.sh >> /var/log/optistock-backup.log 2>&1
```

Copiez régulièrement le dossier `backups/` hors du serveur (Contabo Object Storage, autre machine).

## Accès réservé au VPN WireGuard

L'application n'écoute que sur l'adresse WireGuard du serveur : elle est invisible
depuis Internet. WireGuard chiffre déjà le trafic, d'où le HTTP simple.

```bash
WG_IP=$(ip -4 -o addr show wg0 | awk '{print $4}' | cut -d/ -f1); echo "$WG_IP"
sed -i "s|^BIND_IP=.*|BIND_IP=$WG_IP|; s|^SITE_ADDRESS=.*|SITE_ADDRESS=:80|; s|^PUBLIC_URL=.*|PUBLIC_URL=http://$WG_IP|; s|^COOKIE_SECURE=.*|COOKIE_SECURE=false|" .env

# Docker doit démarrer après WireGuard, sinon il ne peut pas réserver l'adresse au redémarrage.
systemctl enable wg-quick@wg0
mkdir -p /etc/systemd/system/docker.service.d
printf '[Unit]\nAfter=wg-quick@wg0.service\nWants=wg-quick@wg0.service\n' > /etc/systemd/system/docker.service.d/wireguard.conf
systemctl daemon-reload
```

Ouvrir ensuite `http://ADRESSE_WIREGUARD` depuis un poste connecté au VPN. Le
`AllowedIPs` de ce poste doit inclure cette adresse.

Contrôle : `ss -tlnp | grep -E ':(80|443) '` doit afficher l'adresse WireGuard et
non `0.0.0.0`.

## Variante : utiliser le Nginx du serveur

Si Nginx est installé sur le serveur, il peut remplacer Caddy devant l'application
(`docker-compose.host-nginx.yml` et `deploy/nginx/optistock.conf`). Le conteneur
`web` n'écoute alors que sur `127.0.0.1:8080`.

```bash
echo 'COMPOSE_FILE=docker-compose.yml:docker-compose.host-nginx.yml' >> .env
WG_IP=$(ip -4 -o addr show wg0 | awk '{print $4}' | cut -d/ -f1)
sed "s/WG_IP/$WG_IP/" deploy/nginx/optistock.conf | sudo tee /etc/nginx/sites-available/optistock >/dev/null
sudo ln -sf /etc/nginx/sites-available/optistock /etc/nginx/sites-enabled/optistock
sudo mv /etc/nginx/sites-enabled/default /root/nginx-default.bak   # ferme le port 80 public

# Nginx doit démarrer après WireGuard pour pouvoir réserver l'adresse.
sudo mkdir -p /etc/systemd/system/nginx.service.d
printf '[Unit]
After=wg-quick@wg0.service
Wants=wg-quick@wg0.service
' | sudo tee /etc/systemd/system/nginx.service.d/wireguard.conf
sudo systemctl daemon-reload
sudo nginx -t && sudo systemctl restart nginx
./scripts/deploy.sh
```

## Dépannage

- **Connexion impossible / renvoyé à l'écran de connexion** : en HTTP par IP,
  `COOKIE_SECURE` doit valoir `false` ; avec HTTPS, `true`. Puis `./scripts/deploy.sh`.
- **Pas de certificat HTTPS** : le DNS doit pointer vers le serveur et les ports
  80/443 être ouverts ; voir `docker compose logs caddy`.
- **« Service IA indisponible »** : `docker compose logs ai` ; vérifier
  `AI_SERVICE_TOKEN` et `AI_DB_PASSWORD`.
- **Mot de passe de la base modifié après le premier lancement** : le script
  d'initialisation ne s'exécute qu'à la création du volume `db-data`. Changez le
  mot de passe dans PostgreSQL (`ALTER ROLE … PASSWORD …`) ou recréez le volume
  (perte des données).
