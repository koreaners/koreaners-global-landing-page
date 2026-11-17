'use client'

import HeroSection from '@/components/hero-section'
import { TrustSignals } from '@/components/trust-signals'
import { MarketOpportunity } from '@/components/market-opportunity'
import { Barriers } from '@/components/barriers'
import { SolutionRoadmap } from '@/components/solution-roadmap'
import { Performance } from '@/components/performance'
import { ClientShowcase } from '@/components/client-showcase'
import { FinalCTA } from '@/components/final-cta'
import { FooterCTA } from '@/components/footer-cta'
import { StickyCtaBar } from '@/components/ui/sticky-cta-bar'

export function MainContent() {
  return (
    <>
      <HeroSection />
      <TrustSignals />
      {/* 로고 월: 첫 화면 바로 아래 신뢰 장치(261102 홈페이지 개선 기획) */}
      <ClientShowcase />
      {/* 신뢰 블록(RESULTS 스탯) 상단 배치 — 평균 스크롤 33% 데드존 대응 (Task 1.3) */}
      <FinalCTA />
      <MarketOpportunity />
      <Performance />
      <Barriers />
      <SolutionRoadmap />
      {/* StickyCtaBar 의 폼 진입 감지 앵커 — /contact 의 #consult-form 과 페이지가 달라 충돌 없음 */}
      <div id="consult-form">
        <FooterCTA />
      </div>
      <StickyCtaBar />
    </>
  )
}
