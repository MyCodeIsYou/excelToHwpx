import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LoginPage from './components/LoginPage'
import PendingApproval from './components/PendingApproval'
import ExcelToHwpxPage from './pages/ExcelToHwpxPage'
import TemplatesPage from './pages/TemplatesPage'
import CompanyPage from './pages/CompanyPage'
import UsersPage from './pages/UsersPage'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState(false)
  const [activePage, setActivePage] = useState('convert')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initialized = useRef(false)

  const checkApproval = async (u: User) => {
    if (u.email === SUPER_ADMIN_EMAIL) {
      await supabase.from('profiles').upsert({
        id: u.id,
        email: u.email!,
        approved: true,
      }, { onConflict: 'id' })
      setApproved(true)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', u.id)
      .single()

    if (!data) {
      await supabase.from('profiles').insert({
        id: u.id,
        email: u.email || '',
        approved: false,
      })
      setApproved(false)
      return
    }

    setApproved(data.approved === true)
  }

  useEffect(() => {
    // 초기 로드 (1회만)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      try {
        if (u) await checkApproval(u)
      } catch {
        setApproved(false)
      }
      setLoading(false)
      initialized.current = true
    }).catch(() => {
      setLoading(false)
      initialized.current = true
    })

    // 이후 auth 변경 감지 (로그인/로그아웃)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initialized.current) return

      const u = session?.user ?? null
      setUser(u)
      try {
        if (u) {
          await checkApproval(u)
        } else {
          setApproved(false)
        }
      } catch {
        setApproved(false)
      }
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

  if (!approved) {
    return <PendingApproval />
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
