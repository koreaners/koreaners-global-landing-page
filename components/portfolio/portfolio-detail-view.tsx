'use client'

import { useEffect } from 'react'
import type { Portfolio } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/contexts/locale-context'
import { getPortfolioTitle, getPortfolioClientName } from '@/lib/localized-content'
import { getTranslation } from '@/lib/translations'
import { MarketingCTA } from '@/components/common/marketing-cta'
import { SectionTag } from '@/components/ui/section-tag'

interface PortfolioDetailViewProps {
  portfolio: Portfolio
  otherPortfolios: Portfolio[]
}

export function PortfolioDetailView({ portfolio, otherPortfolios }: PortfolioDetailViewProps) {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [portfolio.id])

  const displayTitle = getPortfolioTitle(portfolio, locale)
  const displayClientName = getPortfolioClientName(portfolio, locale)
  const contentHtml = (locale === 'ja' && portfolio.content_jp && typeof portfolio.content_jp === 'string')
    ? portfolio.content_jp
    : (typeof portfolio.content === 'string' ? portfolio.content : '')
  const hasContent = contentHtml.trim().length > 0

  return (
    <article className="pt-32 sm:pt-40 pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 relative z-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 sm:mb-12">
          <SectionTag variant="dark">PORTFOLIO</SectionTag>
          <div className="mt-6" />

          <Link href="/portfolio">
            <Button variant="ghost" className="mb-4 sm:mb-6 min-h-[44px] break-keep text-white hover:bg-card hover:text-[#FF4500] border-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToList')}
            </Button>
          </Link>

          <div className="space-y-4 sm:space-y-6 flex flex-col items-center">
            <div className="w-full max-w-none lg:max-w-4xl mx-auto">
              <div className="aspect-video rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] relative bg-card w-full">
                {portfolio.thumbnail_url ? (
                  <Image
                    src={portfolio.thumbnail_url}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 1024px) 100vw, 896px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-card">
                    <div className="text-center px-4">
                      <span className="text-4xl font-bold text-white/20 tracking-widest">PORTFOLIO</span>
                      <p className="text-sm text-[#A8A29E] mt-2">{t('performanceNoImage')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight break-keep text-white">
                {displayTitle}
              </h1>
              <time className="text-xs sm:text-sm text-[#A8A29E] flex items-center gap-1.5 break-keep" dateTime={portfolio.published_at ?? portfolio.created_at}>
                <Calendar className="h-3.5 w-3.5" />
                {new Date(portfolio.published_at ?? portfolio.created_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR')}
              </time>
            </div>
          </div>
        </header>

        <div className="border-t border-border mt-8 sm:mt-10 mb-8 sm:mb-10" />

        <div className="border border-[var(--border)] bg-card px-6 md:px-12 lg:px-24 py-6 md:py-8 lg:py-10 rounded-[var(--radius)] blog-content-wrapper">
          {hasContent ? (
            <div
              className="prose prose-lg dark:prose-invert max-w-none break-keep text-white/80 leading-relaxed text-base lg:text-lg blog-content-prose"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <p className="text-[#A8A29E]">{t('portfolioNoContent')}</p>
          )}
        </div>

        <MarketingCTA shaderSeed={3} />

        {otherPortfolios.length > 0 && (
          <section className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-border">
            <SectionTag variant="dark">MORE WORK</SectionTag>
            <div className="mt-6" />

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">{t('portfolioOther')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {otherPortfolios.map((item) => (
                <Link key={item.id} href={`/portfolio/${item.id}`} className="block h-full">
                  <Card className="group overflow-hidden bg-card border-border hover:border-[#FF4500]/60 transition-all duration-300 cursor-pointer h-full flex flex-col py-0 gap-0">
                    <div className="aspect-video relative overflow-hidden bg-card">
                      {item.thumbnail_url ? (
                        <Image
                          src={item.thumbnail_url}
                          alt={getPortfolioTitle(item, locale)}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white/30">
                            {item.category?.[0]?.charAt(0) ?? 'P'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white group-hover:text-white transition-colors line-clamp-2">
                        {getPortfolioTitle(item, locale)}
                      </h3>
                      <p className="text-sm text-[#A8A29E] mt-1">{getPortfolioClientName(item, locale)}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/portfolio" className="inline-block">
                <Button
                  className="px-12 py-6 text-lg font-bold rounded-[var(--radius-sm)] gradient-warm text-white hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
                >
                  {t('portfolioViewAll')}
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
