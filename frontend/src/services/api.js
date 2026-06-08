import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const detectionsApi = {
  upload: (formData) => api.post('/detections/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  }),
  list: (params) => api.get('/detections/', { params }),
  get: (id) => api.get(`/detections/${id}`),
  delete: (id) => api.delete(`/detections/${id}`),
  getResultImage: (id) => api.get(`/detections/${id}/image`, { responseType: 'blob' }),
}

export const statsApi = {
  dashboard: () => api.get('/stats/dashboard'),
  comparison: () => api.get('/stats/comparison'),
  mapData: () => api.get('/stats/map-data'),
  trend: () => api.get('/stats/trend'),
}

export const reportsApi = {
  downloadPdf: (id) => api.get(`/reports/pdf/${id}`, { responseType: 'blob' }),
  downloadCsv: () => api.get('/reports/csv', { responseType: 'blob' }),
}

export default api
