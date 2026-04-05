import { apiClient } from '@/services/apiClient'

export const authService = {
  async login(payload) {
    const { data } = await apiClient.post('/api/auth/login', payload)
    return data
  },
  async me() {
    const { data } = await apiClient.get('/api/auth/me')
    return data
  },
}
