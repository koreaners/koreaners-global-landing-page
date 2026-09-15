import type { Metadata } from 'next'
import TripbridgeCreatorContent from '@/components/tripbridge-creator-content'

export const metadata: Metadata = {
  title: 'TripBridge 체험단 | Koreaners',
  description:
    '한국 여행 코스, 전부 무료. 릴스 올리면 원고료까지. 방한 예정이거나 한국에 거주 중인 일본인 Instagram 크리에이터를 모집합니다.',
  alternates: { canonical: '/tripbridge/creator' },
  robots: { index: false },
}

export default function TripbridgeCreatorPage() {
  return <TripbridgeCreatorContent />
}
