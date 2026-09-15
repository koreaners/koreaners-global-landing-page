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
  heroDefinition: string
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
  vsAfterCaption: string
  vsAfter: string[]
  stepsTitle: string
  steps: { no: string; title: string; desc: string; duration: string }[]
  resultsTitle: string
  resultsSub: string
  resultsNote: string
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
    heroDefinition:
      '한국을 여행 중인 일본 나노 인플루언서가 코리너스가 짠 코스로 브랜드 3~4곳의 매장을 방문하고, 섭외비는 브랜드가 나눠 냅니다',
    brandsLabel: '코리너스와 함께한 브랜드',
    brands: ['newmix', '감자밭', '마뗑킴', '세예의원'],
    brandsMore: '외 185개',
    ctaPrimary: '도입 문의하기',
    ctaSecondary: '성공 사례 보기',
    heroStats: [
      { value: '185개', label: '누적 참여 브랜드' },
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
      { value: '¥2.3억', label: '뉴믹스 큐텐 메가와리 매출 (2025)' },
      { value: '이세탄 1위', label: '감자밭 일본 팝업, 베이커리 부문 (2025)' },
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
    vsAfterCaption: '팔로워 3,000명 이상 일본인 인스타그램 크리에이터',
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
      {
        no: '02',
        title: '매칭',
        desc: '브랜드 3~4곳과 여정 구성. 모객과 방문 운영은 코리너스가 맡습니다',
        duration: '여정 확정 후 3일',
      },
      { no: '03', title: '콘텐츠 제작', desc: '일본어 영상 업로드·확산 (인스타그램 릴스)', duration: '방문 후 2주 내 업로드' },
    ],
    resultsTitle: '실제 협업 콘텐츠',
    resultsSub: '고감도 콘텐츠일수록 저장됩니다',
    resultsNote: '이 실적은 모두 트립브릿지 출시(2026.9) 전 코리너스 캠페인 결과입니다',
    gallery: ['뉴믹스 · F&B', '감자밭 · 팝업·리테일', '카페 · F&B', '세예의원 · 클리닉', '메디큐브 · 뷰티'],
    resultChips: [
      { value: '¥2.3억', label: '뉴믹스 큐텐 메가와리 매출 (2025)' },
      { value: '이세탄 1위', label: '감자밭 일본 팝업, 베이커리 부문 (2025)' },
      { value: '매출 150% 증가', label: '뉴믹스 점당 매출 증가' },
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
    heroDefinition:
      '韓国を旅行中の日本人ナノインフルエンサーが、KOREANERSが組んだコースでブランド3~4社の店舗を訪問し、起用費はブランドが分担して支払います',
    brandsLabel: 'KOREANERSと一緒に取り組んだブランド',
    brands: ['newmix', 'カムジャバッ', 'マタンキム', 'セイエ医院'],
    brandsMore: '他185社',
    ctaPrimary: '導入のお問い合わせ',
    ctaSecondary: '実績を見る',
    heroStats: [
      { value: '185社', label: '累計参加ブランド' },
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
      { value: '¥2.3億', label: 'ニューミックス Qoo10メガ割 売上 (2025)' },
      { value: '伊勢丹1位', label: 'カムジャバッ 日本ポップアップ、ベーカリー部門 (2025)' },
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
    vsAfterCaption: 'フォロワー3,000人以上の日本人インスタグラムクリエイター',
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
      {
        no: '02',
        title: 'マッチング',
        desc: 'ブランド3~4社と行程を構成。集客と訪問の運営はKOREANERSが担当します',
        duration: '行程確定後3日',
      },
      {
        no: '03',
        title: 'コンテンツ制作',
        desc: '日本語動画のアップロード・拡散（インスタグラムのリール）',
        duration: '訪問後2週間以内にアップロード',
      },
    ],
    resultsTitle: '実際のコラボコンテンツ',
    resultsSub: '感度の高いコンテンツほど保存されます',
    resultsNote: 'この実績はすべて、トリップブリッジ公開(2026年9月)前のKOREANERSキャンペーンの結果です',
    gallery: [
      'ニューミックス · F&B',
      'カムジャバッ · ポップアップ・リテール',
      'カフェ · F&B',
      'セイエ医院 · クリニック',
      'メディキューブ · ビューティー',
    ],
    resultChips: [
      { value: '¥2.3億', label: 'ニューミックス Qoo10メガ割 売上 (2025)' },
      { value: '伊勢丹1位', label: 'カムジャバッ 日本ポップアップ、ベーカリー部門 (2025)' },
      { value: '売上150%増加', label: 'ニューミックス 店舗あたり売上の増加' },
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
// utm-tracking.ts 가 URL 파라미터를 first-touch 로 저장하고 footer-cta 문의에 실어 보낸다.
const CTA_PRIMARY_HREF = '/contact?utm_source=tripbridge&utm_medium=landing'
// process-timeline.tsx 의 도트 + 연결선 어휘 (라이트 섹션 색으로만 치환).
const TL_DOT = 'w-2.5 h-2.5 rounded-full bg-[#FF4500] shrink-0'
const TL_LINE_H = 'h-px flex-1 bg-gradient-to-r from-[#FF4500]/50 to-[var(--kn-dark)]/10'
const TL_LINE_V = 'w-px flex-1 bg-gradient-to-b from-[#FF4500]/50 to-[var(--kn-dark)]/10 mt-1'
const TL_INDEX = 'text-xs text-[#78716C]'

export default function TripbridgeContent() {
  const { locale } = useLocale()
  const c = COPY[locale]

  const coreItems = [
    {
      no: '01',
      label: c.costFrom.label,
      body: (
        <div className="font-display font-bold text-5xl text-[var(--kn-dark)]">
          {c.costFrom.value}
          <span className="text-2xl">{c.costFrom.unit}</span>
        </div>
      ),
    },
    {
      no: '02',
      label: c.costSplit.label,
      body: (
        <div className="text-2xl md:text-3xl font-bold text-[var(--kn-dark)] break-keep">{c.costSplit.caption}</div>
      ),
    },
    {
      no: '03',
      label: c.costResult.label,
      body: (
        <>
          <div className="font-display font-bold text-5xl text-[#FF4500]">
            {c.costResult.value}
            <span className="text-2xl">{c.costResult.unit}</span>
          </div>
          <div className="text-sm font-bold text-[var(--kn-dark)] mt-2">{c.costResult.sub}</div>
          <div className="text-sm font-bold text-[var(--kn-dark)] mt-1 break-keep">{c.costResult.note}</div>
        </>
      ),
    },
  ]

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
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep">{c.heroDefinition}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8">
            <span className="text-xs text-[#A8A29E] mr-1">{c.brandsLabel}</span>
            {c.brands.map((brand) => (
              <span key={brand} className="text-xs uppercase tracking-wider text-[#A8A29E]">
                {brand}
              </span>
            ))}
            <span className="text-xs text-[#A8A29E]">{c.brandsMore}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-10">
            <Link href={CTA_PRIMARY_HREF} className={BTN_PRIMARY}>
              {c.ctaPrimary}
            </Link>
            <Link
              href="#proof"
              className="text-sm uppercase tracking-wider font-bold text-[var(--kn-light)] border-b border-[var(--kn-light)]/30 hover:border-[#FF4500] hover:text-[#FF4500] pb-1 transition-colors duration-300 self-start sm:self-auto"
            >
              {c.ctaSecondary} →
            </Link>
          </div>

          <div className="mt-16 max-w-xl">
            <div className="grid grid-cols-1 gap-8">
              {c.heroStats.map((stat, index) => (
                <div key={stat.label} className={index < c.heroStats.length - 1 ? 'border-r border-white/10' : ''}>
                  <div className="font-display font-bold text-4xl sm:text-5xl gradient-warm-text leading-none whitespace-nowrap">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#A8A29E] mt-3 break-keep">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#A8A29E] mt-4 break-keep">{c.resultsNote}</p>
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
            <span className="gradient-warm-text whitespace-nowrap">{c.coreTitle2}</span>
          </h2>

          <p className="text-lg text-[#78716C] max-w-2xl mt-4 leading-relaxed break-keep">
            {c.coreNote1}
            <br />
            {c.coreNote2}
          </p>

          {/* Desktop: horizontal timeline */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 mt-16">
            {coreItems.map((item, i) => (
              <div key={item.no} className="relative">
                <div className="flex items-center mb-6">
                  <span className={TL_DOT} />
                  {i < coreItems.length - 1 && <span className={TL_LINE_H} />}
                </div>
                <div className={`${TL_INDEX} mb-3`}>{item.no}</div>
                <div className="text-xs text-[#78716C] mb-2 break-keep">{item.label}</div>
                {item.body}
              </div>
            ))}
          </div>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden mt-12 space-y-6">
            {coreItems.map((item, i) => (
              <div key={item.no} className="flex gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <span className={TL_DOT} />
                  {i < coreItems.length - 1 && <span className={TL_LINE_V} />}
                </div>
                <div className="pb-2">
                  <div className={`${TL_INDEX} mb-2`}>{item.no}</div>
                  <div className="text-xs text-[#78716C] mb-2 break-keep">{item.label}</div>
                  {item.body}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-12 mt-12">
            {c.proofChips.map((chip) => (
              <div key={chip.label} className="flex items-end gap-2">
                <div className="font-display font-bold text-3xl gradient-warm-text leading-none">{chip.value}</div>
                <div className="text-sm text-[#78716C] break-keep">{chip.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#78716C] mt-3 break-keep">{c.resultsNote}</p>
        </div>
      </section>

      {/* Before vs TripBridge — Dark */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">BEFORE VS TRIPBRIDGE</SectionTag>
          <h2 className={`${H2_DARK} max-w-3xl mt-8`}>{c.vsTitle}</h2>

          <div className="grid md:grid-cols-[1fr_2fr] gap-6 mt-16">
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

            <div className={`${CARD_DARK} hover:border-[#FF4500]/60`}>
              <div className="w-12 h-12 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-7 h-7 text-[#FF4500]/70" />
              </div>
              <h3 className="text-xl font-bold text-[#FF4500] break-keep">{c.vsAfterTitle}</h3>
              <p className="text-xs text-[#A8A29E] mt-1 mb-6 break-keep">{c.vsAfterCaption}</p>
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

          {/* Desktop: horizontal timeline */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 mt-16">
            {c.steps.map((step, i) => (
              <div key={step.no} className="relative">
                <div className="flex items-center mb-6">
                  <span className={TL_DOT} />
                  {i < c.steps.length - 1 && <span className={TL_LINE_H} />}
                </div>
                <div className="font-display font-bold text-5xl text-[#FF4500] mb-4">{step.no}</div>
                <h3 className="text-lg font-bold text-[var(--kn-dark)] mb-2 break-keep">{step.title}</h3>
                <p className="text-sm text-[#78716C] leading-relaxed break-keep">{step.desc}</p>
                <div className="text-xs text-[#78716C] mt-2 break-keep">{step.duration}</div>
              </div>
            ))}
          </div>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden mt-12 space-y-6">
            {c.steps.map((step, i) => (
              <div key={step.no} className="flex gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <span className={TL_DOT} />
                  {i < c.steps.length - 1 && <span className={TL_LINE_V} />}
                </div>
                <div className="pb-2">
                  <div className="font-display font-bold text-3xl text-[#FF4500] leading-none mb-2">{step.no}</div>
                  <h3 className="text-lg font-bold text-[var(--kn-dark)] mb-1 break-keep">{step.title}</h3>
                  <p className="text-sm text-[#78716C] leading-relaxed break-keep">{step.desc}</p>
                  <div className="text-xs text-[#78716C] mt-2 break-keep">{step.duration}</div>
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
          <p className="text-sm text-[#A8A29E] max-w-2xl mt-2 leading-relaxed break-keep">{c.resultsNote}</p>

          <div className="flex gap-2 flex-wrap mt-10">
            {c.gallery.map((label) => (
              <span key={label} className={PILL}>
                {label}
              </span>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mt-10">
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
            <Link href={CTA_PRIMARY_HREF} className={BTN_PRIMARY}>
              {c.ctaPrimary}
            </Link>
          </div>
          <p className="text-xs text-[#A8A29E] mt-4 break-keep">{c.closingNote}</p>
        </div>
      </section>
    </main>
  )
}
