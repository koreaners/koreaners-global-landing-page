'use client'

import Link from 'next/link'
import Navigation from '@/components/navigation'
import { SectionTag } from '@/components/ui/section-tag'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/contexts/locale-context'

type Stat = { value: string; label: string }

type Copy = {
  heroTag: string
  heroTitle1: string
  heroTitle2: string
  heroSub: string
  heroLead: string
  brandsLabel: string
  brands: string[]
  brandsMore: string
  ctaPrimary: string
  ctaSecondary: string
  heroStats: Stat[]
  coreTitle1: string
  coreTitle2: string
  costFrom: { label: string; value: string; unit: string }
  costSplit: { label: string; caption: string }
  costResult: { label: string; value: string; unit: string; sub: string; note: string }
  coreNote1: string
  coreNote2: string
  proofChips: Stat[]
  vsTitle: string
  vsBeforeTitle: string
  vsBefore: string[]
  vsAfterTitle: string
  vsAfter: string[]
  stepsTitle: string
  steps: { no: string; title: string; desc: string; duration: string }[]
  resultsTitle: string
  resultsSub: string
  gallery: string[]
  resultChips: Stat[]
  closingTitle1: string
  closingTitle2: string
  closingDesc: string
  closingNote: string
}

// 한국어 문자열은 기존 /tripbridge 번들에서 추출한 원문 그대로 사용한다.
const COPY: Record<Locale, Copy> = {
  ko: {
    heroTag: '트립브릿지 by KOREANERS',
    heroTitle1: '브랜드 부담,',
    heroTitle2: '87% 줄었습니다',
    heroSub: '나노 인플루언서 여러 명이 한 매장에 방문한다면?',
    heroLead: '비용은 나누고, 노출은 커집니다',
    brandsLabel: '함께한 브랜드',
    brands: ['newmix', '감자밭', '마땡킴', '세예의원'],
    brandsMore: '외 200개+',
    ctaPrimary: '도입 문의하기',
    ctaSecondary: '성공 사례 보기',
    heroStats: [
      { value: '200개+', label: '누적 참여 브랜드' },
      { value: '1,600편', label: '업로드 영상' },
    ],
    coreTitle1: '같은 섭외, 더 많은 브랜드,',
    coreTitle2: '더 낮은 비용',
    costFrom: { label: '인플루언서 1인 섭외', value: '150', unit: '만원' },
    costSplit: { label: '3~4개 브랜드가 분담', caption: 'N분의 1씩 나눠서' },
    costResult: {
      label: '브랜드 부담 비용',
      value: '87',
      unit: '%',
      sub: '감소',
      note: '약 20만원 / 영상 1편당',
    },
    coreNote1: '인플루언서는 이미 자신의 일정으로 한국을 여행 중이라,',
    coreNote2: '항공권·숙박비 없이 섭외비만 분담하면 됩니다',
    proofChips: [
      { value: '¥2.3억', label: '뉴믹스 일본 매출' },
      { value: '이세탄 1위', label: '감자밭 팝업' },
    ],
    vsTitle: '무엇이 다른가요?',
    vsBeforeTitle: '기존 매크로 인플루언서',
    vsBefore: [
      '섭외비 150만원 이상 전액 부담',
      '영상 1편, 커뮤니티 1곳',
      '광고로 읽히는 단일 노출',
      '항공·숙박비까지 브랜드 지출',
      '소규모 브랜드는 진입 어려움',
    ],
    vsAfterTitle: '트립브릿지 나노 인플루언서',
    vsAfter: [
      '비용 3~4개 브랜드와 분담, 약 20만원',
      '영상 10편+, 10개 커뮤니티 분산 노출',
      '여행 콘텐츠로 자연스럽게 소비',
      '인플루언서 이미 자비로 방한 중',
      '소규모 브랜드도 즉시 시작 가능',
    ],
    stepsTitle: '단 3단계',
    steps: [
      { no: '01', title: '섭외', desc: '나노 인플루언서 선별·매칭', duration: '1주 이내' },
      { no: '02', title: '매칭', desc: '브랜드 3~4곳과 여정 구성', duration: '여정 확정 후 3일' },
      { no: '03', title: '콘텐츠 제작', desc: '일본어 영상 업로드·확산', duration: '방문 후 2주 내 업로드' },
    ],
    resultsTitle: '실제 협업 콘텐츠',
    resultsSub: '고감도 콘텐츠일수록 저장됩니다',
    gallery: ['뉴믹스 · F&B', '감자밭 · 팝업·리테일', '카페 · F&B', '세예의원 · 클리닉', '메디큐브 · 뷰티'],
    resultChips: [
      { value: '¥2.3억', label: '뉴믹스 매출 실적' },
      { value: '이세탄 1위', label: '감자밭 베이커리' },
      { value: '858건', label: '세예의원 저장수' },
      { value: '매출 150% 증가', label: '점당 매출' },
    ],
    closingTitle1: '약 20만원으로',
    closingTitle2: '일본 시장에 노출하세요',
    closingDesc: '트립브릿지는 매달 새로운 브랜드와 함께 커집니다',
    closingNote: '영업일 기준 24시간 내 담당자가 연락드립니다',
  },
  ja: {
    heroTag: 'トリップブリッジ by KOREANERS',
    heroTitle1: 'ブランドの負担、',
    heroTitle2: '87%減りました',
    heroSub: 'ナノインフルエンサーが複数人、一つの店舗を訪れたら？',
    heroLead: '費用は分け合い、露出は広がります',
    brandsLabel: '一緒に取り組んだブランド',
    brands: ['newmix', 'カムジャバッ', 'マテンキム', 'セイエ医院'],
    brandsMore: '他200社+',
    ctaPrimary: '導入のお問い合わせ',
    ctaSecondary: '実績を見る',
    heroStats: [
      { value: '200社+', label: '累計参加ブランド' },
      { value: '1,600本', label: 'アップロード動画' },
    ],
    coreTitle1: '同じ起用で、より多くのブランドへ、',
    coreTitle2: 'より低い費用',
    costFrom: { label: 'インフルエンサー1人の起用', value: '150', unit: '万ウォン' },
    costSplit: { label: '3~4社のブランドで分担', caption: 'N分の1ずつ分けて' },
    costResult: {
      label: 'ブランド負担費用',
      value: '87',
      unit: '%',
      sub: '減少',
      note: '約20万ウォン / 動画1本あたり',
    },
    coreNote1: 'インフルエンサーはすでに自分の予定で韓国を旅行中のため、',
    coreNote2: '航空券・宿泊費なしで起用費だけ分担すれば済みます',
    proofChips: [
      { value: '¥2.3億', label: 'ニューミックス日本売上' },
      { value: '伊勢丹1位', label: 'カムジャバッ ポップアップ' },
    ],
    vsTitle: '何が違うのですか？',
    vsBeforeTitle: '従来のマクロインフルエンサー',
    vsBefore: [
      '起用費150万ウォン以上を全額負担',
      '動画1本、コミュニティ1か所',
      '広告と受け取られる単発の露出',
      '航空・宿泊費までブランドの支出',
      '小規模ブランドは参入が困難',
    ],
    vsAfterTitle: 'トリップブリッジ ナノインフルエンサー',
    vsAfter: [
      '費用は3~4社のブランドで分担、約20万ウォン',
      '動画10本+、10のコミュニティに分散露出',
      '旅行コンテンツとして自然に消費',
      'インフルエンサーはすでに自費で訪韓中',
      '小規模ブランドもすぐに開始可能',
    ],
    stepsTitle: 'たった3ステップ',
    steps: [
      { no: '01', title: '起用', desc: 'ナノインフルエンサーの選定・マッチング', duration: '1週間以内' },
      { no: '02', title: 'マッチング', desc: 'ブランド3~4社と行程を構成', duration: '行程確定後3日' },
      { no: '03', title: 'コンテンツ制作', desc: '日本語動画のアップロード・拡散', duration: '訪問後2週間以内にアップロード' },
    ],
    resultsTitle: '実際のコラボコンテンツ',
    resultsSub: '感度の高いコンテンツほど保存されます',
    gallery: [
      'ニューミックス · F&B',
      'カムジャバッ · ポップアップ・リテール',
      'カフェ · F&B',
      'セイエ医院 · クリニック',
      'メディキューブ · ビューティー',
    ],
    resultChips: [
      { value: '¥2.3億', label: 'ニューミックス売上実績' },
      { value: '伊勢丹1位', label: 'カムジャバッ ベーカリー' },
      { value: '858件', label: 'セイエ医院の保存数' },
      { value: '売上150%増加', label: '店舗あたり売上' },
    ],
    closingTitle1: '約20万ウォンで',
    closingTitle2: '日本市場に露出しましょう',
    closingDesc: 'トリップブリッジは毎月新しいブランドとともに成長します',
    closingNote: '営業日基準24時間以内に担当者からご連絡します',
  },
}

// service-content.tsx 의 클래스만 사용한다 (섹션 리듬·태그·h2·카드·스탯·아이콘).
const H2_DARK = 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight break-keep'
const H2_LIGHT = 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--kn-dark)] leading-tight break-keep'
const CARD_DARK =
  'bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/40 transition-all duration-300'
const CARD_LIGHT =
  'bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 p-8 hover:border-[#FF4500]/40 transition-all duration-300'
const PILL = 'px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold break-keep'
const BTN_PRIMARY =
  'inline-block gradient-warm text-white px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 text-center'

export default function TripbridgeContent() {
  const { locale } = useLocale()
  const c = COPY[locale]

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* Hero — Dark */}
      <section className="pt-32 sm:pt-40 pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 bg-background hero-glow">
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionTag variant="dark">{c.heroTag}</SectionTag>
          <h1 className="heading-kr text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight break-keep max-w-4xl mt-8">
            <span>{c.heroTitle1}</span>{' '}
            <span className="gradient-warm-text">{c.heroTitle2}</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#A8A29E] font-bold max-w-2xl mt-6 break-keep">{c.heroSub}</p>
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep">{c.heroLead}</p>

          <div className="flex flex-wrap items-center gap-2 mt-8">
            <span className="text-xs text-[#A8A29E] mr-1">{c.brandsLabel}</span>
            {c.brands.map((brand) => (
              <span key={brand} className={PILL}>
                {brand}
              </span>
            ))}
            <span className="text-xs text-[#A8A29E]">{c.brandsMore}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-10">
            <Link href="/contact" className={BTN_PRIMARY}>
              {c.ctaPrimary}
            </Link>
            <Link
              href="/portfolio"
              className="text-sm uppercase tracking-wider font-bold text-[var(--kn-light)] border-b border-[var(--kn-light)]/30 hover:border-[#FF4500] hover:text-[#FF4500] pb-1 transition-colors duration-300 self-start sm:self-auto"
            >
              {c.ctaSecondary} →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-16 max-w-xl">
            {c.heroStats.map((stat, index) => (
              <div key={stat.label} className={index < c.heroStats.length - 1 ? 'border-r border-white/10' : ''}>
                <div className="font-display font-bold text-4xl sm:text-5xl gradient-warm-text leading-none whitespace-nowrap">
                  {stat.value}
                </div>
                <div className="text-sm text-[#A8A29E] mt-3 break-keep">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core value — Light */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <SectionTag variant="light">CORE VALUE</SectionTag>
            <div className="h-px flex-1 bg-[var(--kn-dark)]/10" />
          </div>

          <h2 className={`${H2_LIGHT} max-w-3xl`}>
            <span>{c.coreTitle1}</span>{' '}
            <span className="gradient-warm-text">{c.coreTitle2}</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className={CARD_LIGHT}>
              <div className="text-xs text-[#78716C] mb-2 break-keep">{c.costFrom.label}</div>
              <div className="font-display font-bold text-5xl text-[var(--kn-dark)]">
                {c.costFrom.value}
                <span className="text-2xl">{c.costFrom.unit}</span>
              </div>
            </div>

            <div className={CARD_LIGHT}>
              <div className="text-xs text-[#78716C] mb-2 break-keep">{c.costSplit.label}</div>
              <div className="text-2xl md:text-3xl font-bold text-[var(--kn-dark)] break-keep">{c.costSplit.caption}</div>
            </div>

            <div className={CARD_LIGHT}>
              <div className="text-xs text-[#78716C] mb-2 break-keep">{c.costResult.label}</div>
              <div className="font-display font-bold text-5xl text-[#FF4500]">
                {c.costResult.value}
                <span className="text-2xl">{c.costResult.unit}</span>
              </div>
              <div className="text-sm font-bold text-[var(--kn-dark)] mt-2">{c.costResult.sub}</div>
              <div className="text-xs text-[#78716C] mt-1 break-keep">{c.costResult.note}</div>
            </div>
          </div>

          <p className="text-lg text-[#78716C] max-w-2xl mt-12 leading-relaxed break-keep">
            {c.coreNote1}
            <br />
            {c.coreNote2}
          </p>

          <div className="grid sm:grid-cols-2 gap-3 max-w-xl mt-8">
            {c.proofChips.map((chip) => (
              <div key={chip.label} className="p-4 rounded-[var(--radius-sm)] bg-[var(--kn-card-light)] border border-[#FF4500]/20">
                <div className="text-xs text-[#78716C] mb-1 break-keep">{chip.label}</div>
                <div className="font-display font-bold text-3xl gradient-warm-text">{chip.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs TripBridge — Dark */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">BEFORE VS TRIPBRIDGE</SectionTag>
          <h2 className={`${H2_DARK} max-w-3xl mt-8`}>{c.vsTitle}</h2>

          <div className="grid md:grid-cols-2 gap-6 mt-16">
            <div className={CARD_DARK}>
              <div className="w-12 h-12 flex items-center justify-center mb-6">
                <XCircle className="w-7 h-7 text-[#A8A29E]/70" />
              </div>
              <h3 className="text-xl font-bold text-[#A8A29E] mb-6 break-keep">{c.vsBeforeTitle}</h3>
              <div className="space-y-4">
                {c.vsBefore.map((text) => (
                  <div key={text} className="flex gap-4">
                    <XCircle className="w-5 h-5 text-[#A8A29E]/50 flex-shrink-0 mt-0.5" />
                    <p className="text-[#A8A29E] leading-relaxed break-keep">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={CARD_DARK}>
              <div className="w-12 h-12 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-7 h-7 text-[#FF4500]/70" />
              </div>
              <h3 className="text-xl font-bold text-[#FF4500] mb-6 break-keep">{c.vsAfterTitle}</h3>
              <div className="space-y-4">
                {c.vsAfter.map((text) => (
                  <div key={text} className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-[#FF4500]/70 flex-shrink-0 mt-0.5" />
                    <p className="text-white leading-relaxed break-keep">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — Light */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <SectionTag variant="light">HOW IT WORKS</SectionTag>
            <div className="h-px flex-1 bg-[var(--kn-dark)]/10" />
          </div>

          <h2 className={`${H2_LIGHT} max-w-3xl`}>{c.stepsTitle}</h2>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {c.steps.map((step) => (
              <div key={step.no} className={CARD_LIGHT}>
                <div className="text-xs text-[#78716C] mb-2">{step.no}</div>
                <h3 className="text-xl font-bold text-[var(--kn-dark)] mb-3 break-keep">{step.title}</h3>
                <p className="text-[#78716C] leading-relaxed break-keep">{step.desc}</p>
                <div className="mt-6">
                  <span className={PILL}>{step.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real results — Dark */}
      <section id="proof" className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">REAL RESULTS</SectionTag>
          <h2 className={`${H2_DARK} max-w-3xl mt-8`}>{c.resultsTitle}</h2>
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep">{c.resultsSub}</p>

          <div className="flex gap-2 flex-wrap mt-10">
            {c.gallery.map((label) => (
              <span key={label} className={PILL}>
                {label}
              </span>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {c.resultChips.map((chip) => (
              <div key={chip.label} className={CARD_DARK}>
                <div className="text-xs text-[#A8A29E] mb-2 break-keep">{chip.label}</div>
                <div className="font-display font-bold text-3xl md:text-4xl text-[#FF4500] break-keep">{chip.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get started — Dark */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">GET STARTED</SectionTag>
          <h2 className={`${H2_DARK} max-w-4xl mt-8`}>
            <span>{c.closingTitle1}</span>{' '}
            <span className="gradient-warm-text">{c.closingTitle2}</span>
          </h2>
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep">{c.closingDesc}</p>
          <div className="mt-10">
            <Link href="/contact" className={BTN_PRIMARY}>
              {c.ctaPrimary}
            </Link>
          </div>
          <p className="text-xs text-[#A8A29E] mt-4 break-keep">{c.closingNote}</p>
        </div>
      </section>
    </main>
  )
}
