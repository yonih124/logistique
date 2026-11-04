import { DivisionList } from './components/DivisionList'
import { useEffect, useRef, useState } from 'react'
import { createDispatch, createDivision, createStockUsage, getDispatches, getDivisions, getServiceStock, getStockUsages } from '@/services/dispatchService'

const fmt = value => new Date(value).toLocaleString('fr-FR')

export function DispatchPage({ role, mode, notify, serviceId }) {
  const notifyRef = useRef(notify)
  const client = role === 'Client'
  const [stock, setStock] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [divisions, setDivisions] = useState([])
  const [usages, setUsages] = useState([])
  const [dispatchForm, setDispatchForm] = useState({ id_stock_service: '', id_division: '', nombre: 1 })
  const [usageForm, setUsageForm] = useState({ id_stock_service: '', quantite: 1, motif: '' })
  const [newDivision, setNewDivision] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = () => Promise.all([getServiceStock(), getDispatches(), getDivisions(), getStockUsages()])
  const applyData = ([stocks, dispatchRows, divisionRows, usageRows]) => {
    setStock(stocks); setDispatches(dispatchRows); setDivisions(divisionRows); setUsages(usageRows)
  }
  const reload = async () => applyData(await fetchData())

  useEffect(() => {
    let active = true
    Promise.all([getServiceStock(), getDispatches(), getDivisions(), getStockUsages()]).then(data => { if (active) applyData(data) }).catch(error => { if (active) notifyRef.current(error.message, 'error') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [client])

  const ownDivisions = divisions.filter(item => serviceId != null && Number(item.id_service) === Number(serviceId))
  const available = stock.filter(item => item.restant > 0)
  const totals = stock.reduce((sum, item) => ({ delivered: sum.delivered + item.reparti + item.restant, dispatched: sum.dispatched + item.reparti, remaining: sum.remaining + item.restant }), { delivered: 0, dispatched: 0, remaining: 0 })

  const addDivision = async () => {
    if (!newDivision.trim()) return
    try { const division = await createDivision(newDivision.trim()); setDivisions(rows => [...rows, division]); setDispatchForm(form => ({ ...form, id_division: division.id_division })); setNewDivision(''); notify('Division ajoutée') }
    catch (error) { notify(error.message, 'error') }
  }

  const submitDispatch = async event => {
    event.preventDefault()
    if (!ownDivisions.some(item => Number(item.id_division) === Number(dispatchForm.id_division))) return notify('Choisissez une division de votre service.', 'error')
    setSaving(true)
    try { await createDispatch({ id_stock_service: Number(dispatchForm.id_stock_service), id_division: Number(dispatchForm.id_division), nombre: Number(dispatchForm.nombre) }); setDispatchForm({ id_stock_service: '', id_division: '', nombre: 1 }); await reload(); notify('Dispatch enregistré') }
    catch (error) { notify(error.message, 'error') } finally { setSaving(false) }
  }

  const submitUsage = async event => {
    event.preventDefault(); setSaving(true)
    try { await createStockUsage({ id_stock_service: Number(usageForm.id_stock_service), quantite: Number(usageForm.quantite), motif: usageForm.motif }); setUsageForm({ id_stock_service: '', quantite: 1, motif: '' }); await reload(); notify('Sortie du stock enregistrée') }
    catch (error) { notify(error.message, 'error') } finally { setSaving(false) }
  }

  if (client && mode === 'stock') return <>
    <Summary totals={totals} />
    <StockTable rows={stock} loading={loading} />
    <form className="panel dispatch-form stock-usage-form" onSubmit={submitUsage}><header><div><h2>Sortie du stock interne</h2><p>Soustrayez une quantité avec un motif obligatoire.</p></div></header><div className="form-grid"><Field label="Article"><select required value={usageForm.id_stock_service} onChange={e => setUsageForm({ ...usageForm, id_stock_service: e.target.value })}><option value="">Sélectionner</option>{available.map(item => <option key={item.id_stock_service} value={item.id_stock_service}>{item.Catalogue.designation} — {item.restant} disponible(s)</option>)}</select></Field><Field label="Motif"><input required placeholder="Ex. Perdu, détérioré ou utilisé" value={usageForm.motif} onChange={e => setUsageForm({ ...usageForm, motif: e.target.value })} /></Field><Field label="Quantité"><input required type="number" min="1" value={usageForm.quantite} onChange={e => setUsageForm({ ...usageForm, quantite: e.target.value })} /></Field></div><footer className="form-actions"><button className="primary" disabled={saving || !available.length}>Soustraire du stock</button></footer></form>
    <UsageHistory rows={usages} loading={loading} />
  </>

  return <>
    {client && <DivisionList divisions={ownDivisions} notify={notify} onChanged={async deletedId => { await reload(); if (deletedId) setDispatchForm(form => String(form.id_division) === String(deletedId) ? { ...form, id_division: '' } : form) }} />}
    {client && <><Summary totals={totals} /><section className="panel division-manager"><header><div><h2>Divisions et bureaux</h2><p>Ajoutez les destinations de votre service avant le dispatch.</p></div></header><div><input placeholder="Nom de la division ou du bureau" value={newDivision} onChange={e => setNewDivision(e.target.value)} /><button type="button" className="primary" onClick={addDivision}>Ajouter</button></div></section><form className="panel dispatch-form" onSubmit={submitDispatch}><header><div><h2>Nouveau dispatch</h2><p>Répartissez le stock du service vers une division.</p></div></header><div className="form-grid"><Field label="Article"><select required value={dispatchForm.id_stock_service} onChange={e => setDispatchForm({ ...dispatchForm, id_stock_service: e.target.value })}><option value="">Sélectionner</option>{available.map(item => <option key={item.id_stock_service} value={item.id_stock_service}>{item.Catalogue.designation} — {item.restant} disponible(s)</option>)}</select></Field><Field label="Division ou bureau"><select required value={dispatchForm.id_division} onChange={e => setDispatchForm({ ...dispatchForm, id_division: e.target.value })}><option value="">Sélectionner</option>{ownDivisions.map(item => <option key={item.id_division} value={item.id_division}>{item.nom_division}</option>)}</select></Field><Field label="Nombre"><input required type="number" min="1" value={dispatchForm.nombre} onChange={e => setDispatchForm({ ...dispatchForm, nombre: e.target.value })} /></Field></div><footer className="form-actions"><button className="primary" disabled={saving || !available.length || !ownDivisions.length}>Confirmer le dispatch</button></footer></form></>}
    {client ? <DispatchHistory rows={dispatches} loading={loading} showService={false} /> : <ManagerDispatchTracking stock={stock} dispatches={dispatches} loading={loading} />}
  </>
}

const Field = ({ label, children }) => <label className="form-field"><span>{label} *</span>{children}</label>
const Summary = ({ totals }) => <section className="dispatch-summary"><article><span>✓</span><div><strong>{totals.delivered}</strong><small>Total reçu</small></div></article><article><span>⇥</span><div><strong>{totals.dispatched}</strong><small>Total réparti</small></div></article><article><span>▦</span><div><strong>{totals.remaining}</strong><small>Stock restant</small></div></article></section>

function ManagerDispatchTracking({ stock, dispatches, loading }) {
  const [serviceFilter, setServiceFilter] = useState('TOUS')
  const [accountFilter, setAccountFilter] = useState('TOUS')
  const services = [...new Map(stock.map(item => [item.id_service, item.Service.nom_service])).entries()]
  const accounts = [...new Map(stock.map(item => [item.Catalogue.id_compte, item.Catalogue.Compte?.categorie])).entries()]
  const filteredStock = stock.filter(item => (serviceFilter === 'TOUS' || String(item.id_service) === serviceFilter) && (accountFilter === 'TOUS' || String(item.Catalogue.id_compte) === accountFilter))
  const stockIds = new Set(filteredStock.map(item => item.id_stock_service))
  const filteredDispatches = dispatches.filter(item => stockIds.has(item.id_stock_service))
  const totals = filteredStock.reduce((sum, item) => ({ reparti: sum.reparti + item.reparti, restant: sum.restant + item.restant }), { reparti: 0, restant: 0 })

  return <>
    <section className="panel dispatch-filters"><div className="tracking-filter-grid"><label>Filtrer par service<select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)}><option value="TOUS">Tous les services</option>{services.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Filtrer par compte<select value={accountFilter} onChange={event => setAccountFilter(event.target.value)}><option value="TOUS">Tous les comptes</option>{accounts.map(([id, name]) => <option key={id} value={id}>{id} — {name || 'Sans catégorie'}</option>)}</select></label></div></section>
    <section className="dispatch-summary tracking-summary"><article><span>⇥</span><div><strong>{totals.reparti}</strong><small>Stock total réparti</small></div></article><article><span>▦</span><div><strong>{totals.restant}</strong><small>Stock total restant</small></div></article></section>
    <ManagerStockTable rows={filteredStock} loading={loading} />
    <DispatchHistory rows={filteredDispatches} loading={loading} showService />
  </>
}

function ManagerStockTable({ rows, loading }) {
  return <section className="panel service-material-stock"><header><div><h2>Stock de chaque matériel par service</h2><p>Quantités réparties et restantes après réception et dispatch.</p></div></header><div className="table-scroll"><table><thead><tr><th>SERVICE</th><th>COMPTE</th><th>MATÉRIEL</th><th>UNITÉ</th><th>RÉPARTI</th><th>RESTANT</th></tr></thead><tbody>{rows.map(item => <tr key={item.id_stock_service}><td><strong>{item.Service.nom_service}</strong></td><td>{item.Catalogue.id_compte}<small className="article-ref">{item.Catalogue.Compte?.categorie || 'Sans catégorie'}</small></td><td><strong>{item.Catalogue.designation}</strong></td><td>{item.Catalogue.Unite?.unite || '—'}</td><td><strong>{item.reparti}</strong></td><td><strong className={item.restant === 0 ? 'low-stock' : 'stock-good'}>{item.restant}</strong></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement…</div>}{!loading && !rows.length && <div className="empty">Aucun matériel pour ces filtres.</div>}</div></section>
}

function StockTable({ rows, loading }) { return <section className="panel"><header><div><h2>Stock interne du service</h2><p>Stock alimenté après confirmation de la réception.</p></div></header><div className="table-scroll"><table><thead><tr><th>ARTICLE</th><th>UNITÉ</th><th>RÉPARTI</th><th>RESTANT</th></tr></thead><tbody>{rows.map(item => <tr key={item.id_stock_service}><td><strong>{item.Catalogue.designation}</strong></td><td>{item.Catalogue.Unite?.unite || '—'}</td><td>{item.reparti}</td><td><strong>{item.restant}</strong></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement…</div>}{!loading && !rows.length && <div className="empty">Aucun stock réceptionné.</div>}</div></section> }

function DispatchHistory({ rows, loading, showService }) { return <section className="panel dispatch-history"><header><div><h2>Suivi des dispatchs</h2><p>Répartition entre divisions et bureaux.</p></div></header><div className="table-scroll"><table><thead><tr><th>DATE</th>{showService && <th>SERVICE</th>}<th>ARTICLE</th><th>DIVISION</th><th>NOMBRE</th></tr></thead><tbody>{rows.map(row => <tr key={row.id_dispatch}><td>{fmt(row.date_dispatch)}</td>{showService && <td>{row.Stock_service.Service.nom_service}</td>}<td><strong>{row.Stock_service.Catalogue.designation}</strong></td><td>{row.Division.nom_division}</td><td><strong>{row.nombre}</strong></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement…</div>}{!loading && !rows.length && <div className="empty">Aucun dispatch.</div>}</div></section> }

function UsageHistory({ rows, loading }) { return <section className="panel dispatch-history"><header><div><h2>Historique des sorties</h2></div></header><div className="table-scroll"><table><thead><tr><th>DATE</th><th>ARTICLE</th><th>QUANTITÉ</th><th>MOTIF</th></tr></thead><tbody>{rows.map(row => <tr key={row.id_utilisation}><td>{fmt(row.date_utilisation)}</td><td>{row.Liste_demande.Catalogue.designation}</td><td>{row.quantite}</td><td>{row.motif}</td></tr>)}</tbody></table>{loading && <div className="empty">Chargement…</div>}{!loading && !rows.length && <div className="empty">Aucune sortie.</div>}</div></section> }
