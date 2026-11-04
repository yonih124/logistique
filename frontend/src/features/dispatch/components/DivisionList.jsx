import { useState } from 'react'
import { updateDivision, deleteDivision } from '@/services/dispatchService'

export function DivisionList({ divisions, onChanged, notify }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const save = async event => {
    event.preventDefault()
    if (!editing.nom_division.trim()) return notify('Le nom est obligatoire.', 'error')
    setSaving(true)
    try {
      await updateDivision(editing.id_division, editing.nom_division.trim())
      setEditing(null)
      await onChanged()
      notify('Division modifiée')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  const remove = async division => {
    if (!window.confirm(`Supprimer la division « ${division.nom_division} » ?`)) return
    setSaving(true)
    try {
      await deleteDivision(division.id_division)
      await onChanged(division.id_division)
      notify('Division supprimée')
    } catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  return <section className="panel">
    <button type="button" className="primary" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Masquer' : 'Afficher'} la liste des divisions ({divisions.length})</button>
    {open && <div className="table-scroll"><table><thead><tr><th>DIVISION DE MON SERVICE</th><th>ACTIONS</th></tr></thead><tbody>{divisions.map(division => <tr key={division.id_division}><td>{division.nom_division}</td><td><div className="crud-actions"><button disabled={saving} onClick={() => setEditing({ ...division })}>Modifier</button><button className="delete" disabled={saving} onClick={() => remove(division)}>Supprimer</button></div></td></tr>)}</tbody></table>{!divisions.length && <p className="empty">Aucune division dans votre service.</p>}</div>}
    {editing && <div className="modal-layer"><form className="article-modal" onSubmit={save}><header><h2>Modifier la division</h2><button type="button" disabled={saving} onClick={() => setEditing(null)} aria-label="Fermer">×</button></header><label className="form-field"><span>Nom de la division</span><input required maxLength={150} value={editing.nom_division} onChange={event => setEditing({ ...editing, nom_division: event.target.value })} /></label><footer className="form-actions"><button type="button" disabled={saving} onClick={() => setEditing(null)}>Annuler</button><button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></footer></form></div>}
  </section>
}
