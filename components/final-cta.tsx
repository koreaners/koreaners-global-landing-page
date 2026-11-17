'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

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
    <section className="bg-[var(--kn-light)] px-6 py-24 lg:px-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="heading-kr text-3xl font-medium text-[var(--kn-dark)] lg:text-5xl">
          {t('finalCtaTitle1')}<br />
          {t('finalCtaTitle2')}
        </h2>

        <dl className="mt-16 grid grid-cols-3 border-t border-[var(--kn-dark)]/10">
          {stats.map((stat, i) => (
            <div key={stat.key} className={`flex flex-col-reverse pt-6 ${i > 0 ? 'border-l border-[var(--kn-dark)]/10 pl-4 sm:pl-8' : 'pr-4'}`}>
              <dt className="mt-3 text-balance text-xs text-[#78716C] sm:text-sm">{t(stat.key)}</dt>
              <dd className="whitespace-nowrap text-3xl font-medium leading-none tabular-nums text-[var(--kn-dark)] sm:text-5xl lg:text-7xl">
                {stat.value}
                <span className="text-[#78716C]">{stat.suffix(locale)}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
