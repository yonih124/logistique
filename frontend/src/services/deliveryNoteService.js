import { request } from './httpService'

export const listDeliveryNotes = () => request({ url: '/bons-livraison' })

export const markDeliveryNotePrinted = requestId => request({
  url: `/bons-livraison/${requestId}/imprimer`,
  method: 'POST',
})
