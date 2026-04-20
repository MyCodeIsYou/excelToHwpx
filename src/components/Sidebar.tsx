import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
  userEmail: string
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { id: 'convert', label: 'Excel → HWPX', icon: '&#9998;', adminOnly: false },
  { id: 'templates', label: '저장된 템플릿', icon: '&#128194;', adminOnly: false },
  { id: 'users', label: '사용자 관리', icon: '&#128100;', adminOnly: true },
  { id: 'company', label: '회사 정보', icon: '&#127970;', adminOnly: false },
]

export default function Sidebar({ activePage, onNavigate, userEmail, open, onClose }: SidebarProps) {
  const isAdmin = userEmail === SUPER_ADMIN_EMAIL
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  const handleNav = (page: string) => {
    onNavigate(page)
    onClose()
  }

  return (
    <>
      {/* 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-14 left-0 z-40
        w-56 bg-sidebar border-r border-border
        h-[calc(100vh-56px)] flex flex-col justify-between shrink-0
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
      `}>
        <nav className="p-3 space-y-1">
          {visibleItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                activePage === item.id
                  ? 'bg-selected text-primary font-semibold'
                  : 'text-text hover:bg-peach/50'
              }`}
            >
              <span dangerouslySetInnerHTML={{ __html: item.icon }} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-[11px] text-text-light/50 leading-relaxed">
            드림포이엔<br />
            대표 하준명
          </p>
        </div>
      </aside>
    </>
  )
}
