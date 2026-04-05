import { apiClient } from '@/services/apiClient'

export const questionsService = {
  async bySession(sessionId) {
    const { data } = await apiClient.get(`/api/questions/session/${sessionId}`)
    return data
  },
  async approvedBySession(sessionId) {
    const { data } = await apiClient.get(`/api/questions/session/${sessionId}/approved`)
    return data
  },
  async approve(questionId) {
    const { data } = await apiClient.patch(`/api/questions/${questionId}/approve`)
    return data
  },
}
