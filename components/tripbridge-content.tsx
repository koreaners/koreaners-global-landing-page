'use client'

import Link from 'next/link'
import Navigation from '@/components/navigation'
import { SectionTag } from '@/components/ui/section-tag'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/contexts/locale-context'

type Bullet = { icon: string; text: string }
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
  proofChips: { icon: string; value: string; label: string }[]
  vsTitle: string
  vsBeforeTitle: string
  vsBefore: Bullet[]
  vsAfterTitle: string
  vsAfter: Bullet[]
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

// 브랜드 칩 배경색은 원본 번들 값 그대로 (로케일 무관).
const BRAND_BG = ['#7C2D12', '#78350F', '#14532D', '#3B0764']
const SPLIT_ICONS = ['🍽️', '👗', '💄', '🏥']

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
      { icon: '💴', value: '¥2.3억', label: '뉴믹스 일본 매출' },
      { icon: '🏆', value: '이세탄 1위', label: '감자밭 팝업' },
    ],
    vsTitle: '무엇이 다른가요?',
    vsBeforeTitle: '기존 매크로 인플루언서',
    vsBefore: [
      { icon: '💸', text: '섭외비 150만원 이상 전액 부담' },
      { icon: '🎥', text: '영상 1편, 커뮤니티 1곳' },
      { icon: '📢', text: '광고로 읽히는 단일 노출' },
      { icon: '✈️', text: '항공·숙박비까지 브랜드 지출' },
      { icon: '📉', text: '소규모 브랜드는 진입 어려움' },
    ],
    vsAfterTitle: '트립브릿지 나노 인플루언서',
    vsAfter: [
      { icon: '🤝', text: '비용 3~4개 브랜드와 분담, 약 20만원' },
      { icon: '📱', text: '영상 10편+, 10개 커뮤니티 분산 노출' },
      { icon: '🌊', text: '여행 콘텐츠로 자연스럽게 소비' },
      { icon: '🎒', text: '인플루언서 이미 자비로 방한 중' },
      { icon: '🚀', text: '소규모 브랜드도 즉시 시작 가능' },
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
      { icon: '💴', value: '¥2.3億', label: 'ニューミックス日本売上' },
      { icon: '🏆', value: '伊勢丹1位', label: 'カムジャバッ ポップアップ' },
    ],
    vsTitle: '何が違うのですか？',
    vsBeforeTitle: '従来のマクロインフルエンサー',
    vsBefore: [
      { icon: '💸', text: '起用費150万ウォン以上を全額負担' },
      { icon: '🎥', text: '動画1本、コミュニティ1か所' },
      { icon: '📢', text: '広告と受け取られる単発の露出' },
      { icon: '✈️', text: '航空・宿泊費までブランドの支出' },
      { icon: '📉', text: '小規模ブランドは参入が困難' },
    ],
    vsAfterTitle: 'トリップブリッジ ナノインフルエンサー',
    vsAfter: [
      { icon: '🤝', text: '費用は3~4社のブランドで分担、約20万ウォン' },
      { icon: '📱', text: '動画10本+、10のコミュニティに分散露出' },
      { icon: '🌊', text: '旅行コンテンツとして自然に消費' },
      { icon: '🎒', text: 'インフルエンサーはすでに自費で訪韓中' },
      { icon: '🚀', text: '小規模ブランドもすぐに開始可能' },
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

function Arrow() {
  return (
    <div className="flex items-center justify-center py-2 md:py-0 md:px-1 text-[#A8A29E]" aria-hidden>
      <span className="hidden md:inline text-2xl leading-none">&rarr;</span>
      <span className="md:hidden text-2xl leading-none">&darr;</span>
    </div>
  )
}

export default function TripbridgeContent() {
  const { locale } = useLocale()
  const c = COPY[locale]

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* Hero — Dark */}
      <section className="pt-32 sm:pt-40 pb-20 md:pb-28 px-6 lg:px-24 bg-background hero-glow">
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionTag variant="dark">{c.heroTag}</SectionTag>
          <h1 className="heading-kr text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight break-keep mt-8">
            {c.heroTitle1}
            <br />
            <span className="gradient-warm-text">{c.heroTitle2}</span>
          </h1>
          <p className="text-xl md:text-2xl font-bold text-white max-w-2xl mt-6 leading-relaxed break-keep">
            {c.heroSub}
          </p>
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep">{c.heroLead}</p>

          <div className="flex flex-wrap items-center gap-2 mt-8">
            <span className="text-xs text-[#A8A29E]">{c.brandsLabel}</span>
            {c.brands.map((brand, i) => (
              <span
                key={brand}
                className="px-2.5 py-1 rounded text-xs font-bold text-white"
                style={{ background: BRAND_BG[i] }}
              >
                {brand}
              </span>
            ))}
            <span className="text-xs text-[#A8A29E]">{c.brandsMore}</span>
          </div>

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

          <div className="flex gap-10 pt-8 mt-12 border-t border-white/10">
            {c.heroStats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display font-bold text-2xl md:text-3xl text-white">{stat.value}</div>
                <div className="text-xs text-[#A8A29E] mt-1 break-keep">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core value — Dark */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-background border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <SectionTag variant="dark">CORE VALUE</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep mt-6 mb-12">
            {c.coreTitle1}
            <br />
            {c.coreTitle2}
          </h2>

          <div className="flex flex-col md:flex-row md:items-stretch gap-2">
            <div className="flex-1 rounded-[var(--radius)] p-7 bg-white/5 border border-white/10">
              <p className="text-xs text-[#A8A29E] mb-3 break-keep">{c.costFrom.label}</p>
              <p className="font-display font-bold text-4xl md:text-5xl text-white">
                {c.costFrom.value}
                <span className="text-2xl font-bold">{c.costFrom.unit}</span>
              </p>
            </div>

            <Arrow />

            <div className="flex-1 rounded-[var(--radius)] p-7 bg-white/5 border border-white/10">
              <p className="text-xs text-[#A8A29E] mb-3 break-keep">{c.costSplit.label}</p>
              <div className="flex items-center justify-center gap-2 text-2xl" aria-hidden>
                {SPLIT_ICONS.map((icon) => (
                  <span key={icon}>{icon}</span>
                ))}
              </div>
              <p className="text-sm text-white mt-3 break-keep">{c.costSplit.caption}</p>
            </div>

            <Arrow />

            <div className="flex-1 rounded-[var(--radius)] p-7 gradient-warm shadow-lg shadow-[#FF4500]/20">
              <p className="text-xs font-bold text-white/70 mb-1 break-keep">{c.costResult.label}</p>
              <div className="font-display font-bold text-6xl md:text-7xl text-white leading-none">
                {c.costResult.value}
                <span className="text-[0.42em]">{c.costResult.unit}</span>
              </div>
              <p className="font-bold text-sm text-white/90 mt-1">{c.costResult.sub}</p>
              <p className="text-xs text-white/70 mt-1 break-keep">{c.costResult.note}</p>
            </div>
          </div>

          <p className="text-[#A8A29E] leading-relaxed break-keep mt-10">
            {c.coreNote1}
            <br />
            {c.coreNote2}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {c.proofChips.map((chip) => (
              <div
                key={chip.label}
                className="px-4 py-2 rounded-full flex items-center gap-2 bg-white/5 border border-white/10"
              >
                <span aria-hidden>{chip.icon}</span>
                <span className="text-sm font-bold text-[#FF4500]">{chip.value}</span>
                <span className="text-xs text-[#A8A29E] break-keep">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs TripBridge — Light */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-5xl mx-auto">
          <SectionTag variant="light">BEFORE VS TRIPBRIDGE</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--kn-dark)] leading-tight break-keep mt-6 mb-10">
            {c.vsTitle}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-[var(--radius)] p-8 bg-[#E8E2DA] border border-[var(--kn-dark)]/5">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full bg-[#C9C3BB] text-white text-xs flex items-center justify-center">
                  ✕
                </span>
                <span className="font-bold text-[var(--kn-dark)]/70 break-keep">{c.vsBeforeTitle}</span>
              </div>
              <ul className="space-y-3">
                {c.vsBefore.map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-[#78716C] break-keep">
                    <span aria-hidden>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[var(--radius)] p-8 bg-[var(--kn-card-light)] border-2 border-[#FF4500]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full gradient-warm text-white text-xs flex items-center justify-center">
                  ✓
                </span>
                <span className="font-bold text-[var(--kn-dark)] break-keep">{c.vsAfterTitle}</span>
              </div>
              <ul className="space-y-3">
                {c.vsAfter.map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-[var(--kn-dark)] break-keep">
                    <span aria-hidden>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — Light */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-[var(--kn-light)] border-t border-[var(--kn-dark)]/10">
        <div className="max-w-5xl mx-auto">
          <SectionTag variant="light">HOW IT WORKS</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--kn-dark)] leading-tight break-keep mt-6 mb-12">
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
                <span className="inline-block text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 rounded-full px-2.5 py-1 mt-4 break-keep">
                  {step.duration}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real results — Dark */}
      <section id="proof" className="py-16 md:py-24 px-6 lg:px-24 bg-background">
        <div className="max-w-5xl mx-auto">
          <SectionTag variant="dark">REAL RESULTS</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep mt-6">
            {c.resultsTitle}
          </h2>
          <p className="text-sm text-[#A8A29E] mt-2 break-keep">{c.resultsSub}</p>

          <div className="flex flex-wrap gap-3 mt-10">
            {c.gallery.map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-white/5 border border-white/10 break-keep"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-10">
            {c.resultChips.map((chip) => (
              <div
                key={chip.label}
                className="px-4 py-2 rounded-full flex items-center gap-1.5 bg-white/5 border border-white/10"
              >
                <span className="text-sm font-bold text-[#FF4500]">{chip.value}</span>
                <span className="text-xs text-[#A8A29E] break-keep">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get started — Dark */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-background border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <SectionTag variant="dark">GET STARTED</SectionTag>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep mt-6">
            {c.closingTitle1}
            <br />
            {c.closingTitle2}
          </h2>
          <p className="text-[#A8A29E] mt-4 break-keep">{c.closingDesc}</p>
          <Link
            href="/contact"
            className="inline-block mt-8 gradient-warm text-white px-10 py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20"
          >
            {c.ctaPrimary}
          </Link>
          <p className="text-xs text-[#A8A29E] mt-4 break-keep">{c.closingNote}</p>
        </div>
      </section>
    </main>
  )
}
