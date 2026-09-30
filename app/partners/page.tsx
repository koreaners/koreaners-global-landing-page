import type { Metadata } from 'next'
import PartnersBrief from './partners-brief'

// 영업 담당이 브랜드에 링크로만 전달하는 페이지 — 검색 노출·사이트맵 제외
export const metadata: Metadata = {
  title: '브랜드 사전 정보 시트',
  robots: { index: false, follow: false },
}

export default function PartnersPage() {
  return <PartnersBrief />
}
