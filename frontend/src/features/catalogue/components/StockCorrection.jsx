import { useEffect, useState } from 'react'
import { request } from '@/services/httpService'
import './StockCorrection.css'

export function StockCorrection({ article, stocks, close, onSaved, notify }) {
  const [id, setId] = useState(String(stocks[0]?.id_stock || ''))
  const [quantity, setQuantity] = useState(String(stocks[0]?.quantite_stock ?? ''))
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState('')
  const stock = stocks.find(row => String(row.id_stock) === id)
  useEffect(() => {
    if (!id) return
    let active = true
    request({ url: `/stocks/${id}/modifications` }).then(rows => { if (active) setHistory(rows) }).catch(error => { if (active) setHistoryError(error.message) })
    return () => { active = false }
  }, [id])
  const submit = async event => {
    event.preventDefault()
    if (!stock || quantity === '' || !Number.isInteger(Number(quantity)) || Number(quantity) < 0 || !motif.trim()) return notify('Renseignez une quantité entière positive ou nulle et un motif.', 'error')
    setBusy(true)
    try {
      await request({ url: `/stocks/${id}/correction`, method: 'POST', data: { quantite_avant: stock.quantite_stock, quantite_apres: Number(quantity), motif: motif.trim() } })
      await onSaved()
      close()
      notify('Stock corrigé et modification enregistrée dans l’historique.')
    } catch (error) { notify(error.message, 'error') }
    finally { setBusy(false) }
  }
  return <div className="modal-layer"><form className="article-modal stock-correction" onSubmit={submit}><header><div><span>CORRECTION EXCEPTIONNELLE</span><h2>{article.designation}</h2></div><button type="button" disabled={busy} onClick={close} aria-label="Fermer">×</button></header>
    <p className="stock-correction-warning">Attention : cette action remplace la quantité du stock sélectionné. Elle ne crée pas une entrée en stock. Le motif et les quantités avant/après seront conservés.</p>
    {!stocks.length ? <p>Aucun stock à corriger. Enregistrez d’abord une entrée en stock pour cet article.</p> : <div className="form-grid"><label className="form-field"><span>Stock à corriger</span><select disabled={busy} value={id} onChange={event => { const selected = stocks.find(row => String(row.id_stock) === event.target.value); setId(event.target.value); setQuantity(String(selected.quantite_stock)); setHistory([]); setHistoryError('') }}>{stocks.map(row => <option key={row.id_stock} value={row.id_stock}>Stock #{row.id_stock} — {row.quantite_stock} unité(s)</option>)}</select></label><label className="form-field"><span>Quantité avant</span><input readOnly value={stock?.quantite_stock ?? ''} /></label><label className="form-field"><span>Nouvelle quantité *</span><input required type="number" min="0" max="2147483647" step="1" disabled={busy} value={quantity} onChange={event => setQuantity(event.target.value)} /></label><label className="form-field"><span>Motif obligatoire *</span><textarea required maxLength={1000} disabled={busy} value={motif} onChange={event => setMotif(event.target.value)} /></label></div>}
    <section><h3>Historique des corrections de ce stock</h3>{historyError && <p role="alert">{historyError}</p>}<div className="table-scroll"><table><thead><tr><th>AVANT</th><th>APRÈS</th><th>MOTIF</th></tr></thead><tbody>{history.map(row => <tr key={row.id_modification_stock}><td>{row.quantite_avant}</td><td>{row.quantite_apres}</td><td>{row.motif}</td></tr>)}</tbody></table></div></section>
    <footer className="form-actions"><button type="button" disabled={busy} onClick={close}>Annuler</button><button className="stock-danger" disabled={busy || !stock}>{busy ? 'Enregistrement…' : 'Confirmer la correction'}</button></footer>
  </form></div>
}
