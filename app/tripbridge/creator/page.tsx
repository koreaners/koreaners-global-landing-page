import type { Metadata } from 'next'
import TripbridgeCreatorContent from '@/components/tripbridge-creator-content'

export const metadata: Metadata = {
  title: 'TripBridge 体験団 | Koreaners',
  description:
    '韓国のグルメ・カフェ・ビューティークリニックのコースを全額無料で体験し、リールを投稿すると原稿料もお支払いします。訪韓予定または韓国在住の日本人Instagramクリエイターを募集中。',
  robots: { index: false },
}

export default function TripbridgeCreatorPage() {
  return <TripbridgeCreatorContent />
}
