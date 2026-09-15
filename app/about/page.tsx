import type { Metadata } from 'next'
import AboutContent from '@/components/about-content'
import { safeJsonLdStringify } from '@/lib/json-ld'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

export const metadata: Metadata = {
  title: '회사 소개',
  description:
    '코리너스는 일본 시장 전문 크로스보더 마케팅 에이전시입니다. 220명 이상의 주요 크리에이터, 185+ 브랜드 지원 경험, 데이터 기반 캠페인 운영으로 일본 진출을 돕습니다.',
  alternates: { canonical: `${siteUrl}/about` },
  openGraph: {
    title: '코리너스 | 회사 소개',
    description: '일본 시장 전문 크로스보더 마케팅 에이전시 코리너스. 220명 이상의 주요 크리에이터와 함께합니다.',
    url: `${siteUrl}/about`,
  },
}

export default function AboutPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '회사 소개' },
    ],
  }

  // 블로그 BlogPosting author 와 동일한 Person 엔티티 (@id 로 연결)
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteUrl}/about#leo`,
    name: '조인혁',
    jobTitle: 'BD 팀장',
    worksFor: { '@id': 'https://www.koreaners.co/#organization' },
    url: `${siteUrl}/about`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(personJsonLd) }}
      />
      <AboutContent />
    </>
  )
}
