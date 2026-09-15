import type { Metadata } from 'next'
import ContactLanding from '@/components/contact-landing'
import { safeJsonLdStringify } from '@/lib/json-ld'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

export const metadata: Metadata = {
  title: '문의하기 | 일본 대만 인플루언서 마케팅 무료 상담',
  description:
    '일본, 대만 인플루언서 마케팅 무료 상담. 크리에이터 섭외부터 콘텐츠 제작, 성과 리포트까지 코리너스가 캠페인 전 과정을 직접 운영합니다.',
  alternates: { canonical: `${siteUrl}/contact` },
  openGraph: {
    title: '코리너스 문의하기 | 일본 대만 마케팅 무료 상담',
    description: '일본, 대만 인플루언서 마케팅 전문 상담. 맞춤 전략 제안.',
    url: `${siteUrl}/contact`,
    images: [{ url: '/images/logo.png', width: 800, height: 400, alt: '코리너스 KOREANERS' }],
  },
}

export default function ContactPage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '문의하기' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumb) }}
      />
      <ContactLanding />
    </>
  )
}
