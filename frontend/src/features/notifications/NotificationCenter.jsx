import { useEffect, useRef, useState } from 'react'
import { applyNotificationEvent } from '@/services/notificationState'
import { request } from '@/services/httpService'
import { getChatSocketUrl } from '@/services/chatService'
import './NotificationCenter.css'

function readIds(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}

export function NotificationCenter({ user, onNavigate, onCountsChange }) {
  const storageKey = `notifications-read-${user.im}`
  const [items, setItems] = useState([])
  const [read, setRead] = useState(() => readIds(storageKey))
  const [open, setOpen] = useState(false)
  const [sound, setSound] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const audioRef = useRef(null)
  const soundRef = useRef(false)
  const readRef = useRef(read)

  const markRead = ids => {
    const next = [...new Set([...readRef.current, ...ids])].slice(-5000)
    readRef.current = next
    setRead(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Reading remains available in this session. */ }
  }

  const toggleSound = async () => {
    if (soundRef.current) { soundRef.current = false; setSound(false); return }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) throw new Error('Le son n’est pas disponible dans ce navigateur.')
      audioRef.current ||= new Audio()
      await audioRef.current.resume()
      soundRef.current = true
      setSound(true)
      setError('')
    } catch { setError('Impossible d’activer le son. Vérifiez les réglages audio du navigateur.') }
  }

  useEffect(() => {
    let stopped = false
    let socket
    let retry
    let busy = false
    let refreshAgain = false
    let known = null
    let initialized = false
    let pendingEvents = []
    const beep = () => {
      const context = audioRef.current
      if (!soundRef.current || context?.state !== 'running') return
      const oscillator = context.createOscillator()
      const volume = context.createGain()
      oscillator.connect(volume)
      volume.connect(context.destination)
      oscillator.frequency.setValueAtTime(740, context.currentTime)
      oscillator.frequency.setValueAtTime(990, context.currentTime + 0.12)
      volume.gain.setValueAtTime(0.0001, context.currentTime)
      volume.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015)
      volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.32)
      oscillator.onended = () => { oscillator.disconnect(); volume.disconnect() }
    }
    const refresh = async () => {
      if (stopped) return
      if (busy) { refreshAgain = true; return }
      busy = true
      pendingEvents = []
      try {
        const snapshot = await request({ url: '/notifications' })
        const rows = pendingEvents.reduce(applyNotificationEvent, snapshot)
        if (stopped) return
        const fresh = initialized ? rows.filter(row => !known?.has(row.id) && !readRef.current.includes(row.id)) : []
        initialized = true
        known = new Set([...(known || []), ...rows.map(row => row.id)])
        setItems(rows)
        setError('')
        if (fresh.length) { setAnnouncement(fresh[0].title); beep() }
      } catch (failure) {
        if (!stopped) setError(failure.message)
      } finally {
        busy = false
        if (refreshAgain && !stopped) { refreshAgain = false; void refresh() }
      }
    }
    const connect = () => {
      if (stopped) return
      socket = new WebSocket(getChatSocketUrl())
      socket.onmessage = event => {
        let payload
        try { payload = JSON.parse(event.data) } catch { return }
        if (payload.type === 'chat:ready') {
          if (Number(payload.userId) !== Number(user.im)) { socket.close(1000); setError('Le compte connecté a changé. Reconnectez-vous.'); return }
          void refresh()
        }
        if (['notification:new', 'notification:read', 'notification:remove'].includes(payload.type)) {
          if (busy) pendingEvents.push(payload)
          setItems(current => applyNotificationEvent(current, payload))
          if (payload.type === 'notification:new' && payload.data?.id) {
            const isNew = !known?.has(payload.data.id) && !readRef.current.includes(payload.data.id)
            known ||= new Set()
            known.add(payload.data.id)
            if (isNew) { setAnnouncement(payload.data.title); beep() }
          }
        }
      }
      socket.onclose = event => { if (!stopped && event.code !== 1008 && event.code !== 1000) retry = window.setTimeout(connect, 3000) }
      socket.onerror = () => { if (!stopped) setError('Connexion aux notifications interrompue. Reconnexion en cours…') }
    }
    connect()
    // chat:ready loads notifications once per authenticated connection.
    return () => { stopped = true; clearTimeout(retry); socket?.close() }
  }, [user.im])

  useEffect(() => () => { audioRef.current?.close().catch(() => {}) }, [])
  const unread = items.filter(item => !read.includes(item.id))
  const messageCount = unread.filter(item => item.type === 'message').length
  const requestCount = unread.filter(item => item.type === 'demande').length
  const accountCount = unread.filter(item => item.type === 'compte').length
  const deliveryCount = unread.filter(item => item.type === 'bon').length
  useEffect(() => {
    onCountsChange?.({ messages: messageCount, requests: requestCount, users: accountCount, deliveryNotes: deliveryCount })
  }, [messageCount, requestCount, accountCount, deliveryCount, onCountsChange])
  return <div className="notification-center">
    <button type="button" className="notification-bell" aria-expanded={open} aria-label={`Notifications : ${unread.length} non lues`} onClick={() => setOpen(value => !value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {unread.length > 0 && <b>{unread.length > 99 ? '99+' : unread.length}</b>}
    </button>
    <span className="notification-announcement" role="status">{announcement}</span>
    {open && <section className="notification-dropdown" aria-label="Notifications">
      <header><strong>Notifications ({unread.length})</strong><button type="button" onClick={() => setOpen(false)} aria-label="Fermer les notifications">×</button></header>
      <div className="notification-options"><button type="button" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Couper le son' : 'Activer le son'}</button><button type="button" disabled={!unread.length} onClick={() => markRead(items.map(item => item.id))}>Tout marquer comme lu</button></div>
      {error && <p role="alert">{error}</p>}
      {!sound && <p className="notification-hint">Activez le son pour entendre les nouvelles alertes.</p>}
      <div className="notification-list">{!items.length && <p>Aucune notification.</p>}{items.map(item => <button type="button" key={item.id} className={read.includes(item.id) ? '' : 'unread'} onClick={() => { markRead([item.id]); setOpen(false); onNavigate(item.target) }}><strong>{item.title}</strong><span>{item.text}</span><small>{item.date ? new Date(item.date).toLocaleString('fr-FR') : 'Compte en attente'}{!read.includes(item.id) && ' · Non lu'}</small></button>)}</div>
    </section>}
  </div>
}
