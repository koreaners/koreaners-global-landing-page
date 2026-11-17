'use client'

import type { Portfolio } from '@/lib/supabase'
import { useLocale } from '@/contexts/locale-context'
import { getPortfolioClientName } from '@/lib/localized-content'

/** 포트폴리오 제목은 「브랜드: 한 줄 요약」 형식이라 브랜드 접두를 떼고 요약만 쓴다 */
export function caseHeadline(title: string) {
  const m = title.match(/^[^:：]{1,40}[:：]\s*/)
  return m ? title.slice(m[0].length) : title
}

/** 홈 캠페인 카드 공통 캡션: 주황 점 + 브랜드 · 카테고리 (mono) */
export function CaseCaption({ portfolio, className = '' }: { portfolio: Portfolio; className?: string }) {
  const { locale } = useLocale()
  const category = portfolio.category?.[0]
  return (
    <p className={`flex items-center gap-2 font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-xs text-[#A8A29E] ${className}`}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#FF4500]" />
      <span className="truncate">
        {getPortfolioClientName(portfolio, locale)}
        {category ? ` · ${category}` : ''}
      </span>
    </p>
  )
}
