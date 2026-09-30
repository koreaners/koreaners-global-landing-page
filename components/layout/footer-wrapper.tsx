'use client'

import { usePathname } from 'next/navigation'
import { SiteFooter } from './site-footer'

export function FooterWrapper() {
  const pathname = usePathname()
  // /brand-brief: 링크로만 전달하는 독립 페이지라 사이트 푸터 없음
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/brand-brief')) return null
  return <SiteFooter />
}
