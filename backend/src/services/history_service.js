import { prisma } from '../config/prisma.js'

const sortNewest = rows => rows.sort((a, b) => new Date(b.date) - new Date(a.date))
const decisionDetails = line => ({
  decision: line.status_liste_demande,
  motif_rejet: line.Motif_rejet?.motif || null,
  quantite_demandee: line.quantite_liste_demande,
  quantite_accordee: line.quantite_accordee,
})

export async function getOperationsHistory(user) {
  const client = user.role === 'CLIENT'
  const requestWhere = client ? { id_utilisateur_im: user.id_utilisateur_im } : {}
  const lineWhere = client ? { Demande_client: { id_utilisateur_im: user.id_utilisateur_im } } : {}

  const [entries, requests, receptions, dispatches, usages] = await Promise.all([
    client ? Promise.resolve([]) : prisma.justification_entre.findMany({
      include: { Photos: true, Utilisateur: { include: { Service: true } }, Liste_entre: { include: { Catalogue: { include: { Unite: true } } } } },
    }),
    prisma.demande_client.findMany({
      where: requestWhere,
      include: { Utilisateur: { include: { Service: true } }, Liste_demande: { include: { Catalogue: { include: { Unite: true } }, Motif_rejet: true } } },
    }),
    prisma.liste_demande.findMany({
      where: { ...lineWhere, status_reception: { in: ['RECU', 'NON_RECU'] } },
      include: { Catalogue: { include: { Unite: true } }, Demande_client: { include: { Utilisateur: { include: { Service: true } } } } },
    }),
    client ? prisma.dispatch.findMany({
      where: { Stock_service: { id_service: user.id_service } },
      include: { Division: true, Stock_service: { include: { Catalogue: { include: { Unite: true } }, Service: true } }, Utilisateur: true },
    }) : Promise.resolve([]),
    prisma.utilisation_stock_service.findMany({
      where: client ? { id_utilisateur_im: user.id_utilisateur_im } : undefined,
      include: { Utilisateur: { include: { Service: true } }, Liste_demande: { include: { Catalogue: { include: { Unite: true } } } } },
    }),
  ])

  const rows = []
  for (const entry of entries) rows.push({
    photos: entry.Photos,
    id: `ENT-${entry.id_justification_entre}`, type: 'ENTREE_STOCK', label: 'Entrée en stock', date: entry.date_piece,
    reference: `ENT-${entry.id_justification_entre}`, actor: entry.Utilisateur.nom_complet, service: entry.Utilisateur.Service.nom_service,
    status: 'Enregistrée', note: `${entry.fournisseur} — ${entry.marche_concerne}`,
    items: entry.Liste_entre.map(line => ({ article: line.Catalogue.designation, unite: line.Catalogue.Unite?.unite, quantite: line.quantite })),
  })

  for (const request of requests) {
    rows.push({
      id: `DEM-${request.id_demande_client}-CREATION`, type: 'DEMANDE', label: 'Demande du service', date: request.date_demande,
      reference: `DEM-${request.id_demande_client}`, actor: request.Utilisateur.nom_complet, service: request.Utilisateur.Service.nom_service,
      status: 'Envoyée', note: `Urgence : ${request.Urgence}`,
      items: request.Liste_demande.map(line => ({ ...decisionDetails(line), article: line.Catalogue.designation, unite: line.Catalogue.Unite?.unite, quantite: line.quantite_liste_demande, resultat: line.motif_demande })),
    })
    if (request.date_traitement) rows.push({
      id: `DEM-${request.id_demande_client}-TRAITEMENT`, type: 'VALIDATION', label: request.status_demande === 'REFUSER' ? 'Refus de demande' : 'Validation de demande', date: request.date_traitement,
      reference: `DEM-${request.id_demande_client}`, actor: 'Validateur', service: request.Utilisateur.Service.nom_service,
      status: request.status_demande === 'REFUSER' ? 'Refusée' : 'Validée', note: 'Décision enregistrée par le validateur',
      items: request.Liste_demande.map(line => ({ ...decisionDetails(line), article: line.Catalogue.designation, unite: line.Catalogue.Unite?.unite, quantite: line.quantite_accordee || 0, resultat: line.Motif_rejet?.motif || line.status_liste_demande })),
    })
    if (request.date_livraison) rows.push({
      id: `BS-${request.id_demande_client}`, type: 'LIVRAISON', label: 'Bon de sortie imprimé', date: request.date_livraison,
      reference: `BS-${String(request.id_demande_client).padStart(6, '0')}`, actor: 'Dépositaire', service: request.Utilisateur.Service.nom_service,
      status: 'Livrée', note: `Demande DEM-${request.id_demande_client}`,
      items: request.Liste_demande.filter(line => client || line.status_liste_demande !== 'REJETER').map(line => ({
        ...(client ? decisionDetails(line) : {}),
        article: line.Catalogue.designation,
        unite: line.Catalogue.Unite?.unite,
        quantite: line.status_liste_demande === 'REJETER' ? 0 : line.quantite_accordee || 0,
        ...(client && line.status_liste_demande === 'REJETER' ? { quantite_accordee: 0 } : {}),
      })),
    })
  }

  for (const line of receptions) rows.push({
    id: `REC-${line.id_liste_demande}`, type: 'RECEPTION', label: 'Réception par le service', date: line.date_reception || line.Demande_client.date_livraison,
    reference: `DEM-${line.id_demande_client}`, actor: line.Demande_client.Utilisateur.nom_complet, service: line.Demande_client.Utilisateur.Service.nom_service,
    status: line.status_reception === 'RECU' ? 'Reçu' : 'Non reçu', note: line.status_reception === 'RECU' ? 'Ajouté au stock du service' : 'Article déclaré non reçu',
    items: [{ article: line.Catalogue.designation, unite: line.Catalogue.Unite?.unite, quantite: line.quantite_accordee || 0 }],
  })

  for (const dispatch of dispatches) rows.push({
    id: `DIS-${dispatch.id_dispatch}`, type: 'DISPATCH', label: 'Dispatch interne', date: dispatch.date_dispatch,
    reference: `DIS-${dispatch.id_dispatch}`, actor: dispatch.Utilisateur.nom_complet, service: dispatch.Stock_service.Service.nom_service,
    status: 'Réparti', note: `Destination : ${dispatch.Division.nom_division}`,
    items: [{ article: dispatch.Stock_service.Catalogue.designation, unite: dispatch.Stock_service.Catalogue.Unite?.unite, quantite: dispatch.nombre }],
  })

  for (const usage of usages) rows.push({
    id: `UTI-${usage.id_utilisation}`, type: 'SORTIE_SERVICE', label: 'Sortie du stock service', date: usage.date_utilisation,
    reference: `UTI-${usage.id_utilisation}`, actor: usage.Utilisateur.nom_complet, service: usage.Utilisateur.Service.nom_service,
    status: 'Déduite', note: usage.motif,
    items: [{ article: usage.Liste_demande.Catalogue.designation, unite: usage.Liste_demande.Catalogue.Unite?.unite, quantite: usage.quantite }],
  })

  return sortNewest(rows)
}
