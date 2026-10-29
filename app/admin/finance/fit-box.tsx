'use client'

import { useEffect, useRef } from 'react'

// 긴 표 상자: 바깥 스크롤이 맨 위일 때 표 아래 끝이 화면 안에 들어오도록, 표가 시작하는 높이를 재서 최대 높이를 정함
// (표 위 내용 높이가 화면마다 달라 고정값으로 빼면 넘침, QA 261029). 첫 그림은 className의 대략값
export function FitBox({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const main = el.closest('main')
      const top = el.getBoundingClientRect().top + (main?.scrollTop ?? 0)
      const pad = main ? parseFloat(getComputedStyle(main).paddingBottom) : 0
      el.style.maxHeight = `${Math.max(320, window.innerHeight - top - pad)}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return <div ref={ref} className={className}>{children}</div>
}
