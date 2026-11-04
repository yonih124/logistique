import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { MessageBox } from '@/components/ui/MessageBox'

const FeedbackContext = createContext(null)

/** File d'attente des messages de résultat (succès / erreur) affichés en boîte modale. */
export function FeedbackProvider({ children }) {
  const [messages, setMessages] = useState([])
  const nextId = useRef(0)
  const notify = useCallback((text, type = 'success') => {
    setMessages(current => [...current, { id: ++nextId.current, text: text || 'Une erreur est survenue.', type }])
  }, [])
  return <FeedbackContext.Provider value={notify}>
    {children}
    {messages.length > 0 && <MessageBox key={messages[0].id} message={messages[0]} onClose={() => setMessages(current => current.slice(1))} />}
  </FeedbackContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotify() {
  const notify = useContext(FeedbackContext)
  if (!notify) throw new Error('useNotify doit être utilisé dans <FeedbackProvider>.')
  return notify
}
