import { AppStateProvider } from './AppState'
import { AppRoutes } from '../routes/AppRoutes'

export const App = () => (
  <AppStateProvider>
    <AppRoutes />
  </AppStateProvider>
)
