'use client'

import Link from 'next/link'
import { Instagram, Mail } from 'lucide-react'
import { Logo } from '@/components/logo'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

// 페이지명(영문)은 nav 와 동일하게 원문 유지 (translations.ts 컨벤션)
const SITEMAP = [
  { href: '/service', label: 'Service' },
  { href: '/creator', label: 'Creator' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/blog', label: 'Blog' },
  { href: '/careers', label: 'Careers' },
  { href: '/about', label: 'About' },
] as const

// app/layout.tsx org schema 의 sameAs URL 과 동일
const INSTAGRAM = [
  { href: 'https://www.instagram.com/koreaners_global', label: '@koreaners_global' },
  { href: 'https://www.instagram.com/paripari.korea', label: '@paripari.korea' },
] as const

const SALES_EMAIL = 'sales@koreaners.com'

/**
 * 전역 표준 푸터 — 사이트맵 + 연락 + 문의 CTA + 법인 정보.
 * FooterWrapper 를 통해 전 페이지에서 1회만 렌더된다.
 */
export function SiteFooter() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  return (
    <footer className="w-full border-t border-border bg-surface-1">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12 lg:px-24 py-14 md:py-16">
        <div className="grid gap-10 md:gap-8 md:grid-cols-[1.6fr_1fr_1.2fr]">
          {/* 1) 브랜드 + 문의 CTA */}
          <div className="flex flex-col items-start gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Logo variant="footer" />
              <span className="font-display font-bold text-lg uppercase tracking-tight text-white">
                KOREANERS
              </span>
            </Link>
            <p className="heading-kr max-w-sm text-sm leading-relaxed text-white/60">
              {t('footerBrandDesc')}
            </p>
            <Link
              href="/contact"
              className="gradient-warm mt-1 inline-flex items-center justify-center rounded-[var(--radius-sm)] px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20"
            >
              {t('contact')}
            </Link>
          </div>

          {/* 2) 사이트맵 */}
          <nav aria-label={t('footerSitemapHeading')} className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/60">
              {t('footerSitemapHeading')}
            </h2>
            {SITEMAP.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-white/60 transition-colors hover:text-[#FF4500] w-fit"
              >
                {item.label}
              </Link>
            ))}
            {/* 한국어 전용 페이지라 ko 로케일에서만 노출 */}
            {locale === 'ko' && (
              <Link
                href="/japan-influencer-marketing"
                className="text-sm text-white/60 transition-colors hover:text-[#FF4500] w-fit"
              >
                {t('navJapanInfluencer')}
              </Link>
            )}
          </nav>

          {/* 3) 연락 + 팔로우 */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/60">
                {t('footerContactHeading')}
              </h2>
              <a
                href={`mailto:${SALES_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-[#FF4500] w-fit"
              >
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden />
                {SALES_EMAIL}
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/60">
                {t('footerFollowHeading')}
              </h2>
              {INSTAGRAM.map((ig) => (
                <a
                  key={ig.href}
                  href={ig.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-[#FF4500] w-fit"
                >
                  <Instagram className="h-4 w-4 flex-shrink-0" aria-hidden />
                  {ig.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 최하단: 법인 정보 + 저작권 (기존 3줄 흡수) */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8">
          <div className="text-xs sm:text-sm font-semibold text-white/70 break-keep">
            {t('companyName')}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60 break-keep">
            <span className="break-keep">
              {t('ceo')}: {t('ceoName')}
            </span>
            <span className="text-white/25">|</span>
            <span className="break-keep">
              {t('bizNo')}: {t('bizNoValue')}
            </span>
            <span className="text-white/25">|</span>
            <span className="break-keep">
              {t('address')}: {t('addressValue')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60 break-keep">
            <span>{t('copyright')}</span>
            <Link
              href="/privacy"
              className="text-white/60 transition-colors hover:text-white/80"
            >
              {locale === 'ja' ? 'プライバシーポリシー' : '개인정보처리방침'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
