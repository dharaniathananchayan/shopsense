import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Inject Bearer token from localStorage before every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('shopsense_session')
  if (raw) {
    try {
      const session = JSON.parse(raw)
      if (session.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
    } catch {}
  }
  return config
})

export default api
