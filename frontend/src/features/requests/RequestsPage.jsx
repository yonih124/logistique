import { ClientRequestsPage } from './ClientRequestsPage'
import { ValidationRequestsPage } from './ValidationRequestsPage'

/** Le client suit ses demandes ; validateur et dépositaire les examinent. */
export function RequestsPage({ role, notify }) {
  return role === 'Client' ? <ClientRequestsPage notify={notify} /> : <ValidationRequestsPage notify={notify} />
}
