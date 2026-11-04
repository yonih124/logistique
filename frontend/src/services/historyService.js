import { request } from './httpService'

export const getOperationsHistory = () => request({ url: '/historique-operations' })
