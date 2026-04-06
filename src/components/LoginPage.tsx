import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else if (isSignUp) {
      setError('가입 완료! 이메일을 확인해주세요.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-lg">
        <div className="text-center mb-8">
          <img src="image.png" alt="드림포이엔" className="h-12 mx-auto mb-3" />
          <p className="text-sm text-text-light">드림포이엔_편의제공 사이트</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder-text-light/60 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder-text-light/60 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="6자 이상"
            />
          </div>
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          className="mt-4 w-full text-center text-sm text-text-light hover:text-primary transition-colors"
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    </div>
  )
}
