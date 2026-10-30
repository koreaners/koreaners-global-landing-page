'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { CountUp } from '@/components/ui/count-up'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/fade-in'
import { SectionTag } from '@/components/ui/section-tag'

// 검증 수치 화이트리스트(verified_numbers.json ad_safe_claims)만 사용 — /contact 노출값과 동일 트리오
const stats = [
  { value: 220, suffix: (locale: string) => (locale === 'ja' ? '名+' : '명+'), key: 'finalCtaStat2' as const },
  { value: 185, suffix: (locale: string) => (locale === 'ja' ? '+' : '개+'), key: 'finalCtaStat3' as const },
  { value: 10, suffix: (locale: string) => (locale === 'ja' ? '社' : '곳'), key: 'finalCtaStat4' as const },
]

export function FinalCTA() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  return (
    <section className="bg-[var(--kn-light)] py-24 md:py-32 lg:py-40 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <SectionTag variant="light">RESULTS</SectionTag>
          <h2 className="font-display font-bold text-4xl lg:text-6xl uppercase mt-6 leading-[0.9] text-[var(--kn-dark)]">
            {t('finalCtaTitle1')}<br />
            {t('finalCtaTitle2')}
          </h2>
        </FadeIn>

        {/* Stats Grid */}
        <StaggerContainer staggerDelay={0.1} className="grid grid-cols-3 gap-4 sm:gap-8 mt-16">
          {stats.map((stat, index) => (
            <StaggerItem key={stat.key}>
              <div className={`cursor-default select-none ${index < stats.length - 1 ? 'border-r border-[var(--kn-dark)]/10' : ''}`}>
                <CountUp
                  value={stat.value}
                  suffix={stat.suffix(locale)}
                  className="block font-display font-bold text-3xl sm:text-6xl lg:text-8xl gradient-warm-text leading-none whitespace-nowrap"
                />
                {/* 모바일은 12px·기본 자간 — 3칸 캡션이 모두 2줄 이내, JA 끝 글자 고아 줄 방지(balance) */}
                <div className="text-xs sm:text-sm text-[#78716C] mt-3 uppercase tracking-normal sm:tracking-wider text-balance">
                  {t(stat.key)}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
