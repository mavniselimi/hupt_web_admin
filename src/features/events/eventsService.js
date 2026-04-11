import { apiClient } from '@/services/apiClient'

export const eventsService = {
  async list() {
    const { data } = await apiClient.get('/api/events')
    return data
  },
  async detail(eventId) {
    const { data } = await apiClient.get(`/api/events/${eventId}`)
    return data
  },
  async create(payload) {
    const { data } = await apiClient.post('/api/events', payload)
    return data
  },
  async myCreated() {
    const { data } = await apiClient.get('/api/events/me/created')
    return data
  },
  async registerUser(eventId, userId) {
    // Correct backend path: POST /api/events/{eventId}/registrations/users/{userId}
    const { data } = await apiClient.post(`/api/events/${eventId}/registrations/users/${userId}`)
    return data
  },
  async removeUser(eventId, userId) {
    // Correct backend path: DELETE /api/events/{eventId}/registrations/users/{userId}
    const { data } = await apiClient.delete(`/api/events/${eventId}/registrations/users/${userId}`)
    return data
  },
}