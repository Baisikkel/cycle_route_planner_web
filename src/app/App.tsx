import { useState, useEffect } from 'react'

import { AppHeaderActions } from '@app/navigation/AppHeaderActions'
import { AppLayout } from '@components/Layout'
import { Outlet } from '@lib/router'

import { NotificationToast, type ErrorType } from '../components/notifications/NotificationToast'

function App() {
  const [activeError, setActiveError] = useState<ErrorType | null>(null)

  const handleClose = () => setActiveError(null)

  useEffect(() => {
    // 5s auto-dismiss for non-critical alerts (GPS, Off-course, Rerouting)
    if (activeError && activeError !== 'server_error' && activeError !== 'offline') {
      const timer = setTimeout(() => setActiveError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [activeError])

  useEffect(() => {
    const handleError = (event: Event) => {
      const customEvent = event as CustomEvent<ErrorType>
      setActiveError(customEvent.detail)
    }

    window.addEventListener('app-error', handleError as EventListener)

    const handleOffline = () => setActiveError('offline')
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('app-error', handleError as EventListener)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AppLayout headerActions={<AppHeaderActions />}>
      <NotificationToast errorType={activeError} onClose={handleClose} />
      <Outlet />
    </AppLayout>
  )
}

export default App
