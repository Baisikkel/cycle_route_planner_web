import { Bar, Brand, Inner } from './Header.styled'

export function AppHeader() {
  return (
    <Bar>
      <Inner>
        <Brand to="/">Baisikkel Route Planner</Brand>
      </Inner>
    </Bar>
  )
}
