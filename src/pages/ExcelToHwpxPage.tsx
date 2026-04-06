import { useState, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { supabase, ensureSession } from '@/lib/supabase'

interface MappingRow {
  sheetName: string     // 엑셀 시트명
  excelCell: string     // 셀 주소 (예: J21)
  hwpxPlaceholder: string
  excelValue: string
}

interface MergeInfo {
  colSpan: number
  rowSpan: number
  hidden: boolean // 병합된 셀 중 좌상단이 아닌 셀
}

function extractPlaceholders(xml: string): string[] {
  const re = /\$[^$]+\$/g
  const matches = xml.match(re)
  return matches ? [...new Set(matches)] : []
}

// 병합 정보를 셀 단위 맵으로 변환
function buildMergeMap(merges: XLSX.Range[] | undefined, maxRow: number, maxCol: number) {
  const map: Record<string, MergeInfo> = {}

  // 기본값: 모든 셀 visible, span 1
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= maxCol; c++) {
      map[`${r}:${c}`] = { colSpan: 1, rowSpan: 1, hidden: false }
    }
  }

  if (!merges) return map

  for (const merge of merges) {
    const { s, e } = merge
    // 좌상단 셀에 span 설정
    map[`${s.r}:${s.c}`] = {
      colSpan: e.c - s.c + 1,
      rowSpan: e.r - s.r + 1,
      hidden: false,
    }
    // 나머지 셀은 hidden
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue
        map[`${r}:${c}`] = { colSpan: 1, rowSpan: 1, hidden: true }
      }
    }
  }

  return map
}

interface PageProps {
  userId: string
}

export default function ExcelToHwpxPage({ userId }: PageProps) {
  const [excelData, setExcelData] = useState<Record<string, string>>({})
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [hwpxFile, setHwpxFile] = useState<File | null>(null)
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [mappings, setMappings] = useState<MappingRow[]>([])
  const [hwpxZip, setHwpxZip] = useState<JSZip | null>(null)
  const [sectionXml, setSectionXml] = useState('')
  const [processing, setProcessing] = useState(false)
  const [previewData, setPreviewData] = useState<string[][]>([])
  const [mergeMap, setMergeMap] = useState<Record<string, MergeInfo>>({})
  const [maxCol, setMaxCol] = useState(0)
  const [selectedMapping, setSelectedMapping] = useState<number | null>(null)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [savedTemplates, setSavedTemplates] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [hwpxOriginalBuf, setHwpxOriginalBuf] = useState<Uint8Array | null>(null)

  // 전체 시트 데이터: { sheetName: { cellAddr: value } }
  const allSheetDataRef = useRef<Record<string, Record<string, string>>>({})
  // 현재 시트 데이터 ref
  const excelDataRef = useRef<Record<string, string>>({})

  // 셀 주소(콤마 구분 가능)에서 값을 조회하여 공백으로 합침
  const resolveValue = useCallback((m: MappingRow): string => {
    if (!m.excelCell) return ''
    const all = allSheetDataRef.current
    const cells = m.excelCell.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const values = cells.map(cell => {
      if (m.sheetName && all[m.sheetName]) {
        return all[m.sheetName][cell] ?? ''
      }
      return excelDataRef.current[cell] ?? ''
    })
    return values.join(' ')
  }, [])

  // 매핑의 미리보기 값을 엑셀 데이터에서 다시 채우기
  const refreshMappingValues = useCallback(() => {
    const all = allSheetDataRef.current
    if (Object.keys(all).length === 0) return
    setMappings(prev => prev.map(m => {
      if (!m.excelCell) return m
      return { ...m, excelValue: resolveValue(m) }
    }))
  }, [resolveValue])

  // 저장된 템플릿 목록 불러오기
  useEffect(() => {
    loadTemplateList()
  }, [])

  const loadTemplateList = async () => {
    await ensureSession()
    const { data, error } = await supabase
      .from('hwpx_mappings')
      .select('template_name')
      .eq('user_id', userId)

    if (error) {
      console.error('템플릿 목록 조회 실패:', error.message)
      return
    }

    if (data) {
      const names = [...new Set(data.map((d: { template_name: string }) => d.template_name))]
      setSavedTemplates(names)
    }
  }

  // 매핑 저장
  const saveMappings = async () => {
    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.')
      return
    }

    const validMappings = mappings.filter(m => m.hwpxPlaceholder && m.excelCell)
    if (validMappings.length === 0) {
      alert('저장할 매핑이 없습니다.')
      return
    }

    setSaving(true)
    try {
      await ensureSession()
      // 기존 매핑 삭제 후 새로 삽입
      await supabase
        .from('hwpx_mappings')
        .delete()
        .eq('user_id', userId)
        .eq('template_name', templateName.trim())

      const rows = validMappings.map(m => ({
        user_id: userId,
        template_name: templateName.trim(),
        placeholder: m.hwpxPlaceholder,
        sheet_name: m.sheetName || '',
        excel_cell: m.excelCell,
      }))

      const { error } = await supabase.from('hwpx_mappings').insert(rows)
      if (error) throw error

      alert(`"${templateName}" 매핑이 저장되었습니다. (${rows.length}개)`)
      loadTemplateList()
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // 매핑 불러오기
  const loadMappings = async (name: string) => {
    try {
      await ensureSession()
      const { data, error } = await supabase
        .from('hwpx_mappings')
        .select('placeholder, sheet_name, excel_cell')
        .eq('user_id', userId)
        .eq('template_name', name)

      if (error) {
        alert('불러오기 실패: ' + error.message)
        return
      }

      if (!data || data.length === 0) {
        alert(`"${name}" 매핑 데이터가 없습니다.`)
        return
      }

      if (data.length > 0) {
        setTemplateName(name)
        setMappings(data.map((d: { placeholder: string; sheet_name: string; excel_cell: string }) => {
          const m: MappingRow = {
            hwpxPlaceholder: d.placeholder,
            sheetName: d.sheet_name || '',
            excelCell: d.excel_cell || '',
            excelValue: '',
          }
          m.excelValue = resolveValue(m)
          return m
        }))
      }
    } catch (err) {
      alert('매핑 불러오기 오류: ' + (err as Error).message)
    }
  }

  // 매핑 삭제
  const deleteTemplate = async (name: string) => {
    if (!confirm(`"${name}" 매핑을 정말 삭제하시겠습니까?`)) return

    await ensureSession()
    await supabase
      .from('hwpx_mappings')
      .delete()
      .eq('user_id', userId)
      .eq('template_name', name)

    loadTemplateList()
  }

  // 모든 시트의 셀 데이터를 한번에 로드
  const loadAllSheets = useCallback((wb: XLSX.WorkBook) => {
    const all: Record<string, Record<string, string>> = {}
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name]
      if (!ws['!ref']) continue
      const range = XLSX.utils.decode_range(ws['!ref'])
      const cellMap: Record<string, string> = {}
      for (let r = 0; r <= range.e.r; r++) {
        for (let c = 0; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (cell && cell.v !== undefined) cellMap[addr] = String(cell.v)
        }
      }
      all[name] = cellMap
    }
    allSheetDataRef.current = all
  }, [])

  const loadSheet = useCallback((wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName]
    if (!ws['!ref']) return

    const range = XLSX.utils.decode_range(ws['!ref'])
    const rows = range.e.r + 1
    const cols = range.e.c + 1

    const data: string[][] = []
    const cellMap: Record<string, string> = {}

    for (let r = 0; r < rows; r++) {
      const row: string[] = []
      for (let c = 0; c < cols; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = ws[addr]
        const val = cell && cell.v !== undefined ? String(cell.v) : ''
        row.push(val)
        if (val) cellMap[addr] = val
      }
      data.push(row)
    }

    setPreviewData(data)
    setExcelData(cellMap)
    excelDataRef.current = cellMap
    setMaxCol(cols - 1)
    setMergeMap(buildMergeMap(ws['!merges'], range.e.r, range.e.c))
  }, [])

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)
      loadAllSheets(wb)

      const firstSheet = wb.SheetNames[0]
      setActiveSheet(firstSheet)
      loadSheet(wb, firstSheet)

      // 이미 매핑이 있으면 값 새로고침
      setTimeout(refreshMappingValues, 0)
    }
    reader.readAsArrayBuffer(file)
  }, [loadSheet, loadAllSheets, refreshMappingValues])

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return
    setActiveSheet(sheetName)
    loadSheet(workbook, sheetName)
  }

  const handleHwpxUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setHwpxFile(file)
    const arrayBuf = await file.arrayBuffer()
    setHwpxOriginalBuf(new Uint8Array(arrayBuf))
    const zip = await JSZip.loadAsync(arrayBuf)
    setHwpxZip(zip)

    const sectionFile = zip.file('Contents/section0.xml')
    if (!sectionFile) {
      alert('Contents/section0.xml을 찾을 수 없습니다.')
      return
    }

    const xml = await sectionFile.async('string')
    setSectionXml(xml)

    const phs = extractPlaceholders(xml)
    setPlaceholders(phs)

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // 모바일: 기존 매핑 유지
      setMappings(prev => {
        const existing = new Map(prev.map(m => [m.hwpxPlaceholder, m]))
        return phs.map(ph => existing.get(ph) || ({
          sheetName: '',
          excelCell: '',
          hwpxPlaceholder: ph,
          excelValue: '',
        }))
      })
    } else {
      // PC: 새로 세팅
      setMappings(phs.map(ph => ({
        sheetName: '',
        excelCell: '',
        hwpxPlaceholder: ph,
        excelValue: '',
      })))
    }
  }, [])

  // 매핑 업데이트 (셀 주소만 수동 입력 시 — 시트는 유지)
  const updateMappingCell = useCallback((index: number, cellAddr: string) => {
    const upper = cellAddr.toUpperCase().trim()
    setMappings(prev => prev.map((m, i) => {
      if (i !== index) return m
      const updated = { ...m, excelCell: upper, sheetName: m.sheetName || activeSheet }
      return { ...updated, excelValue: resolveValue(updated) }
    }))
  }, [activeSheet, resolveValue])

  const addMapping = () => {
    setMappings(prev => [...prev, { sheetName: '', excelCell: '', hwpxPlaceholder: '', excelValue: '' }])
  }

  const removeMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index))
    if (selectedMapping === index) setSelectedMapping(null)
  }

  const updatePlaceholder = (index: number, value: string) => {
    setMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, hwpxPlaceholder: value } : m
    ))
  }

  // 셀 클릭 → 선택된 매핑 행에 시트명 + 셀 주소 반영
  const handleCellClick = (rowIdx: number, colIdx: number) => {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
    setSelectedCell(addr)

    if (selectedMapping !== null) {
      const val = excelDataRef.current[addr] || ''
      setMappings(prev => prev.map((m, i) =>
        i === selectedMapping
          ? { ...m, sheetName: activeSheet, excelCell: addr, excelValue: val }
          : m
      ))
    }
  }

  // 매핑 행 선택 (토글)
  const handleMappingSelect = (index: number) => {
    setSelectedMapping(prev => prev === index ? null : index)
  }

  const generateHwpx = async () => {
    if (!hwpxZip || !sectionXml) {
      alert('HWPX 파일을 먼저 업로드해주세요.')
      return
    }

    setProcessing(true)
    try {
      let modifiedXml = sectionXml

      for (const mapping of mappings) {
        if (!mapping.hwpxPlaceholder) continue
        // 이미 매핑에 세팅된 excelValue를 그대로 사용
        const val = mapping.excelValue ?? ''
        const escaped = mapping.hwpxPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        modifiedXml = modifiedXml.replace(new RegExp(escaped, 'g'), val)
      }

      // 원본 바이너리에서 다시 로드하여 ZIP 구조 최대한 보존
      if (!hwpxOriginalBuf) {
        alert('원본 HWPX 파일이 없습니다. 다시 업로드해주세요.')
        return
      }
      const srcZip = await JSZip.loadAsync(hwpxOriginalBuf as Uint8Array)

      // 파일별 압축 방식을 원본과 동일하게 유지
      const storedFiles = new Set(['mimetype', 'version.xml', 'Preview/PrvImage.png'])
      const finalZip = new JSZip()

      for (const [filename, zipEntry] of Object.entries(srcZip.files) as [string, JSZip.JSZipObject][]) {
        if (zipEntry.dir) continue
        if (filename === 'Contents/section0.xml') {
          finalZip.file(filename, modifiedXml)
        } else {
          const content = await zipEntry.async('uint8array')
          if (storedFiles.has(filename)) {
            finalZip.file(filename, content, { compression: 'STORE' })
          } else {
            finalZip.file(filename, content)
          }
        }
      }

      const zipBlob = await finalZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })
      // application/octet-stream으로 래핑하여 모바일 브라우저의 자동 ZIP 해제 방지
      const blob = new Blob([zipBlob], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = hwpxFile?.name?.replace('.hwpx', '_완성.hwpx') || 'output.hwpx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('생성 중 오류: ' + (err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-4 max-w-full mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text">엑셀 → HWPX 변환</h1>
      <p className="text-sm text-text-light">
        엑셀 셀 값을 HWPX 템플릿의 플레이스홀더($...$)에 매핑하여 변환합니다.
      </p>

      {/* 샘플 파일 다운로드 */}
      <div className="border border-border rounded-xl p-4 bg-card flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-light">샘플 파일:</span>
        <a
          href="convert.xls"
          download
          className="text-sm px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-selected transition-colors"
        >
          convert.xls
        </a>
        <a
          href="convert.hwpx"
          download
          className="text-sm px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-selected transition-colors"
        >
          convert.hwpx
        </a>
      </div>

      {/* 파일 업로드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
          <h2 className="font-semibold text-sm text-text">1. 엑셀 파일 업로드</h2>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="block w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
          />
          {sheetNames.length > 1 && (
            <select
              value={activeSheet}
              onChange={e => handleSheetChange(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-bg px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
          <h2 className="font-semibold text-sm text-text">2. HWPX 템플릿 업로드</h2>
          <input
            type="file"
            accept=".hwpx"
            onChange={handleHwpxUpload}
            className="block w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
          />
          {placeholders.length > 0 && (
            <p className="text-xs text-text-light">
              감지된 플레이스홀더: {placeholders.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* 엑셀 미리보기 (병합 셀 반영) */}
      {previewData.length > 0 && (
        <div className="border border-border rounded-xl p-4 space-y-2 bg-card relative z-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-sm text-text">엑셀 미리보기</h2>
            {selectedMapping !== null && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-selected text-primary font-medium">
                매핑 #{selectedMapping + 1} 선택 중 — 셀을 클릭하세요
              </span>
            )}
            {selectedCell && (
              <span className="text-xs font-mono text-text-light">
                선택: {selectedCell} = {excelData[selectedCell] || '(빈 셀)'}
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-[300px] md:max-h-[500px] border border-border rounded-lg relative z-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="text-xs border-collapse">
              <thead>
                <tr className="bg-cream">
                  <th className="border border-border px-1 py-0.5 bg-cream min-w-[30px]"></th>
                  {Array.from({ length: maxCol + 1 }, (_, ci) => (
                    <th key={ci} className="border border-border px-1 py-0.5 font-mono bg-cream min-w-[40px] text-text-light">
                      {XLSX.utils.encode_col(ci)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 30).map((row, ri) => (
                  <tr key={ri}>
                    <td className="border border-border px-1 py-0.5 font-mono bg-cream text-center text-[10px] text-text-light">
                      {ri + 1}
                    </td>
                    {row.map((val, ci) => {
                      const info = mergeMap[`${ri}:${ci}`]
                      if (info?.hidden) return null

                      const addr = XLSX.utils.encode_cell({ r: ri, c: ci })
                      const isSelected = selectedCell === addr

                      return (
                        <td
                          key={ci}
                          colSpan={info?.colSpan || 1}
                          rowSpan={info?.rowSpan || 1}
                          onClick={() => handleCellClick(ri, ci)}
                          className={`border border-border px-1 py-0.5 cursor-pointer whitespace-pre-wrap max-w-[200px] truncate ${
                            isSelected
                              ? 'bg-selected ring-2 ring-selected-ring'
                              : 'hover:bg-peach/50'
                          } ${val ? '' : 'text-text-light/40'}`}
                          title={`${addr}: ${val}`}
                        >
                          {val || '\u00A0'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 저장된 매핑 불러오기 */}
      {savedTemplates.length > 0 && (
        <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
          <h2 className="font-semibold text-sm text-text">저장된 매핑</h2>
          <div className="flex flex-wrap gap-2">
            {savedTemplates.map(name => (
              <div key={name} className="flex items-center gap-1 border border-border rounded-lg px-2 py-1 bg-cream">
                <button
                  onClick={() => loadMappings(name)}
                  className="text-sm text-text hover:text-primary transition-colors"
                >
                  {name}
                </button>
                <button
                  onClick={() => deleteTemplate(name)}
                  className="text-danger/60 hover:text-danger text-xs ml-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 매핑 테이블 */}
      {mappings.length > 0 && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text">3. 매핑 설정 (행을 클릭하여 선택 → 엑셀 셀 클릭)</h2>
            <button
              onClick={addMapping}
              className="text-xs px-2 py-1 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              + 매핑 추가
            </button>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-cream">
                <th className="border border-border px-2 py-1 w-8 text-text-light">#</th>
                <th className="border border-border px-2 py-1 text-left text-text-light">HWPX 플레이스홀더</th>
                <th className="border border-border px-2 py-1 text-left text-text-light">시트</th>
                <th className="border border-border px-2 py-1 text-left text-text-light">셀 주소</th>
                <th className="border border-border px-2 py-1 text-left text-text-light">미리보기 값</th>
                <th className="border border-border px-2 py-1 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, i) => (
                <tr
                  key={i}
                  onClick={() => handleMappingSelect(i)}
                  className={`cursor-pointer transition-colors ${
                    selectedMapping === i
                      ? 'bg-selected ring-1 ring-selected-ring'
                      : 'hover:bg-peach/50'
                  }`}
                >
                  <td className="border border-border px-2 py-1 text-center text-xs text-text-light">
                    {i + 1}
                  </td>
                  <td className="border border-border px-2 py-1">
                    <input
                      value={m.hwpxPlaceholder}
                      onChange={e => updatePlaceholder(i, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full rounded-lg border border-border bg-bg px-1 py-0.5 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="$플레이스홀더$"
                    />
                  </td>
                  <td className="border border-border px-2 py-1">
                    <span className="text-xs font-mono text-text-light">
                      {m.sheetName || '-'}
                    </span>
                  </td>
                  <td className="border border-border px-2 py-1">
                    <input
                      value={m.excelCell}
                      onChange={e => updateMappingCell(i, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full rounded-lg border border-border bg-bg px-1 py-0.5 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="예: A1, B3"
                    />
                  </td>
                  <td className="border border-border px-2 py-1 text-text-light font-mono text-xs">
                    {m.excelValue || '-'}
                  </td>
                  <td className="border border-border px-2 py-1 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); removeMapping(i) }}
                      className="text-danger/60 hover:text-danger text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 매핑 저장 + 생성 버튼 */}
      {mappings.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm w-48 focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="템플릿 이름 (예: 대기측정기록부)"
          />
          <button
            onClick={saveMappings}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-border bg-cream hover:bg-peach text-sm font-semibold text-text disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '매핑 저장'}
          </button>
          <button
            onClick={generateHwpx}
            disabled={processing}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white hover:opacity-90 disabled:opacity-50 font-semibold transition-opacity shadow-sm"
          >
            {processing ? '생성 중...' : 'HWPX 생성 및 다운로드'}
          </button>
        </div>
      )}
    </div>
  )
}
