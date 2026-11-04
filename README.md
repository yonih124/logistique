# OptiStock — Gestion de stock

| Dossier       | Rôle                                   | Technologies                     |
| ------------- | -------------------------------------- | -------------------------------- |
| `frontend/`   | interface web                          | React 19, Vite, React Router     |
| `backend/`    | API REST + WebSocket temps réel        | Node 24, Express 5, Prisma 7     |
| `ai-service/` | prévision des demandes                 | Python 3.12, FastAPI, scikit-learn |

## Lancer toute l'application avec Docker

```bash
cp .env.example .env      # puis remplacer les valeurs « changez-moi »
docker compose up -d --build
```

Application : http://localhost (les migrations de la base sont appliquées automatiquement).

### Données de démonstration

```bash
docker compose exec backend node prisma/seed.js --force   # ⚠ efface puis recharge toute la base
```

24 mois d'activité cohérente (≈ 1 450 demandes, 160 articles, 8 services), puis
réentraîner le modèle depuis **Prévisions IA → Réentraîner le modèle** (dépositaire ou validateur).

| Rôle        | Numéro IM         | Mot de passe       |
| ----------- | ----------------- | ------------------ |
| Validateur  | 100001            | `Validateur@2026`  |
| Dépositaire | 100002, 100003    | `Depositaire@2026` |
| Client      | 200001 → 200008   | `Client@2026`      |

Les clients 200001 à 200008 correspondent chacun à un service (Solde, Pensions,
Informatique, Administratif et Financier, Personnel, Juridique, Secrétariat
Général, Moyens Généraux). Les IM 300001 à 300003 sont des inscriptions en attente.
À ne pas utiliser en production réelle : ces mots de passe sont publics.

## Développement sans Docker

Voir `backend/readme`, `frontend/README.md` et `ai-service/README.md`.

## Mise en production

Guide pas à pas pour un VPS Contabo : [DEPLOIEMENT.md](DEPLOIEMENT.md).
