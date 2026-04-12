import type { ReactNode } from 'react'

import { RouteProvider } from '@components/Map'

import { AuthProvider } from './AuthProvider'
import { I18nProvider } from './I18nProvider'
import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from './ThemeProvider'

type Props = {
  children: ReactNode
}

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          <RouteProvider>
            <AuthProvider>{children}</AuthProvider>
          </RouteProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
