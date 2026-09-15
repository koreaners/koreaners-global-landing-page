'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { Menu, ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation, type TranslationKey } from '@/lib/translations'

function getScrollbarWidth(): number {
  if (typeof window === 'undefined') return 0
  return window.innerWidth - document.documentElement.clientWidth
}

export default function Navigation() {
  const { locale, setLocale } = useLocale()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const scrollbarWidthRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const measure = () => {
      scrollbarWidthRef.current = getScrollbarWidth()
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const width = scrollbarWidthRef.current || getScrollbarWidth()
    if (width <= 0) return
    const prevBodyPaddingRight = document.body.style.paddingRight
    document.body.style.paddingRight = `${width}px`
    const nav = navRef.current
    const prevNavPaddingRight = nav?.style.paddingRight ?? ''
    if (nav) nav.style.paddingRight = `${width}px`
    return () => {
      document.body.style.paddingRight = prevBodyPaddingRight
      if (nav) nav.style.paddingRight = prevNavPaddingRight
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  type NavItem =
    | { href: string; label: string; labelKey?: never }
    | { href: string; labelKey: TranslationKey; label?: never }
  const menuItems: NavItem[] = [
    { href: '/service', label: 'Service' },
    { href: '/creator', label: 'Creator' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/blog', label: 'Blog' },
    { href: '/careers', label: 'Careers' },
    { href: '/contact', labelKey: 'contact' },
  ]

  const serviceItems: { href: string; titleKey: TranslationKey; descKey: TranslationKey }[] = [
    { href: '/service', titleKey: 'navSvcInfluencer', descKey: 'navSvcInfluencerDesc' },
    { href: '/tripbridge', titleKey: 'navSvcTripbridge', descKey: 'navSvcTripbridgeDesc' },
  ]

  const effectiveLocale = mounted ? locale : 'ko'
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(effectiveLocale, key)

  return (
    <nav
      ref={navRef}
      className={`main-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full max-w-full overflow-hidden ${
        scrolled
          ? 'bg-background/80 backdrop-blur-md border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}
      style={{ width: '100%' }}
    >
      <div className="w-full max-w-full px-6 md:px-12 lg:px-24">
        <div className={`container mx-auto max-w-7xl flex items-center transition-[height] duration-300 ${scrolled ? 'h-12 sm:h-16' : 'h-16 sm:h-20'}`}>
        <div className="flex items-center justify-between min-w-0 w-full">
          <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0 flex items-center gap-2 sm:gap-3 min-w-0">
            <Logo variant="header" />
            <span className="font-display font-bold text-lg uppercase tracking-tight text-white">KOREANERS</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            <div className="flex items-center gap-1 border border-white/20 bg-card/50 p-0.5">
              <button
                type="button"
                onClick={() => setLocale('ko')}
                className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${locale === 'ko' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                KR
              </button>
              <button
                type="button"
                onClick={() => setLocale('ja')}
                className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${locale === 'ja' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                JP
              </button>
            </div>
            {menuItems.filter((m) => m.href !== '/contact').map((item) => {
              const isActive = pathname === item.href
              if (item.href === '/service') {
                return (
                  <DropdownMenu
                    key={item.href}
                    open={serviceOpen}
                    onOpenChange={setServiceOpen}
                    modal={false}
                  >
                    <div
                      className="flex"
                      onMouseEnter={() => setServiceOpen(true)}
                      onMouseLeave={() => setServiceOpen(false)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Link
                          href={item.href}
                          /* pointerdown 기본동작을 막아 Radix 토글 대신 링크 이동이 그대로 동작 */
                          onPointerDown={(e) => e.preventDefault()}
                          className={`relative py-2 font-bold text-sm group whitespace-nowrap transition-all duration-200 outline-none ${
                            isActive ? 'text-white' : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {item.label}
                          <span className={`absolute bottom-0 left-0 h-0.5 bg-[#FF4500] transition-all duration-200 ${
                            isActive ? 'w-full' : 'w-0 group-hover:w-full'
                          }`} />
                        </Link>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={0}
                      onMouseEnter={() => setServiceOpen(true)}
                      onMouseLeave={() => setServiceOpen(false)}
                      className="w-[22rem] bg-surface-1 border-border p-2"
                    >
                      {serviceItems.map((svc) => (
                        <DropdownMenuItem
                          key={svc.href}
                          asChild
                          className="flex-col items-start gap-1 focus:bg-background hover:bg-background cursor-pointer rounded-[var(--radius-sm)] p-3"
                        >
                          <Link href={svc.href}>
                            <span className="block font-bold text-sm text-white">{t(svc.titleKey)}</span>
                            <span className="block text-xs text-[#A8A29E] whitespace-normal break-keep [overflow-wrap:anywhere]">
                              {t(svc.descKey)}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative py-2 font-bold text-sm group whitespace-nowrap transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-[#FF4500] transition-all duration-200 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </Link>
              )
            })}
            <Link href="/contact" className="ml-1">
              <Button size="default" className="px-6 py-2.5 font-bold whitespace-nowrap gradient-warm text-white border-0 hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300">
                {t('contact')}
              </Button>
            </Link>
          </div>

          {/* Mobile: 언어 토글(헤더 고정) + 햄버거 메뉴 — 하이드레이션 가드로 Sheet는 클라이언트 마운트 후에만 렌더 */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0 min-w-0">
            {/* 언어 토글: 화면 크기와 관계없이 항상 헤더 우측(햄버거 옆)에 노출 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setLocale('ko')}
                aria-label="한국어로 전환"
                aria-pressed={locale === 'ko'}
                className={`rounded-md min-w-[44px] min-h-[44px] px-3 text-sm font-bold transition-colors flex items-center justify-center border ${locale === 'ko' ? 'bg-white text-black border-white' : 'bg-card/50 text-white/70 border-white/20 hover:text-white hover:border-white/40'}`}
              >
                KR
              </button>
              <button
                type="button"
                onClick={() => setLocale('ja')}
                aria-label="日本語に切り替え"
                aria-pressed={locale === 'ja'}
                className={`rounded-md min-w-[44px] min-h-[44px] px-3 text-sm font-bold transition-colors flex items-center justify-center border ${locale === 'ja' ? 'bg-white text-black border-white' : 'bg-card/50 text-white/70 border-white/20 hover:text-white hover:border-white/40'}`}
              >
                JP
              </button>
            </div>
            {mounted && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 min-w-[2.25rem] hover:bg-card border-0 flex-shrink-0"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="h-5 w-5 text-white" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right" 
                  className="w-[min(300px,100vw)] sm:w-[340px] max-w-full bg-surface-1 border-l border-border z-50 overflow-y-auto"
                >
                  <SheetHeader className="border-b border-border pb-4 mb-4 z-10 relative">
                    <SheetTitle className="text-left text-xl font-bold text-white break-words">
                      {t('menu')}
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-0 relative z-10">
                    {menuItems.filter((m) => m.href !== '/contact').map((item, index) => (
                      <div key={item.href} className="contents">
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center justify-between hover:bg-background active:bg-card transition-all duration-200 py-4 px-5 rounded-[var(--radius-sm)] text-base sm:text-sm font-bold tracking-tight relative z-10 border-b border-border break-words ${
                          pathname === item.href ? 'text-white border-l-2 border-l-white bg-background' : 'text-white'
                        }`}
                        style={{
                          animation: `fadeInSlide 0.3s ease-out ${index * 60}ms both`,
                        }}
                      >
                        <span className="text-white transition-colors duration-200 font-bold break-words min-w-0">
                          {'labelKey' in item && item.labelKey ? t(item.labelKey) : item.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-white/40 flex-shrink-0 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
                      </Link>
                      {item.href === '/service' &&
                        serviceItems.map((svc) => (
                          <Link
                            key={svc.href}
                            href={svc.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between py-3 pl-9 pr-5 text-sm font-bold text-white/70 hover:text-white hover:bg-background active:bg-card transition-all duration-200 border-b border-border break-words"
                            style={{
                              animation: `fadeInSlide 0.3s ease-out ${index * 60}ms both`,
                            }}
                          >
                            <span className="break-words min-w-0">{t(svc.titleKey)}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                    {/* 문의하기: 데스크탑 버튼과 동일한 Solid CTA 스타일, 하단 격리 */}
                    <Link
                      href="/contact"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-6 flex w-full items-center justify-center rounded-[var(--radius-sm)] gradient-warm py-4 px-5 font-bold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 active:scale-[0.98]"
                      style={{
                        animation: `fadeInSlide 0.3s ease-out ${menuItems.filter((m) => m.href !== '/contact').length * 60}ms both`,
                      }}
                    >
                      {t('contact')}
                    </Link>
                  </nav>
                  
                  <style jsx>{`
                    @keyframes fadeInSlide {
                      from {
                        opacity: 0;
                        transform: translateX(1rem);
                      }
                      to {
                        opacity: 1;
                        transform: translateX(0);
                      }
                    }
                  `}</style>
                </SheetContent>
              </Sheet>
            )}
            {!mounted && (
              <span
                className="inline-flex h-9 w-9 min-w-[2.25rem] items-center justify-center flex-shrink-0 invisible"
                aria-hidden
              >
                <Menu className="h-5 w-5 text-white" />
              </span>
            )}
          </div>
        </div>
        </div>
      </div>
    </nav>
  )
}
