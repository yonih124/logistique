import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma.js'
import { env } from '../config/env.js'
import { sendMessage } from '../services/chat_service.js'
import { notificationEvents, messageNotification } from '../services/notification_service.js'

const clients = new Map()

const cookieToken = request => Object.fromEntries((request.headers.cookie || '').split(';').map(item => item.trim().split('='))).access_token
const transmit = (socket, payload) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(payload))

export function attachChatWebSocket(server) {
  const webSocketServer = new WebSocketServer({ server, path: '/ws' })
  webSocketServer.on('connection', async (socket, request) => {
    try {
      const token = cookieToken(request)
      const payload = jwt.verify(token, env.jwtSecret)
      const user = await prisma.utilisateur.findUnique({ where: { id_utilisateur_im: Number(payload.sub) }, include: { Service: true } })
      if (!user || user.status_utilisateur !== 'actif' || !['CLIENT', 'VALIDATEUR', 'DEPOSITAIRE'].includes(user.role)) return socket.close(1008, 'Non autorisé')
      const userSockets = clients.get(user.id_utilisateur_im) || new Set()
      userSockets.add(socket); clients.set(user.id_utilisateur_im, userSockets)
      transmit(socket, { type: 'chat:ready', userId: user.id_utilisateur_im })
      const onNewRequest = data => {
        if (['VALIDATEUR', 'DEPOSITAIRE'].includes(user.role)) transmit(socket, { type: 'notification:new', data })
      }
      notificationEvents.on('request', onNewRequest)
      const onWorkflow = ({ role, type, data }) => {
        if (user.role === role) transmit(socket, { type, data })
      }
      notificationEvents.on('workflow', onWorkflow)
      socket.on('close', () => notificationEvents.off('workflow', onWorkflow))
      const onRequestClosed = data => { if (['VALIDATEUR', 'DEPOSITAIRE'].includes(user.role)) transmit(socket, { type: 'notification:remove', data }) }
      notificationEvents.on('request:closed', onRequestClosed)
      socket.on('close', () => notificationEvents.off('request:closed', onRequestClosed))
      const onRead = (userId, data) => { if (userId === user.id_utilisateur_im) transmit(socket, { type: 'notification:read', data }) }
      notificationEvents.on('read', onRead)
      socket.on('close', () => notificationEvents.off('read', onRead))
      socket.on('close', () => notificationEvents.off('request', onNewRequest))

      socket.on('message', async raw => {
        try {
          const event = JSON.parse(raw.toString())
          if (event.type !== 'chat:send') return
          const content = String(event.content || '').trim()
          if (!content || content.length > 5000) throw new Error('Le message doit contenir entre 1 et 5000 caractères')
          const data = await sendMessage(user, Number(event.recipientId), content)
          const outgoing = { type: 'chat:message', data: { ...data.message, conversation: data.conversation } }
          for (const recipientSocket of clients.get(Number(event.recipientId)) || []) transmit(recipientSocket, { type: 'notification:new', data: messageNotification(data.message) })
          for (const participantId of [user.id_utilisateur_im, Number(event.recipientId)]) {
            for (const participantSocket of clients.get(participantId) || []) transmit(participantSocket, outgoing)
          }
        } catch (error) { transmit(socket, { type: 'chat:error', message: error.message }) }
      })
      socket.on('close', () => { userSockets.delete(socket); if (!userSockets.size) clients.delete(user.id_utilisateur_im) })
    } catch { socket.close(1008, 'Authentification requise') }
  })
  return webSocketServer
}
