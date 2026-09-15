'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation, type TranslationKey } from '@/lib/translations'

/**
 * 로케일이 'ja'일 때 <title>·meta[description]을 JP 번역으로 바꾼다.
 * 메타데이터는 서버에서 한국어로만 렌더되므로, 클라이언트 로케일 전환분은 여기서 덮어쓴다.
 * 서버가 렌더한 한국어 값은 경로별로 처음 볼 때 보관했다가 'ko'로 돌아올 때 복원한다.
 */
const ROUTES = new Set([
  '/',
  '/service',
  '/japan-influencer-marketing',
  '/creator',
  '/portfolio',
  '/blog',
  '/careers',
  '/contact',
  '/about',
  '/tripbridge',
  '/tripbridge/creator',
])

export function LocaleDocumentMeta() {
  const { locale } = useLocale()
  const pathname = usePathname()
  const server = useRef<Record<string, { title: string; description: string }>>({})
  const lastApplied = useRef('')

  useEffect(() => {
    if (!ROUTES.has(pathname)) return

    const meta = document.querySelector('meta[name="description"]')
    const titleKey = `metaTitle:${pathname}` as TranslationKey
    const descKey = `metaDesc:${pathname}` as TranslationKey

    if (locale === 'ja') {
      const apply = () => {
        // ponytail: 라우트 전환 직후 document.title 이 아직 이전 페이지 값일 수 있어, 우리가 쓴 JP 제목이면 보관하지 않는다.
        // 재적용 때는 server.current 가 이미 차 있어 JP 제목이 서버값으로 덮어써지지 않는다.
        if (!server.current[pathname] && document.title !== lastApplied.current) {
          server.current[pathname] = {
            title: document.title,
            description: meta?.getAttribute('content') ?? '',
          }
        }
        const title = getTranslation('ja', titleKey)
        const description = getTranslation('ja', descKey)
        if (title) {
          document.title = title
          lastApplied.current = title
        }
        if (description) meta?.setAttribute('content', description)
      }

      apply()
      // 새로고침·직접 진입에서는 Next 의 <title> 수화가 첫 적용을 덮어쓴다. 수화 이후 한 번 더 적용한다.
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(apply)
      })
      const timer = setTimeout(apply, 0)
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
        clearTimeout(timer)
      }
    }

    // 'ko' — 서버 렌더값 복원. 보관분이 없으면 ko 번역으로 폴백.
    if (!lastApplied.current) return
    const saved = server.current[pathname]
    const title = saved?.title || getTranslation('ko', titleKey)
    const description = saved?.description || getTranslation('ko', descKey)
    if (title) document.title = title
    if (description) meta?.setAttribute('content', description)
    lastApplied.current = ''
  }, [locale, pathname])

  return null
}
