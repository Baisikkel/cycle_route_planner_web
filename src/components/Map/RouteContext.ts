import { createContext } from 'react'

import type { RouteContextValue } from './useRoute'

export const RouteContext = createContext<RouteContextValue | null>(null)
