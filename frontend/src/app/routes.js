/**
 * Table unique des pages de l'application.
 * L'identifiant (`id`) reste la clé stable utilisée par le backend
 * (cibles des notifications, liens du tableau de bord) et par `useAppNavigate`.
 */
export const ROLES = {
  CLIENT: 'Client',
  VALIDATOR: 'Validateur',
  DEPOSITARY: 'Dépositaire',
}

const { CLIENT, VALIDATOR, DEPOSITARY } = ROLES
const ALL = [CLIENT, VALIDATOR, DEPOSITARY]
const MANAGERS = [VALIDATOR, DEPOSITARY]

export const PAGES = {
  dashboard: { path: '/tableau-de-bord', roles: ALL, title: 'Tableau de bord', subtitle: 'Statistiques et activité de votre espace en temps réel', hideHeader: true },
  requests: {
    path: '/demandes', roles: ALL, title: 'Demandes', subtitle: 'Suivez et gérez les demandes de stock',
    byRole: { [CLIENT]: { title: 'Mes demandes' }, [VALIDATOR]: { title: 'Demandes à valider', subtitle: 'Examinez les demandes et ajustez les quantités accordées' }, [DEPOSITARY]: { title: 'Demandes à valider', subtitle: 'Examinez les demandes et ajustez les quantités accordées' } },
  },
  forms: { path: '/demandes/nouvelle', roles: [CLIENT], title: 'Nouvelle demande', subtitle: 'Créez une demande d’articles pour votre service' },
  messages: { path: '/messagerie', roles: ALL, title: 'Messagerie', subtitle: 'Échangez au sujet des demandes entre client et validateur' },
  catalogue: { path: '/catalogue', roles: MANAGERS, title: 'Catalogue des articles', subtitle: 'Gérez le référentiel et les niveaux de stock' },
  entries: { path: '/entrees', roles: MANAGERS, title: 'Entrées en stock', subtitle: 'Enregistrez les livraisons et leurs justificatifs' },
  entryHistory: { path: '/entrees/historique', roles: MANAGERS, title: 'Historique des entrées en stock', subtitle: 'Consultez les articles reçus et les photos justificatives' },
  deliveryNotes: { path: '/bons-de-sortie', roles: [DEPOSITARY], title: 'Bons de sortie', subtitle: 'Vérifiez et imprimez les bons en attente' },
  history: {
    path: '/historique', roles: ALL, title: 'Historique', subtitle: 'Consultez la traçabilité des opérations',
    byRole: { [CLIENT]: { title: 'Mon historique' }, [DEPOSITARY]: { title: 'Historique des livraisons' } },
  },
  receipts: { path: '/receptions', roles: [CLIENT], title: 'Réception des colis', subtitle: 'Vérifiez et confirmez les articles remis à votre service' },
  references: { path: '/referentiels', roles: [DEPOSITARY], title: 'Référentiels', subtitle: 'Gérez les comptes et les unités de gestion' },
  ai: { path: '/previsions', roles: MANAGERS, title: 'Prévisions IA', subtitle: 'Anticipez les nouvelles demandes et les besoins en stock' },
  users: { path: '/utilisateurs', roles: [VALIDATOR], title: 'Comptes utilisateurs', subtitle: 'Examinez les inscriptions en attente d’autorisation' },
  serviceStock: { path: '/stock-service', roles: [CLIENT], title: 'Stock du service', subtitle: 'Consultez les quantités livrées, réparties et encore disponibles' },
  dispatch: { path: '/dispatch', roles: [CLIENT], title: 'Dispatch interne', subtitle: 'Répartissez les articles entre vos divisions et bureaux' },
  dispatchTracking: { path: '/suivi-dispatch', roles: MANAGERS, title: 'Suivi des dispatchs', subtitle: 'Suivez les répartitions effectuées par les services bénéficiaires' },
  profile: { path: '/profil', roles: ALL, title: 'Mon profil', subtitle: 'Consultez vos informations et sécurisez votre compte' },
}

export const LOGIN_PATH = '/connexion'
export const HOME_PATH = PAGES.dashboard.path

/** Titre et sous-titre d'une page, adaptés au rôle de l'utilisateur. */
export function pageMeta(id, role) {
  const page = PAGES[id] || PAGES.dashboard
  return { ...page, ...page.byRole?.[role] }
}

export const canAccess = (id, role) => Boolean(PAGES[id]?.roles.includes(role))

/**
 * Menu latéral par rôle, regroupé en sections.
 * Chaque entrée : [id de page, libellé affiché].
 */
export const SIDEBAR = {
  [CLIENT]: [
    { label: 'Principal', items: [['dashboard', 'Tableau de bord'], ['forms', 'Nouvelle demande'], ['requests', 'Mes demandes'], ['messages', 'Messagerie']] },
    { label: 'Mon service', items: [['serviceStock', 'Stock du service'], ['dispatch', 'Dispatch interne'], ['receipts', 'Réception des colis']] },
    { label: 'Suivi', items: [['history', 'Mon historique']] },
  ],
  [VALIDATOR]: [
    { label: 'Principal', items: [['dashboard', 'Tableau de bord']] },
    { label: 'Administration', items: [['users', 'Comptes utilisateurs']] },
    { label: 'Suivi', items: [['dispatchTracking', 'Suivi des dispatchs'], ['history', 'Historique'], ['entryHistory', 'Historique des entrées'], ['ai', 'Prévisions IA']] },
  ],
  [DEPOSITARY]: [
    { label: 'Principal', items: [['dashboard', 'Tableau de bord'], ['deliveryNotes', 'Bons de sortie']] },
    { label: 'Administration', items: [['references', 'Référentiels']] },
    { label: 'Suivi', items: [['dispatchTracking', 'Suivi des dispatchs'], ['history', 'Historique des livraisons'], ['entryHistory', 'Historique des entrées'], ['ai', 'Prévisions IA']] },
  ],
}

/** Barre d'opérations affichée en haut pour les gestionnaires. */
export const TOP_NAV = {
  [VALIDATOR]: [['requests', 'Demandes à valider'], ['messages', 'Messagerie'], ['entries', 'Entrées en stock'], ['catalogue', 'Catalogue']],
  [DEPOSITARY]: [['requests', 'Demandes à valider'], ['messages', 'Messagerie'], ['entries', 'Entrées en stock'], ['catalogue', 'Catalogue']],
}
