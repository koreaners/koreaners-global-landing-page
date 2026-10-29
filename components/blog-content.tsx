'use client'

import Navigation from '@/components/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BlogPost } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionTag } from '@/components/ui/section-tag'
import { ShaderBackdrop } from '@/components/ui/shader-backdrop'
import { SafeImage } from '@/components/ui/SafeImage'
import { resolveThumbnailSrc } from '@/lib/thumbnail'
import { blogArtSrc, isGenericBlogThumbnail } from '@/lib/blog-art'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { getBlogTitle } from '@/lib/localized-content'

const POSTS_PER_PAGE = 9

interface BlogContentProps {
  initialPosts: BlogPost[]
  currentPage: number
}

function BlogContent({ initialPosts, currentPage }: BlogContentProps) {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  const totalPages = Math.ceil(initialPosts.length / POSTS_PER_PAGE)
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const endIndex = startIndex + POSTS_PER_PAGE
  const blogPosts = initialPosts.slice(startIndex, endIndex)

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 sm:pt-40 pb-12 sm:pb-16 py-24 md:py-32 lg:py-40 px-6 lg:px-24 w-full max-w-full overflow-hidden relative hero-glow">
        <ShaderBackdrop variant="hero-sub" seed={4} className="absolute!" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-12 sm:mb-16">
            <SectionTag variant="dark">BLOG</SectionTag>
            <div className="mb-8" />
            <h1 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              <span>{t('blogHeroTitle')}</span>
              <span className="gradient-warm-text">{t('blogHeroTitle2')}</span>
            </h1>
            <p className="text-lg text-[#A8A29E] max-w-2xl mt-6">
              {t('blogHeroDesc')}
            </p>
          </div>

          {/* Blog Grid */}
          {initialPosts.length === 0 ? (
            <div className="text-center py-20">
              <div className="space-y-3">
                <div className="text-white/80 text-4xl">📝</div>
                <p className="text-white/80 text-lg">{t('blogEmpty')}</p>
                <p className="text-white/60 text-sm">{t('blogEmptySub')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-20">
                {blogPosts.map((post) => (
                <article key={post.id} className="h-full">
                  <Link href={`/blog/${post.slug}`} className="block h-full">
                    <Card
                      className="group overflow-hidden bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300 cursor-pointer h-full flex flex-col py-0 gap-0 sm:py-6 sm:gap-6"
                    >
                      {/* Image — 고유 썸네일 → 카테고리 아트 → 기본 아트 폴백 체인 */}
                      <div className="aspect-video relative overflow-hidden bg-surface-1">
                        <SafeImage
                          src={
                            isGenericBlogThumbnail(post.thumbnail_url)
                              ? blogArtSrc(post.category)
                              : resolveThumbnailSrc(post.thumbnail_url)
                          }
                          alt={`${getBlogTitle(post, locale)} - ${post.category}`}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/60 via-transparent to-transparent pointer-events-none z-[5]" />
                        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                          <Badge variant="secondary" className="text-xs bg-surface-1 text-white/80 border-border">{post.category}</Badge>
                        </div>
                      </div>

                      {/* Content: KR/JP 동일 여백 유지, 줄바꿈으로 넘침 방지 */}
                      <div className="p-4 sm:p-6 flex-1 flex flex-col min-w-0 overflow-hidden">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 group-hover:text-white transition-colors leading-tight tracking-tight break-words pr-1">
                          {getBlogTitle(post, locale)}
                        </h2>
                        <div className="mt-auto pt-3 sm:pt-4 border-t border-border flex items-center justify-between">
                          <time className="text-xs text-[#A8A29E] flex items-center gap-1" dateTime={post.created_at}>
                            <Calendar className="h-3 w-3" />
                            {new Date(post.created_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'ko-KR')}
                          </time>
                          <span className="text-xs text-[#FF4500] flex items-center gap-1 group-hover:gap-2 transition-all">
                            {t('read')}
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </article>
              ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12 mb-8">
                  <Link
                    href={currentPage > 1 ? `/blog?page=${currentPage - 1}` : '#'}
                    aria-disabled={currentPage === 1}
                    className={`inline-flex items-center justify-center gap-1 h-10 px-4 rounded-md border border-border bg-surface-1 text-white text-sm hover:bg-white/10 hover:text-white hover:border-border ${currentPage === 1 ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('prev')}
                  </Link>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // 현재 페이지 주변 2페이지씩만 표시
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        const isActive = page === currentPage
                        return (
                          <Link
                            key={page}
                            href={`/blog?page=${page}`}
                            className={`inline-flex items-center justify-center min-w-[44px] h-10 px-4 rounded-md text-sm ${
                              isActive
                                ? 'gradient-warm text-white hover:opacity-90'
                                : 'border border-border bg-surface-1 text-white hover:bg-white/10 hover:text-white hover:border-border'
                            }`}
                          >
                            {page}
                          </Link>
                        )
                      } else if (
                        page === currentPage - 3 ||
                        page === currentPage + 3
                      ) {
                        return (
                          <span key={page} className="px-2 text-[#A8A29E]">
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                  </div>

                  <Link
                    href={currentPage < totalPages ? `/blog?page=${currentPage + 1}` : '#'}
                    aria-disabled={currentPage === totalPages}
                    className={`inline-flex items-center justify-center gap-1 h-10 px-4 rounded-md border border-border bg-surface-1 text-white text-sm hover:bg-white/10 hover:text-white hover:border-border ${currentPage === totalPages ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {t('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}

export default function BlogPageContent({ initialPosts, currentPage }: BlogContentProps) {
  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />
      <BlogContent initialPosts={initialPosts} currentPage={currentPage} />
    </main>
  )
}
