import republicLogo from '@/assets/brand/republique.jpg'
import dgbfLogo from '@/assets/brand/dgbf.jpg'

export function BonSortie({ request, showShelf, deliveryDate }) {
  const articles = request.Liste_demande.map(line => ({
    name: line.Catalogue.designation,
    unit: line.Catalogue.Unite?.unite || '—',
    quantity: line.quantite_accordee ?? line.quantite_liste_demande,
    shelf: line.Catalogue.emplacement || '—',
    observation: line.status_liste_demande === 'MODIFIER' ? 'Quantité ajustée' : 'Conforme',
  }))
  const service = request.Utilisateur.service
  const requestReference = `DEM-${request.id_demande_client}`
  const noteReference = `BS-${String(request.id_demande_client).padStart(6, '0')}`
  const formattedDate = deliveryDate ? new Date(`${deliveryDate}T12:00:00`).toLocaleDateString('fr-FR') : '—'
  return <article className="bon-sortie" id="bon-sortie">
    <div className="bs-emblems"><img className="republic-logo" src={republicLogo} alt="République de Madagascar" /><img className="dgbf-logo" src={dgbfLogo} alt="Direction générale du budget et des finances" /></div>
    <div className="bs-administration"><strong>MINISTÈRE DE L’ÉCONOMIE ET DES FINANCES</strong><strong>SECRÉTARIAT GÉNÉRAL</strong><strong>DIRECTION GÉNÉRALE DU BUDGET</strong><strong>ET DES FINANCES</strong><strong>DIRECTION DE LA SOLDE ET DES PENSIONS</strong><span>Division des Affaires Administratives et Financières</span></div>
    <h1>BON DE SORTIE</h1>
    <section className="bs-meta"><p>Destiné au (SERVICE OU CELLULE) : <strong>{service}</strong></p><p>N° : <strong>{noteReference}</strong> &nbsp; / &nbsp; Demande : <strong>{requestReference}</strong></p><p>Date de livraison : <strong>{formattedDate}</strong></p></section>
    <table><thead><tr><th>N°</th><th>DÉSIGNATION DES ARTICLES</th><th>UNITÉ</th><th>QUANTITÉ</th>{showShelf && <th>ÉTAGÈRE</th>}<th>OBSERVATION</th></tr></thead><tbody>{articles.map((item, index) => <tr key={item.name}><td>{String(index + 1).padStart(2, '0')}</td><td>{item.name}</td><td>{item.unit}</td><td>{item.quantity}</td>{showShelf && <td>{item.shelf}</td>}<td>{item.observation}</td></tr>)}</tbody></table>
    <p className="bs-place">Antananarivo, le {formattedDate}</p>
    <div className="bs-signatures"><span>Le demandeur</span><span>Le dépositaire</span><span>Le responsable du service bénéficiaire</span></div>
  </article>
}
