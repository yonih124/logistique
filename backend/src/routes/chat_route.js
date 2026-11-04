import { Router } from 'express'
import { listNotifications } from '../services/notification_service.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { listChatContacts, listConversations, listMessages, markConversationRead } from '../services/chat_service.js'

const router = Router()
router.patch('/chat/conversations/:id/read', authenticate, authorize('CLIENT', 'VALIDATEUR', 'DEPOSITAIRE'), async (req, res) => res.json({ success: true, data: await markConversationRead(req.utilisateur, Number(req.params.id), req.body.lastMessageId) }))
router.get('/notifications', authenticate, authorize('CLIENT', 'VALIDATEUR', 'DEPOSITAIRE'), async (req, res) => res.json({ success: true, data: await listNotifications(req.utilisateur) }))
router.use('/chat', authenticate, authorize('CLIENT', 'VALIDATEUR', 'DEPOSITAIRE'))
router.get('/chat/contacts', async (req, res) => res.json({ success: true, data: await listChatContacts(req.utilisateur) }))
router.get('/chat/conversations', async (req, res) => res.json({ success: true, data: await listConversations(req.utilisateur) }))
router.get('/chat/conversations/:id/messages', async (req, res) => res.json({ success: true, data: await listMessages(req.utilisateur, Number(req.params.id)) }))

export const chatRoute = router
