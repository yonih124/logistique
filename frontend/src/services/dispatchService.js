import { request } from './httpService'

export const getServiceStock = () => request({ url: '/stock-service' })
export const getDispatches = () => request({ url: '/dispatches' })
export const createDispatch = payload => request({ url: '/dispatches', method: 'POST', data: payload })
export const getStockUsages = () => request({ url: '/utilisations-stock-service' })
export const createStockUsage = payload => request({ url: '/utilisations-stock-service', method: 'POST', data: payload })
export const getDivisions = () => request({ url: '/divisions' })
export const updateDivision = (id, nom_division) => request({ url: `/divisions/${id}`, method: 'PATCH', data: { nom_division } })
export const deleteDivision = id => request({ url: `/divisions/${id}`, method: 'DELETE' })
export const createDivision = nom_division => request({ url: '/divisions', method: 'POST', data: { nom_division } })
export const receiveLines = decisions => request({ url: '/receptions', method: 'POST', data: { decisions } })
