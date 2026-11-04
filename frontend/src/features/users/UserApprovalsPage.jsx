import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/crudService'

const roleLabels = { CLIENT: 'Client', DEPOSITAIRE: 'Dépositaire', VALIDATEUR: 'Validateur' }

function mapUser(row) {
  return {
    id: row.id_utilisateur_im,
    im: `IM-${row.id_utilisateur_im}`,
    name: row.nom_complet,
    email: row.mail || '—',
    service: row.service,
    role: roleLabels[row.role] || row.role,
    status: row.status_utilisateur === 'actif' ? 'Accepté' : 'En attente',
  }
}

export function UserApprovalsPage({ notify }) {
  const notifyRef = useRef(notify)
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('En attente')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setUsers((await api.list('utilisateurs')).map(mapUser)) }
    catch (error) { notifyRef.current(error.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    api.list('utilisateurs')
      .then(rows => { if (active) setUsers(rows.map(mapUser)) })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const decide = async (user, accepted) => {
    setSaving(true)
    try {
      if (accepted) {
        await api.update('utilisateurs', user.id, { status_utilisateur: 'actif' })
        notify(`Compte ${user.im} autorisé à se connecter`)
      } else {
        await api.remove('utilisateurs', user.id)
        notify('Demande d’inscription refusée et supprimée')
      }
      setSelected(null)
      await load()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const rows = users.filter(user => filter === 'Tous' || user.status === filter)

  return <>
    <section className="approval-stats"><article><span>◷</span><div><strong>{users.filter(user => user.status === 'En attente').length}</strong><small>En attente</small></div></article><article><span>✓</span><div><strong>{users.filter(user => user.status === 'Accepté').length}</strong><small>Acceptés</small></div></article></section>
    <section className="panel approvals"><div className="approval-toolbar"><div><h2>Demandes d’inscription</h2><p>L’IM accepté deviendra l’identifiant de connexion de l’utilisateur.</p></div><select value={filter} onChange={event => setFilter(event.target.value)}><option>En attente</option><option>Accepté</option><option>Tous</option></select></div><div className="table-scroll"><table><thead><tr><th>IM</th><th>UTILISATEUR</th><th>E-MAIL</th><th>SERVICE</th><th>RÔLE</th><th>STATUT</th><th /></tr></thead><tbody>{rows.map(user => <tr key={user.id}><td><strong className="reference-code">{user.im}</strong></td><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.service}</td><td>{user.role}</td><td><span className={`status ${user.status === 'Accepté' ? 'validee' : 'en-attente'}`}>• {user.status}</span></td><td>{user.status === 'En attente' ? <button className="link" onClick={() => setSelected(user)}>Examiner →</button> : '—'}</td></tr>)}</tbody></table>{loading && <div className="empty">Chargement des comptes…</div>}{!loading && !rows.length && <div className="empty">Aucune demande.</div>}</div></section>
    {selected && <div className="modal-layer"><section className="article-modal approval-modal"><header><div><span>INSCRIPTION {selected.im}</span><h2>Examiner le compte</h2></div><button disabled={saving} onClick={() => setSelected(null)}>×</button></header><div className="candidate"><span>{selected.name.split(' ').map(word => word[0]).join('')}</span><div><h3>{selected.name}</h3><p>{selected.email}</p></div></div><div className="operation-summary"><div><span>Numéro IM</span><strong>{selected.im}</strong></div><div><span>Service</span><strong>{selected.service}</strong></div><div><span>Rôle demandé</span><strong>{selected.role}</strong></div></div><div className="approval-warning">En acceptant ce compte, l’utilisateur pourra se connecter avec l’IM <strong>{selected.im}</strong>.</div><footer className="approval-actions"><button disabled={saving} onClick={() => decide(selected, false)}>Refuser</button><button className="primary" disabled={saving} onClick={() => decide(selected, true)}>{saving ? 'Traitement…' : '✓ Accepter le compte'}</button></footer></section></div>}
  </>
}
