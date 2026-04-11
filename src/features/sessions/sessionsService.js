import { apiClient } from '@/services/apiClient'

export const sessionsService = {
  async detail(sessionId) {
    const { data } = await apiClient.get(`/api/sessions/${sessionId}`)
    return data
  },
  async byEvent(eventId) {
    const { data } = await apiClient.get(`/api/sessions/event/${eventId}`)
    return data
  },
  async create(eventId, payload) {
    const { data } = await apiClient.post(`/api/sessions/event/${eventId}`, payload)
    return data
  },
  async activate(sessionId) {
    const { data } = await apiClient.patch(`/api/sessions/${sessionId}/activate`)
    return data
  },
  async deactivate(sessionId) {
    const { data } = await apiClient.patch(`/api/sessions/${sessionId}/deactivate`)
    return data
  },
  async enableAttendance(sessionId) {
    const { data } = await apiClient.patch(`/api/sessions/${sessionId}/attendance/enable`)
    return data
  },
  async disableAttendance(sessionId) {
    const { data } = await apiClient.patch(`/api/sessions/${sessionId}/attendance/disable`)
    return data
  },
  async regenerateQr(sessionId) {
    const { data } = await apiClient.patch(`/api/sessions/${sessionId}/qr/regenerate`)
    return data
  },
  /**
   * Admin / Registrar only. Returns SessionDetailDto which includes the qrKey
   * so the admin panel can display the session QR code for check-in.
   */
  async adminDetail(sessionId) {
    const { data } = await apiClient.get(`/api/sessions/${sessionId}/detail`)
    return data
  },
}
