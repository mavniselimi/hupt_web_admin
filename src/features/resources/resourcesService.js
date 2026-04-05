import { apiClient } from '@/services/apiClient'

export const resourcesService = {
  async bySession(sessionId) {
    const { data } = await apiClient.get(`/api/resources/session/${sessionId}`)
    return data
  },
  async byType(type) {
    const { data } = await apiClient.get(`/api/resources/type/${encodeURIComponent(type)}`)
    return data
  },
  async addToSession(sessionId, payload) {
    const { data } = await apiClient.post(`/api/resources/session/${sessionId}`, payload)
    return data
  },
}
