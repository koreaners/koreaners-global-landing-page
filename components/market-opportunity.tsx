'use client'

import { FadeIn, Reveal, StaggerContainer, StaggerItem } from '@/components/ui/fade-in'
import { Counter } from '@/components/ui/counter'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { SectionTag } from '@/components/ui/section-tag'
import { ShaderBackdrop } from '@/components/ui/shader-backdrop'

export function MarketOpportunity() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  const stats = [
    { titleKey: 'marketStat1Title' as const, subtitleKey: 'marketStat1Subtitle' as const, descKey: 'marketStat1Desc' as const },
    { titleKey: 'marketStat2Title' as const, subtitleKey: 'marketStat2Subtitle' as const, descKey: 'marketStat2Desc' as const },
    { titleKey: 'marketStat3Title' as const, subtitleKey: 'marketStat3Subtitle' as const, descKey: 'marketStat3Desc' as const },
  ]

  return (
    <section id="market" className="bg-[var(--kn-light)] py-24 md:py-32 lg:py-40 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left column — Text */}
          <Reveal direction="left">
            <div>
              <SectionTag variant="light">MARKET OPPORTUNITY</SectionTag>
              <h2 className="font-display font-bold text-5xl lg:text-7xl uppercase leading-[0.9] text-[var(--kn-dark)] max-w-md mt-6">
                <span className="block">{t('marketTitle1')}</span>
                <span className="block">{t('marketTitle2')}</span>
              </h2>
              <p className="text-lg text-[#78716C] leading-relaxed mt-6">
                {t('marketSubtitle')}
              </p>
            </div>
          </Reveal>

          {/* Right column — Gradient stats card */}
          <Reveal direction="right">
            <div className="relative rounded-[var(--radius-lg)] overflow-hidden gradient-sunset p-8 md:p-10">
              {/* 라이브 셰이더 (홈 2번째 캔버스, 상한) — gradient-sunset 은 폴백으로 유지 */}
              <ShaderBackdrop variant="card" seed={7} />
              <StaggerContainer staggerDelay={0.15} className="relative z-10 flex flex-col gap-6">
                {stats.map((stat, index) => (
                  <StaggerItem key={index}>
                    <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius)] p-6">
                      <div className="text-xs text-white/70 mb-1 font-medium uppercase tracking-wider">
                        {t(stat.titleKey)}
                      </div>
                      <div className="font-display font-bold text-5xl text-white">
                        {index === 0 ? <><Counter end={500} />{locale === 'ja' ? '万' : '만'}</> :
                         index === 1 ? <><Counter end={25} />%</> :
                         <><Counter end={90} />%</>}
                      </div>
                      <div className="text-sm text-white/60 mt-2">
                        {t(stat.descKey)}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
