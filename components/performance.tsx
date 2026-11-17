'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Portfolio } from '@/lib/supabase'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { getPortfolioTitle } from '@/lib/localized-content'
import { CaseCaption, caseHeadline } from '@/components/case-caption'

export function Performance({ portfolios }: { portfolios: Portfolio[] }) {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  // 히어로가 최신 3건을 쓰므로 여기선 그다음 6건, 모자라면 최신부터
  const items = portfolios.length > 6 ? portfolios.slice(3, 9) : portfolios.slice(0, 6)

  return (
    <section id="performance" className="bg-[var(--kn-dark)] px-6 py-24 lg:px-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="heading-kr text-3xl font-medium text-[var(--kn-light)] lg:text-5xl">
          {t('performanceTitle1')}{t('performanceTitle2')}
        </h2>

        {items.length === 0 ? (
          <p className="mt-12 text-lg text-[#A8A29E]">{t('performanceEmpty')}</p>
        ) : (
          <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link key={item.id} href={`/portfolio/${item.id}`} className="group block">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-[#292524]">
                  {item.thumbnail_url && (
                    <Image
                      src={item.thumbnail_url}
                      alt={getPortfolioTitle(item, locale)}
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <CaseCaption portfolio={item} className="mt-4" />
                <h3 className="mt-2 text-lg font-medium leading-7 text-[var(--kn-light)] transition-colors duration-150 line-clamp-2 group-hover:text-[#FF4500]">
                  {caseHeadline(getPortfolioTitle(item, locale))}
                </h3>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/portfolio"
          className="mt-12 inline-flex h-11 items-center text-[15px] font-medium text-[var(--kn-light)] underline decoration-white/30 underline-offset-8 transition-colors duration-150 hover:text-[#FF4500] hover:decoration-[#FF4500]"
        >
          {t('performanceViewAll')} →
        </Link>
      </div>
    </section>
  )
}
