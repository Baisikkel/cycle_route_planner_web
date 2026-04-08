import { AppHeaderActions } from '@app/navigation/AppHeaderActions'
import { AppLayout } from '@components/Layout'
import { Outlet } from '@lib/router'

function App() {
  return (
    <AppLayout headerActions={<AppHeaderActions />}>
      <Outlet />
    </AppLayout>
  )
}

export default App
