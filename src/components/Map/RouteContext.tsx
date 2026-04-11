import type { ReactNode } from 'react'

import { RouteContext } from './RouteContext'
import { useRoute } from './useRoute'

export function RouteProvider({ children }: { children: ReactNode }) {
  const routeValue = useRoute()
  return <RouteContext.Provider value={routeValue}>{children}</RouteContext.Provider>
}

export { RouteContext }
export type { RouteContextValue } from './useRoute'
