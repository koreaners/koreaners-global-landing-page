import type { Metadata } from 'next'
import ServiceContent from '@/components/service-content'
import { getTranslation } from '@/lib/translations'

export const metadata: Metadata = {
  title: { absolute: getTranslation('ja', 'metaTitle:/service') },
  description: getTranslation('ja', 'metaDesc:/service'),
  alternates: {
    canonical: '/ja/service',
    languages: { ko: '/service', ja: '/ja/service', 'x-default': '/service' },
  },
  openGraph: {
    title: getTranslation('ja', 'metaTitle:/service'),
    description: getTranslation('ja', 'metaDesc:/service'),
    url: '/ja/service',
    locale: 'ja_JP',
  },
}

export default function JaServicePage() {
  return <ServiceContent />
}
