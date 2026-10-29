'use client'

import { useEffect, useRef } from 'react'

// 긴 표 상자: 바깥 스크롤이 맨 위일 때 표 아래 끝(과 그 아래 각주)이 화면 안에 들어오도록, 표가 시작하는 높이와 표 아래 내용 높이를 재서 최대 높이를 정함
// (표 위 내용 높이가 화면마다 달라 고정값으로 빼면 넘침, QA 261029). 남는 높이가 320px 아래면(모바일, 표 위 내용이 긴 화면) 상자를 풀어 페이지 스크롤로 펼침
// 표 위 내용이 바뀌면(상세 열기, 글꼴 적용) 다시 잼. 첫 그림은 className의 대략값
export function FitBox({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    const main = el?.closest('main')
    if (!el || !main) return
    const fit = () => {
      const r = el.getBoundingClientRect()
      const top = r.top + main.scrollTop
      const below = main.scrollHeight - (r.bottom - main.getBoundingClientRect().top + main.scrollTop) // 표 아래 내용과 main 아래 여백
      const room = window.innerHeight - top - below
      const next = room >= 320 ? `${Math.floor(room)}px` : 'none'
      if (el.style.maxHeight !== next) el.style.maxHeight = next
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(main)
    if (main.firstElementChild) ro.observe(main.firstElementChild)
    return () => ro.disconnect()
  }, [])
  return <div ref={ref} className={className}>{children}</div>
}
