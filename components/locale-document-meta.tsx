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
        const descEl = document.querySelector('meta[name="description"]')
        if (!server.current[pathname] && document.title !== lastApplied.current) {
          server.current[pathname] = {
            title: document.title,
            description: descEl?.getAttribute('content') ?? '',
          }
        }
        const title = getTranslation('ja', titleKey)
        const description = getTranslation('ja', descKey)
        if (title) {
          document.title = title
          lastApplied.current = title
        }
        if (description) descEl?.setAttribute('content', description)
      }

      apply()
      // Next 16 은 메타데이터를 스트리밍해서 수화 뒤(관측 ~200ms)에 <title> 을 다시 써 넣는다.
      // rAF·setTimeout 으로는 그 시점을 못 잡으므로 head 변경을 관측해 되돌린다.
      const observer = new MutationObserver(() => {
        if (document.title !== lastApplied.current) apply()
      })
      observer.observe(document.head, { childList: true, subtree: true, characterData: true })
      return () => observer.disconnect()
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
