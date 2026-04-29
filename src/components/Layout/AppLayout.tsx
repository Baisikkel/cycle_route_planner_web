import type { PropsWithChildren, ReactNode } from 'react'

import { AppFooter } from '@components/Footer'
import { AppHeader } from '@components/Header'

import { Container, Main, Page } from './Layout.styled'

type Props = PropsWithChildren<{
  hideHeader?: boolean
  hideFooter?: boolean
  headerActions?: ReactNode
}>

export function AppLayout({ hideHeader = false, hideFooter = false, children }: Props) {
  return (
    <Page>
      {!hideHeader && <AppHeader />}
      <Main>
        <Container>{children}</Container>
      </Main>
      {!hideFooter && <AppFooter />}
    </Page>
  )
}
