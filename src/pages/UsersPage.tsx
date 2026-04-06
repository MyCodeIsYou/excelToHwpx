import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

interface UserInfo {
  id: string
  email: string
  approved: boolean
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adding, setAdding] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, approved, created_at')
      .order('created_at', { ascending: true })

    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newPassword) return

    setAdding(true)
    const { error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
    })

    if (error) {
      alert('사용자 추가 실패: ' + error.message)
    } else {
      setNewEmail('')
      setNewPassword('')
      setTimeout(loadUsers, 1000)
    }
    setAdding(false)
  }

  const handleApprove = async (userId: string) => {
    await supabase.from('profiles').update({ approved: true }).eq('id', userId)
    loadUsers()
  }

  const handleRevoke = async (userId: string, email: string) => {
    if (email === SUPER_ADMIN_EMAIL) return
    if (!confirm(`"${email}" 사용자의 승인을 취소하시겠습니까?`)) return
    await supabase.from('profiles').update({ approved: false }).eq('id', userId)
    loadUsers()
  }

  const handleDelete = async (userId: string, email: string) => {
    if (email === SUPER_ADMIN_EMAIL) {
      alert('최고 관리자 계정은 삭제할 수 없습니다.')
      return
    }
    if (!confirm(`"${email}" 사용자를 삭제하시겠습니까?`)) return

    await supabase.from('profiles').delete().eq('id', userId)
    loadUsers()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const pendingUsers = users.filter(u => !u.approved && u.email !== SUPER_ADMIN_EMAIL)
  const approvedUsers = users.filter(u => u.approved || u.email === SUPER_ADMIN_EMAIL)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text">사용자 관리</h1>

      {/* 승인 대기 */}
      {pendingUsers.length > 0 && (
        <div className="border-2 border-selected-ring/40 rounded-xl bg-selected/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-selected-ring/20 bg-selected/50">
            <h2 className="text-sm font-semibold text-primary">
              승인 대기 ({pendingUsers.length}명)
            </h2>
          </div>
          <div className="divide-y divide-border">
            {pendingUsers.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">{u.email}</p>
                  <p className="text-xs text-text-light">{formatDate(u.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors font-medium"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleDelete(u.id, u.email)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용자 추가 */}
      <div className="border border-border rounded-xl bg-card p-4">
        <h2 className="text-sm font-semibold text-text mb-3">새 사용자 추가</h2>
        <form onSubmit={handleAddUser} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-text-light mb-1">이메일</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="user@example.com"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-text-light mb-1">비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="6자 이상"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {adding ? '추가 중...' : '추가'}
          </button>
        </form>
      </div>

      {/* 승인된 사용자 목록 */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text">
            승인된 사용자 ({approvedUsers.length}명)
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-text-light">불러오는 중...</div>
        ) : approvedUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-light">승인된 사용자가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream text-text-light">
                <th className="px-4 py-2 text-left font-medium">이메일</th>
                <th className="px-4 py-2 text-left font-medium">역할</th>
                <th className="px-4 py-2 text-left font-medium">가입일</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map(u => {
                const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-peach/10 transition-colors">
                    <td className="px-4 py-2.5 text-text font-medium">{u.email}</td>
                    <td className="px-4 py-2.5">
                      {isSuperAdmin ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                          최고관리자
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                          승인됨
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-light text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isSuperAdmin ? (
                        <span className="text-xs text-text-light/40">보호됨</span>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleRevoke(u.id, u.email)}
                            className="text-xs px-2 py-1 rounded-lg border border-text-light/30 text-text-light hover:bg-peach/50 transition-colors"
                          >
                            승인취소
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.email)}
                            className="text-xs px-2 py-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
