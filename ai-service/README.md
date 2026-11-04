# OptiStock — service IA

React → Node `/api/ai/*` (JWT, dépositaire/validateur) → FastAPI (secret partagé).
Python lit les agrégats PostgreSQL sans modifier les données métier ni appeler d'IA externe.

## Structure

- `app/repository.py` : lecture SQL des quantités demandées par mois/article.
- `app/features.py` : séries, mois sans demandes, variables des mois précédents.
- `app/engine.py` : entraînement, évaluation, prédiction et versionnement.
- `app/main.py` : API et ordonnanceur de réentraînement.
- `models/` : modèles activés et rapports des essais, exclus du versionnement Git.
- `tests/` : tests sans base de données.

## Installation Windows

Installer **Python 3.11 ou 3.12**. Python 3.7 actuellement présent ne suffit pas.
Depuis `ai-service` :

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Configurer `.env` : `DATABASE_URL` vers la même base que Node (idéalement avec un
compte SELECT seulement) et `AI_SERVICE_TOKEN`, secret aléatoire long.
Retirer l'éventuel paramètre Prisma `?schema=public` de l'URL psycopg.
Ne jamais committer les secrets ni charger un fichier joblib provenant d'un utilisateur.

Ajouter dans **backend/.env** puis redémarrer Node :

```dotenv
AI_SERVICE_URL=http://127.0.0.1:8001
AI_SERVICE_TOKEN=le-meme-secret-que-dans-ai-service
```

Lancer Python :

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1
```

Garder un seul worker : ordonnanceur et verrou locaux au processus.
Entraînement au démarrage puis tous les `AI_RETRAIN_DAYS` (7 par défaut), tant que
le processus tourne. Un bouton permet aussi le réentraînement manuel.
En production multi-instance, utiliser un ordonnanceur unique et un verrou partagé.

## Méthode et limites

Prévision du **mois UTC prochain**, basée uniquement sur les mois complets précédents,
par article, tous services confondus. Modèle HistGradientBoostingRegressor partagé :
trois quantités précédentes, moyenne et mois de l'année. Pas de score de confiance inventé.

Le mois en cours est incomplet : le modèle le projette d'abord, puis utilise cette
estimation pour prévoir le mois prochain (deux étapes récursives). La moyenne de
secours reste celle des trois derniers mois complets disponibles. La MAE affichée
évalue les prévisions historiques à un pas, pas la précision de cet horizon à deux pas.
L'interface présente les quantités demandées estimées, sans écart de réapprovisionnement.

Minimum technique : neuf mois cibles après trois retards (12 mois de profondeur globale)
et 30 observations exploitables. Les séries courtes utilisent une moyenne indicative ;
les articles sans historique affichent « Historique insuffisant ».
Les mois absents après la première observation sont comptés à zéro : vérifier que les
données historiques sont complètes et exclure les données de démonstration avant usage réel.

Test chronologique sur les trois derniers mois, à un pas (les observations antérieures
à chaque cible sont disponibles). Le candidat doit battre la moyenne mobile selon la MAE,
puis le modèle actif sur les mêmes mois **non vus par ce modèle**. Sinon il est conservé.
Après promotion, réentraînement sur tous les mois complets. Il faut donc trois nouveaux
mois après la coupure du modèle actif pour une nouvelle comparaison fiable.
Un essai hebdomadaire ne garantit ni amélioration ni promotion hebdomadaire.
Les anciens modèles activés et les rapports d'évaluation restent dans `models/`.

Le modèle prévoit les demandes, pas la consommation ou les décisions de validation.
Node ajoute le stock actuel pour un écart indicatif uniquement : il ne tient pas compte
des demandes déjà satisfaites ce mois-ci, des livraisons futures ou des délais fournisseurs.
Aucun réapprovisionnement ni retrait de stock automatique.

## Tests

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Vérifier ensuite avec les services lancés : rôle client refusé, Python indisponible,
base vide, historique court, entraînement avec historique suffisant et comparaison des versions.

Références officielles :
- https://scikit-learn.org/stable/auto_examples/applications/plot_time_series_lagged_features.html
- https://fastapi.tiangolo.com/deployment/manually/
