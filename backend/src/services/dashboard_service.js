import { prisma } from '../config/prisma.js';

const MONTHS = 12;
const DAY = 24 * 60 * 60 * 1000;
const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

const recentInclude = {
  Utilisateur: { select: { nom_complet: true, Service: { select: { nom_service: true } } } },
  Liste_demande: {
    include: { Catalogue: { select: { designation: true } } },
  },
};

const STATUS_LABELS = [
  ['ENVOYER', 'En attente'],
  ['VALIDER', 'Validées'],
  ['BON_IMPRIME', 'Bons imprimés'],
  ['REFUSER', 'Refusées'],
];

function startOfMonth(offset = 0) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function emptySeries() {
  return Array.from({ length: MONTHS }, (_, index) => {
    const date = startOfMonth(index - MONTHS + 1);
    return { month: monthKey(date), label: monthLabel.format(date).replace('.', ''), entrees: 0, sorties: 0, demandes: 0 };
  });
}

function addToSeries(series, date, field, value) {
  if (!date) return;
  const point = series.find(item => item.month === monthKey(new Date(date)));
  if (point) point[field] += value;
}

function trend(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Compare le mois en cours à la même période du mois précédent (ex. 1–5 oct. vs 1–5 sept.).
function periodTrend(items, dateOf, valueOf = () => 1) {
  const now = new Date();
  const currentStart = startOfMonth();
  const previousStart = startOfMonth(-1);
  const previousEnd = new Date(previousStart.getTime() + (now - currentStart));
  let current = 0;
  let previous = 0;
  for (const item of items) {
    const date = dateOf(item) && new Date(dateOf(item));
    if (!date) continue;
    if (date >= currentStart) current += valueOf(item);
    else if (date >= previousStart && date < previousEnd) previous += valueOf(item);
  }
  return trend(current, previous);
}

const grantedQuantity = line => (line.status_liste_demande === 'REJETER' ? 0 : line.quantite_accordee ?? 0);

function ranking(lines, keyOf, labelOf, quantityOf, limit = 5) {
  const totals = new Map();
  for (const line of lines) {
    const quantity = quantityOf(line);
    if (!quantity) continue;
    const key = keyOf(line);
    const current = totals.get(key) || { label: labelOf(line), quantite: 0 };
    current.quantite += quantity;
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => b.quantite - a.quantite).slice(0, limit);
}

async function stockSummary() {
  const catalogues = await prisma.catalogue.findMany({
    select: {
      id_catalogue: true,
      designation: true,
      stock_min: true,
      Unite: { select: { unite: true } },
      Stock: { select: { quantite_stock: true } },
    },
  });
  const items = catalogues.map(item => ({
    id: item.id_catalogue,
    designation: item.designation,
    unite: item.Unite?.unite || '',
    minimum: item.stock_min,
    quantite: item.Stock.reduce((sum, stock) => sum + stock.quantite_stock, 0),
  }));
  const critical = items
    .filter(item => item.quantite <= item.minimum)
    .sort((a, b) => a.quantite / (a.minimum || 1) - b.quantite / (b.minimum || 1));
  return {
    articles: items.length,
    total: items.reduce((sum, item) => sum + item.quantite, 0),
    ruptures: items.filter(item => item.quantite === 0).length,
    critical,
  };
}

async function globalStatistics() {
  const from = startOfMonth(-MONTHS + 1);
  const [stock, statusGroups, requests, grantedLines, entryLines] = await Promise.all([
    stockSummary(),
    prisma.demande_client.groupBy({ by: ['status_demande'], _count: { _all: true } }),
    prisma.demande_client.findMany({
      where: { date_demande: { gte: from } },
      select: { date_demande: true, date_traitement: true, status_demande: true },
    }),
    prisma.liste_demande.findMany({
      where: { Demande_client: { date_traitement: { gte: from } }, status_liste_demande: { not: 'REJETER' } },
      select: {
        id_catalogue: true,
        quantite_accordee: true,
        status_liste_demande: true,
        Catalogue: { select: { designation: true, Unite: { select: { unite: true } } } },
        Demande_client: { select: { date_traitement: true, Utilisateur: { select: { Service: { select: { id_service: true, nom_service: true } } } } } },
      },
    }),
    prisma.liste_entre.findMany({
      where: { Justification_entre: { date_piece: { gte: from } } },
      select: { quantite: true, Justification_entre: { select: { date_piece: true } } },
    }),
  ]);

  const series = emptySeries();
  for (const request of requests) addToSeries(series, request.date_demande, 'demandes', 1);
  for (const line of grantedLines) addToSeries(series, line.Demande_client.date_traitement, 'sorties', grantedQuantity(line));
  for (const line of entryLines) addToSeries(series, line.Justification_entre.date_piece, 'entrees', line.quantite);

  const current = series.at(-1);
  const processed = requests.filter(request => request.date_traitement);
  const recentProcessed = processed.filter(request => Date.now() - new Date(request.date_traitement) <= 90 * DAY);
  const delays = recentProcessed.map(request => (new Date(request.date_traitement) - new Date(request.date_demande)) / DAY);
  const accepted = processed.filter(request => request.status_demande !== 'REFUSER').length;
  const counts = Object.fromEntries(statusGroups.map(group => [group.status_demande, group._count._all]));

  return {
    stock,
    counts,
    series,
    current,
    statuses: STATUS_LABELS.map(([key, label]) => ({ key, label, value: counts[key] || 0 })),
    topArticles: ranking(
      grantedLines,
      line => line.id_catalogue,
      line => ({ designation: line.Catalogue.designation, unite: line.Catalogue.Unite?.unite || '' }),
      grantedQuantity,
    ).map(item => ({ ...item.label, quantite: item.quantite })),
    topServices: ranking(
      grantedLines,
      line => line.Demande_client.Utilisateur.Service.id_service,
      line => line.Demande_client.Utilisateur.Service.nom_service,
      grantedQuantity,
    ).map(item => ({ label: item.label, quantite: item.quantite })),
    indicators: {
      delaiMoyen: delays.length ? Math.round((delays.reduce((sum, value) => sum + value, 0) / delays.length) * 10) / 10 : null,
      tauxValidation: processed.length ? Math.round((accepted / processed.length) * 100) : null,
      demandesTraitees: processed.length,
      tendanceSorties: periodTrend(grantedLines, line => line.Demande_client.date_traitement, grantedQuantity),
      tendanceEntrees: periodTrend(entryLines, line => line.Justification_entre.date_piece, line => line.quantite),
      tendanceDemandes: periodTrend(requests, request => request.date_demande),
    },
  };
}

function criticalList(stock) {
  return stock.critical.slice(0, 6).map(item => ({ designation: item.designation, unite: item.unite, quantite: item.quantite, minimum: item.minimum }));
}

async function depositaireDashboard() {
  const [stats, recent] = await Promise.all([
    globalStatistics(),
    prisma.demande_client.findMany({ include: recentInclude, orderBy: { date_demande: 'desc' }, take: 6 }),
  ]);
  const { stock, counts, current, indicators } = stats;
  return {
    cards: [
      { value: stock.total, label: 'Unités en stock', note: `${stock.articles} articles référencés`, color: 'teal', icon: '▦', page: 'catalogue' },
      { value: stock.critical.length, label: 'Stocks critiques', note: stock.ruptures ? `dont ${stock.ruptures} en rupture` : 'À réapprovisionner', color: 'orange', icon: '⚠', page: 'catalogue', alert: stock.critical.length > 0 },
      { value: counts.VALIDER || 0, label: 'Bons à imprimer', note: 'Demandes validées', color: 'purple', icon: '▤', page: 'deliveryNotes', alert: (counts.VALIDER || 0) > 0 },
      { value: current.sorties, label: 'Sorties ce mois', note: 'Unités livrées', color: 'blue', icon: '⇤', page: 'history', trend: indicators.tendanceSorties },
    ],
    ...pick(stats),
    critical: criticalList(stock),
    recentTitle: 'Dernières demandes',
    recent,
  };
}

async function validateurDashboard() {
  const [stats, recent] = await Promise.all([
    globalStatistics(),
    prisma.demande_client.findMany({ where: { status_demande: 'ENVOYER' }, include: recentInclude, orderBy: { date_demande: 'asc' }, take: 6 }),
  ]);
  const { stock, counts, current, indicators } = stats;
  return {
    cards: [
      { value: counts.ENVOYER || 0, label: 'À valider', note: 'Action requise', color: 'orange', icon: '▤', page: 'requests', alert: (counts.ENVOYER || 0) > 0 },
      { value: current.demandes, label: 'Demandes ce mois', note: 'Reçues depuis le 1er', color: 'blue', icon: '◷', page: 'requests', trend: indicators.tendanceDemandes },
      { value: indicators.tauxValidation ?? 0, suffix: '%', label: 'Taux de validation', note: `${indicators.demandesTraitees} demandes traitées`, color: 'teal', icon: '✓', page: 'history' },
      { value: stock.critical.length, label: 'Stocks critiques', note: 'Points d’attention', color: 'purple', icon: '⚠', page: 'catalogue', alert: stock.critical.length > 0 },
    ],
    ...pick(stats),
    critical: criticalList(stock),
    recentTitle: 'Demandes en attente de validation',
    recent,
  };
}

function pick(stats) {
  return {
    series: stats.series,
    statuses: stats.statuses,
    topArticles: stats.topArticles,
    topServices: stats.topServices,
    indicators: stats.indicators,
  };
}

// Le client ne voit que ses propres actions : demandes envoyées, réceptions,
// dispatchs et utilisations. Aucune décision du validateur ou du dépositaire.
const clientRecentInclude = {
  Liste_demande: { select: { quantite_liste_demande: true, Catalogue: { select: { designation: true } } } },
};

async function clientDashboard(user) {
  const from = startOfMonth(-MONTHS + 1);
  const where = { id_utilisateur_im: user.id_utilisateur_im };
  const [total, requests, lines, receptions, dispatches, usages, toReceive, serviceStock, recent] = await Promise.all([
    prisma.demande_client.count({ where }),
    prisma.demande_client.findMany({ where: { ...where, date_demande: { gte: from } }, select: { date_demande: true } }),
    prisma.liste_demande.findMany({
      where: { Demande_client: { ...where, date_demande: { gte: from } } },
      select: {
        id_catalogue: true,
        quantite_liste_demande: true,
        Catalogue: { select: { designation: true, Unite: { select: { unite: true } } } },
        Demande_client: { select: { date_demande: true } },
      },
    }),
    prisma.liste_demande.findMany({
      where: { status_reception: 'RECU', date_reception: { gte: from }, Demande_client: where },
      select: { quantite_accordee: true, date_reception: true },
    }),
    prisma.dispatch.findMany({ where: { ...where, date_dispatch: { gte: from } }, select: { nombre: true, date_dispatch: true } }),
    prisma.utilisation_stock_service.findMany({ where: { ...where, date_utilisation: { gte: from } }, select: { quantite: true, date_utilisation: true } }),
    prisma.liste_demande.count({ where: { status_reception: 'EN_ATTENTE', status_liste_demande: { not: 'REJETER' }, Demande_client: { ...where, status_demande: 'BON_IMPRIME' } } }),
    prisma.stock_service.aggregate({ where: { id_service: user.id_service }, _sum: { restant: true } }),
    prisma.demande_client.findMany({
      where,
      select: { id_demande_client: true, date_demande: true, Urgence: true, ...clientRecentInclude },
      orderBy: { date_demande: 'desc' },
      take: 6,
    }),
  ]);

  const series = emptySeries();
  for (const request of requests) addToSeries(series, request.date_demande, 'demandes', 1);
  for (const line of lines) addToSeries(series, line.Demande_client.date_demande, 'entrees', line.quantite_liste_demande);
  const sum = (items, valueOf) => items.reduce((acc, item) => acc + valueOf(item), 0);
  const requested = sum(lines, line => line.quantite_liste_demande);
  const received = sum(receptions, line => line.quantite_accordee || 0);
  const dispatched = sum(dispatches, item => item.nombre);
  const used = sum(usages, item => item.quantite);

  return {
    cards: [
      { value: total, label: 'Mes demandes', note: 'Envoyées au total', color: 'blue', icon: '▤', page: 'requests', trend: periodTrend(requests, request => request.date_demande) },
      { value: requested, label: 'Unités demandées', note: 'Sur les 12 derniers mois', color: 'orange', icon: '＋', page: 'forms' },
      { value: toReceive, label: 'Articles à réceptionner', note: 'Colis à confirmer', color: 'purple', icon: '▣', page: 'receipts', alert: toReceive > 0 },
      { value: serviceStock._sum.restant || 0, label: 'Stock du service', note: 'Unités disponibles', color: 'teal', icon: '◫', page: 'serviceStock' },
    ],
    series,
    seriesKeys: ['entrees'],
    seriesLabels: { entrees: 'Quantités demandées' },
    activity: [
      { key: 'received', label: 'Unités réceptionnées', value: received, page: 'receipts' },
      { key: 'dispatched', label: 'Unités dispatchées', value: dispatched, page: 'dispatch' },
      { key: 'used', label: 'Unités utilisées', value: used, page: 'serviceStock' },
    ],
    statuses: [],
    topArticles: ranking(
      lines,
      line => line.id_catalogue,
      line => ({ designation: line.Catalogue.designation, unite: line.Catalogue.Unite?.unite || '' }),
      line => line.quantite_liste_demande,
    ).map(item => ({ ...item.label, quantite: item.quantite })),
    topServices: [],
    critical: [],
    indicators: {
      demandesAnnee: requests.length,
      quantiteDemandee: requested,
      receptions: receptions.length,
      dispatchs: dispatches.length,
    },
    recentTitle: 'Mes dernières demandes',
    recent,
  };
}

export function getDashboard(user) {
  if (user.role === 'DEPOSITAIRE') return depositaireDashboard();
  if (user.role === 'VALIDATEUR') return validateurDashboard();
  return clientDashboard(user);
}
