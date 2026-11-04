import axios from 'axios'
import { config } from '@/config/env'

const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let onUnauthorized = null

/** Appelé quand la session expire (401) en dehors des routes d'authentification. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    if (status === 401 && !error.config?.url?.startsWith('/auth/')) onUnauthorized?.()
    const message = error.response?.data?.message
      || (error.request ? 'Le serveur est momentanément indisponible.' : error.message)
    const apiError = new Error(message, { cause: error })
    Object.assign(apiError, {
      status,
      details: error.response?.data?.details,
    })
    return Promise.reject(apiError)
  },
)

export default axiosInstance
