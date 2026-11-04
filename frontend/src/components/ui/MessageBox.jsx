import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './MessageBox.css'

export function MessageBox({ message, onClose }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previous = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  const error = message.type === 'error'
  return createPortal(<dialog ref={dialogRef} className={`crud-message-box ${error ? 'is-error' : 'is-success'}`} aria-labelledby="crud-message-title" aria-describedby="crud-message-text" onCancel={event => { event.preventDefault(); onClose() }}>
    <span className="crud-message-symbol" aria-hidden="true">{error ? '!' : '✓'}</span>
    <h2 id="crud-message-title">{error ? 'Opération impossible' : 'Opération réussie'}</h2>
    <p id="crud-message-text">{message.text}</p>
    <button type="button" autoFocus onClick={onClose}>Compris</button>
  </dialog>, document.body)
}
