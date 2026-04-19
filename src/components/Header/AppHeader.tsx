import type { ReactNode } from 'react'

import { Actions, Bar, Brand, Inner } from './Header.styled'

type Props = {
  actions?: ReactNode
}

export function AppHeader({ actions }: Props) {
  return (
    <Bar>
      <Inner>
        <Brand to="/">Baisikkel Route Planner</Brand>
        {actions && <Actions>{actions}</Actions>}
      </Inner>
    </Bar>
  )
}
