import { EventEmitter } from 'node:events';
import { prisma } from '../config/prisma.js';

export const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(0);
export const accountNotification = (item, date = null) => ({ id: `compte-${item.id_utilisateur_im}`, type: 'compte', date, title: 'Nouveau compte à examiner', text: item.nom_complet, target: 'users' });
export const deliveryNotification = item => ({ id: `bon-${item.id_demande_client}`, type: 'bon', date: item.date_traitement, title: `Bon de sortie à imprimer — DEM-${item.id_demande_client}`, text: 'Demande validée, prête à être livrée', target: 'deliveryNotes' });

export const messageNotification = item => ({ id: `message-${item.id_message}`, type: 'message', messageId: item.id_message, conversationId: item.id_conversation, date: item.date_message, title: `Message de ${item.Utilisateur.nom_complet}`, text: item.contenu.slice(0, 120), target: 'messages' });
export const requestNotification = item => ({ id: `demande-${item.id_demande_client}`, type: 'demande', date: item.date_demande, title: `Nouvelle demande DEM-${item.id_demande_client}`, text: item.Utilisateur?.nom_complet || 'Service demandeur', target: 'requests' });

export async function listNotifications(user) {
  const [messages, demandes, comptes, bons] = await Promise.all([
    prisma.message.findMany({
      where: { status_message: { not: 'LU' }, id_utilisateur_im: { not: user.id_utilisateur_im }, Conversation: { OR: [
        { id_utilisateur_im: user.id_utilisateur_im }, { id_utilisateur_im2: user.id_utilisateur_im },
      ] } },
      include: { Utilisateur: { select: { nom_complet: true } } },
      orderBy: [{ date_message: 'desc' }, { id_message: 'desc' }], take: 100,
    }),
    ['VALIDATEUR', 'DEPOSITAIRE'].includes(user.role) ? prisma.demande_client.findMany({
      where: { status_demande: 'ENVOYER', Liste_demande: { some: {} } },
      include: { Utilisateur: { select: { nom_complet: true } } },
      orderBy: { date_demande: 'desc' }, take: 100,
    }) : [],
    user.role === 'VALIDATEUR' ? prisma.utilisateur.findMany({
      where: { status_utilisateur: 'inactif' },
      select: { id_utilisateur_im: true, nom_complet: true },
    }) : [],
    user.role === 'DEPOSITAIRE' ? prisma.demande_client.findMany({
      where: { status_demande: 'VALIDER' },
      select: { id_demande_client: true, date_traitement: true },
    }) : [],
  ]);
  return [
    ...messages.map(messageNotification),
    ...demandes.map(requestNotification),
    ...comptes.map(item => accountNotification(item)),
    ...bons.map(deliveryNotification),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
}
