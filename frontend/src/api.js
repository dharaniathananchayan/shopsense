import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : (import.meta.env.DEV ? '/api/v1' : 'https://shopsense-xkn1.onrender.com/api/v1')

const api = axios.create({
  baseURL: API_BASE
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
