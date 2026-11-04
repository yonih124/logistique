import dashboard from '@/assets/icons/tableau-de-bord.png'
import dispatch from '@/assets/icons/suivi-dispatch.png'
import serviceStock from '@/assets/icons/stock_service.png'
import receipts from '@/assets/icons/reception-du-colis.png'
import forms from '@/assets/icons/nouvelle_demande.png'
import messages from '@/assets/icons/messagerie.png'
import ai from '@/assets/icons/ia.png'
import history from '@/assets/icons/historique.png'
import entries from '@/assets/icons/entre_stock.png'
import requests from '@/assets/icons/demande.png'
import logout from '@/assets/icons/deconnexion.png'
import catalogue from '@/assets/icons/catalogue.png'
import deliveryNotes from '@/assets/icons/bons_sortie.png'
import references from '@/assets/icons/referentiel.png'
import './Icon.css'

const icons = {
  dashboard, dispatch, dispatchTracking: dispatch, serviceStock,
  receipts, forms, messages, ai, history, entryHistory: history, entries,
  requests, logout, catalogue, deliveryNotes, references,
}

export function Icon({ name, fallback = null }) {
  return icons[name]
    ? <img className="app-icon" src={icons[name]} alt="" aria-hidden="true" />
    : <span aria-hidden="true">{fallback}</span>
}
