import type { Metadata } from 'next'
import Navigation from '@/components/navigation'
import { MainContent } from '@/components/main-content'
import { getTranslation } from '@/lib/translations'

// 일본어 공개 주소. 로케일은 LocaleProvider 가 /ja 경로를 보고 고정한다.
export const metadata: Metadata = {
  title: { absolute: getTranslation('ja', 'metaTitle:/') },
  description: getTranslation('ja', 'metaDesc:/'),
  alternates: { canonical: '/ja', languages: { ko: '/', ja: '/ja', 'x-default': '/' } },
  openGraph: {
    title: getTranslation('ja', 'metaTitle:/'),
    description: getTranslation('ja', 'metaDesc:/'),
    url: '/ja',
    locale: 'ja_JP',
  },
}

export default function JaPage() {
  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />
      <MainContent />
    </main>
  )
}
