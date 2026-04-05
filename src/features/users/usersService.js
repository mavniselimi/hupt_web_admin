import { apiClient } from '@/services/apiClient'

export const usersService = {
  async list() {
    const { data } = await apiClient.get('/api/users')
    return data
  },
  async detail(userId) {
    const { data } = await apiClient.get(`/api/users/${userId}`)
    return data
  },
}
