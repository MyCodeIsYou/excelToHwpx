import { useState } from 'react'
import type { SheetData } from '../pages/ExcelToHwpxPage'

interface Props {
  sheets: SheetData[]
}

export default function ExcelPreview({ sheets }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const sheet = sheets[activeTab]

  return (
    <div className="preview">
      <div className="sheet-tabs">
        {sheets.map((s, i) => (
          <button
            key={s.name}
            className={`tab ${i === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {sheet.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.slice(0, 50).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.rows.length > 50 && (
          <p className="truncated">
            ... 외 {sheet.rows.length - 50}개 행 (미리보기 50행 제한)
          </p>
        )}
      </div>
    </div>
  )
}
