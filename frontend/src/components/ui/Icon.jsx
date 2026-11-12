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

// Icônes dessinées pour les entrées sans image dédiée.
const svgIcons = {
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.3.2 3.9 1.8 4.5 4.8" /></>,
  profile: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" /></>,
}

export function Icon({ name, fallback = null }) {
  if (icons[name]) return <img className="app-icon" src={icons[name]} alt="" aria-hidden="true" />
  if (svgIcons[name]) return <svg className="app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">{svgIcons[name]}</svg>
  return <span aria-hidden="true">{fallback}</span>
}
