import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/services/crudService'

const tabs = [['accounts', 'Comptes'], ['units', 'Unités'], ['services', 'Services']]

export function ReferenceDataPage({ notify }) {
  const notifyRef = useRef(notify)
  const [activeTab, setActiveTab] = useState('accounts')
  const [data, setData] = useState({ accounts: [], units: [], services: [] })
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const mapRows = (accounts, units, catalogues, services) => ({
    accounts: accounts.map(row => ({
      id: row.id_compte,
      code: String(row.id_compte),
      name: row.categorie || '',
      description: row.description || '',
      used: catalogues.filter(item => item.id_compte === row.id_compte).length,
    })),
    units: units.map(row => ({
      id: row.id_unite,
      code: String(row.id_unite),
      name: row.unite,
      description: row.description || '',
      used: catalogues.filter(item => item.id_unite === row.id_unite).length,
    })),
    services: services.map(row => ({ id: row.id_service, code: String(row.id_service), name: row.nom_service, description: '', used: 0 })),
  })

  const load = async () => {
    setLoading(true)
    try {
      const [accounts, units, catalogues, services] = await Promise.all([
        api.list('comptes'), api.list('unites'), api.list('catalogues'), api.list('services'),
      ])
      setData(mapRows(accounts, units, catalogues, services))
    } catch (error) { notifyRef.current(error.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    Promise.all([api.list('comptes'), api.list('unites'), api.list('catalogues'), api.list('services')])
      .then(([accounts, units, catalogues, services]) => { if (active) setData(mapRows(accounts, units, catalogues, services)) })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const isAccount = activeTab === 'accounts'
  const isService = activeTab === 'services'
  const resourceLabel = isAccount ? 'compte' : isService ? 'service' : 'unité'
  const list = useMemo(() => data[activeTab].filter(item =>
    `${item.code} ${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())),
  [data, activeTab, query])

  const save = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      if (isAccount) {
        const payload = { categorie: editing.name || null, description: editing.description || null }
        if (editing.id) await api.update('comptes', editing.id, payload)
        else await api.create('comptes', { id_compte: Number(editing.code), ...payload })
      } else if (!isService) {
        const payload = { unite: editing.name, description: editing.description || null }
        if (editing.id) await api.update('unites', editing.id, payload)
        else await api.create('unites', payload)
      } else if (editing.id) await api.update('services', editing.id, { nom_service: editing.name })
      else await api.create('services', { nom_service: editing.name })
      setEditing(null)
      await load()
      notify('Élément enregistré avec succès')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }

  const remove = async item => {
    if (item.used > 0) return notify('Suppression impossible : cet élément est utilisé par des articles', 'error')
    setSaving(true)
    try {
      await api.remove(isAccount ? 'comptes' : isService ? 'services' : 'unites', item.id)
      await load()
      notify('Élément supprimé')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }

  return <>
    <div className="reference-tabs">{tabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => { setActiveTab(id); setQuery(''); setEditing(null) }}><span>{id === 'accounts' ? '#' : '◫'}</span>{label}<b>{data[id].length}</b></button>)}</div>
    <section className="panel reference-panel"><div className="reference-toolbar"><div className="catalogue-search"><span>⌕</span><input placeholder={`Rechercher un ${resourceLabel}…`} value={query} onChange={event => setQuery(event.target.value)} /></div><button className="primary" onClick={() => setEditing({ id: null, code: '', name: '', description: '', used: 0 })}>＋ Ajouter un {resourceLabel}</button></div><div className="table-scroll"><table><thead><tr><th>CODE</th><th>{isAccount ? 'CATÉGORIE' : 'LIBELLÉ'}</th><th>DESCRIPTION</th><th>UTILISATION</th><th>ACTIONS</th></tr></thead><tbody>{list.map(item => <tr key={item.id}><td><strong className="reference-code">{item.code}</strong></td><td><strong>{item.name}</strong></td><td>{item.description || '—'}</td><td>{item.used} article{item.used > 1 ? 's' : ''}</td><td><div className="crud-actions"><button onClick={() => setEditing({ ...item })}>Modifier</button><button className="delete" disabled={item.used > 0 || saving} onClick={() => remove(item)}>Supprimer</button></div></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement des référentiels…</div>}{!loading && !list.length && <div className="empty">Aucun élément.</div>}</div></section>
    <div className="reference-rule"><span>i</span><p>Un compte ou une unité utilisé par un article ne peut pas être supprimé afin de préserver l’historique.</p></div>
    {editing && <div className="modal-layer"><form className="article-modal reference-modal" onSubmit={save}><header><div><span>RÉFÉRENTIEL</span><h2>{editing.id ? 'Modifier' : 'Ajouter'} {isAccount ? 'le compte' : 'l’unité'}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header><div className="form-grid"><label className="form-field"><span>Code <b>*</b></span><input required={isAccount} type={isAccount ? 'number' : 'text'} min="1" disabled={Boolean(editing.id) || !isAccount} value={isAccount ? editing.code : editing.id ? editing.code : 'Généré automatiquement'} onChange={event => setEditing({ ...editing, code: event.target.value })} /></label><label className="form-field"><span>{isAccount ? 'Catégorie' : 'Libellé'} <b>*</b></span><input required value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label></div><label className="form-field reference-description"><span>Description</span><textarea value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></label><footer className="form-actions"><button type="button" onClick={() => setEditing(null)}>Annuler</button><button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer →'}</button></footer></form></div>}
  </>
}
