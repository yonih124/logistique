import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/crudService'

export function NewRequestPage({ notify }) {
  const notifyRef = useRef(notify)
  const [catalogues, setCatalogues] = useState([])
  const [urgency, setUrgency] = useState('NORMALE')
  const [accountFilter, setAccountFilter] = useState('TOUS')
  const [lines, setLines] = useState([{ id_catalogue: '', quantity: 1, reason: '' }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    api.list('catalogues-disponibles')
      .then(items => {
        if (!active) return
        setCatalogues(items)
        if (items.length) setLines([{ id_catalogue: items[0].id_catalogue, quantity: 1, reason: '' }])
      })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const updateLine = (index, field, value) => setLines(current =>
    current.map((line, position) => position === index ? { ...line, [field]: value } : line))

  const accounts = [...new Map(catalogues.map(item => [item.id_compte, item.Compte])).entries()]
  const filteredCatalogues = accountFilter === 'TOUS' ? catalogues : catalogues.filter(item => String(item.id_compte) === accountFilter)
  const changeAccount = value => {
    setAccountFilter(value)
    const choices = value === 'TOUS' ? catalogues : catalogues.filter(item => String(item.id_compte) === value)
    setLines(current => current.map(line => choices.some(item => item.id_catalogue === Number(line.id_catalogue)) ? line : { ...line, id_catalogue: choices[0]?.id_catalogue || '' }))
  }

  const submit = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      const demande = await api.create('demandes-client', {
        Urgence: urgency,
        produits: lines.map(line => ({
          id_catalogue: Number(line.id_catalogue),
          quantite_liste_demande: Number(line.quantity),
          motif_demande: line.reason.trim(),
          status_liste_demande: 'EN_ATTENTE',
        })),
      })
      setUrgency('NORMALE')
      setLines([{ id_catalogue: catalogues[0]?.id_catalogue || '', quantity: 1, reason: '' }])
      notify(`Demande DEM-${demande.id_demande_client} envoyée au validateur`)
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }

  return <section className="forms-workspace"><form className="business-form" onSubmit={submit}>
    <header className="form-intro"><span>DEMANDE DE SORTIE</span><h2>Articles souhaités</h2><p>Sélectionnez les produits nécessaires à votre service.</p></header>
    <div className="privacy-note">▣ Les niveaux de stock restent confidentiels. Le validateur examinera votre demande.</div>
    <div className="form-grid client-request-meta"><Field label="Niveau d’urgence" required><select value={urgency} onChange={event => setUrgency(event.target.value)}><option value="NORMALE">Normale</option><option value="PRIORITAIRE">Prioritaire</option><option value="URGENTE">Urgente</option></select></Field></div>
    <div className="account-filter-row"><label>Filtrer par compte<select value={accountFilter} onChange={event => changeAccount(event.target.value)}><option value="TOUS">Tous les comptes</option>{accounts.map(([id, account]) => <option key={id} value={id}>{id} — {account?.categorie || 'Sans catégorie'}</option>)}</select></label></div>
    <section className="line-section"><header><div><h3>Articles</h3><p>Ajoutez les produits et les quantités demandées.</p></div><button type="button" disabled={!filteredCatalogues.length} onClick={() => setLines([...lines, { id_catalogue: filteredCatalogues[0]?.id_catalogue || '', quantity: 1, reason: '' }])}>＋ Ajouter un article</button></header>{lines.map((line, index) => <div className="line-row with-reason" key={index}><Field label="Article" required><select required value={line.id_catalogue} onChange={event => updateLine(index, 'id_catalogue', event.target.value)}>{filteredCatalogues.map(item => <option key={item.id_catalogue} value={item.id_catalogue}>{item.designation}</option>)}</select></Field><Field label="Quantité demandée" required><input required type="number" min="1" value={line.quantity} onChange={event => updateLine(index, 'quantity', event.target.value)} /></Field><Field label="Motif" required><input required type="text" maxLength="500" value={line.reason} onChange={event => updateLine(index, 'reason', event.target.value)} placeholder="Expliquez le besoin…" /></Field><button className="remove-line" type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, position) => position !== index))}>×</button></div>)}</section>
    {loading && <div className="empty">Chargement des articles…</div>}
    <footer className="form-actions"><button type="button" onClick={() => setLines([{ id_catalogue: catalogues[0]?.id_catalogue || '', quantity: 1, reason: '' }])}>Réinitialiser</button><button className="primary" disabled={saving || loading || !catalogues.length}>{saving ? 'Envoi…' : 'Envoyer la demande →'}</button></footer>
  </form></section>
}

function Field({ label, required, children }) {
  return <label className="form-field"><span>{label}{required && <b> *</b>}</span>{children}</label>
}
