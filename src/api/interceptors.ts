import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

import { getCsrfToken, triggerUnauthenticated } from '@lib/auth'

import { notifyError } from '../lib/notify'

export const registerInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getCsrfToken()
    if (token) {
      config.headers['X-CSRF-TOKEN'] = token
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      notifyError('server_error')
      console.error('API error', error.message)

      if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
        triggerUnauthenticated()
      }
      return Promise.reject(error)
    },
  )
}
