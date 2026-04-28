import { type ErrorType } from '../components/notifications/NotificationToast'

export const notifyError = (error: ErrorType) => {
  const event = new CustomEvent('app-error', { detail: error })
  window.dispatchEvent(event)
}
