import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'

const stockInclude = { Catalogue: { include: { Unite: true, Compte: true } }, Service: true }

export function getServiceStock(user) {
  return prisma.stock_service.findMany({
    where: user.role === 'CLIENT' ? { id_service: user.id_service } : undefined,
    include: stockInclude,
    orderBy: { id_stock_service: 'desc' },
  })
}

export function listDivisions(user) {
  return prisma.division.findMany({
    where: { id_service: user.id_service },
    include: { Service: true },
    orderBy: { nom_division: 'asc' },
  })
}

export function updateDivision(user, id, nom_division) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new AppError('Identifiant de division invalide', 400)
  return prisma.division.update({ where: { id_division: id, id_service: user.id_service }, data: { nom_division }, include: { Service: true } })
}

export async function deleteDivision(user, id) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new AppError('Identifiant de division invalide', 400)
  const division = await prisma.division.findFirst({ where: { id_division: id, id_service: user.id_service }, include: { _count: { select: { Dispatch: true } } } })
  if (!division) throw new AppError('Division introuvable pour votre service', 404)
  if (division._count.Dispatch) throw new AppError('Cette division possède des dispatchs et ne peut pas être supprimée.', 409)
  return prisma.division.delete({ where: { id_division: id, id_service: user.id_service } })
}

export function createDivision(user, nomDivision) {
  return prisma.division.create({
    data: { nom_division: nomDivision, id_service: user.id_service },
    include: { Service: true },
  })
}

export function createDispatch(user, payload) {
  return prisma.$transaction(async tx => {
    const division = await tx.division.findFirst({ where: { id_division: payload.id_division, id_service: user.id_service } })
    if (!division) throw new AppError('Division introuvable pour votre service', 404)
    const stock = await tx.stock_service.findFirst({ where: { id_stock_service: payload.id_stock_service, id_service: user.id_service } })
    if (!stock) throw new AppError('Stock du service introuvable', 404)
    if (payload.nombre > stock.restant) throw new AppError(`Stock interne insuffisant : ${stock.restant} disponible(s)`, 409)

    const updated = await tx.stock_service.updateMany({
      where: { id_stock_service: stock.id_stock_service, restant: { gte: payload.nombre } },
      data: { restant: { decrement: payload.nombre }, reparti: { increment: payload.nombre } },
    })
    if (updated.count !== 1) throw new AppError('Stock interne insuffisant', 409)
    return tx.dispatch.create({
      data: { ...payload, id_utilisateur_im: user.id_utilisateur_im },
      include: { Division: true, Stock_service: { include: stockInclude }, Utilisateur: { include: { Service: true } } },
    })
  }, { isolationLevel: 'Serializable' })
}

export function listDispatches(user) {
  return prisma.dispatch.findMany({
    where: user.role === 'CLIENT' ? { Stock_service: { id_service: user.id_service } } : undefined,
    include: { Division: true, Stock_service: { include: stockInclude }, Utilisateur: { include: { Service: true } } },
    orderBy: { date_dispatch: 'desc' },
  })
}

export function createStockUsage(user, payload) {
  return prisma.$transaction(async tx => {
    const stock = await tx.stock_service.findFirst({ where: { id_stock_service: payload.id_stock_service, id_service: user.id_service } })
    if (!stock) throw new AppError('Stock du service introuvable', 404)
    if (payload.quantite > stock.restant) throw new AppError(`Stock interne insuffisant : ${stock.restant} disponible(s)`, 409)
    // La sortie diminue le « restant » du stock du service auquel elle est rattachée.
    const updated = await tx.stock_service.updateMany({
      where: { id_stock_service: stock.id_stock_service, restant: { gte: payload.quantite } },
      data: { restant: { decrement: payload.quantite } },
    })
    if (updated.count !== 1) throw new AppError('Stock interne insuffisant', 409)
    return tx.utilisation_stock_service.create({
      data: { quantite: payload.quantite, motif: payload.motif, id_utilisateur_im: user.id_utilisateur_im, id_stock_service: stock.id_stock_service },
      include: { Stock_service: { include: stockInclude } },
    })
  }, { isolationLevel: 'Serializable' })
}

export function listStockUsages(user) {
  return prisma.utilisation_stock_service.findMany({
    where: user.role === 'CLIENT' ? { id_utilisateur_im: user.id_utilisateur_im } : undefined,
    include: { Utilisateur: { include: { Service: true } }, Stock_service: { include: stockInclude } },
    orderBy: { date_utilisation: 'desc' },
  })
}

export function receiveLines(user, decisions) {
  return prisma.$transaction(async tx => {
    const ids = decisions.map(item => item.id_liste_demande)
    const lines = await tx.liste_demande.findMany({
      where: { id_liste_demande: { in: ids }, Demande_client: { id_utilisateur_im: user.id_utilisateur_im, status_demande: 'BON_IMPRIME' } },
    })
    if (lines.length !== decisions.length) throw new AppError('Certaines lignes de réception sont invalides', 400)
    for (const decision of decisions) {
      const line = lines.find(item => item.id_liste_demande === decision.id_liste_demande)
      if (line.status_reception !== 'EN_ATTENTE' || line.stock_service_enregistre) throw new AppError('Cette ligne a déjà été réceptionnée', 409)
      if (decision.status_reception === 'RECU') {
        await tx.stock_service.upsert({
          where: { id_service_id_catalogue: { id_service: user.id_service, id_catalogue: line.id_catalogue } },
          create: { id_service: user.id_service, id_catalogue: line.id_catalogue, restant: line.quantite_accordee || 0 },
          update: { restant: { increment: line.quantite_accordee || 0 } },
        })
      }
      await tx.liste_demande.update({
        where: { id_liste_demande: line.id_liste_demande },
        data: {
          status_reception: decision.status_reception,
          stock_service_enregistre: decision.status_reception === 'RECU',
          date_reception: new Date(),
        },
      })
    }
    return { lignes: decisions.length }
  })
}
