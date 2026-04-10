import App from '@app/App'
import { AppMap } from '@components/Map'
import { AccountPage } from '@features/Account/AccountPage'
import { createBrowserRouter, RouterProvider } from '@lib/router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <AppMap />,
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
