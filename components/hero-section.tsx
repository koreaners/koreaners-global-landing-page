'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { getPortfolioTitle } from '@/lib/localized-content'
import type { Portfolio } from '@/lib/supabase'
import { InquirySheet } from '@/components/ui/inquiry-sheet'
import { CaseCaption, caseHeadline } from '@/components/case-caption'

export default function HeroSection({ portfolios }: { portfolios: Portfolio[] }) {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const frames = portfolios.filter((p) => p.thumbnail_url).slice(0, 3)

  return (
    <section className="flex min-h-[100svh] items-center bg-[var(--kn-dark)] px-6 pb-24 pt-32 lg:px-24 lg:pt-40">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <h1 className="heading-kr text-balance text-4xl font-medium text-[var(--kn-light)] sm:text-5xl lg:text-[56px]">
            {t('heroTitle')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#A8A29E]">{t('heroLead')}</p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setInquiryOpen(true)}
              className="h-12 cursor-pointer rounded-[var(--radius-sm)] bg-[#FF4500] px-6 text-[15px] font-medium text-[var(--kn-dark)] transition-[background-color,transform] duration-150 hover:bg-[#FF5A1F] active:scale-[0.98]"
            >
              {t('heroCtaFreeConsult')}
            </button>
            <Link
              href="/portfolio"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--kn-light)]/10 px-6 text-[15px] font-medium text-[var(--kn-light)] transition-colors duration-150 hover:bg-white/5"
            >
              {t('heroCtaViewCases')}
            </Link>
          </div>

          <p className="mt-8 text-sm text-[#A8A29E]">
            {t('heroTrustLine')}
          </p>
        </div>

        {frames.length > 0 && (
          <div>
            <p className="text-sm text-[#A8A29E]">{t('heroRecentCases')}</p>
            <div className="mt-4 grid grid-cols-3 items-start gap-3 lg:gap-4">
              {frames.map((p, i) => (
                <Link key={p.id} href={`/portfolio/${p.id}`} className={`group block ${i === 1 ? 'mt-8 lg:mt-12' : ''}`}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.08] bg-[#292524]">
                    <Image
                      src={p.thumbnail_url!}
                      alt={getPortfolioTitle(p, locale)}
                      fill
                      sizes="(min-width: 1024px) 200px, 33vw"
                      className="object-cover"
                      priority={i === 0}
                    />
                  </div>
                  <CaseCaption portfolio={p} className="mt-3" />
                  <p className="mt-1 hidden text-sm leading-5 text-[#A8A29E] transition-colors duration-150 line-clamp-3 group-hover:text-[var(--kn-light)] sm:block">
                    {caseHeadline(getPortfolioTitle(p, locale))}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <InquirySheet open={inquiryOpen} onOpenChange={setInquiryOpen} />
    </section>
  )
}
