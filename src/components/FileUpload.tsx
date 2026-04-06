import { useRef, useState, type DragEvent } from 'react'

interface Props {
  onFileSelect: (file: File) => void
}

const ACCEPT = '.xlsx,.xls'

export default function FileUpload({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    if (
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      onFileSelect(file)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div className="upload-icon">📂</div>
      <p>클릭하거나 Excel 파일을 드래그하세요</p>
      <span className="upload-hint">.xlsx, .xls 파일 지원</span>
    </div>
  )
}
