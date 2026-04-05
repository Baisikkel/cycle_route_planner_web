import { AppHeaderActions } from '@app/navigation/AppHeaderActions'
import { AppLayout } from '@components/Layout'
import { AppMap } from '@components/Map'
import { Outlet } from '@lib/router'

function App() {
  return (
    <AppLayout headerActions={<AppHeaderActions />}>
      <Outlet />
      <AppMap />
    </AppLayout>
  )
}

export default App
