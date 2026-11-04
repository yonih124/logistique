import { request } from './httpService'

export const confirmRequest = (requestId, decisions) => request({
  url: `/demandes/${requestId}/confirmer`,
  method: 'POST',
  data: { decisions },
})
