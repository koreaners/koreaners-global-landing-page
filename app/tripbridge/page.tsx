import type { Metadata } from 'next'
import TripbridgeContent from '@/components/tripbridge-content'
import { safeJsonLdStringify } from '@/lib/json-ld'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

export const metadata: Metadata = {
  title: 'TripBridge | Koreaners',
  description:
    '방한 일본 인플루언서를 모객하고 매장 방문·촬영 운영을 대행합니다. 브랜드 3~4곳이 한 코스의 섭외비를 나눠 부담하는 트립브릿지.',
  alternates: { canonical: `${siteUrl}/tripbridge` },
  openGraph: {
    title: 'TripBridge | Koreaners',
    description: '방한 일본 인플루언서 모객, 방문·촬영 운영 대행, 브랜드 분담 가격.',
    url: `${siteUrl}/tripbridge`,
    images: [{ url: '/images/logo.png', width: 800, height: 400, alt: '코리너스 KOREANERS' }],
  },
}

export default function TripbridgePage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'TripBridge' },
    ],
  }

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${siteUrl}/tripbridge#service`,
    name: '트립브릿지 (TripBridge)',
    serviceType: '방한 인플루언서 모객 / 방문·촬영 운영 대행 / 브랜드 분담 가격',
    description:
      '이미 자기 일정으로 방한하는 일본 나노 인플루언서를 모객하고, 매장 방문과 촬영·업로드 운영을 대행합니다. 한 코스에 참여한 브랜드 3~4곳이 섭외비를 나눠 부담합니다.',
    url: `${siteUrl}/tripbridge`,
    provider: { '@id': 'https://www.koreaners.co/#organization' },
    areaServed: [
      { '@type': 'Country', name: 'South Korea' },
      { '@type': 'Country', name: 'Japan' },
    ],
    audience: {
      '@type': 'BusinessAudience',
      audienceType: '한국 브랜드 (B2B), 오프라인 매장·팝업 운영 기업',
    },
    inLanguage: ['ko', 'ja'],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(service) }}
      />
      <TripbridgeContent />
    </>
  )
}
