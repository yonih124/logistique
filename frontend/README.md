# OptiStock — Frontend

Interface React 19 + Vite, navigation par URL (React Router), pages chargées à la demande.

## Démarrer en local

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173 (le backend doit tourner sur :3000)
```

Vite redirige `/api`, `/uploads` et `/ws` vers le backend (`VITE_DEV_BACKEND`).

| Commande          | Rôle                               |
| ----------------- | ---------------------------------- |
| `npm run dev`     | serveur de développement           |
| `npm run build`   | build de production dans `dist/`   |
| `npm run preview` | prévisualise le build              |
| `npm run lint`    | vérification ESLint                |

## Structure

```
src/
├── main.jsx                 point d'entrée, feuilles de style globales
├── app/
│   ├── App.jsx              Router + providers
│   ├── AppRoutes.jsx        routes, protection par rôle, chargement différé
│   ├── routes.js            ★ table des pages : URL, titre, rôles, menus
│   └── providers/
│       ├── AuthProvider.jsx      session (restaurée via /auth/me)
│       └── FeedbackProvider.jsx  messages succès / erreur (useNotify)
├── config/env.js            URL de l'API et du WebSocket
├── lib/axios.js             client HTTP (cookies, erreurs, session expirée)
├── services/                appels à l'API, un fichier par domaine
├── hooks/useAppNavigate.js  naviguer par identifiant de page
├── components/
│   ├── layout/AppShell.jsx  menu latéral, barre du haut, notifications
│   └── ui/                  composants réutilisables (Icon, Logo, PageHeader, Loader…)
├── features/                un dossier par fonctionnalité métier
│   ├── auth/  dashboard/  requests/  catalogue/  entries/  deliveries/
│   ├── history/  receipts/  references/  users/  profile/  messages/
│   └── dispatch/  forecast/  notifications/
├── pages/NotFoundPage.jsx
├── styles/                  base, app, theme, enhancements (dans cet ordre)
└── assets/  brand/ (logos)  icons/ (icônes du menu)
```

## Ajouter une page

1. Créer le composant dans `src/features/<domaine>/`.
2. Déclarer la page dans `PAGES` de `src/app/routes.js` (URL, titre, rôles).
3. L'ajouter au menu (`SIDEBAR` ou `TOP_NAV`) et à `views` dans `AppRoutes.jsx`.

Les identifiants de page (`requests`, `catalogue`…) sont utilisés par le backend
pour les liens des notifications et du tableau de bord : ne pas les renommer.

## Production

Le `Dockerfile` construit l'application puis la sert avec Nginx, qui fait aussi
reverse proxy vers l'API (`nginx.conf`). Voir `DEPLOIEMENT.md` à la racine du projet.
