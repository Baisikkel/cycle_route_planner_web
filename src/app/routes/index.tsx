import App from '@app/App'
import { MapComponent } from '@components/Map'
import { AccountPage } from '@features/Account/AccountPage'
import { createBrowserRouter, RouterProvider } from '@lib/router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <MapComponent />,
      },
      {
        path: 'account',
        element: <AccountPage />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
