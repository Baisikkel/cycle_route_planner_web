import { createContext } from 'react'

import type { RouteContextValue } from './routing/types'

export const RouteContext = createContext<RouteContextValue | null>(null)
