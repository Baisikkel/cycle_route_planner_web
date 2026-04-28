import axios from 'axios'

import { registerInterceptors } from './interceptors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
})

registerInterceptors(apiClient)
