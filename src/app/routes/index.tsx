import App from '@app/App'
import { AccountPage } from '@features/Account/AccountPage'
import { RoutePlannerPage } from '@features/RoutePlanner/RoutePlannerPage'
import { createBrowserRouter, RouterProvider } from '@lib/router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <RoutePlannerPage />,
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
