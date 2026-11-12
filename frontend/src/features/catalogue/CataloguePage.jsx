import { StockCorrection } from './components/StockCorrection'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/services/crudService'

export function CataloguePage({ notify }) {
  const notifyRef = useRef(notify)
  const [catalogues, setCatalogues] = useState([])
  const [comptes, setComptes] = useState([])
  const [unites, setUnites] = useState([])
  const [stocks, setStocks] = useState([])
  const [query, setQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState('TOUS')
  const [correcting, setCorrecting] = useState(null)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const rows = await Promise.all(['catalogues', 'comptes', 'unites', 'stocks'].map(api.list))
      setCatalogues(rows[0]); setComptes(rows[1]); setUnites(rows[2]); setStocks(rows[3])
    } catch (error) { notify(error.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    Promise.all(['catalogues', 'comptes', 'unites', 'stocks'].map(api.list))
      .then(rows => {
        if (!active) return
        setCatalogues(rows[0]); setComptes(rows[1]); setUnites(rows[2]); setStocks(rows[3])
      })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const quantities = useMemo(() => stocks.reduce((all, row) => ({
    ...all, [row.id_catalogue]: (all[row.id_catalogue] || 0) + row.quantite_stock,
  }), {}), [stocks])
  const compte = id => comptes.find(row => row.id_compte === id)?.categorie || '—'
  const unite = id => unites.find(row => row.id_unite === id)?.unite || '—'
  const shown = catalogues.filter(row => (accountFilter === 'TOUS' || String(row.id_compte) === accountFilter) && `${row.designation} ${row.id_catalogue} ${row.emplacement || ''} ${compte(row.id_compte)}`.toLowerCase().includes(query.toLowerCase()))

  const save = async event => {
    event.preventDefault()
    const payload = { pourcentage_demande_max: Number(editing.pourcentage_demande_max ?? 100), designation: editing.designation, emplacement: editing.emplacement || null, stock_min: Number(editing.stock_min), id_compte: Number(editing.id_compte), id_unite: Number(editing.id_unite) }
    try {
      if (editing.id_catalogue) await api.update('catalogues', editing.id_catalogue, payload)
      else await api.create('catalogues', payload)
      setEditing(null); await load(); notify('Article enregistré')
    } catch (error) { notify(error.message, 'error') }
  }

  return <>
    <section className="catalogue-summary"><article><span>▦</span><div><strong>{catalogues.length}</strong><small>Articles référencés</small></div></article><article><span>◫</span><div><strong>{Object.values(quantities).reduce((a, b) => a + b, 0).toLocaleString('fr-FR')}</strong><small>Unités en stock</small></div></article><article><span>⚠</span><div><strong>{catalogues.filter(row => (quantities[row.id_catalogue] || 0) <= row.stock_min).length}</strong><small>Stocks critiques</small></div></article></section>
    <section className="panel catalogue"><div className="catalogue-tools"><div className="catalogue-search"><span>⌕</span><input placeholder="Article, compte ou étagère…" value={query} onChange={event => setQuery(event.target.value)} /></div><select className="account-filter" value={accountFilter} onChange={event => setAccountFilter(event.target.value)}><option value="TOUS">Tous les comptes</option>{comptes.map(row => <option key={row.id_compte} value={row.id_compte}>{row.id_compte} — {row.categorie}</option>)}</select><button className="primary" disabled={!comptes.length || !unites.length} onClick={() => setEditing({ designation: '', emplacement: '', stock_min: 10, pourcentage_demande_max: 100, id_compte: comptes[0]?.id_compte, id_unite: unites[0]?.id_unite })}>＋ Nouvel article</button></div><div className="table-scroll"><table><thead><tr><th>ARTICLE</th><th>COMPTE / CATÉGORIE</th><th>UNITÉ</th><th>ÉTAGÈRE</th><th>STOCK</th><th>ACTIONS</th></tr></thead><tbody>{shown.map(row => { const stock = quantities[row.id_catalogue] || 0; return <tr key={row.id_catalogue}><td><strong>{row.designation}</strong><small className="article-ref">ART-{String(row.id_catalogue).padStart(6, '0')}</small></td><td><strong>{row.id_compte}</strong><small className="article-ref">{compte(row.id_compte)}</small></td><td>{unite(row.id_unite)}</td><td className="cell-nowrap"><strong>{row.emplacement || '—'}</strong></td><td><strong className={stock <= row.stock_min ? 'low-stock' : ''}>{stock}</strong><small className="article-ref">Seuil : {row.stock_min}</small><small className="article-ref">Base de validation : {row.pourcentage_demande_max ?? 100} % ({Math.floor(stock * (row.pourcentage_demande_max ?? 100) / 100)} unités)</small></td><td className="cell-nowrap"><button className="link" onClick={() => setEditing({ ...row })}>Modifier ✎</button><button type="button" className="stock-danger" title="Corriger la quantité de stock" aria-label={`Corriger le stock de ${row.designation}`} onClick={() => setCorrecting(row)}>⚠</button></td></tr> })}</tbody></table>{loading && <div className="empty">Chargement…</div>}{!loading && !shown.length && <div className="empty">Aucun article.</div>}</div></section>
    {correcting && <StockCorrection article={correcting} stocks={stocks.filter(row => row.id_catalogue === correcting.id_catalogue)} close={() => setCorrecting(null)} onSaved={load} notify={notify} />}
    {editing && <div className="modal-layer"><form className="article-modal" onSubmit={save}><header><div><span>CATALOGUE</span><h2>{editing.id_catalogue ? 'Modifier l’article' : 'Créer un article'}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header><div className="form-grid"><Field label="Désignation"><input required value={editing.designation} onChange={event => setEditing({ ...editing, designation: event.target.value })} /></Field><Field label="Compte"><select value={editing.id_compte} onChange={event => setEditing({ ...editing, id_compte: event.target.value })}>{comptes.map(row => <option key={row.id_compte} value={row.id_compte}>{row.id_compte} — {row.categorie}</option>)}</select></Field><Field label="Unité"><select value={editing.id_unite} onChange={event => setEditing({ ...editing, id_unite: event.target.value })}>{unites.map(row => <option key={row.id_unite} value={row.id_unite}>{row.unite}</option>)}</select></Field><Field label="Étagère"><input value={editing.emplacement || ''} onChange={event => setEditing({ ...editing, emplacement: event.target.value })} /></Field><Field label="Pourcentage proposé à la validation (% du stock central)"><input required type="number" min="0" max="100" step="1" value={editing.pourcentage_demande_max ?? 100} onChange={event => setEditing({ ...editing, pourcentage_demande_max: event.target.value })} /><small>Sert au calcul de la quantité proposée à la validation. Le service demandeur reste libre de sa demande.</small></Field><Field label="Stock minimum"><input required type="number" min="0" value={editing.stock_min} onChange={event => setEditing({ ...editing, stock_min: event.target.value })} /></Field></div><footer className="form-actions"><button type="button" onClick={() => setEditing(null)}>Annuler</button><button className="primary">Enregistrer →</button></footer></form></div>}
  </>
}

function Field({ label, children }) { return <label className="form-field"><span>{label} <b>*</b></span>{children}</label> }
