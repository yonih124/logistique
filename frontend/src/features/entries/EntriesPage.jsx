import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/crudService'

const today = new Date().toISOString().slice(0, 10)

export function EntriesPage({ notify }) {
  const notifyRef = useRef(notify)
  const [catalogues, setCatalogues] = useState([])
  const [accountFilter, setAccountFilter] = useState('TOUS')
  const [images, setImages] = useState([])
  const [reading, setReading] = useState(false)
  const [savedPhotos, setSavedPhotos] = useState([])
  const fileRef = useRef(null)
  const [entry, setEntry] = useState({ piece: '', date: today, market: '', supplier: '' })
  const [lines, setLines] = useState([{ id_catalogue: '', quantite: 1 }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    api.list('catalogues')
      .then(items => {
        if (!active) return
        setCatalogues(items)
        if (items.length) setLines([{ id_catalogue: items[0].id_catalogue, quantite: 1 }])
      })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const updateLine = (index, field, value) => setLines(current =>
    current.map((line, position) => position === index ? { ...line, [field]: value } : line))

  const accounts = [...new Set(catalogues.map(item => item.id_compte))].sort((a, b) => a - b)
  const filteredCatalogues = accountFilter === 'TOUS' ? catalogues : catalogues.filter(item => String(item.id_compte) === accountFilter)
  const changeAccount = value => {
    setAccountFilter(value)
    const choices = value === 'TOUS' ? catalogues : catalogues.filter(item => String(item.id_compte) === value)
    setLines(current => current.map(line => choices.some(item => item.id_catalogue === Number(line.id_catalogue)) ? line : { ...line, id_catalogue: choices[0]?.id_catalogue || '' }))
  }

  const chooseImage = async event => {
    const files = [...event.target.files]
    event.target.value = ''
    if (!files.length) return
    if (images.length + files.length > 10) return notify('Vous pouvez ajouter 10 photos maximum.', 'error')
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      return notify('Chaque photo doit être JPG, PNG ou WebP, de 2 Mo maximum.', 'error')
    }
    setReading(true)
    try {
      const photos = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, data: reader.result })
        reader.onerror = () => reject(new Error('Impossible de lire une photo.'))
        reader.readAsDataURL(file)
      })))
      setImages(current => [...current, ...photos])
    } catch (error) { notify(error.message, 'error') }
    finally { setReading(false) }
  }
  const submit = async event => {
    event.preventDefault()
    const pieceId = Number(String(entry.piece).replace(/\D/g, ''))
    if (!Number.isInteger(pieceId) || pieceId <= 0) return notify('Le numéro de pièce doit contenir un nombre positif', 'error')
    setSaving(true)
    try {
      const saved = await api.create('entrees-stock', {
        id_justification_entre: pieceId,
        date_piece: new Date(`${entry.date}T00:00:00`).toISOString(),
        marche_concerne: entry.market,
        fournisseur: entry.supplier,
        images: images.map(photo => photo.data),
        produits: lines.map(line => ({
          id_catalogue: Number(line.id_catalogue),
          quantite: Number(line.quantite),
        })),
      })
      setSavedPhotos(saved.Photos || [])
      setImages([])
      if (fileRef.current) fileRef.current.value = ''
      setEntry({ piece: '', date: today, market: '', supplier: '' })
      setLines([{ id_catalogue: catalogues[0]?.id_catalogue || '', quantite: 1 }])
      notify('Entrée enregistrée et stock mis à jour')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }

  return <section className="forms-workspace"><form className="business-form" onSubmit={submit} onReset={() => setImages([])}>
    <header className="form-intro"><span>ENTRÉE EN STOCK</span><h2>Réception d’articles</h2><p>Enregistrez la pièce justificative et les quantités réellement reçues.</p></header>
    <div className="form-grid"><Field label="Numéro de pièce" required><input required inputMode="numeric" value={entry.piece} onChange={event => setEntry({ ...entry, piece: event.target.value })} placeholder="Ex. 20260084" /></Field><Field label="Date de saisie" required><input required type="date" value={entry.date} onChange={event => setEntry({ ...entry, date: event.target.value })} /></Field><Field label="Marché concerné" required><input required value={entry.market} onChange={event => setEntry({ ...entry, market: event.target.value })} /></Field><Field label="Fournisseur" required><input required value={entry.supplier} onChange={event => setEntry({ ...entry, supplier: event.target.value })} /></Field></div>
    <div className="account-filter-row"><label>Filtrer par compte<select value={accountFilter} onChange={event => changeAccount(event.target.value)}><option value="TOUS">Tous les comptes</option>{accounts.map(id => <option key={id} value={id}>Compte {id}</option>)}</select></label></div>
    <section className="line-section"><header><div><h3>Articles reçus</h3><p>Chaque quantité enregistrée sera ajoutée au stock actuel.</p></div><button type="button" disabled={!filteredCatalogues.length} onClick={() => setLines([...lines, { id_catalogue: filteredCatalogues[0]?.id_catalogue || '', quantite: 1 }])}>＋ Ajouter un article</button></header>{lines.map((line, index) => <div className="line-row" key={index}><Field label="Article" required><select required value={line.id_catalogue} onChange={event => updateLine(index, 'id_catalogue', event.target.value)}>{filteredCatalogues.map(item => <option key={item.id_catalogue} value={item.id_catalogue}>{item.designation}</option>)}</select></Field><Field label="Quantité reçue" required><input required type="number" min="1" value={line.quantite} onChange={event => updateLine(index, 'quantite', event.target.value)} /></Field><button className="remove-line" type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, position) => position !== index))}>×</button></div>)}</section>
    <Field label="Photos justificatives (facultatives)">
      <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={saving || reading} onChange={chooseImage} />
      <small>JPG, PNG ou WebP — 2 Mo par photo, 10 photos maximum ({images.length}/10)</small>
    </Field>
    {reading && <p role="status">Lecture des photos…</p>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {images.map(photo => <figure key={photo.id} style={{ margin: 0, maxWidth: 220 }}>
        <img src={photo.data} alt={photo.name} style={{ maxWidth: '100%', height: 150, objectFit: 'contain' }} />
        <figcaption>{photo.name}</figcaption>
        <button type="button" disabled={saving || reading} onClick={() => setImages(current => current.filter(item => item.id !== photo.id))}>Retirer cette photo</button>
      </figure>)}
    </div>
    {savedPhotos.map((photo, index) => <p key={photo.id_photo_justification}><a href={new URL(photo.url_photo, new URL(import.meta.env.VITE_API_URL || '/api', window.location.origin)).href} target="_blank" rel="noreferrer">Consulter la photo enregistrée {index + 1}</a></p>)}
    {loading && <div className="empty">Chargement du catalogue…</div>}
    <footer className="form-actions"><button type="reset" disabled={saving || reading} onClick={() => setLines([{ id_catalogue: catalogues[0]?.id_catalogue || '', quantite: 1 }])}>Réinitialiser</button><button className="primary" disabled={saving || reading || loading || !catalogues.length}>{saving ? 'Enregistrement…' : 'Enregistrer l’entrée →'}</button></footer>
  </form></section>
}

function Field({ label, required, children }) {
  return <label className="form-field"><span>{label}{required && <b> *</b>}</span>{children}</label>
}
