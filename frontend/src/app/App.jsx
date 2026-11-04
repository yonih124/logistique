import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'
import { AuthProvider } from './providers/AuthProvider'
import { FeedbackProvider } from './providers/FeedbackProvider'

export default function App() {
  return <BrowserRouter>
    <FeedbackProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </FeedbackProvider>
  </BrowserRouter>
}
