import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/crudService'
import { confirmRequest } from '@/services/validationRequestService'

export function ValidationRequestsPage({ notify }) {
  const notifyRef = useRef(notify)
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [review, setReview] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')

  const load = async () => {
    setLoading(true)
    try { setRequests(await api.list('demandes-a-valider')) }
    catch (error) { notifyRef.current(error.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    api.list('demandes-a-valider')
      .then(rows => { if (active) setRequests(rows) })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openReview = request => {
    setValidationError('')
    setReview(request)
    setLines(request.Liste_demande.map(line => ({
      ...line,
      available: line.Catalogue.Stock.reduce((sum, stock) => sum + stock.quantite_stock, 0),
      granted: line.quantite_accordee ?? line.quantite_proposee ?? line.quantite_liste_demande,
      decision: (line.quantite_accordee ?? line.quantite_proposee ?? line.quantite_liste_demande) === line.quantite_liste_demande ? 'VALIDER' : 'MODIFIER',
      rejectionReason: line.Motif_rejet?.motif || '',
    })))
  }

  const updateLine = (index, field, value) => {
    setValidationError('')
    setLines(current => current.map((line, position) => {
      if (position !== index) return line
      if (field === 'granted') {
        const granted = Number(value)
        return { ...line, granted, decision: 'MODIFIER' }
      }
      return { ...line, [field]: value, ...(field === 'decision' && value === 'REJETER' ? { granted: 0 } : {}) }
    }))
  }

  const validate = async event => {
    event.preventDefault()
    setValidationError('')
    if (lines.some(line => line.decision === 'REJETER' && !line.rejectionReason.trim())) {
      const message = 'Le motif de rejet est obligatoire pour chaque article refusé'
      setValidationError(message)
      notify(message, 'error')
      return
    }
    const insufficient = lines.find(line => line.decision !== 'REJETER' && Number(line.granted) > line.available)
    if (insufficient) {
      const message = `Stock insuffisant pour ${insufficient.Catalogue.designation} : ${insufficient.available} disponible(s), ${insufficient.granted} accordé(s)`
      setValidationError(message)
      notify(message, 'error')
      return
    }
    setSaving(true)
    try {
      const decisions = lines.map(line => ({
          id_liste_demande: line.id_liste_demande,
          status: line.decision,
          quantite_accordee: line.decision === 'REJETER' ? 0 : Number(line.granted),
          motif_rejet: line.decision === 'REJETER' ? line.rejectionReason.trim() : undefined,
      }))
      const allRejected = lines.every(line => line.decision === 'REJETER')
      await confirmRequest(review.id_demande_client, decisions)
      setReview(null)
      await load()
      notify(allRejected ? 'Demande refusée' : 'Décision transmise au dépositaire')
    } catch (error) {
      setValidationError(error.message)
      notify(error.message, 'error')
    }
    finally { setSaving(false) }
  }

  const shown = requests.filter(request => `DEM-${request.id_demande_client} ${request.Utilisateur.nom_complet} ${request.Utilisateur.service} ${request.Liste_demande.map(line => line.Catalogue.designation).join(' ')}`.toLowerCase().includes(query.toLowerCase()))

  if (review) return <form className="business-form examination" onSubmit={validate}>
    <button className="back-link" type="button" disabled={saving} onClick={() => setReview(null)}>← Retour aux demandes</button>
    <header className="form-intro"><span>DEMANDE DEM-{review.id_demande_client}</span><h2>Examen de la demande</h2><p>{review.Utilisateur.nom_complet} • {review.Utilisateur.service} • {new Date(review.date_demande).toLocaleDateString('fr-FR')}</p></header>
    {validationError && <div className="approval-warning" role="alert">⚠ {validationError}</div>}
    <div className="review-list">{lines.map((line, index) => <article key={line.id_liste_demande}>
      <header><div><span>ARTICLE {index + 1}</span><h3>{line.Catalogue.designation}</h3></div><select className={line.decision === 'REJETER' ? 'decision-select rejete' : line.decision === 'MODIFIER' ? 'decision-select ajuste' : 'decision-select accorde'} value={line.decision} onChange={event => updateLine(index, 'decision', event.target.value)}><option value="VALIDER">Valider</option><option value="MODIFIER">Modifier</option><option value="REJETER">Refuser</option></select></header>
      <div className="approval-warning"><strong>Motif du client :</strong> {line.motif_demande || 'Aucun motif renseigné'}</div>
      <div className="review-values"><label>Demandé<input disabled value={line.quantite_liste_demande} /></label><label>Stock réel<input disabled value={line.available} /></label><label>Quantité accordée<input required type="number" min="0" max={line.available} disabled={line.decision === 'REJETER'} value={line.granted} onChange={event => updateLine(index, 'granted', event.target.value)} /></label><label>Pourcentage du catalogue<input disabled value={`${line.Catalogue.pourcentage_demande_max ?? 100} % du stock central`} /><small>Base de la proposition initiale. Vous pouvez ajuster la quantité accordée dans la limite du stock disponible.</small></label></div>
      {line.decision === 'REJETER' && <label className="reject-reason"><span>Motif du rejet <b>*</b></span><textarea required maxLength="1000" value={line.rejectionReason} onChange={event => updateLine(index, 'rejectionReason', event.target.value)} placeholder="Expliquez pourquoi cet article est refusé…" /></label>}
    </article>)}</div>
    <footer className="form-actions"><button type="button" disabled={saving} onClick={() => setLines(lines.map(line => ({ ...line, decision: 'REJETER', granted: 0 })))}>Tout refuser</button><button className="primary" disabled={saving}>{saving ? 'Validation…' : 'Enregistrer toutes les décisions →'}</button></footer>
  </form>

  return <section className="panel request-page"><div className="tools"><div><span>⌕</span><input placeholder="Rechercher une demande…" value={query} onChange={event => setQuery(event.target.value)} /></div></div><div className="table-scroll"><table><thead><tr><th>RÉFÉRENCE</th><th>DEMANDEUR</th><th>SERVICE</th><th>CONTENU</th><th>URGENCE</th><th>DATE</th><th /></tr></thead><tbody>{shown.map(request => <tr key={request.id_demande_client}><td><strong>DEM-{request.id_demande_client}</strong></td><td>{request.Utilisateur.nom_complet}</td><td>{request.Utilisateur.service}</td><td>{request.Liste_demande.length} article{request.Liste_demande.length > 1 ? 's' : ''}</td><td>{request.Urgence}</td><td>{new Date(request.date_demande).toLocaleDateString('fr-FR')}</td><td><button className="link" onClick={() => openReview(request)}>Examiner →</button></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement des demandes…</div>}{!loading && !shown.length && <div className="empty">Aucune demande à valider.</div>}</div></section>
}
