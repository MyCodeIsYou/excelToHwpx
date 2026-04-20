import { useRef, useCallback, useEffect } from 'react'

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const scrollLeft = useRef(0)
  const scrollTop = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    // input, button 등은 드래그 방지
    if ((e.target as HTMLElement).closest('input, button, select')) return
    isDragging.current = true
    startX.current = e.pageX - el.offsetLeft
    startY.current = e.pageY - el.offsetTop
    scrollLeft.current = el.scrollLeft
    scrollTop.current = el.scrollTop
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !ref.current) return
    e.preventDefault()
    const el = ref.current
    const x = e.pageX - el.offsetLeft
    const y = e.pageY - el.offsetTop
    el.scrollLeft = scrollLeft.current - (x - startX.current)
    el.scrollTop = scrollTop.current - (y - startY.current)
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    if (ref.current) {
      ref.current.style.cursor = 'grab'
      ref.current.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  return { ref, onMouseDown }
}
