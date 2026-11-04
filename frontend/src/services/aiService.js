import { request } from './httpService'

export const getForecast = month => request({ url: '/ai/forecast', params: { month } })
export const trainModel = () => request({ url: '/ai/train', method: 'POST', timeout: 130000 })
