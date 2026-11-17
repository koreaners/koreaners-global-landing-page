'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Portfolio } from '@/lib/supabase'
import Link from 'next/link'
import { SkeletonGrid } from '@/components/ui/skeleton-card'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { getPortfolioTitle, getPortfolioClientName } from '@/lib/localized-content'
import { FadeIn } from '@/components/ui/fade-in'
import { SectionTag } from '@/components/ui/section-tag'
import Image from 'next/image'

export function Performance() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolios()
  }, [])

  async function fetchPortfolios() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setPortfolios(data || [])
    } catch (error: any) {
      console.error('Error fetching portfolios:', error)
      setPortfolios([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="performance" className="bg-[var(--kn-dark)] py-24 md:py-32 lg:py-40 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <SectionTag variant="dark">PORTFOLIO</SectionTag>
          <h2 className="font-display font-bold text-4xl lg:text-6xl uppercase mt-6 leading-[0.9] text-[var(--kn-light)] max-w-md">
            {t('performanceTitle1')}{t('performanceTitle2')}
          </h2>
        </FadeIn>

        {loading ? (
          <div className="mt-16">
            <SkeletonGrid count={3} />
          </div>
        ) : portfolios.length === 0 ? (
          <div className="text-center py-20 mt-16">
            <p className="text-[#78716C] text-lg">
              {t('performanceEmpty')}
            </p>
          </div>
        ) : (
          <>
            {/* 한 줄 캐러셀 (마퀴, hover 시 정지). height = 카드 한 칸. 모바일은 화면 끝까지 + 끝 페이드 */}
            <div className="marquee-fade -mx-6 sm:mx-0 mt-16 overflow-hidden">
              <div className="portfolio-marquee flex w-max gap-6">
                {[...portfolios, ...portfolios].map((item, i) => (
                  <Link
                    key={`${item.id}-${i}`}
                    href={`/portfolio/${item.id}`}
                    className="group/card block w-72 flex-shrink-0 sm:w-80"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-[var(--kn-light)]/10 bg-[var(--kn-card-dark)]">
                      {item.thumbnail_url ? (
                        <Image
                          src={item.thumbnail_url}
                          alt={getPortfolioTitle(item, locale) || 'Portfolio image'}
                          fill
                          sizes="320px"
                          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-[var(--kn-light)]/20">
                          {item.category?.[0]?.charAt(0) || 'P'}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <span className="text-xs uppercase tracking-wider text-[#FF4500]">
                        {item.category && item.category.length > 0 ? item.category[0] : 'ETC'}
                      </span>
                      <h3 className="mt-1 truncate text-xl font-bold text-[var(--kn-light)] transition-colors duration-300 group-hover/card:text-[#FF4500]">
                        {getPortfolioTitle(item, locale)}
                      </h3>
                      <p className="mt-1 truncate text-sm text-[#78716C]">
                        {getPortfolioClientName(item, locale)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <FadeIn delay={0.3}>
              <div className="mt-12 text-center">
                <Link
                  href="/portfolio"
                  className="inline-block text-sm uppercase tracking-wider font-bold text-[var(--kn-light)] border-b border-[var(--kn-light)]/30 hover:border-[#FF4500] hover:text-[#FF4500] pb-1 transition-colors duration-300 relative after:content-[''] after:absolute after:inset-x-0 after:-inset-y-2.5"
                >
                  {t('performanceViewAll')} →
                </Link>
              </div>
            </FadeIn>
          </>
        )}
      </div>
    </section>
  )
}
