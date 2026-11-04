import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { notificationEvents } from './notification_service.js'

const userSelect = { id_utilisateur_im: true, nom_complet: true, role: true, photo_url: true, Service: true }

export function listChatContacts(user) {
  const targetRoles = ['CLIENT', 'VALIDATEUR', 'DEPOSITAIRE'].filter(role => role !== user.role)
  return prisma.utilisateur.findMany({
    where: { role: { in: targetRoles }, status_utilisateur: 'actif' },
    select: userSelect,
    orderBy: { nom_complet: 'asc' },
  })
}

export async function listConversations(user) {
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ id_utilisateur_im: user.id_utilisateur_im }, { id_utilisateur_im2: user.id_utilisateur_im }] },
    include: {
      Utilisateur: { select: userSelect },
      Utilisateur2: { select: userSelect },
      Message: { orderBy: { date_message: 'desc' }, take: 1 },
      _count: { select: { Message: { where: { id_utilisateur_im: { not: user.id_utilisateur_im }, status_message: { not: 'LU' } } } } },
    },
    orderBy: { date_conversation: 'desc' },
  })
  return rows.map(row => ({
    ...row,
    correspondant: row.id_utilisateur_im === user.id_utilisateur_im ? row.Utilisateur2 : row.Utilisateur,
    dernier_message: row.Message[0] || null,
    non_lus: row._count.Message,
  }))
}

export function listMessages(user, conversationId) {
  return prisma.conversation.findFirst({
    where: {
      id_conversation: conversationId,
      OR: [{ id_utilisateur_im: user.id_utilisateur_im }, { id_utilisateur_im2: user.id_utilisateur_im }],
    },
  }).then(async conversation => {
    if (!conversation) throw new AppError('Conversation introuvable', 404)
    return prisma.message.findMany({
      where: { id_conversation: conversationId },
      include: { Utilisateur: { select: userSelect } },
      orderBy: { date_message: 'asc' },
    })
  })
}

export async function markConversationRead(user, conversationId, lastMessageId) {
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0 || !Number.isSafeInteger(lastMessageId) || lastMessageId <= 0) throw new AppError('Identifiant invalide', 400)
  const conversation = await prisma.conversation.findFirst({ where: {
    id_conversation: conversationId,
    OR: [{ id_utilisateur_im: user.id_utilisateur_im }, { id_utilisateur_im2: user.id_utilisateur_im }],
  } })
  if (!conversation) throw new AppError('Conversation introuvable', 404)
  const result = await prisma.message.updateMany({ where: {
    id_conversation: conversationId, id_message: { lte: lastMessageId },
    id_utilisateur_im: { not: user.id_utilisateur_im }, status_message: { not: 'LU' },
  }, data: { status_message: 'LU' } })
  if (result.count) notificationEvents.emit('read', user.id_utilisateur_im, { conversationId, lastMessageId })
  return result
}

export async function sendMessage(user, recipientId, content) {
  const recipient = await prisma.utilisateur.findFirst({
    where: { id_utilisateur_im: recipientId, status_utilisateur: 'actif' },
    select: userSelect,
  })
  if (!recipient) throw new AppError('Destinataire introuvable', 404)
  const roles = ['CLIENT', 'VALIDATEUR', 'DEPOSITAIRE']
  const validPair = roles.includes(user.role) && roles.includes(recipient.role) && user.role !== recipient.role
  if (!validPair) throw new AppError('Cette conversation n’est pas autorisée', 403)

  let conversation = await prisma.conversation.findFirst({
    where: { OR: [
      { id_utilisateur_im: user.id_utilisateur_im, id_utilisateur_im2: recipientId },
      { id_utilisateur_im: recipientId, id_utilisateur_im2: user.id_utilisateur_im },
    ] },
  })
  if (!conversation) conversation = await prisma.conversation.create({
    data: { id_utilisateur_im: user.id_utilisateur_im, id_utilisateur_im2: recipientId },
  })
  const message = await prisma.message.create({
    data: { id_conversation: conversation.id_conversation, id_utilisateur_im: user.id_utilisateur_im, contenu: content, status_message: 'ENVOYE' },
    include: { Utilisateur: { select: userSelect } },
  })
  return { conversation, message, recipient }
}
