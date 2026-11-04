import { Link } from 'react-router'
import { HOME_PATH } from '@/app/routes'

export function NotFoundPage() {
  return <section className="ui-state-card">
    <span className="ui-state-symbol" aria-hidden="true">404</span>
    <h2>Page introuvable</h2>
    <p>L’adresse demandée n’existe pas ou n’est pas accessible avec votre profil.</p>
    <Link className="primary ui-button-link" to={HOME_PATH}>Retour au tableau de bord</Link>
  </section>
}
