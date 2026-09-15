'use client'

import Link from 'next/link'
import Navigation from '@/components/navigation'
import { SectionTag } from '@/components/ui/section-tag'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/contexts/locale-context'

type Copy = {
  heroLead: string
  heroSub: string
  ctaPrimary: string
  ctaSecondary: string
  coreTag: string
  core: { title: string; desc: string }[]
  compareTitle: string
  compareCols: [string, string]
  compareRows: { label: string; a: string; b: string }[]
  stepsTag: string
  stepsTitle: string
  steps: { no: string; title: string; desc: string; duration: string }[]
  caseTag: string
  caseName: string
  caseResults: string[]
  metricsTag: string
  metrics: { value: string; label: string }[]
  closingTitle: string
  closingDesc: string
}

// 한국어 문자열은 기존 /tripbridge 번들에서 추출한 원문 그대로 사용한다.
const COPY: Record<Locale, Copy> = {
  ko: {
    heroLead: '같은 섭외, 더 많은 브랜드, 비용은 나누고, 노출은 커집니다',
    heroSub: '캠페인 하나를 사는 대신, 코스의 한 자리를 삽니다',
    ctaPrimary: '문의하기',
    ctaSecondary: '성공 사례 보기',
    coreTag: 'WHAT WE DO',
    core: [
      {
        title: '방한 인플루언서 모객',
        desc: '이미 자기 일정으로 한국을 여행하는 일본 나노 인플루언서를 모읍니다.',
      },
      {
        title: '방문·촬영 운영 대행',
        desc: '매장 방문 일정, 촬영, 일본어 영상 업로드까지 코리너스가 운영합니다.',
      },
      {
        title: '브랜드 분담으로 낮춘 비용',
        desc: '한 코스에 참여한 브랜드 3~4곳이 섭외비를 나눠 부담합니다.',
      },
    ],
    compareTitle: '브랜드 부담, 무엇이 다른가요?',
    compareCols: ['인플루언서 마케팅', '트립브릿지'],
    compareRows: [
      { label: '사는 것', a: '우리 브랜드 전용 캠페인', b: '방한 크리에이터 코스의 한 자리' },
      { label: '비용', a: '브랜드 단독 부담', b: '코스에 탄 브랜드끼리 분담' },
      { label: '콘텐츠', a: '제품이 주인공인 게시물', b: '여행 브이로그 속 한 장면' },
    ],
    stepsTag: 'HOW IT WORKS',
    stepsTitle: '단 3단계',
    steps: [
      { no: '01', title: '섭외', desc: '나노 인플루언서 선별·매칭', duration: '1주 이내' },
      { no: '02', title: '매칭', desc: '브랜드 3~4곳과 여정 구성', duration: '여정 확정 후 3일' },
      { no: '03', title: '콘텐츠 제작', desc: '일본어 영상 업로드·확산', duration: '방문 후 2주 내 업로드' },
    ],
    caseTag: 'CASE',
    caseName: '감자밭 베이커리',
    caseResults: ['매출 150% 증가', '이세탄 1위'],
    metricsTag: 'NUMBERS',
    metrics: [
      { value: '858건', label: '세예의원 저장수' },
      { value: '1,600편', label: '업로드 영상' },
      { value: '¥2.3억', label: '뉴믹스 매출 실적' },
      { value: '200개+', label: '누적 참여 브랜드' },
    ],
    closingTitle: '다음 코스에 한 자리를 잡으시겠습니까?',
    closingDesc: '영업일 기준 24시간 내 담당자가 연락드립니다.',
  },
  ja: {
    heroLead: '同じ起用で、より多くのブランドへ。費用は分け合い、露出は広がります',
    heroSub: 'キャンペーンを丸ごと買うのではなく、コースの一枠を買います',
    ctaPrimary: 'お問い合わせ',
    ctaSecondary: '実績を見る',
    coreTag: 'WHAT WE DO',
    core: [
      {
        title: '訪韓インフルエンサーの募集',
        desc: 'すでに自分の予定で韓国を旅行する日本のナノインフルエンサーを集めます。',
      },
      {
        title: '訪問・撮影の運営代行',
        desc: '店舗訪問の日程、撮影、日本語動画のアップロードまでKOREANERSが運営します。',
      },
      {
        title: 'ブランド分担で下げた費用',
        desc: '一つのコースに参加するブランド3~4社が起用費を分担します。',
      },
    ],
    compareTitle: 'ブランドの負担、何が違うのですか？',
    compareCols: ['インフルエンサーマーケティング', 'トリップブリッジ'],
    compareRows: [
      { label: '買うもの', a: '自社ブランド専用のキャンペーン', b: '訪韓クリエイターのコースの一枠' },
      { label: '費用', a: 'ブランドの単独負担', b: 'コースに乗ったブランド同士で分担' },
      { label: 'コンテンツ', a: '商品が主役の投稿', b: '旅行ブイログの中の一場面' },
    ],
    stepsTag: 'HOW IT WORKS',
    stepsTitle: 'たった3ステップ',
    steps: [
      { no: '01', title: '起用', desc: 'ナノインフルエンサーの選定・マッチング', duration: '1週間以内' },
      { no: '02', title: 'マッチング', desc: 'ブランド3~4社と行程を構成', duration: '行程確定後3日' },
      { no: '03', title: 'コンテンツ制作', desc: '日本語動画のアップロード・拡散', duration: '訪問後2週間以内にアップロード' },
    ],
    caseTag: 'CASE',
    caseName: 'カムジャバッ ベーカリー',
    caseResults: ['売上150%増加', '伊勢丹1位'],
    metricsTag: 'NUMBERS',
    metrics: [
      { value: '858件', label: 'セイエ医院の保存数' },
      { value: '1,600本', label: 'アップロード動画' },
      { value: '¥2.3億', label: 'ニューミックス売上実績' },
      { value: '200社+', label: '累計参加ブランド' },
    ],
    closingTitle: '次のコースに一枠を確保しませんか？',
    closingDesc: '営業日基準24時間以内に担当者からご連絡します。',
  },
}

export default function TripbridgeContent() {
  const { locale } = useLocale()
  const c = COPY[locale]

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* Hero — Dark */}
      <section className="pt-32 sm:pt-40 pb-24 md:pb-32 px-6 lg:px-24 bg-background hero-glow">
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionTag variant="dark">TRIPBRIDGE</SectionTag>
          <h1 className="heading-kr text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight break-keep mt-8">
            TripBridge
          </h1>
          <p className="text-xl md:text-2xl font-bold text-white max-w-2xl mt-6 leading-relaxed break-keep">
            {c.heroLead}
          </p>
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep">
            {c.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link
              href="/contact"
              className="gradient-warm text-white px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 text-center"
            >
              {c.ctaPrimary}
            </Link>
            <Link
              href="/portfolio"
              className="bg-transparent text-[var(--foreground)] px-8 py-4 text-sm font-bold uppercase tracking-wider border border-[#A8A29E]/30 rounded-[var(--radius-sm)] hover:border-[#FF4500]/60 hover:bg-white/5 transition-all duration-300 text-center"
            >
              {c.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Core three — Light */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <SectionTag variant="light">{c.coreTag}</SectionTag>
            <div className="h-px flex-1 bg-[var(--kn-dark)]/10" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {c.core.map((item) => (
              <div
                key={item.title}
                className="bg-[var(--kn-card-light)] border border-[var(--kn-dark)]/5 rounded-[var(--radius)] p-8 hover:border-[#FF4500]/40 transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-[var(--kn-dark)] mb-3 break-keep">{item.title}</h3>
                <p className="text-[#78716C] leading-relaxed break-keep">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison — Dark */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-background">
        <div className="max-w-5xl mx-auto">
          <SectionTag variant="dark">COMPARE</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep mt-8 mb-12">
            {c.compareTitle}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#A8A29E]/30">
                  <th className="py-4 pr-4 text-sm font-bold text-[#A8A29E] uppercase tracking-wider" />
                  <th className="py-4 px-4 text-sm font-bold text-[#A8A29E] break-keep">{c.compareCols[0]}</th>
                  <th className="py-4 pl-4 text-sm font-bold text-[#FF4500] break-keep">{c.compareCols[1]}</th>
                </tr>
              </thead>
              <tbody>
                {c.compareRows.map((row) => (
                  <tr key={row.label} className="border-b border-[#A8A29E]/15">
                    <td className="py-5 pr-4 text-sm font-bold text-white break-keep">{row.label}</td>
                    <td className="py-5 px-4 text-[#A8A29E] break-keep">{row.a}</td>
                    <td className="py-5 pl-4 text-white break-keep">{row.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Steps — Light */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-5xl mx-auto">
          <SectionTag variant="light">{c.stepsTag}</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--kn-dark)] leading-tight break-keep mt-8 mb-12">
            {c.stepsTitle}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {c.steps.map((step) => (
              <div
                key={step.no}
                className="bg-[var(--kn-card-light)] border border-[var(--kn-dark)]/5 rounded-[var(--radius)] p-8"
              >
                <span className="text-xs font-bold text-[#FF4500]">{step.no}</span>
                <h3 className="text-xl font-bold text-[var(--kn-dark)] mt-1 mb-2 break-keep">{step.title}</h3>
                <p className="text-[#78716C] leading-relaxed break-keep">{step.desc}</p>
                <p className="text-xs text-[#FF4500] mt-4">{step.duration}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case + Metrics — Dark */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-background">
        <div className="max-w-5xl mx-auto">
          <SectionTag variant="dark">{c.caseTag}</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep mt-8">
            {c.caseName}
          </h2>
          <div className="flex flex-wrap gap-3 mt-6">
            {c.caseResults.map((result) => (
              <span
                key={result}
                className="px-4 py-2 rounded-full text-sm font-bold text-[#FF4500] border border-[#FF4500]/30 bg-white/5"
              >
                {result}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-16 mb-10">
            <SectionTag variant="dark">{c.metricsTag}</SectionTag>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {c.metrics.map((metric) => (
              <div key={metric.label}>
                <div className="font-display font-bold text-3xl md:text-4xl gradient-warm-text">{metric.value}</div>
                <div className="text-xs text-[#A8A29E] mt-2 break-keep">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA — Light */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--kn-dark)] leading-tight break-keep">
            {c.closingTitle}
          </h2>
          <p className="text-[#78716C] mt-4 break-keep">{c.closingDesc}</p>
          <Link
            href="/contact"
            className="inline-block mt-8 gradient-warm text-white px-10 py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20"
          >
            {c.ctaPrimary}
          </Link>
        </div>
      </section>
    </main>
  )
}
