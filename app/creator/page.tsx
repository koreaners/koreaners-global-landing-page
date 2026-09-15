import type { Metadata } from 'next'
import CreatorPageContent from '@/components/creator-content'
import { safeJsonLdStringify } from '@/lib/json-ld'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

export const metadata: Metadata = {
  title: '크리에이터 | 일본 주요 인플루언서 네트워크',
  description:
    '코리너스의 220+ 일본 주요 크리에이터를 만나보세요. 뷰티, 패션, F&B, 라이프스타일 등 다양한 카테고리의 검증된 인플루언서 네트워크.',
  alternates: { canonical: `${siteUrl}/creator` },
  openGraph: {
    title: '코리너스 크리에이터 | 일본 인플루언서 네트워크',
    description: '220+ 일본 주요 크리에이터. 뷰티, 패션, F&B 등 카테고리별 검증된 인플루언서.',
    url: `${siteUrl}/creator`,
    images: [{ url: '/images/logo.png', width: 800, height: 400, alt: '코리너스 KOREANERS' }],
  },
}

export default function CreatorPage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '크리에이터' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumb) }}
      />
      <CreatorPageContent />
    </>
  )
}
