import { AppLayout } from '@components/Layout'
import { Outlet } from '@lib/router'

function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default App
