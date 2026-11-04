import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { notificationEvents, deliveryNotification } from './notification_service.js';

async function retirerDuStock(tx, idCatalogue, quantite, designation) {
  if (quantite === 0) return;
  const stocks = await tx.stock.findMany({
    where: { id_catalogue: idCatalogue },
    orderBy: { id_stock: 'asc' },
  });
  const disponible = stocks.reduce((sum, stock) => sum + stock.quantite_stock, 0);
  if (disponible < quantite) {
    throw new AppError(`Stock insuffisant pour ${designation} : ${disponible} disponible(s), ${quantite} demandé(s)`, 409, {
      id_catalogue: idCatalogue,
      disponible,
      demande: quantite,
    });
  }

  let restant = quantite;
  for (const stock of stocks) {
    if (restant === 0) break;
    const retrait = Math.min(stock.quantite_stock, restant);
    await tx.stock.update({
      where: { id_stock: stock.id_stock },
      data: { quantite_stock: { decrement: retrait } },
    });
    restant -= retrait;
  }
}

export async function confirmerDemande(idDemande, decisions) {
  const result = await prisma.$transaction(async tx => {
    const demande = await tx.demande_client.findUnique({
      where: { id_demande_client: idDemande },
      include: { Liste_demande: { include: { Catalogue: { select: { designation: true } } } } },
    });
    if (!demande) throw new AppError('Demande introuvable', 404);
    if (demande.status_demande !== 'ENVOYER') {
      throw new AppError('Cette demande a déjà été traitée', 409);
    }

    const lignes = new Map(demande.Liste_demande.map(ligne => [ligne.id_liste_demande, ligne]));
    const idsDecisions = new Set(decisions.map(decision => decision.id_liste_demande));
    if (decisions.length !== lignes.size || idsDecisions.size !== lignes.size || decisions.some(decision => !lignes.has(decision.id_liste_demande))) {
      throw new AppError('Une décision est requise pour chaque ligne de la demande', 400);
    }

    const retraits = new Map();
    for (const decision of decisions) {
      const ligne = lignes.get(decision.id_liste_demande);
      const quantite = decision.status === 'REJETER' ? 0 : decision.quantite_accordee;
      const retrait = retraits.get(ligne.id_catalogue) || { quantite: 0, designation: ligne.Catalogue.designation };
      retrait.quantite += quantite;
      retraits.set(ligne.id_catalogue, retrait);
    }

    const allRejected = decisions.every(decision => decision.status === 'REJETER');
    const claimed = await tx.demande_client.updateMany({
      where: { id_demande_client: idDemande, status_demande: 'ENVOYER' },
      data: { status_demande: allRejected ? 'REFUSER' : 'VALIDER', date_traitement: new Date() },
    });
    if (claimed.count !== 1) throw new AppError('Cette demande a déjà été traitée', 409);

    for (const [idCatalogue, retrait] of retraits) {
      await retirerDuStock(tx, idCatalogue, retrait.quantite, retrait.designation);
    }

    for (const decision of decisions) {
      const rejected = decision.status === 'REJETER';
      await tx.liste_demande.update({
        where: { id_liste_demande: decision.id_liste_demande },
        data: {
          status_liste_demande: rejected ? 'REJETER' : decision.quantite_accordee === lignes.get(decision.id_liste_demande).quantite_liste_demande ? 'VALIDER' : 'MODIFIER',
          quantite_accordee: rejected ? 0 : decision.quantite_accordee,
          pourcentage_accorde: null,
        },
      });
      if (rejected) {
        await tx.motif_rejet.upsert({
          where: { id_liste_demande: decision.id_liste_demande },
          create: { id_liste_demande: decision.id_liste_demande, motif: decision.motif_rejet },
          update: { motif: decision.motif_rejet, date_rejet: new Date() },
        });
      }
    }

    return { id_demande_client: idDemande, status_demande: allRejected ? 'REFUSER' : 'VALIDER' };
  }, { isolationLevel: 'Serializable' });
  notificationEvents.emit('request:closed', { id: `demande-${idDemande}` });
  if (result.status_demande === 'VALIDER') notificationEvents.emit('workflow', {
    role: 'DEPOSITAIRE', type: 'notification:new',
    data: deliveryNotification({ ...result, date_traitement: new Date() }),
  });
  return result;
}
