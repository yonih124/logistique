import { request } from './httpService'

export const getDashboard = () => request({ url: '/dashboard' })
