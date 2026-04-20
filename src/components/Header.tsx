import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface HeaderProps {
  user: User;
  onMenuToggle: () => void;
}

export default function Header({ user, onMenuToggle }: HeaderProps) {
  return (
    <header className="h-14 bg-gradient-to-r from-grad-from to-grad-to text-white px-4 md:px-6 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuToggle}
          className="text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="bg-white rounded-lg px-2 py-1">
          <img src="image.png" alt="드림포이엔" className="h-6 md:h-7" />
        </div>
        <span className="text-xs md:text-sm font-medium opacity-90 hidden sm:inline">
          드림포이엔_편의제공 사이트
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <a
          href="http://xn--ok0b74gwww5qf.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs md:text-sm px-2 md:px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          <span className="hidden sm:inline">드림포이엔 </span>홈페이지
        </a>
        <span className="text-xs md:text-sm opacity-90 hidden md:inline">
          {user.email}
        </span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs md:text-sm px-2 md:px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
