import type { Metadata } from 'next'
import DiagnosisLanding from './diagnosis-landing'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

export const metadata: Metadata = {
  title: '일본 인지도 무료 진단',
  description:
    '브랜드명과 홈페이지만 남기시면, 일본에서 얼마나 검색되고 언급되는지 다섯 항목으로 확인해 2영업일 안에 메일로 보내드립니다.',
  alternates: { canonical: `${siteUrl}/diagnosis` },
}

export default function DiagnosisPage() {
  return <DiagnosisLanding />
}
