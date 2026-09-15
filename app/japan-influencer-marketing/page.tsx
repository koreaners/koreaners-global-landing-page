import type { Metadata } from 'next'
import Link from 'next/link'
import Navigation from '@/components/navigation'
import { safeJsonLdStringify } from '@/lib/json-ld'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'
const pageUrl = `${siteUrl}/japan-influencer-marketing`

export const metadata: Metadata = {
  // 루트 layout 의 title.template("%s | 코리너스 KOREANERS")가 브랜드를 붙임 — 여기서 중복 표기 금지.
  title: '일본 인플루언서 마케팅 대행사 비교와 비용',
  description:
    '일본 현지 대행사와 한국 대행사의 차이, 크리에이터 티어별 단가(나노 15~20만 원, 마이크로 20~35만 원부터), 견적 전 확인 항목 7가지, 코리너스의 운영 방식과 사례를 한 페이지에 정리했습니다.',
  alternates: { canonical: pageUrl },
  openGraph: {
    title: '일본 인플루언서 마케팅 대행사 비교와 비용 | 코리너스 KOREANERS',
    description:
      '일본 현지 대행사와 한국 대행사의 차이, 크리에이터 티어별 단가(나노 15~20만 원, 마이크로 20~35만 원부터), 견적 전 확인 항목 7가지, 코리너스의 운영 방식과 사례를 한 페이지에 정리했습니다.',
    url: pageUrl,
    images: [{ url: '/images/logo.png', width: 800, height: 400, alt: '코리너스 KOREANERS' }],
  },
}

const COMPARISON_ROWS = [
  ['Find Model', '일본', '일본 국내', '전담 담당자 대행형', '13,800명 이상', '팔로워당 1.5엔부터, 최저 20만 엔'],
  ['UUUM Marketing', '일본', '일본 국내', 'MCN 기반 대행형', '10,000명', '비공개'],
  ['콜라보티켓', '한국(서울)', '일본 단독', '월 정찰제 팀 운영', '2,400개 이상 DB', '금액 비공개'],
  ['와이즈케이 WISEK', '한국(서울)', '일본, 대만, 영미권, 국내', '섭외부터 발행까지 대행형', '비공개', '비공개'],
  ['CNEC(하우랩)', '한국', '한국, 일본, 미국 동시 집행', 'AI 매칭과 대행형', '비공개', '비공개'],
  ['코리너스 KOREANERS', '한국(서울)', '일본 중심', '전속 크리에이터를 포함한 대행형', '220명 이상 주요 크리에이터', '나노 15~20만 원, 마이크로 20~35만 원부터'],
]

const PRICING_ROWS = [
  ['나노', '1만 이하', '15만~20만 원부터'],
  ['마이크로', '1만~3만', '20만~35만 원부터'],
  ['미드 이상', '3만 초과', '캠페인별 견적'],
]

const CHECKLIST = [
  '크리에이터의 일본인 팔로워 비율',
  '여성 비율과 연령대 분포',
  '최근 10개 게시물 평균 조회수와 참여율',
  '광고 게시물 성과(일반 게시물과 분리)',
  '콘텐츠 2차 사용권 범위와 기간',
  '대행 수수료와 크리에이터 비용 분리 표기',
  '최근 같은 카테고리 캠페인 사례',
]

const OPERATION_ITEMS = [
  '일본 인플루언서 마케팅: 220명 이상의 주요 크리에이터 네트워크로 캠페인을 기획하고 운영합니다. 일부는 전속 계약으로 운영해 브랜드 메시지를 장기적으로 일관되게 전달합니다.',
  '대량 시딩: 크리에이터와 체험단 네트워크로 제품 체험과 리뷰 콘텐츠를 확산합니다.',
  '콘텐츠 제작: 일본 소비자의 감성과 트렌드에 맞춘 콘텐츠를 기획하고 제작합니다.',
  '데이터 리포팅: ROAS, CVR, 전환 분석과 정성 키워드 분석을 합친 리포트를 제공합니다.',
]

const CASES = [
  {
    brand: '감자밭',
    title: '줄 서서 먹는 한국의 감자빵, 일본 열도를 사로잡다',
    href: '/portfolio/f6bfe351-7330-4bf8-b7e5-faf0eace6ac4',
  },
  {
    brand: '온리프성형외과',
    title: '일본인의 검색창을 점령한 한국 클리닉',
    href: '/portfolio/d1aab841-138e-4001-9f4b-cda67726a649',
  },
  {
    brand: '뉴믹스',
    title: '성수동 신생 브랜드가 일본인의 한국 여행 필수 코스가 된 비결',
    href: '/portfolio/66f5513e-5b0c-4ac3-9020-44671af86ddd',
  },
]

const FAQS = [
  {
    q: '일본 현지 대행사와 한국 대행사 중 어디가 낫나요?',
    a: '일본에서 처음 캠페인을 하는 한국 브랜드라면 한국어로 브리프하고 일본어로 운영하는 일본 전문 한국 대행사가 제품 이해와 계약 관행 면에서 빠릅니다. 이미 일본 법인과 현지 담당자가 있다면 현지 대행사의 큰 크리에이터 풀이 유리합니다.',
  },
  {
    q: '일본 인플루언서 마케팅 비용은 얼마인가요?',
    a: '코리너스 기준 나노 크리에이터(팔로워 1만 이하) 게시물 1건 15만~20만 원, 마이크로(1만~3만) 20만~35만 원부터입니다. 채널, 콘텐츠 유형, 2차 사용권에 따라 달라집니다.',
  },
  {
    q: '최소 몇 명부터 시작할 수 있나요?',
    a: '마이크로 크리에이터 30명 규모의 시딩부터 권합니다. 반응이 좋은 5~10명을 골라 확장하는 구조가 예산 대비 결과가 안정적입니다.',
  },
  {
    q: '콘텐츠를 우리 광고 소재로 다시 쓸 수 있나요?',
    a: '2차 사용권 범위와 기간을 계약에 명시하면 가능합니다. 견적 단계에서 별도 항목으로 표기해 달라고 요청하십시오.',
  },
  {
    q: '성과는 어떻게 보고받나요?',
    a: '노출, 조회, 참여, 전환(ROAS, CVR)의 정량 지표와 댓글, 검색어 등 정성 키워드 분석을 합친 리포트를 캠페인 종료 후 제공합니다.',
  },
]

const sectionClass = 'py-12 sm:py-16 px-6 lg:px-24 border-t border-border'
const containerClass = 'max-w-4xl mx-auto'
const h2Class = 'text-2xl sm:text-3xl font-bold text-white mb-6 break-keep'
const bodyClass = 'text-[#A8A29E] leading-relaxed break-keep'
const thClass = 'px-3 py-2 text-left text-white font-bold whitespace-nowrap'
const tdClass = 'px-3 py-2 text-left align-top'

export default function JapanInfluencerMarketingPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '일본 인플루언서 마케팅 대행사 비교와 비용' },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${pageUrl}#service`,
    name: '일본 인플루언서 마케팅',
    url: pageUrl,
    provider: { '@id': 'https://www.koreaners.co/#organization' },
    areaServed: [{ '@type': 'Country', name: 'Japan' }],
    // 단가는 /service 와 홈 FAQ 에 이미 공개된 값과 동일. 새 숫자 도입 금지.
    offers: [
      {
        '@type': 'Offer',
        name: '나노 크리에이터(~1만 팔로워) 인플루언서 캠페인',
        priceCurrency: 'KRW',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'KRW',
          minPrice: 150000,
          maxPrice: 200000,
          unitText: '크리에이터 1인 1건',
        },
        availability: 'https://schema.org/InStock',
        url: `${siteUrl}/contact`,
      },
      {
        '@type': 'Offer',
        name: '마이크로 크리에이터(1~3만 팔로워) 인플루언서 캠페인',
        priceCurrency: 'KRW',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'KRW',
          minPrice: 200000,
          maxPrice: 350000,
          unitText: '크리에이터 1인 1건',
        },
        availability: 'https://schema.org/InStock',
        url: `${siteUrl}/contact`,
      },
    ],
  }

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(serviceJsonLd) }}
      />

      <article>
        <section className="pt-32 sm:pt-40 pb-12 px-6 lg:px-24">
          <div className={containerClass}>
            <h1 className="heading-kr text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep">
              일본 인플루언서 마케팅 대행사 비교와 비용
            </h1>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>일본 인플루언서 마케팅 대행사, 무엇을 보고 고르나</h2>
            <p className={bodyClass}>
              일본 인플루언서 마케팅 대행사는 일본 크리에이터의 섭외, 계약, 콘텐츠 검수, 성과 리포팅을 브랜드 대신 운영하는 회사입니다. 한국 브랜드가 고를 때 첫 갈림길은 일본 현지 대행사와 일본 전문 한국 대행사 중 어디에 맡길지입니다. 현지 대행사는 크리에이터 데이터베이스가 크고 일본 소비자 감각이 정확한 대신 커뮤니케이션이 일본어로만 이뤄집니다. 한국 대행사는 한국어로 브리프를 받고 일본어로 크리에이터를 운영하므로 제품 이해와 브랜드 톤 전달이 빠르고, 콘텐츠 2차 사용권을 한국 계약 관행으로 묶기 쉽습니다. 2026년 기준 일본 마이크로 크리에이터(팔로워 1만~3만) 게시물 단가는 20만~35만 원, 나노(1만 이하)는 15만~20만 원부터 시작합니다. 단가보다 결과를 가르는 것은 섭외, 계약, 검수, 리포팅을 누가 어느 언어로 하느냐입니다.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>일본 현지 대행사와 한국 대행사 비교</h2>
            <p className={`${bodyClass} mb-6`}>
              2026년 9월 14일 각사 공식 페이지 기준. 비공개 항목은 그대로 비공개로 적었습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-[#A8A29E]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={thClass}>업체</th>
                    <th className={thClass}>소재</th>
                    <th className={thClass}>대상 시장</th>
                    <th className={thClass}>운영 방식</th>
                    <th className={thClass}>공개한 크리에이터 풀</th>
                    <th className={thClass}>공개 가격</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row[0]} className="border-b border-white/10">
                      {row.map((cell, i) => (
                        <td key={i} className={tdClass}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>일본 인플루언서 마케팅 비용</h2>
            <p className={`${bodyClass} mb-6`}>
              코리너스 기준 게시물 1건 단가입니다. 캠페인 규모, 채널, 콘텐츠 유형(피드, 릴스, 숏폼, 영상), 2차 사용권 포함 여부에 따라 달라집니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-[#A8A29E]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={thClass}>크리에이터 티어</th>
                    <th className={thClass}>팔로워</th>
                    <th className={thClass}>게시물 단가</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_ROWS.map((row) => (
                    <tr key={row[0]} className="border-b border-white/10">
                      {row.map((cell, i) => (
                        <td key={i} className={tdClass}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`${bodyClass} mt-6`}>
              견적 요청 때는 대행 수수료와 크리에이터 비용을 분리해 받으십시오. 두 값이 합쳐진 견적은 업체 간 비교가 되지 않습니다.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>견적 전에 확인할 것 7가지</h2>
            <ol className={`${bodyClass} list-decimal pl-6 space-y-2`}>
              {CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className={`${bodyClass} mt-6`}>
              같은 조건(타깃, 채널, 티어, 인원 3안, 시딩 포함 여부, 2차 사용권, 예상 조회수와 도달)으로 여러 업체에 보내야 실력이 비교됩니다.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>코리너스 운영 방식</h2>
            <ul className={`${bodyClass} list-disc pl-6 space-y-2`}>
              {OPERATION_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={`${bodyClass} mt-6`}>
              처음 일본에 진출하는 브랜드에는 팔로워 10만 크리에이터 5명보다 일본 20~30대 여성 마이크로 크리에이터 30~50명에게 제품을 뿌리고, 반응이 좋은 5~10명의 콘텐츠를 광고 소재로 확장한 뒤, 성과가 검증된 크리에이터와 장기 계약을 맺는 순서를 권합니다.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>사례</h2>
            <ul className={`${bodyClass} list-disc pl-6 space-y-2`}>
              {CASES.map((item) => (
                <li key={item.href}>
                  {item.brand}:{' '}
                  <Link href={item.href} className="text-[#FF4500] hover:underline">
                    {item.title}
                  </Link>
                  .
                </li>
              ))}
            </ul>
            <p className={`${bodyClass} mt-6`}>
              코리너스는 2022년 설립 이후 K-뷰티, F&amp;B, 패션, 의료관광, IT 분야 185개 이상 브랜드를 지원했습니다(자체 집계). KOTRA 수출바우처 공식 수행기관입니다.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>자주 묻는 질문</h2>
            <dl className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q}>
                  <dt className="text-base font-bold text-white mb-2 break-keep">Q: {faq.q}</dt>
                  <dd className={bodyClass}>A: {faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={containerClass}>
            <h2 className={h2Class}>문의</h2>
            <p className={bodyClass}>
              같은 조건으로 견적을 받아 보시려면{' '}
              <Link href="/contact" className="text-[#FF4500] hover:underline">
                문의 페이지
              </Link>
              에 타깃, 채널, 인원 규모를 적어 보내 주십시오.
            </p>
          </div>
        </section>
      </article>
    </main>
  )
}
