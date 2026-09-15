'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import Navigation from '@/components/navigation'
import { SectionTag } from '@/components/ui/section-tag'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TripbridgeCreatorForm } from '@/components/tripbridge-creator-form'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

type Copy = {
  heroTitle: string
  heroSub: string
  cta: string
  benefitsTag: string
  benefits: { title: string; desc: string }[]
  stepsTag: string
  steps: { no: string; title: string }[]
  notes: string[]
  registerHeading: string
}

const COPY: Record<Locale, Copy> = {
  ja: {
    heroTitle: '韓国旅行コース、全部無料。リールを投稿すれば原稿料も',
    heroSub:
      '9〜10月に韓国を訪れる、または韓国在住の日本人Instagramクリエイターを募集しています',
    cta: '体験団プールに登録する',
    benefitsTag: 'BENEFITS',
    benefits: [
      {
        title: 'コース全額無料',
        desc: 'グルメ・カフェ・ビューティークリニック・アクセサリーのコースが全額無料。',
      },
      {
        title: '現地運営はおまかせ',
        desc: '予約も動線も現地ケアもKOREANERSが担当、あなたは撮影だけ。',
      },
      {
        title: 'フォロワー3,000人から',
        desc: 'フォロワー3,000人から応募OK、リール投稿で原稿料も。',
      },
    ],
    stepsTag: 'STEPS',
    steps: [
      { no: '01', title: '登録' },
      { no: '02', title: '1営業日以内にDMまたはメールでご連絡' },
      { no: '03', title: '訪韓日程に合わせてコースをマッチング' },
    ],
    notes: [
      '原稿料の金額とクリニックの内容はマッチング後に個別にご案内',
      '掲載言語は日本語、20〜39歳のクリエイターが対象',
      '施術の紹介はありません（ビューティークリニック体験の範囲）',
    ],
    registerHeading: '体験団プール登録',
  },
  ko: {
    heroTitle: '한국 여행 코스, 전부 무료. 릴스 올리면 원고료까지',
    heroSub:
      '9~10월에 한국을 방문하거나 한국에 거주 중인 일본인 Instagram 크리에이터를 모집합니다',
    cta: '체험단 풀에 등록하기',
    benefitsTag: 'BENEFITS',
    benefits: [
      {
        title: '코스 전액 무료',
        desc: '맛집, 카페, 뷰티 클리닉, 액세서리 코스가 전액 무료입니다.',
      },
      {
        title: '현지 운영은 코리너스가',
        desc: '예약도 동선도 현지 케어도 코리너스가 맡고, 크리에이터는 촬영만 합니다.',
      },
      {
        title: '팔로워 3,000명부터',
        desc: '팔로워 3,000명부터 지원할 수 있고, 릴스를 올리면 원고료도 드립니다.',
      },
    ],
    stepsTag: 'STEPS',
    steps: [
      { no: '01', title: '등록' },
      { no: '02', title: '1영업일 이내에 DM 또는 이메일로 연락' },
      { no: '03', title: '방한 일정에 맞춰 코스 매칭' },
    ],
    notes: [
      '원고료 금액과 클리닉 내용은 매칭 후 개별 안내',
      '게시 언어는 일본어, 20~39세 크리에이터 대상',
      '시술 소개는 없습니다 (뷰티 클리닉 체험 범위)',
    ],
    registerHeading: '체험단 풀 등록',
  },
}

export default function TripbridgeCreatorContent() {
  const { locale, setLocale } = useLocale()
  const c = COPY[locale]
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const registerRef = useRef<HTMLElement>(null)
  const [registerVisible, setRegisterVisible] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  // 광고 유입은 일본어가 기본. 사용자가 고른 적 없을 때만 ja로 한 번 맞춘다.
  useEffect(() => {
    try {
      if (localStorage.getItem('koreaners-locale') === null) setLocale('ja')
    } catch {
      // ignore
    }
  }, [setLocale])

  useEffect(() => {
    const el = registerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setRegisterVisible(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden pb-24 md:pb-0">
      <Navigation />

      {/* Hero — Dark */}
      <section className="pt-32 sm:pt-40 pb-16 md:pb-24 px-6 lg:px-24 bg-background hero-glow">
        <div className="max-w-3xl mx-auto relative z-10">
          <SectionTag variant="dark">TRIPBRIDGE</SectionTag>
          <h1 className="heading-kr text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight break-keep mt-8">
            {c.heroTitle}
          </h1>
          <p className="text-base sm:text-lg text-[#A8A29E] mt-6 leading-relaxed break-keep">
            {c.heroSub}
          </p>
          <button
            type="button"
            onClick={() => setApplyOpen(true)}
            className="inline-block mt-10 gradient-warm text-white px-8 py-4 text-sm font-bold tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20"
          >
            {c.cta}
          </button>
        </div>
      </section>

      {/* Benefits — Light */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="light">{c.benefitsTag}</SectionTag>
          <div className="grid gap-6 mt-8 md:grid-cols-3">
            {c.benefits.map((b) => (
              <div
                key={b.title}
                className="bg-[var(--kn-card-light)] border border-[var(--kn-dark)]/5 rounded-[var(--radius)] p-6 sm:p-8"
              >
                <h2 className="text-lg sm:text-xl font-bold text-[var(--kn-dark)] mb-2 break-keep">
                  {b.title}
                </h2>
                <p className="text-[#78716C] leading-relaxed break-keep">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps — Dark */}
      <section className="py-16 md:py-24 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">{c.stepsTag}</SectionTag>
          <div className="grid gap-4 mt-8 md:grid-cols-3">
            {c.steps.map((step) => (
              <div key={step.no} className="flex gap-4 items-start">
                <span className="text-xs font-bold text-[#FF4500] mt-1">{step.no}</span>
                <p className="text-white font-bold break-keep">{step.title}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-[#A8A29E]/20 space-y-2">
            {c.notes.map((note) => (
              <p key={note} className="text-xs text-[#A8A29E] leading-relaxed break-keep">
                {note}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Register — Dark */}
      <section
        id="register"
        ref={registerRef}
        className="py-16 md:py-24 px-6 lg:px-24 bg-surface-1 scroll-mt-24 pb-32 md:pb-24"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 break-keep">
            {c.registerHeading}
          </h2>
          <p className="text-base text-[#A8A29E] mb-8 break-keep">{c.heroSub}</p>
          <button
            type="button"
            onClick={() => setApplyOpen(true)}
            className="inline-block gradient-warm text-white px-8 py-4 text-sm font-bold tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20"
          >
            {c.cta}
          </button>
        </div>
      </section>

      {/* Sticky CTA — 모바일만, 등록 섹션이 보이면 감춘다 */}
      <div
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 p-4 bg-background/90 backdrop-blur-md border-t border-border transition-opacity duration-200 ${
          registerVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setApplyOpen(true)}
          className="flex w-full items-center justify-center gradient-warm text-white py-4 text-sm font-bold rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300"
        >
          {c.cta}
        </button>
      </div>

      {/* 신청 폼 모달 */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto bg-background border-[var(--border)] p-0">
          <div className="p-8 sm:p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-bold text-white text-left break-keep">
                {c.registerHeading}
              </DialogTitle>
              <DialogDescription className="pt-4 text-base text-[#A8A29E] text-left break-keep">
                {c.heroSub}
              </DialogDescription>
            </DialogHeader>

            <TripbridgeCreatorForm
              onSuccess={() => {
                setApplyOpen(false)
                setSuccessOpen(true)
              }}
              onCancel={() => setApplyOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 접수 완료 모달 */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md bg-card border-[var(--border)]">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-[#FF4500]/10 border border-[#FF4500]/20">
              <CheckCircle2 className="h-10 w-10 text-[#FF4500]" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              {t('welcomePopupSuccess')}
            </DialogTitle>
            <DialogDescription className="pt-4 text-base leading-relaxed text-[#A8A29E] break-keep">
              {t('tbFormSuccess')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setSuccessOpen(false)}
              className="w-full sm:w-auto px-8 font-bold gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
            >
              {t('dialogConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
