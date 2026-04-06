import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LoginPage from './components/LoginPage'
import ExcelToHwpxPage from './pages/ExcelToHwpxPage'
import TemplatesPage from './pages/TemplatesPage'
import CompanyPage from './pages/CompanyPage'
import UsersPage from './pages/UsersPage'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState('convert')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text-light">
        <div className="text-center">
          <img src="image.png" alt="드림포이엔" className="h-10 mx-auto mb-3 animate-pulse" />
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header user={user} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
      <div className="flex flex-1">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          userEmail={user.email || ''}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          {activePage === 'convert' && <ExcelToHwpxPage userId={user.id} />}
          {activePage === 'templates' && <TemplatesPage userId={user.id} />}
          {activePage === 'users' && <UsersPage />}
          {activePage === 'company' && <CompanyPage />}
        </main>
      </div>
    </div>
  )
}

export default App
