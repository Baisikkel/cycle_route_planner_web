import type { ReactNode } from 'react'

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
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
