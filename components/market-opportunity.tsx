'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

const REASONS = [
  { titleKey: 'marketStat1Title', descKey: 'marketStat1Desc' },
  { titleKey: 'marketStat2Title', descKey: 'marketStat2Desc' },
  { titleKey: 'marketStat3Title', descKey: 'marketStat3Desc' },
] as const

export function MarketOpportunity() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  return (
    <section id="market" className="bg-[var(--kn-light)] px-6 pb-24 lg:px-24 lg:pb-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="heading-kr text-3xl font-medium text-[var(--kn-dark)] lg:text-5xl">
            <span className="block">{t('marketTitle1')}</span>
            <span className="block">{t('marketTitle2')}</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#78716C]">{t('marketSubtitle')}</p>
        </div>

        <ol className="border-t border-[var(--kn-dark)]/10">
          {REASONS.map((r, i) => (
            <li key={r.titleKey} className="grid grid-cols-[40px_1fr] border-b border-[var(--kn-dark)]/10 py-6">
              <span className="pt-0.5 font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-xs text-[#78716C]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-lg font-medium text-[var(--kn-dark)]">{t(r.titleKey)}</h3>
                <p className="mt-1 text-[15px] leading-6 text-[#57534E]">{t(r.descKey)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
