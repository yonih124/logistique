import { useEffect, useMemo, useRef, useState } from 'react'
import { getOperationsHistory } from '@/services/historyService'
import { BonSortie } from '@/features/deliveries/components/BonSortie'
import './HistoryPhotos.css'

const decisionLabels = { VALIDER: 'Accordé', REJETER: 'Refusé', MODIFIER: 'Modifié', EN_ATTENTE: 'En attente' }
const statusTone = value => {
  const text = (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/refus|rejet|non recu/.test(text)) return 'history-danger'
  if (/valid|accord|livr|^recu|enregistr/.test(text)) return 'history-success'
  if (/modifi|attente|envoy/.test(text)) return 'history-pending'
  return 'history-neutral'
}
const formatDate = value => value ? new Date(value).toLocaleString('fr-FR') : '—'

export function HistoryPage({ role, scope, notify = () => {} }) {
  const notifyRef = useRef(notify)
  const [operations, setOperations] = useState([])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('TOUS')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getOperationsHistory().then(rows => { if (active) setOperations(scope ? rows.filter(row => row.type === scope) : rows) }).catch(error => { if (active) notifyRef.current(error.message, 'error') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [scope])

  const types = [...new Map(operations.map(row => [row.type, row.label])).entries()]
  const rows = useMemo(() => operations.filter(row => {
    const searchable = `${row.reference} ${row.label} ${row.actor} ${row.service} ${row.status} ${row.note} ${row.items.map(item => item.article).join(' ')}`.toLowerCase()
    return (type === 'TOUS' || row.type === type) && searchable.includes(query.toLowerCase())
  }), [operations, query, type])

  return <>
    <section className="history-cards"><article><span>◷</span><div><strong>{operations.length}</strong><small>Opérations enregistrées</small></div></article><article><span>⌑</span><div><strong>{operations.reduce((sum, row) => sum + row.items.length, 0)}</strong><small>Lignes d’articles tracées</small></div></article></section>
    <section className="panel history-list"><div className="history-tools"><div className="catalogue-search"><span>⌕</span><input placeholder="Référence, utilisateur, service ou article…" value={query} onChange={event => setQuery(event.target.value)} /></div><select disabled={Boolean(scope)} value={type} onChange={event => setType(event.target.value)}><option value="TOUS">{scope ? 'Entrées en stock' : 'Toutes les opérations'}</option>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="table-scroll"><table><thead><tr><th>DATE ET HEURE</th><th>OPÉRATION</th><th>RÉFÉRENCE</th><th>UTILISATEUR</th><th>SERVICE</th><th>ARTICLES</th><th>STATUT</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{formatDate(row.date)}</td><td><span className="operation-type">{row.label}</span></td><td><strong>{row.reference}</strong></td><td>{row.actor}</td><td>{row.service}</td><td>{row.items.length}</td><td><span className={`status ${statusTone(row.status)}`}>• {row.status}</span></td><td><button className="link" onClick={() => setSelected(row)}>Consulter →</button></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement de l’historique…</div>}{!loading && !rows.length && <div className="empty">Aucune opération trouvée.</div>}</div></section>
    {selected && <OperationDetail operation={selected} client={role === 'Client'} close={() => setSelected(null)} />}
  </>
}

function OperationDetail({ operation, close, client }) {
  const [showShelf, setShowShelf] = useState(false)
  const validation = operation.type === 'VALIDATION'
  if (!client && (operation.type === 'DEMANDE' || operation.type === 'LIVRAISON')) {
    const requestId = Number(operation.reference.match(/\d+/)?.[0] || 0)
    const request = {
      id_demande_client: requestId,
      Utilisateur: { service: operation.service },
      Liste_demande: operation.items.map(item => ({
        Catalogue: { designation: item.article, emplacement: '', Unite: { unite: item.unite || '—' } },
        quantite_liste_demande: item.quantite,
        quantite_accordee: item.quantite,
        status_liste_demande: 'VALIDER',
      })),
    }
    const deliveryDate = new Date(operation.date).toISOString().slice(0, 10)
    return <div className="modal-layer bs-layer"><section className="bs-dialog"><header className="bs-toolbar"><div><span>DOCUMENT ARCHIVÉ</span><h2>BS-{String(requestId).padStart(6, '0')}</h2></div><label className="shelf-option"><input type="checkbox" checked={showShelf} onChange={event => setShowShelf(event.target.checked)} /><i /> Afficher les étagères</label><button onClick={() => window.print()}>⌑ Imprimer</button><button className="close-bs" onClick={close}>×</button></header><div className="bs-scroll"><BonSortie request={request} showShelf={showShelf} deliveryDate={deliveryDate} /></div><footer className="bs-actions"><span className="archive-warning">Document archivé • {formatDate(operation.date)}</span><div><button onClick={close}>Fermer</button><button className="primary" onClick={() => window.print()}>⌑ Imprimer le bon →</button></div></footer></section></div>
  }
  return <div className="modal-layer"><section className="operation-modal printable-detail">
    <header><div><span>DÉTAIL DE L’OPÉRATION</span><h2>{operation.label}</h2><p>{operation.reference} • {formatDate(operation.date)}</p></div><button onClick={close}>×</button></header>
    <div className="operation-summary">
      <div><span>Utilisateur</span><strong>{operation.actor}</strong><small>{operation.type}</small></div>
      <div><span>Service concerné</span><strong>{operation.service}</strong></div>
      <div><span>Demande associée</span><strong>{operation.reference.startsWith('DEM-') ? operation.reference : operation.note?.match(/DEM-\d+/)?.[0] || '—'}</strong></div>
      <div><span>Statut</span><strong className={`status ${statusTone(operation.status)}`}>{operation.status}</strong></div>
    </div>
    <div className="operation-note"><span>i</span><p>{operation.note || 'Aucune information complémentaire.'}</p></div>
    {operation.type === 'ENTREE_STOCK' && <section className="history-photos" aria-label="Photos des pièces justificatives">
      <h3>Pièces justificatives</h3>
      {operation.photos?.length ? <div className="history-photo-grid">{operation.photos.map((photo, index) => <JustificationPhoto key={photo.id_photo_justification} photo={photo} index={index} />)}</div> : <p>Aucune photo justificative enregistrée pour cette entrée.</p>}
    </section>}
    <section className="operation-products"><div><h3>Liste des produits</h3><span>{operation.items.length} ligne{operation.items.length > 1 ? 's' : ''}</span></div><div className="table-scroll"><table><thead><tr><th>N°</th><th>RÉFÉRENCE</th><th>DÉSIGNATION DU PRODUIT</th><th>UNITÉ</th><th>{validation ? 'QUANTITÉ DEMANDÉE' : 'QUANTITÉ'}</th>{validation && <th>QUANTITÉ ACCORDÉE</th>}<th>RÉSULTAT</th></tr></thead><tbody>{operation.items.map((item, index) => <tr key={`${item.article}-${index}`}><td>{String(index + 1).padStart(2, '0')}</td><td><strong>{operation.reference}</strong></td><td>{item.article}</td><td>{item.unite || '—'}</td><td><strong>{validation ? item.quantite_demandee ?? '—' : item.quantite}</strong></td>{validation && <td><strong>{item.decision === 'REJETER' ? 0 : item.quantite_accordee ?? '—'}</strong></td>}<td>{item.decision ? <div>
      <span className={`status ${statusTone(decisionLabels[item.decision])}`}>{decisionLabels[item.decision] || item.decision}</span>
      {!validation && <p>Demandé : {item.quantite_demandee} · Accordé : {item.quantite_accordee ?? '—'}</p>}
      {item.decision === 'REJETER' && <p className="rejection-explanation"><strong>Motif du refus :</strong> {item.motif_rejet || 'Aucun motif renseigné.'}</p>}
    </div> : <span className={`status ${statusTone(item.resultat || operation.status)}`}>{item.resultat || operation.status}</span>}</td></tr>)}</tbody></table></div></section>
    <footer><button onClick={close}>Fermer</button>{!client && !validation && <button className="primary" onClick={() => window.print()}>⌑ Imprimer le détail</button>}</footer>
  </section></div>
}

function JustificationPhoto({ photo, index }) {
  const [failed, setFailed] = useState(false)
  const url = new URL(photo.url_photo, new URL(import.meta.env.VITE_API_URL || '/api', window.location.origin)).href
  return <a className="history-photo" href={url} target="_blank" rel="noreferrer">
    {failed ? <span className="history-photo-error">Aperçu indisponible</span> : <img src={url} alt={`Pièce justificative ${index + 1}`} loading="lazy" onError={() => setFailed(true)} />}
    <span>Photo {index + 1} — ouvrir en grand</span>
  </a>
}
