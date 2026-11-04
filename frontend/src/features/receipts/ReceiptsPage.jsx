import { Icon } from '@/components/ui/Icon'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/crudService'
import { receiveLines } from '@/services/dispatchService'

const needsReception = item => item.status_demande === 'BON_IMPRIME' && item.Liste_demande.some(line => line.status_reception === 'EN_ATTENTE' && line.status_liste_demande !== 'REJETER')

const labels = { EN_ATTENTE: 'En attente', RECU: 'Reçu', NON_RECU: 'Non reçu' }

export function ReceiptsPage({ notify }) {
  const notifyRef = useRef(notify)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [decisions, setDecisions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => setRequests((await api.list('mes-demandes')).filter(needsReception))
  useEffect(() => { let active = true; api.list('mes-demandes').then(rows => { if (active) setRequests(rows.filter(needsReception)) }).catch(error => notifyRef.current(error.message, 'error')).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])

  const open = request => {
    setSelected(request)
    setDecisions(Object.fromEntries(request.Liste_demande.filter(line => line.status_reception === 'EN_ATTENTE' && line.status_liste_demande !== 'REJETER').map(line => [line.id_liste_demande, 'RECU'])))
  }
  const submit = async event => {
    event.preventDefault(); setSaving(true)
    try { await receiveLines(Object.entries(decisions).map(([id, status_reception]) => ({ id_liste_demande: Number(id), status_reception }))); await load(); setSelected(null); notify('Réception enregistrée et stock du service mis à jour') }
    catch (error) { notify(error.message, 'error') } finally { setSaving(false) }
  }

  return <><section className="receipt-info"><span>i</span><div><strong>Confirmation de réception</strong><p>Chaque article reçu alimente automatiquement le stock interne de votre service.</p></div></section><section className="panel receipt-list"><div className="panel-title"><div><h2>Colis de mon service</h2><p>Bons de sortie imprimés par le dépositaire</p></div></div><div className="delivery-cards">{requests.map(request => { const pending = request.Liste_demande.some(line => line.status_reception === 'EN_ATTENTE' && line.status_liste_demande !== 'REJETER'); return <article key={request.id_demande_client}><div className="delivery-icon"><Icon name="receipts" /></div><div className="delivery-main"><span>BS-{String(request.id_demande_client).padStart(6, '0')}</span><strong>Demande DEM-{request.id_demande_client}</strong><small>{request.Liste_demande.length} article(s) • {new Date(request.date_demande).toLocaleDateString('fr-FR')}</small></div><span className={`status ${pending ? 'en-attente' : 'livree'}`}>• {pending ? 'À confirmer' : 'Réception traitée'}</span><button disabled={!pending} onClick={() => open(request)}>{pending ? 'Vérifier le colis →' : 'Confirmée ✓'}</button></article> })}</div>{loading && <div className="empty">Chargement…</div>}{!loading && !requests.length && <div className="empty">Aucun colis à réceptionner.</div>}</section>{selected && <div className="modal-layer"><form className="article-modal receipt-modal" onSubmit={submit}><header><div><span>RÉCEPTION DU COLIS</span><h2>Articles reçus</h2><p>DEM-{selected.id_demande_client}</p></div><button type="button" onClick={() => setSelected(null)}>×</button></header><div className="check-articles">{selected.Liste_demande.filter(line => line.status_reception === 'EN_ATTENTE' && line.status_liste_demande !== 'REJETER').map(line => <article className="receipt-decision" key={line.id_liste_demande}><div><strong>{line.Catalogue.designation}</strong><small>Quantité attendue : {line.quantite_accordee || 0}</small></div><select value={decisions[line.id_liste_demande]} onChange={event => setDecisions(current => ({ ...current, [line.id_liste_demande]: event.target.value }))}><option value="RECU">{labels.RECU}</option><option value="NON_RECU">{labels.NON_RECU}</option></select></article>)}</div><footer className="form-actions"><button type="button" onClick={() => setSelected(null)}>Annuler</button><button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Confirmer la réception'}</button></footer></form></div>}</>
}
