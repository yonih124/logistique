import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/crudService'

const statusLabels = {
  ENVOYER: 'En attente',
  VALIDER: 'Validée',
  REFUSER: 'Refusée',
  BON_IMPRIME: 'Bon imprimé',
}

const lineStatusLabels = {
  EN_ATTENTE: 'En attente',
  MODIFIER: 'Modifié',
  VALIDER: 'Accordé',
  REJETER: 'Rejeté',
}

const statusClass = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-')

export function ClientRequestsPage({ notify }) {
  const notifyRef = useRef(notify)
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Toutes')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.list('mes-demandes')
      .then(rows => { if (active) setRequests(rows) })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const rows = requests.filter(request => {
    if (['BON_IMPRIME', 'REFUSER'].includes(request.status_demande) || request.date_livraison) return false
    const status = statusLabels[request.status_demande] || request.status_demande
    const searchable = `DEM-${request.id_demande_client} ${request.Urgence} ${status} ${request.Liste_demande.map(line => line.Catalogue.designation).join(' ')}`.toLowerCase()
    return (filter === 'Toutes' || status === filter) && searchable.includes(query.toLowerCase())
  })

  return <>
    <section className="panel request-page"><div className="tools"><div><span>⌕</span><input placeholder="Rechercher une demande ou un article…" value={query} onChange={event => setQuery(event.target.value)} /></div><select value={filter} onChange={event => setFilter(event.target.value)}><option>Toutes</option><option>En attente</option><option>Validée</option></select></div><div className="table-scroll"><table><thead><tr><th>RÉFÉRENCE</th><th>CONTENU</th><th>URGENCE</th><th>STATUT</th><th>DATE</th><th /></tr></thead><tbody>{rows.map(request => { const status = statusLabels[request.status_demande] || request.status_demande; return <tr key={request.id_demande_client}><td><strong>DEM-{request.id_demande_client}</strong></td><td>{request.Liste_demande.length} article{request.Liste_demande.length > 1 ? 's' : ''}</td><td>{request.Urgence}</td><td><span className={`status ${statusClass(status)}`}>• {status}</span></td><td>{new Date(request.date_demande).toLocaleDateString('fr-FR')}</td><td><button className="link" onClick={() => setSelected(request)}>Consulter →</button></td></tr> })}</tbody></table>{loading && <div className="empty">Chargement de vos demandes…</div>}{!loading && !rows.length && <div className="empty">Aucune demande trouvée.</div>}</div></section>
    {selected && <div className="modal-layer"><section className="article-modal"><header><div><span>DEMANDE DEM-{selected.id_demande_client}</span><h2>Détail de la demande</h2></div><button onClick={() => setSelected(null)}>×</button></header><div className="operation-summary"><div><span>Date</span><strong>{new Date(selected.date_demande).toLocaleDateString('fr-FR')}</strong></div><div><span>Urgence</span><strong>{selected.Urgence}</strong></div><div><span>Statut</span><strong>{statusLabels[selected.status_demande] || selected.status_demande}</strong></div></div><div className="table-scroll"><table><thead><tr><th>ARTICLE</th><th>DEMANDÉ</th><th>ACCORDÉ</th><th>MOTIF CLIENT</th><th>DÉCISION / MOTIF DE REJET</th></tr></thead><tbody>{selected.Liste_demande.map(line => <tr key={line.id_liste_demande}><td><strong>{line.Catalogue.designation}</strong></td><td>{line.quantite_liste_demande}</td><td>{line.quantite_accordee ?? '—'}</td><td>{line.motif_demande || '—'}</td><td><span className={`status ${statusClass(lineStatusLabels[line.status_liste_demande] || line.status_liste_demande)}`}>• {lineStatusLabels[line.status_liste_demande] || line.status_liste_demande}</span>{line.Motif_rejet && <small className="article-ref">Motif : {line.Motif_rejet.motif}</small>}</td></tr>)}</tbody></table></div><footer className="form-actions"><button className="primary" onClick={() => setSelected(null)}>Fermer</button></footer></section></div>}
  </>
}
