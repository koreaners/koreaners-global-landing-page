'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

const BARRIERS = [
  { titleKey: 'barrier1Title', descKey: 'barrier1Desc' },
  { titleKey: 'barrier2Title', descKey: 'barrier2Desc' },
  { titleKey: 'barrier3Title', descKey: 'barrier3Desc' },
  { titleKey: 'barrier4Title', descKey: 'barrier4Desc' },
] as const

export function Barriers() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  return (
    <section className="bg-[var(--kn-light)] px-6 py-24 lg:px-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="heading-kr text-3xl font-medium text-[var(--kn-dark)] lg:text-5xl">
          {t('barriersTitle1')}
          {t('barriersTitle2')}
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {BARRIERS.map((b, i) => (
            <div key={b.titleKey} className="rounded-xl border border-[var(--kn-dark)]/10 bg-white p-6">
              <span className="font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-xs text-[#78716C]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-medium text-[var(--kn-dark)]">{t(b.titleKey)}</h3>
              <p className="mt-1 text-[15px] leading-6 text-[#57534E]">{t(b.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
