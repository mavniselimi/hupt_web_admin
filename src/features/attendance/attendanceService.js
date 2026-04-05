import { apiClient } from '@/services/apiClient'

export const attendanceService = {
  async bySession(sessionId) {
    const { data } = await apiClient.get(`/api/attendance/session/${sessionId}`)
    return data
  },
  async countBySession(sessionId) {
    const { data } = await apiClient.get(`/api/attendance/session/${sessionId}/count`)
    return data
  },
}
