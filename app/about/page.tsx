import type { Metadata } from 'next'
import Navigation from '@/components/navigation'
import { safeJsonLdStringify } from '@/lib/json-ld'
import Link from 'next/link'
import { Building2, Globe, Users, BarChart3, Award, Target } from 'lucide-react'
import { ShaderBackdrop } from '@/components/ui/shader-backdrop'
import { CountUp } from '@/components/ui/count-up'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

export const metadata: Metadata = {
  title: '회사 소개',
  description:
    '코리너스는 일본 시장 전문 크로스보더 마케팅 에이전시입니다. 220명 이상의 주요 크리에이터, 185+ 브랜드 지원 경험, 데이터 기반 캠페인 운영으로 일본 진출을 돕습니다.',
  alternates: { canonical: `${siteUrl}/about` },
  openGraph: {
    title: '코리너스 | 회사 소개',
    description: '일본 시장 전문 크로스보더 마케팅 에이전시 코리너스. 220명 이상의 주요 크리에이터와 함께합니다.',
    url: `${siteUrl}/about`,
  },
}

const stats = [
  { num: 185, suffix: '+', label: '지원 브랜드', icon: Building2 },
  { num: 220, suffix: '+', label: '주요 크리에이터', icon: Users },
  { num: 30, suffix: '만+', label: 'SNS 커뮤니티', icon: Globe },
  { num: 250, suffix: '%', label: '평균 ROI', icon: BarChart3 },
]

const services = [
  {
    title: '일본 인플루언서 마케팅',
    description: '일본 현지 인플루언서를 활용한 브랜드 마케팅 캠페인 기획 및 운영. 220명 이상의 주요 크리에이터 네트워크를 통해 브랜드에 최적화된 콘텐츠를 제작합니다.',
    icon: Target,
  },
  {
    title: '대량 시딩',
    description: '일본 크리에이터 네트워크를 통한 제품 체험 및 리뷰 콘텐츠 확산. 크리에이터·체험단 네트워크를 활용하여 자연스러운 입소문을 형성합니다.',
    icon: Users,
  },
  {
    title: '콘텐츠 제작',
    description: '일본 시장 맞춤 마케팅 콘텐츠 기획 및 제작. 현지 소비자의 감성과 트렌드를 반영한 고품질 콘텐츠를 제공합니다.',
    icon: Globe,
  },
  {
    title: '데이터 리포팅',
    description: '캠페인 성과 분석 및 데이터 기반 인사이트 리포트 제공. ROAS, CVR, 전환 분석부터 정성적 키워드 분석까지 종합 리포팅합니다.',
    icon: BarChart3,
  },
]

const strengths = [
  { title: '일본 현지 전문성', description: '한일 양국에 거점을 두고 일본 시장의 소비 트렌드, 플랫폼 특성, 문화적 뉘앙스를 깊이 이해합니다.' },
  { title: '수출바우처 공식 수행기관', description: 'KOTRA 수출바우처 공식 수행기관으로 지정되어 중소·중견기업의 일본 진출을 체계적으로 지원합니다.' },
  { title: '전속 크리에이터 운영', description: '단발성 섭외가 아닌, 전속 계약 기반으로 브랜드 메시지를 일관되게 전달하며 장기적인 팬덤을 구축합니다.' },
  { title: '데이터 기반 의사결정', description: '캠페인 전 과정을 데이터로 추적하고, 정량·정성 분석을 통해 다음 액션을 결정합니다.' },
]

export default function AboutPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '회사 소개' },
    ],
  }

  // 블로그 BlogPosting author 와 동일한 Person 엔티티 (@id 로 연결)
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteUrl}/about#leo`,
    name: '조인혁',
    jobTitle: 'BD 팀장',
    worksFor: { '@id': 'https://www.koreaners.co/#organization' },
    url: `${siteUrl}/about`,
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
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(personJsonLd) }}
      />

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-20 px-6 lg:px-24 relative overflow-hidden hero-glow">
        <ShaderBackdrop variant="hero-sub" seed={6} className="absolute!" />
        <div className="max-w-7xl mx-auto relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold mb-6">ABOUT US</p>
          <h1 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl">
            일본 시장 진출의
            <br />
            <span className="gradient-warm-text">확실한 파트너</span>
          </h1>
          <p className="text-lg text-[#A8A29E] mt-6 max-w-2xl leading-relaxed">
            코리너스는 2022년 설립된 일본 시장 전문 크로스보더 마케팅 에이전시입니다.
            인플루언서 캠페인, 대량 시딩, 콘텐츠 제작, 데이터 기반 리포팅까지
            일본 진출의 전 과정을 설계하고 운영합니다.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-20 px-6 lg:px-24 border-t border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-1 border border-border rounded-[var(--radius)] p-6 sm:p-8 text-center hover:border-[#FF4500]/40 transition-colors"
            >
              <stat.icon className="h-6 w-6 text-[#FF4500] mx-auto mb-3" />
              <p className="text-3xl sm:text-4xl font-bold gradient-warm-text">
                <CountUp value={stat.num} suffix={stat.suffix} />
              </p>
              <p className="text-sm text-[#A8A29E] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-16 sm:py-20 px-6 lg:px-24 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold mb-6">SERVICES</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12">
            크로스보더 마케팅의 모든 것
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="p-6 bg-surface-1 border border-border rounded-[var(--radius)] hover:border-[#FF4500]/40 transition-colors"
              >
                <service.icon className="h-5 w-5 text-[#FF4500] mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                <p className="text-sm text-[#A8A29E] leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section className="py-16 sm:py-20 px-6 lg:px-24 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold mb-6">WHY KOREANERS</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12">
            코리너스를 선택하는 이유
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {strengths.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF4500]/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-[#FF4500]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-6 lg:px-24 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            일본 시장 진출, 지금 시작하세요
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-xl mx-auto">
            185개 이상의 브랜드가 코리너스와 함께 일본 시장에 진출했습니다.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 text-base font-bold rounded-[var(--radius-sm)] gradient-warm text-white hover:opacity-90 hover:scale-[1.02] transition-all duration-300"
          >
            문의하기
          </Link>
        </div>
      </section>
    </main>
  )
}
