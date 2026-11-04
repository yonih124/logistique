import { useEffect, useRef, useState } from 'react'
import { listDeliveryNotes, markDeliveryNotePrinted } from '@/services/deliveryNoteService'
import { BonSortie } from '@/features/deliveries/components/BonSortie'

export function DeliveryNotesPage({ notify }) {
  const notifyRef = useRef(notify)
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [showShelf, setShowShelf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    let active = true
    listDeliveryNotes()
      .then(rows => { if (active) setNotes(rows) })
      .catch(error => { if (active) notifyRef.current(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const print = async () => {
    setPrinting(true)
    window.print()
    try {
      await markDeliveryNotePrinted(selected.id_demande_client)
      setNotes(current => current.filter(note => note.id_demande_client !== selected.id_demande_client))
      setSelected(null)
      notify('Bon imprimé et archivé')
    } catch (error) { notify(error.message, 'error') }
    finally { setPrinting(false) }
  }

  return <>
    <section className="panel note-page"><div className="workflow-note"><span>2</span><p>Cette liste contient les demandes validées dont le bon de sortie doit être imprimé.</p></div><div className="table-scroll"><table><thead><tr><th>BON DE SORTIE</th><th>DEMANDE</th><th>SERVICE BÉNÉFICIAIRE</th><th>ARTICLES</th><th>DATE</th><th>ÉTAT</th><th /></tr></thead><tbody>{notes.map(note => <tr key={note.id_demande_client}><td><strong>BS-{String(note.id_demande_client).padStart(6, '0')}</strong></td><td>DEM-{note.id_demande_client}</td><td>{note.Utilisateur.service}</td><td>{note.Liste_demande.length}</td><td>{new Date(note.date_demande).toLocaleDateString('fr-FR')}</td><td><span className="status en-attente">• À imprimer</span></td><td><button className="link" onClick={() => setSelected(note)}>Aperçu et impression →</button></td></tr>)}</tbody></table>{loading && <div className="empty">Chargement des bons…</div>}{!loading && !notes.length && <div className="empty-state"><span>⌑</span><h3>Aucun bon en attente</h3><p>Les demandes validées apparaîtront automatiquement ici.</p></div>}</div></section>
    {selected && <div className="modal-layer bs-layer"><section className="bs-dialog"><header className="bs-toolbar"><div><span>BON DE SORTIE NON IMPRIMÉ</span><h2>BS-{String(selected.id_demande_client).padStart(6, '0')}</h2></div><label className="shelf-option"><input type="checkbox" checked={showShelf} onChange={event => setShowShelf(event.target.checked)} /><i /> Afficher les étagères</label><button disabled={printing} onClick={print}>⌑ Imprimer et archiver</button><button className="close-bs" onClick={() => setSelected(null)}>×</button></header><div className="bs-scroll"><BonSortie request={selected} showShelf={showShelf} deliveryDate={new Date().toISOString().slice(0, 10)} /></div><footer className="bs-actions"><span className="archive-warning">Après impression, ce bon sera retiré de la liste.</span><div><button onClick={() => setSelected(null)}>Annuler</button><button className="primary" disabled={printing} onClick={print}>{printing ? 'Archivage…' : 'Imprimer et archiver →'}</button></div></footer></section></div>}
  </>
}
