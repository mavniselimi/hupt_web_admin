import { apiClient } from '@/services/apiClient'

/**
 * Registrations service — desk workflow endpoints.
 *
 * Endpoint reference:
 *   POST   /api/events/:id/registrations/users/:uid  — register participant (Admin + Registrar)
 *   GET    /api/events/:id/registrations/queue/my    — PENDING queue for calling registrar, ordered by queueNumber
 *   POST   /api/events/:id/registrations/:rid/issue-card — mark CARD_ISSUED
 */
export const registrationsService = {

  /**
   * Register a participant by user ID.
   * Backend auto-assigns them to the least-loaded active desk.
   * Returns EventRegistrationResponseDto with assigned desk + queue number.
   */
  async registerUser(eventId, userId) {
    const { data } = await apiClient.post(
      `/api/events/${eventId}/registrations/users/${userId}`
    )
    return data
  },

  /**
   * Return all PENDING registrations assigned to the calling registrar for this event.
   * Ordered by queueNumber ascending — index 0 is the next person to process.
   */
  async getMyQueue(eventId) {
    const { data } = await apiClient.get(
      `/api/events/${eventId}/registrations/queue/my`
    )
    return data   // EventRegistrationResponseDto[]
  },

  /**
   * Issue a card for a specific registration — moves it from PENDING → CARD_ISSUED.
   * Returns the updated EventRegistrationResponseDto.
   */
  async issueCard(eventId, registrationId) {
    const { data } = await apiClient.post(
      `/api/events/${eventId}/registrations/${registrationId}/issue-card`
    )
    return data
  },
}
