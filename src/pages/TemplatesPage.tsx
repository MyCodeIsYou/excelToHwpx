import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  userId: string
}

interface TemplateInfo {
  name: string
  count: number
}

export default function TemplatesPage({ userId }: Props) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadTemplates = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hwpx_mappings')
      .select('template_name')
      .eq('user_id', userId)

    if (data) {
      const countMap: Record<string, number> = {}
      for (const d of data as { template_name: string }[]) {
        countMap[d.template_name] = (countMap[d.template_name] || 0) + 1
      }
      setTemplates(Object.entries(countMap).map(([name, count]) => ({ name, count })))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTemplates()
  }, [userId])

  const handleDelete = async (name: string) => {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) return

    await supabase
      .from('hwpx_mappings')
      .delete()
      .eq('user_id', userId)
      .eq('template_name', name)

    loadTemplates()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text">저장된 템플릿</h1>

      {loading ? (
        <p className="text-sm text-text-light">불러오는 중...</p>
      ) : templates.length === 0 ? (
        <div className="border border-border rounded-xl bg-card p-8 text-center">
          <p className="text-3xl mb-2">&#128203;</p>
          <p className="text-sm text-text-light">저장된 템플릿이 없습니다.</p>
          <p className="text-xs text-text-light/60 mt-1">Excel → HWPX 메뉴에서 매핑을 저장해보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.name} className="border border-border rounded-xl bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">{t.name}</p>
                <p className="text-xs text-text-light">매핑 {t.count}개</p>
              </div>
              <button
                onClick={() => handleDelete(t.name)}
                className="text-xs px-3 py-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
