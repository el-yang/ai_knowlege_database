import { AuthPage } from './components/AuthPage'
import { ChatPage } from './pages/ChatPage'
import { useAuth } from './auth/AuthContext'

export default function App() {
  const { status } = useAuth()

  if (status === 'checking') {
    return <div className="app-splash">正在加载…</div>
  }

  return status === 'authenticated' ? <ChatPage /> : <AuthPage />
}
