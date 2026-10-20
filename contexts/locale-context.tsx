'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 로케일은 localStorage 기반으로 클라이언트에서만 결정됩니다.
 * 서버에서는 사용자 언어를 알 수 없으므로, t()를 사용하는 페이지(creator, contact, service)는
 * useMounted 패턴으로 마운트 후에만 번역 텍스트를 렌더링하여 Hydration Mismatch를 방지합니다.
 * 예외: /ja 경로는 크롤러용 일본어 공개 주소라 서버 렌더부터 ja로 고정하고 localStorage를 무시합니다(forced).
 */
export type Locale = 'ko' | 'ja'

const LOCALE_KEY = 'koreaners-locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  forced: boolean
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const forced = pathname === '/ja' || !!pathname?.startsWith('/ja/')
  const [stateLocale, setLocaleState] = useState<Locale>('ko')
  const locale: Locale = forced ? 'ja' : stateLocale
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || forced) return
    try {
      const stored = localStorage.getItem(LOCALE_KEY) as Locale | null
      if (stored === 'ko' || stored === 'ja') setLocaleState(stored)
    } catch {
      // ignore
    }
  }, [mounted, forced])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'ja' ? 'ja' : 'ko'
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_KEY, next)
    } catch {
      // ignore
    }
    // /ja 고정 페이지에서 KR을 누르면 한국어 주소로 이동
    if (forced && next === 'ko') window.location.assign(pathname.replace(/^\/ja/, '') || '/')
  }, [forced, pathname])

  const value: LocaleContextValue = { locale, setLocale, forced }

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    return { locale: 'ko' as Locale, setLocale: () => {}, forced: false }
  }
  return ctx
}
