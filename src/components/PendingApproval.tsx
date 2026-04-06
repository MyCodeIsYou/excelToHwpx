import { supabase } from '@/lib/supabase'

export default function PendingApproval() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-lg text-center">
        <img src="image.png" alt="드림포이엔" className="h-12 mx-auto mb-4" />
        <div className="text-4xl mb-4">&#9203;</div>
        <h2 className="text-lg font-bold text-text mb-2">승인 대기 중</h2>
        <p className="text-sm text-text-light leading-relaxed mb-6">
          회원가입이 완료되었습니다.<br />
          관리자 승인 후 이용 가능합니다.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-2 rounded-lg border border-border text-text-light hover:bg-peach/50 transition-colors text-sm"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
