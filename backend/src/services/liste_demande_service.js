import { prisma } from "../config/prisma.js";
import { AppError } from '../utils/AppError.js';
import { notificationEvents, requestNotification } from './notification_service.js';

export async function creerPlusieursLignesDemande(id_demande_client, produits, user) {
  let notification;
  const lignes = await prisma.$transaction(async tx => {
    const demande = await tx.demande_client.findUnique({ where: { id_demande_client }, include: { Liste_demande: true, Utilisateur: { select: { nom_complet: true } } } });
    if (!demande || (user.role === 'CLIENT' && demande.id_utilisateur_im !== user.id_utilisateur_im)) throw new AppError('Demande introuvable', 404);
    if (demande.status_demande !== 'ENVOYER') throw new AppError('Demande déjà traitée', 409);
    if (!demande.Liste_demande.length) notification = requestNotification(demande);
    return tx.liste_demande.createManyAndReturn({
    data: produits.map((produit) => ({
      id_demande_client,
      id_catalogue: produit.id_catalogue,
      quantite_liste_demande: produit.quantite_liste_demande,
      motif_demande: produit.motif_demande,
      status_liste_demande: 'EN_ATTENTE',
    })),
    });
  }, { isolationLevel: 'Serializable' });
  if (notification) notificationEvents.emit('request', notification);
  return lignes;
}

export async function creerDemandeComplete(user, { Urgence, produits }) {
  const demande = await prisma.$transaction(async tx => {
    return tx.demande_client.create({ data: {
      id_utilisateur_im: user.id_utilisateur_im, Urgence, status_demande: 'ENVOYER',
      Liste_demande: { create: produits.map(line => ({ id_catalogue: line.id_catalogue, quantite_liste_demande: line.quantite_liste_demande, motif_demande: line.motif_demande, status_liste_demande: 'EN_ATTENTE' })) },
    }, include: { Utilisateur: { select: { nom_complet: true } } } });
  }, { isolationLevel: 'Serializable' });
  notificationEvents.emit('request', requestNotification(demande));
  return demande;
}
