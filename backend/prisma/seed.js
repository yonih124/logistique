/**
 * Données de démonstration OptiStock.
 *
 * Simule 24 mois d'activité en respectant les règles de l'API :
 * entrées en stock → demandes clients → décision du validateur (stock décrémenté,
 * plafond `pourcentage_demande_max`) → bon de sortie imprimé → réception par le
 * client (stock du service) → dispatch aux divisions et sorties internes.
 * Les dernières demandes restent en cours (à valider, bons à imprimer, colis à
 * réceptionner) pour la présentation. L'historique mensuel des demandes sert à
 * entraîner le modèle de prévision.
 *
 * ATTENTION : vide toutes les tables avant de les remplir.
 *   docker compose exec backend node prisma/seed.js --force
 *   (en local : npm run seed -- --force)
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma.js'

const MONTHS = 24
const DAY = 86400000

// ---------------------------------------------------------------------------
// Générateur pseudo-aléatoire reproductible (mêmes données à chaque exécution)
// ---------------------------------------------------------------------------
let seed = 20260901
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (min, max) => min + Math.floor(random() * (max - min + 1))
const pick = items => items[Math.floor(random() * items.length)]
const chance = probability => random() < probability
const weightedPick = (items, weight) => {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let target = random() * total
  for (const item of items) if ((target -= weight(item)) <= 0) return item
  return items.at(-1)
}

// ---------------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------------
const UNITES = [
  ['pièce', 'Article à l’unité'], ['boîte', 'Boîte conditionnée'], ['flacon', 'Flacon'],
  ['paire', 'Paire'], ['paquet', 'Paquet'], ['rouleau', 'Rouleau'], ['bidon', 'Bidon'], ['ramette', 'Ramette de 500 feuilles'],
]

const COMPTES = [
  [6111, 'Produits d’entretien', 'Produits et matériels d’entretien et d’hygiène'],
  [6112, 'Imprimés administratifs', 'Imprimés, registres et documents administratifs'],
  [6113, 'Consommables informatiques', 'Consommables, câbles et accessoires informatiques'],
  [6114, 'Fournitures de bureau', 'Petites fournitures de bureau'],
]

// [désignation, unité, demande de base par ligne, popularité 1-5]
const ARTICLES = {
  6111: [
    ['Alcool', 'pièce', 3, 3], ['bac à ordure PM plastique', 'pièce', 1, 1], ['balai brosse avec manche', 'pièce', 2, 3],
    ['balai rasta à manche avec seau', 'pièce', 1, 2], ['balai satrana', 'pièce', 3, 4], ['balai tête de loup', 'pièce', 1, 1],
    ['bloc désodorisant WC', 'pièce', 4, 4], ['bombe dépoussiérante', 'pièce', 2, 2], ['bombe désodorisant 300ml', 'pièce', 3, 4],
    ['bombe insecticide 300ml', 'pièce', 2, 3], ['bombe lave moquette 600ml', 'pièce', 1, 1], ['bombe pour tableau de bord', 'pièce', 1, 1],
    ['brosse à linge', 'pièce', 2, 2], ['brosse coco', 'pièce', 2, 2], ['brosse WC avec pot', 'pièce', 1, 2],
    ['cache bouche', 'boîte', 2, 3], ['canard WC gel 750 ml', 'pièce', 3, 4], ['chamoisine GM', 'pièce', 2, 2],
    ['chiffon antistatique pour auto', 'pièce', 2, 1], ['déboucheur', 'pièce', 1, 2], ['déboucheur ventouse', 'pièce', 1, 1],
    ['détartrant liquide', 'pièce', 2, 3], ['eau de javel', 'flacon', 4, 5], ['encaustique 1kg', 'pièce', 1, 2],
    ['encaustique 2kg', 'pièce', 1, 1], ['éponge', 'pièce', 5, 4], ['essuie-tout', 'pièce', 6, 5],
    ['gants de ménage', 'paire', 3, 3], ['gants chirurgicales', 'paire', 10, 2], ['gel hydro alcoolique 500 ml', 'flacon', 3, 4],
    ['lave main 500 ml parfumé', 'pièce', 4, 5], ['liquide lave sol pour carreau 1l', 'pièce', 3, 4], ['liquide lave vitre 750 ml', 'pièce', 2, 3],
    ['mouchoir pour auto', 'boîte', 2, 2], ['papier hygiénique 2 plis', 'paquet', 8, 5], ['parfum auto', 'pièce', 2, 1],
    ['pelle à ordure à manche longue', 'pièce', 1, 2], ['pelle à ordure avec manche courte', 'pièce', 1, 2], ['poudre à récurer', 'pièce', 3, 3],
    ['purificateur d air', 'pièce', 2, 3], ['raclette à vitre manche longue', 'pièce', 1, 1], ['sac en jute 150kg', 'pièce', 5, 1],
    ['sac en jute 180kg', 'pièce', 5, 1], ['sac en jute 250kg', 'pièce', 4, 1], ['sac en jute 350 kg', 'pièce', 3, 1],
    ['sac poubelle rouleau 50 l', 'rouleau', 4, 5], ['savon de ménage 120 g', 'pièce', 8, 5], ['savon multi-usage 1l', 'pièce', 3, 4],
    ['savon poudre 30 g', 'pièce', 10, 3], ['serpillère double', 'pièce', 3, 4], ['tapis de bureau', 'pièce', 1, 1], ['virokil 4,5l', 'bidon', 1, 2],
  ],
  6112: [
    ['acte formaté', 'pièce', 20, 3], ['bon special de transport voyageurs', 'pièce', 10, 2], ['bordereau d emploi des fonds d avance', 'pièce', 10, 3],
    ['cahier d enregistrement "arrivée"', 'pièce', 2, 4], ['cahier d enregistrement "départ"', 'pièce', 2, 4], ['cahier de transmission', 'pièce', 3, 4],
    ['carnet de commande adressé au fournisseur', 'pièce', 2, 2], ['carnet de parcours effectués', 'pièce', 2, 2], ['chemise cartonnée', 'pièce', 30, 5],
    ['demande d avance de fond', 'pièce', 10, 2], ['etat d emploi', 'pièce', 10, 2], ['fascicule annexé parcours effectués', 'pièce', 5, 1],
    ['livre journal de caisse', 'pièce', 1, 2], ['livret matricule entretien et réparation garage', 'pièce', 1, 1], ['livret matricule garage et station service', 'pièce', 1, 1],
    ['livret matricule service automobile', 'pièce', 1, 1], ['ordre de route', 'pièce', 15, 3], ['papier A4 avec bas de page', 'pièce', 200, 4],
    ['papier A4 avec Logo', 'pièce', 250, 5], ['rejistra (paositra malagasy)', 'pièce', 2, 2],
  ],
  6113: [
    ['cable alimentation uc', 'pièce', 2, 2], ['cable hdmi 1.5m', 'pièce', 1, 2], ['cable hdmi 5m', 'pièce', 1, 1],
    ['cable imprimante usb 3m', 'pièce', 1, 2], ['cable imprimante usb 5m', 'pièce', 1, 1], ['Cable multiprise 5 entrées', 'pièce', 2, 3],
    ['cable vga 2m', 'pièce', 1, 1], ['cable vga 3m', 'pièce', 1, 1], ['cable vga 5m', 'pièce', 1, 1],
    ['clavier azerty avec fil', 'pièce', 2, 3], ['clavier azerty sans fil', 'pièce', 1, 2], ['Disque dur externe 1To', 'pièce', 1, 2],
    ['Disque dur externe 2To', 'pièce', 1, 1], ['encre canon 440 black', 'pièce', 2, 3], ['encre canon 441 couleur', 'pièce', 1, 2],
    ['encre canon cl 446 color', 'pièce', 1, 2], ['encre canon pg 445 black', 'pièce', 2, 3], ['encre deskjet hp 305 black', 'pièce', 2, 3],
    ['encre deskjet hp 305 color', 'pièce', 1, 2], ['encre HP 87A', 'pièce', 1, 2], ['encre laserjet 203a black', 'pièce', 2, 3],
    ['encre laserjet 203a cyan', 'pièce', 1, 1], ['encre laserjet 203a magenta', 'pièce', 1, 1], ['encre laserjet 203a yellow', 'pièce', 1, 1],
    ['encre lc brother 221 black', 'pièce', 1, 2], ['encre lc brother 221 cyan', 'pièce', 1, 1], ['encre lc brother 221 magenta', 'pièce', 1, 1],
    ['encre lc brother 221 yellow', 'pièce', 1, 1], ['encre officejet 953xl black', 'pièce', 2, 3], ['encre officejet 953xl cyan', 'pièce', 1, 1],
    ['encre officejet 953xl magenta', 'pièce', 1, 1], ['encre officejet 953xl yellow', 'pièce', 1, 1], ['encre toner canon 719', 'pièce', 1, 2],
    ['encre toner canon 737', 'pièce', 1, 2], ['encre toner c-exv 14', 'pièce', 1, 2], ['encre toner c-exv 33', 'pièce', 1, 2],
    ['encre canon c-exv 50 black', 'pièce', 1, 2], ['encre toner hp 05a', 'pièce', 2, 4], ['encre toner hp 128a black', 'pièce', 1, 2],
    ['encre toner hp 128a cyan', 'pièce', 1, 1], ['encre toner hp 128a magenta', 'pièce', 1, 1], ['encre toner hp 128a yellow', 'pièce', 1, 1],
    ['encre toner hp 12a', 'pièce', 2, 4], ['encre toner hp 142a', 'pièce', 1, 2], ['encre toner hp laserjet 80a', 'pièce', 2, 3],
    ['encre toner hp laserjet 85a', 'pièce', 2, 4], ['encre toner hp laserjet 87a', 'pièce', 1, 2], ['encre toner ricoh mp2014h', 'pièce', 1, 2],
    ['flash disc 16go', 'pièce', 2, 3], ['flash disc 32go', 'pièce', 2, 3], ['Pile AA', 'pièce', 6, 4],
    ['Pile AAA', 'pièce', 6, 4], ['Poudre toner imprimante HP', 'pièce', 1, 2], ['Poudre toner imprimante STANDARD', 'pièce', 1, 2],
    ['Rallonge enrouleur multiprise', 'pièce', 1, 2], ['ruban epson matricielle lq2090', 'pièce', 2, 2], ['ruban printronix 255049/101', 'pièce', 1, 1],
    ['ruban printronix 259885/104', 'pièce', 1, 1], ['ruban tally genicom 255670/401', 'pièce', 1, 1], ['souris à capteur optique sans fil', 'pièce', 2, 3],
    ['souris avec fil', 'pièce', 2, 3], ['tapis souris', 'pièce', 2, 2],
  ],
  // À ADAPTER : l'image fournie pour le compte 6114 reprenait la liste 6111.
  // Liste provisoire de fournitures de bureau, à remplacer par la liste officielle.
  6114: [
    ['ramette papier A4 80g', 'ramette', 10, 5], ['ramette papier A3 80g', 'ramette', 2, 2], ['stylo bille bleu', 'boîte', 2, 5],
    ['stylo bille noir', 'boîte', 1, 4], ['stylo bille rouge', 'boîte', 1, 3], ['crayon à papier HB', 'boîte', 1, 3],
    ['gomme blanche', 'pièce', 4, 3], ['taille-crayon', 'pièce', 3, 2], ['surligneur fluo', 'pièce', 4, 3],
    ['marqueur permanent', 'pièce', 3, 3], ['marqueur tableau blanc', 'pièce', 4, 2], ['correcteur liquide', 'pièce', 4, 3],
    ['agrafeuse 24/6', 'pièce', 1, 2], ['agrafes 24/6', 'boîte', 3, 4], ['perforatrice 2 trous', 'pièce', 1, 1],
    ['trombones 32 mm', 'boîte', 3, 4], ['attache-lettres', 'boîte', 2, 2], ['colle bâton 20 g', 'pièce', 4, 3],
    ['ruban adhésif transparent', 'rouleau', 4, 3], ['classeur à levier dos 8 cm', 'pièce', 6, 4], ['sous-chemise couleur', 'paquet', 2, 3],
    ['enveloppe kraft A4', 'paquet', 2, 4], ['enveloppe blanche 110x220', 'paquet', 2, 3], ['bloc-notes A5', 'pièce', 6, 3],
    ['post-it 76x76', 'paquet', 3, 3], ['registre 200 pages', 'pièce', 2, 2], ['calculatrice de bureau', 'pièce', 1, 1],
  ],
}

// Profil de consommation : poids de chaque compte par service
const SERVICES = [
  { name: 'Service de la Solde', weights: { 6111: 2, 6112: 4, 6113: 3, 6114: 4 }, divisions: ['Division Liquidation', 'Division Mandatement', 'Bureau Accueil'] },
  { name: 'Service des Pensions', weights: { 6111: 2, 6112: 4, 6113: 2, 6114: 4 }, divisions: ['Division Pensions civiles', 'Division Pensions militaires', 'Bureau Archives'] },
  { name: 'Service Informatique', weights: { 6111: 1, 6112: 1, 6113: 8, 6114: 2 }, divisions: ['Division Réseaux', 'Division Développement', 'Division Maintenance'] },
  { name: 'Service Administratif et Financier', weights: { 6111: 2, 6112: 5, 6113: 2, 6114: 4 }, divisions: ['Division Budget', 'Division Comptabilité', 'Bureau Courrier'] },
  { name: 'Service du Personnel', weights: { 6111: 2, 6112: 3, 6113: 2, 6114: 4 }, divisions: ['Division Carrière', 'Division Formation', 'Bureau Social'] },
  { name: 'Service Juridique', weights: { 6111: 1, 6112: 3, 6113: 2, 6114: 4 }, divisions: ['Division Contentieux', 'Division Réglementation'] },
  { name: 'Secrétariat Général', weights: { 6111: 3, 6112: 3, 6113: 2, 6114: 3 }, divisions: ['Cabinet', 'Bureau Protocole', 'Bureau Courrier SG'] },
  { name: 'Service Moyens Généraux', weights: { 6111: 8, 6112: 2, 6113: 1, 6114: 2 }, divisions: ['Division Entretien', 'Division Parc automobile', 'Bureau Sécurité'] },
]
const LOGISTICS_SERVICE = 'Division des Affaires Administratives et Financières'

// Comptes de démonstration (mot de passe identique par rôle)
const PASSWORDS = { VALIDATEUR: 'Validateur@2026', DEPOSITAIRE: 'Depositaire@2026', CLIENT: 'Client@2026' }
const STAFF = [
  { im: 100001, role: 'VALIDATEUR', name: 'Rakotomalala Hery Nirina', mail: 'hery.rakotomalala@dsp.gov.mg' },
  { im: 100002, role: 'DEPOSITAIRE', name: 'Randrianarisoa Fanja', mail: 'fanja.randrianarisoa@dsp.gov.mg' },
  { im: 100003, role: 'DEPOSITAIRE', name: 'Andriamanana Tojo', mail: 'tojo.andriamanana@dsp.gov.mg' },
]
const CLIENT_NAMES = [
  'Rasoanaivo Lalaina', 'Razafindrakoto Mamy', 'Rabe Andry Tiana', 'Ravelojaona Voahangy',
  'Rakotondrabe Haja', 'Ramanantsoa Nathalie', 'Andrianjafy Rija', 'Raharison Patrick',
]
const PENDING_ACCOUNTS = [
  { im: 300001, name: 'Rabetokotany Lina', service: 'Service Juridique', mail: 'lina.rabetokotany@dsp.gov.mg' },
  { im: 300002, name: 'Rakotoarisoa Fidy', service: 'Service Informatique', mail: 'fidy.rakotoarisoa@dsp.gov.mg' },
  { im: 300003, name: 'Randriamampionona Sitraka', service: 'Service des Pensions', mail: 'sitraka.r@dsp.gov.mg' },
]

const FOURNISSEURS = ['SOCOBIS', 'Librairie de Madagascar', 'Bureau Pro Madagascar', 'Infosys Océan Indien', 'SODIM Hygiène', 'Papeterie Analakely', 'Imprimerie Nationale']
const MOTIFS_DEMANDE = {
  6111: ['Entretien des bureaux du service', 'Hygiène des sanitaires', 'Remplacement du matériel usé', 'Nettoyage hebdomadaire des locaux'],
  6112: ['Traitement des dossiers en cours', 'Épuisement du stock du service', 'Clôture mensuelle', 'Ouverture des nouveaux registres'],
  6113: ['Remplacement de cartouche vide', 'Équipement d’un nouveau poste', 'Matériel défectueux', 'Impression des états mensuels'],
  6114: ['Fournitures pour les agents', 'Préparation des dossiers', 'Épuisement du stock du service', 'Réunion de service'],
}
const MOTIFS_REJET = [
  'Stock épuisé, réapprovisionnement en cours.', 'Quantité déjà livrée au service ce mois-ci.',
  'Besoin non justifié pour ce service.', 'Article réservé aux services techniques.',
]
const MOTIFS_UTILISATION = ['Distribution aux agents', 'Remplacement au bureau du chef de service', 'Utilisation pour la salle de réunion', 'Consommation courante']

// Saisonnalité mensuelle (janv. → déc.) : rentrée administrative en janvier, clôture en décembre.
const SEASON = [1.6, 1.1, 1.0, 0.95, 0.9, 0.8, 0.7, 0.6, 1.5, 1.2, 1.0, 0.55]

// ---------------------------------------------------------------------------
// Construction des données
// ---------------------------------------------------------------------------
const now = new Date()
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS, 1))
const atWorkHour = (date, day) => {
  const result = new Date(date.getTime() + day * DAY)
  result.setUTCHours(between(5, 13), between(0, 59), 0, 0) // 8 h – 16 h à Antananarivo (UTC+3)
  return result
}
const addDays = (date, min, max) => atWorkHour(date, between(min, max))

async function main() {
  const existing = await prisma.utilisateur.count()
  if (existing && !process.argv.includes('--force')) {
    console.error(`La base contient déjà ${existing} utilisateur(s). Relancez avec --force pour TOUT effacer et recharger la démonstration.`)
    process.exitCode = 1
    return
  }

  console.log('Effacement des données existantes…')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    message, conversation, utilisation_stock_service, dispatch, division, stock_service, motif_rejet,
    liste_demande, demande_client, modification_stock, stock, liste_entre, photo_justification,
    justification_entre, catalogue, unite, compte, utilisateur, service, historique_changement
    RESTART IDENTITY CASCADE`)

  // --- Référentiels -------------------------------------------------------
  const unites = UNITES.map(([unite, description], index) => ({ id_unite: index + 1, unite, description }))
  const uniteId = Object.fromEntries(unites.map(row => [row.unite, row.id_unite]))
  const comptes = COMPTES.map(([id_compte, categorie, description]) => ({ id_compte, categorie, description }))

  const catalogues = []
  const shelves = { 6111: 'A', 6112: 'B', 6113: 'C', 6114: 'D' }
  for (const [compte, rows] of Object.entries(ARTICLES)) {
    rows.forEach(([designation, unite, base, popularity], index) => {
      const expensive = /disque dur|toner|clavier|souris|calculatrice/i.test(designation)
      catalogues.push({
        id_catalogue: catalogues.length + 1, designation, id_compte: Number(compte), id_unite: uniteId[unite],
        emplacement: `${shelves[compte]}-${String(Math.floor(index / 8) + 1).padStart(2, '0')}-${String((index % 8) + 1).padStart(2, '0')}`,
        stock_min: Math.max(2, Math.round(base * popularity * 1.5)),
        pourcentage_demande_max: expensive ? 50 : 100,
        base, popularity,
      })
    })
  }

  const services = [...SERVICES.map(service => service.name), LOGISTICS_SERVICE].map((nom_service, index) => ({ id_service: index + 1, nom_service }))
  const serviceId = Object.fromEntries(services.map(row => [row.nom_service, row.id_service]))
  const divisions = []
  for (const service of SERVICES) for (const nom_division of service.divisions) {
    divisions.push({ id_division: divisions.length + 1, nom_division, id_service: serviceId[service.name] })
  }

  // --- Utilisateurs ---------------------------------------------------------
  const hashes = Object.fromEntries(await Promise.all(Object.entries(PASSWORDS).map(async ([role, password]) => [role, await bcrypt.hash(password, 12)])))
  const utilisateurs = STAFF.map(user => ({
    id_utilisateur_im: user.im, role: user.role, nom_complet: user.name, mail: user.mail,
    id_service: serviceId[LOGISTICS_SERVICE], mot_de_passe: hashes[user.role], status_utilisateur: 'actif',
  }))
  const clients = SERVICES.map((service, index) => ({
    id_utilisateur_im: 200001 + index, role: 'CLIENT', nom_complet: CLIENT_NAMES[index],
    mail: `${CLIENT_NAMES[index].split(' ')[1].toLowerCase()}.${CLIENT_NAMES[index].split(' ')[0].toLowerCase()}@dsp.gov.mg`,
    id_service: serviceId[service.name], mot_de_passe: hashes.CLIENT, status_utilisateur: 'actif', profile: service,
  }))
  utilisateurs.push(...clients.map(({ profile: _profile, ...user }) => user))
  for (const account of PENDING_ACCOUNTS) utilisateurs.push({
    id_utilisateur_im: account.im, role: 'CLIENT', nom_complet: account.name, mail: account.mail,
    id_service: serviceId[account.service], mot_de_passe: hashes.CLIENT, status_utilisateur: 'inactif',
  })

  // --- Simulation mois par mois ---------------------------------------------
  const stock = new Map(catalogues.map(article => [article.id_catalogue, 0]))
  const justifications = [], listesEntree = [], demandes = [], lignes = [], motifsRejet = []
  const stockService = new Map(), dispatches = [], utilisations = []
  const depositaries = STAFF.filter(user => user.role === 'DEPOSITAIRE')
  const articlesByCompte = Object.fromEntries(Object.keys(ARTICLES).map(compte => [compte, catalogues.filter(article => article.id_compte === Number(compte))]))
  // Articles habituels de chaque service, selon son profil de consommation par compte.
  for (const client of clients) {
    client.habits = catalogues
      .filter(article => chance(Math.min(0.95, article.popularity * client.profile.weights[article.id_compte] / 24)))
      .map(article => ({ article, quantity: article.base * (0.5 + client.profile.weights[article.id_compte] / 4) * (0.8 + random() * 0.4) }))
  }
  // Demande mensuelle attendue par article (tous services, mois de pointe), pour dimensionner les entrées.
  const monthlyNeed = new Map(catalogues.map(article => [article.id_catalogue, 1]))
  for (const client of clients) for (const habit of client.habits) monthlyNeed.set(habit.article.id_catalogue, monthlyNeed.get(habit.article.id_catalogue) + habit.quantity * 1.3)
  const expectedMonthly = article => monthlyNeed.get(article.id_catalogue)
  // Seuil d'alerte : environ deux semaines de consommation.
  for (const article of catalogues) article.stock_min = Math.max(2, Math.round(expectedMonthly(article) / 2))

  const addEntry = (date, articles, sizeInMonths) => {
    const id = justifications.length + 1
    const compte = articles[0].id_compte
    justifications.push({
      id_justification_entre: id, date_piece: date,
      marche_concerne: `Marché n° ${date.getUTCFullYear()}/${String(between(1, 60)).padStart(3, '0')}/MEF/SG/DSP — compte ${compte}`,
      fournisseur: pick(FOURNISSEURS), id_utilisateur_im: pick(depositaries).im,
    })
    for (const article of articles) {
      const quantite = Math.max(article.stock_min, Math.round(expectedMonthly(article) * sizeInMonths * (0.8 + random() * 0.4)))
      listesEntree.push({ id_liste_entre: listesEntree.length + 1, id_catalogue: article.id_catalogue, id_justification_entre: id, quantite })
      stock.set(article.id_catalogue, stock.get(article.id_catalogue) + quantite)
    }
  }

  const receive = (line, client, date) => {
    const key = `${client.id_service}-${line.id_catalogue}`
    const row = stockService.get(key) || { id_stock_service: stockService.size + 1, id_service: client.id_service, id_catalogue: line.id_catalogue, reparti: 0, restant: 0 }
    row.restant += line.quantite_accordee
    stockService.set(key, row)
    // Répartition aux divisions puis sorties internes, si les dates sont déjà passées.
    const serviceDivisions = divisions.filter(division => division.id_service === client.id_service)
    if (chance(0.7)) {
      let toDispatch = Math.round(row.restant * (0.5 + random() * 0.5))
      for (const division of serviceDivisions.slice(0, between(1, serviceDivisions.length))) {
        const nombre = Math.min(toDispatch, Math.max(1, Math.round(toDispatch / 2)))
        const date_dispatch = addDays(date, 1, 8)
        if (nombre <= 0 || date_dispatch > now) break
        dispatches.push({ id_dispatch: dispatches.length + 1, id_division: division.id_division, id_stock_service: row.id_stock_service, nombre, date_dispatch, id_utilisateur_im: client.id_utilisateur_im })
        row.restant -= nombre; row.reparti += nombre; toDispatch -= nombre
      }
    }
    if (row.restant > 1 && chance(0.25)) {
      const date_utilisation = addDays(date, 2, 12)
      if (date_utilisation <= now) {
        const quantite = between(1, Math.max(1, Math.floor(row.restant / 2)))
        utilisations.push({ id_utilisation: utilisations.length + 1, quantite, motif: pick(MOTIFS_UTILISATION), date_utilisation, id_utilisateur_im: client.id_utilisateur_im, id_stock_service: row.id_stock_service })
        row.restant -= quantite
      }
    }
  }

  // Activité récente garantie pour la présentation : demandes des 14 derniers jours.
  const recentRequests = Array.from({ length: 22 }, (_, index) => ({
    client: clients[index % clients.length],
    date_demande: new Date(now.getTime() - (0.2 + random() * 13.5) * DAY),
  }))
  // Étapes atteintes selon l'âge de la demande (en jours) : à valider < 3 ≤ bon à imprimer < 6 ≤ à réceptionner < 10.
  const ageInDays = date => (now - date) / DAY

  for (let month = 0; month <= MONTHS; month += 1) {
    const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month, 1))
    if (monthStart > now) break
    const season = SEASON[monthStart.getUTCMonth()]
    const trend = 1 + month * 0.012

    // Entrées : stock initial, puis réapprovisionnement des articles sous le seuil.
    for (const articles of Object.values(articlesByCompte)) {
      const toRefill = month === 0
        ? articles
        : articles.filter(article => stock.get(article.id_catalogue) < expectedMonthly(article) * 1.5 && chance(month === MONTHS ? 0.35 : 0.9))
      if (toRefill.length) addEntry(addDays(monthStart, 0, 2), toRefill, month === 0 ? 4 : 3)
    }

    // Demandes des services : chaque service commande ses articles habituels,
    // regroupés par compte (une demande par compte, au plus 8 articles).
    const monthRequests = []
    for (const client of clients) {
      const byCompte = new Map()
      for (const habit of client.habits) {
        if (!chance(0.95)) continue
        const quantite = Math.max(1, Math.round(habit.quantity * season * trend * (0.92 + random() * 0.16)))
        byCompte.set(habit.article.id_compte, [...(byCompte.get(habit.article.id_compte) || []), { article: habit.article, quantite }])
      }
      for (const [compte, items] of byCompte) for (let index = 0; index < items.length; index += 8) {
        const date_demande = atWorkHour(monthStart, between(2, 27))
        if (date_demande <= now) monthRequests.push({ client, date_demande, compte, items: items.slice(index, index + 8) })
      }
    }
    for (const request of recentRequests) {
      if (request.date_demande.getUTCFullYear() !== monthStart.getUTCFullYear() || request.date_demande.getUTCMonth() !== monthStart.getUTCMonth()) continue
      const habits = request.client.habits.filter(() => chance(0.15)).slice(0, 4)
      const items = (habits.length ? habits : request.client.habits.slice(0, 2)).map(habit => ({ article: habit.article, quantite: Math.max(1, Math.round(habit.quantity * season * 0.5)) }))
      monthRequests.push({ ...request, compte: items[0].article.id_compte, items })
    }
    monthRequests.sort((a, b) => a.date_demande - b.date_demande)

    for (const { client, date_demande, items } of monthRequests) {
      const id_demande_client = demandes.length + 1
      const requestLines = items.map(({ article, quantite }, index) => ({
        id_liste_demande: lignes.length + index + 1, id_catalogue: article.id_catalogue, quantite_liste_demande: quantite,
        motif_demande: pick(MOTIFS_DEMANDE[article.id_compte]), quantite_accordee: null, pourcentage_accorde: null,
        status_liste_demande: 'EN_ATTENTE', status_reception: 'EN_ATTENTE', stock_service_enregistre: false, date_reception: null, id_demande_client,
      }))
      const demande = {
        id_demande_client, date_demande, date_livraison: null, date_traitement: null, status_demande: 'ENVOYER',
        Urgence: weightedPick(['NORMALE', 'PRIORITAIRE', 'URGENTE'], level => ({ NORMALE: 7, PRIORITAIRE: 2, URGENTE: 1 })[level]),
        id_utilisateur_im: client.id_utilisateur_im,
      }
      demandes.push(demande)
      lignes.push(...requestLines)

      // Décision du validateur (si la date est passée)
      const age = ageInDays(date_demande)
      const date_traitement = age < 10 ? new Date(date_demande.getTime() + Math.min(age - 0.1, 1 + random()) * DAY) : addDays(date_demande, 1, 3)
      if (date_traitement > now || age < 3) continue
      const refused = chance(0.04)
      const remaining = new Map()
      for (const line of requestLines) {
        const article = catalogues[line.id_catalogue - 1]
        if (!remaining.has(line.id_catalogue)) remaining.set(line.id_catalogue, Math.floor(stock.get(line.id_catalogue) * article.pourcentage_demande_max / 100))
        let granted = Math.min(line.quantite_liste_demande, remaining.get(line.id_catalogue))
        if (granted > 1 && chance(0.1)) granted = Math.max(1, Math.round(granted * (0.5 + random() * 0.3)))
        if (refused || chance(0.03)) granted = 0
        remaining.set(line.id_catalogue, remaining.get(line.id_catalogue) - granted)
        stock.set(line.id_catalogue, stock.get(line.id_catalogue) - granted)
        line.quantite_accordee = granted
        line.status_liste_demande = granted === 0 ? 'REJETER' : granted === line.quantite_liste_demande ? 'VALIDER' : 'MODIFIER'
        if (granted === 0) motifsRejet.push({
          id_motif_rejet: motifsRejet.length + 1, id_liste_demande: line.id_liste_demande, date_rejet: date_traitement,
          motif: refused ? MOTIFS_REJET[2] : stock.get(line.id_catalogue) <= 0 ? MOTIFS_REJET[0] : pick(MOTIFS_REJET.slice(1)),
        })
      }
      demande.date_traitement = date_traitement
      demande.status_demande = requestLines.every(line => line.status_liste_demande === 'REJETER') ? 'REFUSER' : 'VALIDER'
      if (demande.status_demande === 'REFUSER') continue

      // Impression du bon de sortie par le dépositaire
      const date_livraison = age < 10 ? new Date(Math.min(now - DAY / 4, date_traitement.getTime() + DAY)) : addDays(date_traitement, 1, 3)
      if (date_livraison > now || age < 6) continue
      demande.status_demande = 'BON_IMPRIME'
      demande.date_livraison = date_livraison

      // Réception par le client
      for (const line of requestLines) {
        if (line.status_liste_demande === 'REJETER') continue
        const date_reception = new Date(Math.max(addDays(date_livraison, 0, 3).getTime(), date_livraison.getTime() + 2 * 3600000))
        if (date_reception > now || age < 10) continue
        const received = chance(0.97)
        line.status_reception = received ? 'RECU' : 'NON_RECU'
        line.stock_service_enregistre = received
        line.date_reception = date_reception
        if (received) receive(line, client, date_reception)
      }
    }
  }

  // Quelques articles volontairement sous le seuil minimum (alertes du tableau de bord)
  const stocks = catalogues.map(article => ({ id_stock: article.id_catalogue, id_catalogue: article.id_catalogue, quantite_stock: Math.max(0, stock.get(article.id_catalogue)) }))
  const modifications = []
  for (const row of stocks.filter(() => chance(0.04))) {
    const quantite_apres = Math.max(0, row.quantite_stock - between(1, 3))
    modifications.push({ id_modification_stock: modifications.length + 1, id_stock: row.id_stock, quantite_avant: row.quantite_stock, quantite_apres, motif: pick(['Inventaire trimestriel : articles endommagés', 'Écart constaté lors de l’inventaire', 'Produits périmés retirés du magasin']) })
    row.quantite_stock = quantite_apres
  }

  // --- Messagerie -----------------------------------------------------------
  const conversations = [], messages = []
  const validator = STAFF[0], depositary = STAFF[1]
  const recent = demandes.slice(-40)
  for (const client of clients.slice(0, 6)) {
    const demande = recent.find(item => item.id_utilisateur_im === client.id_utilisateur_im) || recent[0]
    const reference = `DEM-${demande.id_demande_client}`
    const partner = chance(0.5) ? validator : depositary
    const id_conversation = conversations.length + 1
    const opened = new Date(Math.min(now - DAY, demande.date_demande.getTime() + DAY / 2))
    conversations.push({ id_conversation, id_utilisateur_im: client.id_utilisateur_im, id_utilisateur_im2: partner.im, date_conversation: opened })
    const script = partner.role === 'VALIDATEUR'
      ? [[client, `Bonjour, pourriez-vous examiner la demande ${reference} ? Nous en avons besoin rapidement.`], [partner, `Bonjour, c’est noté. Je la traite dans la journée.`], [client, 'Merci beaucoup.'], [partner, `La demande ${reference} est traitée. Certaines quantités ont été ajustées selon le stock disponible.`]]
      : [[client, `Bonjour, le bon de sortie de la demande ${reference} est-il prêt ?`], [partner, 'Bonjour, il sera imprimé ce matin. Vous pourrez passer au magasin à partir de 14 h.'], [client, 'Parfait, un agent passera récupérer les articles.']]
    script.forEach(([author, contenu], index) => {
      const date_message = new Date(Math.min(now.getTime() - 60000 * (script.length - index), opened.getTime() + index * 45 * 60000))
      const last = index === script.length - 1
      messages.push({ id_message: messages.length + 1, id_conversation, id_utilisateur_im: author.im ?? author.id_utilisateur_im, contenu, date_message, status_message: last && chance(0.6) ? 'ENVOYE' : 'LU' })
    })
  }

  // --- Écriture en base -----------------------------------------------------
  console.log('Écriture des données…')
  const strip = rows => rows.map(({ base: _b, popularity: _p, ...row }) => row)
  await prisma.unite.createMany({ data: unites })
  await prisma.compte.createMany({ data: comptes })
  await prisma.service.createMany({ data: services })
  await prisma.division.createMany({ data: divisions })
  await prisma.utilisateur.createMany({ data: utilisateurs })
  await prisma.catalogue.createMany({ data: strip(catalogues) })
  await prisma.stock.createMany({ data: stocks })
  await prisma.modification_stock.createMany({ data: modifications })
  await prisma.justification_entre.createMany({ data: justifications })
  await prisma.liste_entre.createMany({ data: listesEntree })
  await prisma.demande_client.createMany({ data: demandes })
  for (let index = 0; index < lignes.length; index += 1000) await prisma.liste_demande.createMany({ data: lignes.slice(index, index + 1000) })
  await prisma.motif_rejet.createMany({ data: motifsRejet })
  await prisma.stock_service.createMany({ data: [...stockService.values()] })
  await prisma.dispatch.createMany({ data: dispatches })
  await prisma.utilisation_stock_service.createMany({ data: utilisations })
  await prisma.conversation.createMany({ data: conversations })
  await prisma.message.createMany({ data: messages })

  // Les identifiants ont été fixés : recaler les séquences auto-incrémentées.
  const sequences = [
    ['unite', 'id_unite'], ['service', 'id_service'], ['division', 'id_division'], ['catalogue', 'id_catalogue'],
    ['stock', 'id_stock'], ['modification_stock', 'id_modification_stock'], ['liste_entre', 'id_liste_entre'],
    ['demande_client', 'id_demande_client'], ['liste_demande', 'id_liste_demande'], ['motif_rejet', 'id_motif_rejet'],
    ['stock_service', 'id_stock_service'], ['dispatch', 'id_dispatch'], ['utilisation_stock_service', 'id_utilisation'],
    ['conversation', 'id_conversation'], ['message', 'id_message'],
  ]
  for (const [table, column] of sequences) {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), GREATEST(COALESCE((SELECT MAX("${column}") FROM "${table}"), 0), 1))`)
  }

  const count = status => demandes.filter(demande => demande.status_demande === status).length
  console.log(`
Données de démonstration chargées :
  ${catalogues.length} articles · ${justifications.length} entrées en stock · ${demandes.length} demandes (${lignes.length} lignes) sur ${MONTHS} mois
  ${count('ENVOYER')} à valider · ${count('VALIDER')} bons à imprimer · ${count('BON_IMPRIME')} livrées · ${count('REFUSER')} refusées
  ${dispatches.length} dispatchs · ${utilisations.length} sorties internes · ${messages.length} messages
  ${stocks.filter(row => row.quantite_stock < catalogues[row.id_catalogue - 1].stock_min).length} articles sous le seuil minimum

Comptes de connexion (numéro IM / mot de passe) :
  Validateur   ${STAFF[0].im}  ${PASSWORDS.VALIDATEUR}   ${STAFF[0].name}
  Dépositaire  ${STAFF[1].im}  ${PASSWORDS.DEPOSITAIRE}  ${STAFF[1].name}
  Dépositaire  ${STAFF[2].im}  ${PASSWORDS.DEPOSITAIRE}  ${STAFF[2].name}
${clients.map(client => `  Client       ${client.id_utilisateur_im}  ${PASSWORDS.CLIENT}       ${client.nom_complet} — ${client.profile.name}`).join('\n')}
  (${PENDING_ACCOUNTS.length} inscriptions en attente d’approbation : IM ${PENDING_ACCOUNTS.map(account => account.im).join(', ')})
`)
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
