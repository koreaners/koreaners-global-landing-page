import type { Metadata } from 'next'
import Navigation from '@/components/navigation'
import { MainContent } from '@/components/main-content'

export const metadata: Metadata = {
  title: '코리너스 | 크로스보더 인플루언서 마케팅 전문 대행사',
  description: '크로스보더 인플루언서 마케팅 전문 대행사 코리너스. 185+ 브랜드, 220+ 주요 크리에이터. 인플루언서 캠페인, 대량 시딩, 콘텐츠 제작, 데이터 리포팅까지 크로스보더 마케팅 전 과정을 운영합니다.',
  alternates: { canonical: '/' },
}

export default function Page() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '코리너스는 어떤 회사인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '코리너스는 2022년 설립된 크로스보더 인플루언서 마케팅 전문 대행사입니다. 일본 시장을 중심으로 220명 이상의 주요 크리에이터와 30만 SNS 커뮤니티를 활용해 인플루언서 캠페인, 대량 시딩, 콘텐츠 제작, 데이터 기반 리포팅까지 한국 브랜드의 일본 진출 전 과정을 설계하고 운영합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '일본 인플루언서 마케팅 비용은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '캠페인 규모, 크리에이터 티어, 콘텐츠 유형에 따라 달라집니다. 나노 크리에이터(~1만 팔로워) 기준 15~20만원, 마이크로(1~3만) 기준 20~35만원부터 시작합니다. 상세한 견적은 문의 페이지를 통해 요청해주세요.',
        },
      },
      {
        '@type': 'Question',
        name: '어떤 업종의 브랜드를 지원하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'K-뷰티, F&B, 패션, 의료관광, IT 등 다양한 업종에서 누적 185개 이상의 브랜드를 지원한 경험이 있습니다. 특히 K-뷰티와 의료관광 분야에서 강점을 보유하고 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '캠페인 성과를 어떻게 측정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ROAS, CVR, 노출수, 전환 분석 등 정량적 지표와 함께 브랜드 이미지, 현지 정서, 구매 의사 등 정성적 키워드 분석을 종합한 데이터 리포트를 제공합니다.',
        },
      },
    ],
  }

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />
      {/* 서버 렌더링 SEO 콘텐츠 — JS 미실행 크롤러(AI Overview, ChatGPT, Perplexity)가 핵심 콘텐츠를 읽을 수 있도록 */}
      <div className="sr-only" aria-hidden="false">
        <h1>코리너스 — 크로스보더 인플루언서 마케팅 전문 대행사</h1>
        <p>
          코리너스(KOREANERS)는 크로스보더 인플루언서 마케팅 전문 대행사입니다.
          일본 시장을 중심으로 220명 이상의 주요 크리에이터와 30만 SNS 커뮤니티를 활용하여
          일본 인플루언서 캠페인, 대량 시딩, 콘텐츠 제작, 데이터 기반 리포팅까지
          한국 브랜드의 일본 진출 전 과정을 설계하고 운영합니다. KOTRA 수출바우처 공식 수행기관.
        </p>
        <p>185+ 브랜드 지원 | 220+ 주요 크리에이터 | 30만+ SNS 커뮤니티 | 평균 ROI 250%</p>
        <h2>일본 인플루언서 마케팅 서비스</h2>
        <ul>
          <li>일본 인플루언서 마케팅 — 220+ 주요 크리에이터 네트워크를 통한 캠페인 기획 및 운영. 나노~메가 티어 맞춤 섭외. 전속 계약 기반 운영으로 브랜드 메시지 일관성 확보.</li>
          <li>대량 시딩(체험단) — 크리에이터·체험단 네트워크를 활용한 리뷰 콘텐츠 확산</li>
          <li>콘텐츠 제작 — 일본 현지 소비자 감성에 맞춘 마케팅 콘텐츠</li>
          <li>데이터 리포팅 — ROAS, CVR, 전환 분석, 정성적 키워드 분석, 브랜드 이미지 분석</li>
        </ul>
        <h2>지원 업종</h2>
        <p>K-뷰티, F&amp;B, 패션, 의료관광, IT 등 다양한 업종의 일본 시장 진출을 지원합니다.</p>
        <h2>일본 인플루언서 마케팅 비용</h2>
        <p>나노 크리에이터(~1만 팔로워) 15~20만원, 마이크로(1~3만) 20~35만원부터. 캠페인 규모와 목표에 따라 맞춤 견적을 제공합니다.</p>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MainContent />
    </main>
  )
}
