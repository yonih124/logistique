import { config } from '@/config/env'
import { request } from './httpService'

export const getChatContacts = () => request({ url: '/chat/contacts' })
export const getChatConversations = () => request({ url: '/chat/conversations' })
export const getChatMessages = conversationId => request({ url: `/chat/conversations/${conversationId}/messages` })
export const markChatRead = (conversationId, lastMessageId) => request({ url: `/chat/conversations/${conversationId}/read`, method: 'PATCH', data: { lastMessageId } })

export const getChatSocketUrl = () => config.wsUrl
