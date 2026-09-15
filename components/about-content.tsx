'use client'

import Link from 'next/link'
import Navigation from '@/components/navigation'
import { Building2, Globe, Users, BarChart3, Award, Target } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { ShaderBackdrop } from '@/components/ui/shader-backdrop'
import { CountUp } from '@/components/ui/count-up'

const STAT_KEYS = [
  { num: 185, suffix: () => '+', labelKey: 'aboutStat1Label' as const, icon: Building2 },
  { num: 220, suffix: () => '+', labelKey: 'aboutStat2Label' as const, icon: Users },
  { num: 30, suffix: (l: string) => (l === 'ja' ? '万+' : '만+'), labelKey: 'aboutStat3Label' as const, icon: Globe },
  { num: 250, suffix: () => '%', labelKey: 'aboutStat4Label' as const, icon: BarChart3 },
]

const SERVICE_KEYS = [
  { titleKey: 'aboutService1Title' as const, descKey: 'aboutService1Desc' as const, icon: Target },
  { titleKey: 'aboutService2Title' as const, descKey: 'aboutService2Desc' as const, icon: Users },
  { titleKey: 'aboutService3Title' as const, descKey: 'aboutService3Desc' as const, icon: Globe },
  { titleKey: 'aboutService4Title' as const, descKey: 'aboutService4Desc' as const, icon: BarChart3 },
]

const STRENGTH_KEYS = [
  { titleKey: 'aboutStrength1Title' as const, descKey: 'aboutStrength1Desc' as const },
  { titleKey: 'voucherOfficialAgency' as const, descKey: 'aboutStrength2Desc' as const },
  { titleKey: 'aboutStrength3Title' as const, descKey: 'aboutStrength3Desc' as const },
  { titleKey: 'aboutStrength4Title' as const, descKey: 'aboutStrength4Desc' as const },
]

export default function AboutContent() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-20 px-6 lg:px-24 relative overflow-hidden hero-glow">
        <ShaderBackdrop variant="hero-sub" seed={6} className="absolute!" />
        <div className="max-w-7xl mx-auto relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold mb-6">ABOUT US</p>
          <h1 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl">
            {t('aboutHero1')}
            <br />
            <span className="gradient-warm-text">{t('aboutHero2')}</span>
          </h1>
          <p className="text-lg text-[#A8A29E] mt-6 max-w-2xl leading-relaxed">
            {t('aboutHeroDesc')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-20 px-6 lg:px-24 border-t border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STAT_KEYS.map((stat) => (
            <div
              key={stat.labelKey}
              className="bg-surface-1 border border-border rounded-[var(--radius)] p-6 sm:p-8 text-center hover:border-[#FF4500]/40 transition-colors"
            >
              <stat.icon className="h-6 w-6 text-[#FF4500] mx-auto mb-3" />
              <p className="text-3xl sm:text-4xl font-bold gradient-warm-text">
                <CountUp value={stat.num} suffix={stat.suffix(locale)} />
              </p>
              <p className="text-sm text-[#A8A29E] mt-1">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-16 sm:py-20 px-6 lg:px-24 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4500] font-bold mb-6">SERVICES</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12">
            {t('aboutServicesHeading')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICE_KEYS.map((service) => (
              <div
                key={service.titleKey}
                className="p-6 bg-surface-1 border border-border rounded-[var(--radius)] hover:border-[#FF4500]/40 transition-colors"
              >
                <service.icon className="h-5 w-5 text-[#FF4500] mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{t(service.titleKey)}</h3>
                <p className="text-sm text-[#A8A29E] leading-relaxed">{t(service.descKey)}</p>
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
            {t('aboutStrengthsHeading')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STRENGTH_KEYS.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF4500]/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-[#FF4500]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{t(item.titleKey)}</h3>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">{t(item.descKey)}</p>
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
            {t('aboutCtaTitle')}
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-xl mx-auto">
            {t('aboutCtaDesc')}
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 text-base font-bold rounded-[var(--radius-sm)] gradient-warm text-white hover:opacity-90 hover:scale-[1.02] transition-all duration-300"
          >
            {t('contact')}
          </Link>
        </div>
      </section>
    </main>
  )
}
