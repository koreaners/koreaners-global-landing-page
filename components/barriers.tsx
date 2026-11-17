'use client'

import { Database, Shield, Target, AlertTriangle } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/fade-in'
import { SectionTag } from '@/components/ui/section-tag'

const BARRIER_DESC_KEYS = ['barrier1Desc', 'barrier2Desc', 'barrier3Desc', 'barrier4Desc'] as const

export function Barriers() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const barriers = [
    { icon: Database, title: 'Data Black-box', descKey: BARRIER_DESC_KEYS[0] },
    { icon: Shield, title: 'Trust Barrier', descKey: BARRIER_DESC_KEYS[1] },
    { icon: Target, title: 'Lack of Strategy', descKey: BARRIER_DESC_KEYS[2] },
    { icon: AlertTriangle, title: 'Operational Risk', descKey: BARRIER_DESC_KEYS[3] },
  ]

  return (
    <section className="bg-[var(--kn-light)] py-24 md:py-32 lg:py-40 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <SectionTag variant="light">BARRIERS</SectionTag>
          <h2 className="font-display font-bold text-4xl lg:text-6xl uppercase leading-[0.9] text-[var(--kn-dark)] max-w-2xl mt-6">
            {t('barriersTitle1')}
            {t('barriersTitle2')}
          </h2>
        </FadeIn>

        <StaggerContainer staggerDelay={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16">
          {barriers.map((barrier, index) => (
            <StaggerItem key={index}>
              <div className="bg-white rounded-[var(--radius)] border border-[var(--kn-dark)]/10 p-8 hover:border-[#FF4500]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF4500]/5 transition-all duration-300 cursor-pointer">
                <barrier.icon className="w-10 h-10 text-[#FF4500]/70 mb-4" />
                <h3 className="text-lg font-bold text-[var(--kn-dark)] mb-2">{barrier.title}</h3>
                <p className="text-sm text-[#78716C] leading-relaxed">{t(barrier.descKey)}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
