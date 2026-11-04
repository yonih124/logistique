/** Configuration publique de l'application, lue au moment du build (Vite). */
const apiUrl = new URL(import.meta.env.VITE_API_URL || '/api', window.location.origin)

export const config = {
  appName: 'OptiStock',
  apiUrl: apiUrl.href.replace(/\/$/, ''),
  apiOrigin: apiUrl.origin,
  wsUrl: `${apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${apiUrl.host}/ws`,
}
