import type { Metadata } from 'next'
import BlogPageContent from '@/components/blog-content'
import { safeJsonLdStringify } from '@/lib/json-ld'
import { createStaticClient } from '@/lib/supabase/static'
import type { BlogPost } from '@/lib/supabase'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koreaners.co'

// 페이지네이션 canonical — ?page=2 이상은 자기 자신을 canonical 로 (page=1/무인자는 /blog)
export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1)
  const canonical = currentPage > 1 ? `${siteUrl}/blog?page=${currentPage}` : `${siteUrl}/blog`

  return {
    title: '블로그 | 일본 마케팅 인사이트 & 트렌드',
    description:
      '일본 인플루언서 마케팅 비용 가이드, 플랫폼별 전략, 업종별 사례 등 일본 시장 진출에 필요한 실전 인사이트를 제공합니다.',
    alternates: { canonical },
    openGraph: {
      title: '코리너스 블로그 | 일본 마케팅 인사이트',
      description: '일본 인플루언서 마케팅 비용, 전략, 사례. 크로스보더 마케팅 전문가의 실전 인사이트.',
      url: canonical,
    },
  }
}

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Blog Index] 에러: ' + (error.message || '알 수 없는 에러'))
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    console.error('[Blog Index] 에러: ' + (err?.message || '알 수 없는 에러'))
    return []
  }
}

export const revalidate = 3600 // 1시간 ISR

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1)
  const initialPosts = await getBlogPosts()

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '블로그' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumb) }}
      />
      <BlogPageContent initialPosts={initialPosts} currentPage={currentPage} />
    </>
  )
}
