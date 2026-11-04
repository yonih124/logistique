import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getChatContacts, getChatConversations, getChatMessages, getChatSocketUrl, markChatRead } from '@/services/chatService'

const initials = name => (name || '?').split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase()
const serviceName = contact => contact?.service || contact?.Service?.nom_service || 'Service non renseigné'

export function MessagesPage({ user, notify }) {
  const [contacts, setContacts] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const socketRef = useRef(null)
  const selectedRef = useRef(null)

  const loadSidebar = useCallback(async () => {
    const [contactRows, conversationRows] = await Promise.all([getChatContacts(), getChatConversations()])
    setContacts(contactRows)
    setConversations(conversationRows)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => loadSidebar().catch(error => notify(error.message, 'error')).finally(() => setLoading(false)), 0)
    return () => window.clearTimeout(timer)
  }, [loadSidebar, notify])

  const discussions = useMemo(() => {
    const items = new Map(contacts.map(contact => [contact.id_utilisateur_im, { recipientId: contact.id_utilisateur_im, contact, conversationId: null, lastMessage: null }]))
    conversations.forEach(conversation => items.set(conversation.correspondant.id_utilisateur_im, { recipientId: conversation.correspondant.id_utilisateur_im, contact: conversation.correspondant, conversationId: conversation.id_conversation, unread: conversation.non_lus || 0, lastMessage: conversation.dernier_message }))
    const needle = search.trim().toLowerCase()
    return [...items.values()].filter(item => !needle || item.contact.nom_complet.toLowerCase().includes(needle) || serviceName(item.contact).toLowerCase().includes(needle))
  }, [contacts, conversations, search])

  const selected = discussions.find(item => item.recipientId === selectedId)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    if (!selected?.conversationId) {
      const timer = window.setTimeout(() => setMessages([]), 0)
      return () => window.clearTimeout(timer)
    }
    let active = true
    getChatMessages(selected.conversationId).then(rows => active && setMessages(rows)).catch(error => notify(error.message, 'error'))
    return () => { active = false }
  }, [selected?.conversationId, notify])

  useEffect(() => {
    let stopped = false
    let retryTimer
    const connect = () => {
      const socket = new WebSocket(getChatSocketUrl())
      socketRef.current = socket
      socket.onopen = () => setConnected(true)
      socket.onmessage = event => {
        const payload = JSON.parse(event.data)
        if (payload.type === 'chat:error') { notify(payload.message, 'error'); return }
        if (payload.type === 'notification:read' || payload.type === 'chat:ready') { loadSidebar().catch(() => {}); return }
        if (payload.type !== 'chat:message') return
        const incoming = payload.data
        const current = selectedRef.current
        const participants = [Number(incoming.conversation.id_utilisateur_im), Number(incoming.conversation.id_utilisateur_im2)]
        if (current && participants.includes(Number(current.recipientId))) setMessages(rows => rows.some(message => message.id_message === incoming.id_message) ? rows : [...rows, incoming])
        loadSidebar().catch(() => {})
      }
      socket.onerror = () => setConnected(false)
      socket.onclose = () => { setConnected(false); if (!stopped) retryTimer = window.setTimeout(connect, 2500) }
    }
    connect()
    return () => { stopped = true; window.clearTimeout(retryTimer); socketRef.current?.close() }
  }, [loadSidebar, notify])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stream = document.querySelector('.message-stream')
      if (stream) stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages])

  useEffect(() => {
    let active = true
    let reading = false
    const readVisible = async () => {
      if (reading || document.visibilityState !== 'visible' || !selected?.conversationId) return
      const incoming = messages.filter(message => message.id_conversation === selected.conversationId && Number(message.id_utilisateur_im) !== Number(user.im) && message.status_message !== 'LU')
      if (!incoming.length) return
      reading = true
      const lastId = Math.max(...incoming.map(message => message.id_message))
      try {
        await markChatRead(selected.conversationId, lastId)
        if (active) {
          setMessages(rows => rows.map(message => message.id_conversation === selected.conversationId && message.id_message <= lastId && Number(message.id_utilisateur_im) !== Number(user.im) ? { ...message, status_message: 'LU' } : message))
          await loadSidebar()
        }
      } catch (error) { if (active) notify(error.message, 'error') }
      finally { reading = false }
    }
    void readVisible()
    document.addEventListener('visibilitychange', readVisible)
    return () => { active = false; document.removeEventListener('visibilitychange', readVisible) }
  }, [messages, selected?.conversationId, user.im, loadSidebar, notify])

  const send = event => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !selected || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({ type: 'chat:send', recipientId: selected.recipientId, content }))
    setDraft('')
  }

  if (!contacts.length && !conversations.length && !loading) return <section className="messaging-shell"><aside className="conversation-list"><header><div><span>DISCUSSIONS</span><h2>Contacts</h2></div><b>0</b></header></aside><article className="message-thread"><div className="empty-state"><h3>Aucun interlocuteur disponible</h3><p>La messagerie relie les clients, les validateurs et les dépositaires actifs.</p></div></article></section>

  return <section className="messaging-shell"><aside className="conversation-list"><header><div><span>DISCUSSIONS</span><h2>Contacts</h2></div><b>{discussions.length}</b></header><div className="conversation-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une discussion…" /></div><div className="conversation-items">{discussions.map(item => <button key={item.recipientId} className={selectedId === item.recipientId ? 'active' : ''} onClick={() => { if (selectedId !== item.recipientId) { setMessages([]); setSelectedId(item.recipientId) } }}><span>{initials(item.contact.nom_complet)}</span><div><strong>{item.contact.nom_complet}</strong><p>{item.lastMessage?.contenu || 'Commencer une conversation'}</p><small>{serviceName(item.contact)}</small></div>{item.unread > 0 && <b aria-label={`${item.unread} messages non lus`}>{item.unread}</b>}</button>)}</div></aside>{!selected && <article className="message-thread"><div className="empty-state"><h3>Sélectionnez une discussion</h3><p>Les compteurs indiquent les messages non lus de chaque conversation.</p></div></article>}{selected && <article className="message-thread"><header><div className="message-avatar">{initials(selected.contact.nom_complet)}</div><div><h2>{selected.contact.nom_complet}</h2><p>{({ VALIDATEUR: 'Validateur', CLIENT: 'Client', DEPOSITAIRE: 'Dépositaire' })[selected.contact.role]} • {serviceName(selected.contact)}</p></div><span className="online-state">● {connected ? 'Connecté' : 'Reconnexion…'}</span></header><div className="request-context"><span>Conversation sécurisée</span><strong>{selected.conversationId ? `CONV-${selected.conversationId}` : 'NOUVELLE'}</strong><p>Messages conservés dans la base de données</p></div><div className="message-stream"><div className="message-date"><span>Messages</span></div>{messages.map(message => <div key={message.id_message} className={`message-bubble ${Number(message.id_utilisateur_im) === Number(user.im) ? 'mine' : ''}`}><div><strong>{message.Utilisateur?.nom_complet || (Number(message.id_utilisateur_im) === Number(user.im) ? user.name : selected.contact.nom_complet)}</strong><time>{new Date(message.date_message).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</time></div><p>{message.contenu}</p></div>)}</div><form className="message-composer" onSubmit={send}><textarea maxLength="5000" value={draft} onChange={event => setDraft(event.target.value)} placeholder={`Écrire un message à ${selected.contact.nom_complet}…`} rows="2" /><div><small>{connected ? 'Connexion temps réel active.' : 'Connexion au serveur en cours…'}</small><button className="primary" disabled={!draft.trim() || !connected}>Envoyer →</button></div></form></article>}</section>
}
