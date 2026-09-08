/**
 * llms-full.txt — llms.txt 본문 + 블로그 글·포트폴리오 사례 전체 목록
 * https://llmstxt.org/ 사양의 확장 파일. 데이터 소스는 sitemap.ts 와 동일(Supabase static client).
 */
import { GET as llmsTxt } from '../llms.txt/route'
import { createStaticClient } from '@/lib/supabase/static'

const baseUrl = 'https://www.koreaners.co'

// 목록 한 줄이 깨지지 않도록 개행/연속 공백 제거 + 길이 제한
function oneLine(text: string | null | undefined, fallback: string): string {
  const clean = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const value = clean || fallback
  return value.length > 120 ? `${value.slice(0, 119)}…` : value
}

export async function GET() {
  const base = await llmsTxt().text()

  const blogLines: string[] = []
  const portfolioLines: string[] = []

  try {
    const supabase = createStaticClient()

    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('slug, title, meta_description, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: false })

    if (blogError) {
      console.error('[llms-full] blog_posts query failed:', blogError.message)
    }
    for (const post of blogPosts || []) {
      blogLines.push(`- [${post.title}](${baseUrl}/blog/${post.slug}): ${oneLine(post.meta_description, post.title)}`)
    }

    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, title, client_name, summary, published_at, created_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (portfolioError) {
      console.error('[llms-full] portfolios query failed:', portfolioError.message)
    }
    for (const p of portfolios || []) {
      portfolioLines.push(
        `- [${p.title}](${baseUrl}/portfolio/${p.id}): ${oneLine(p.summary, `${p.client_name} 일본 마케팅 캠페인 사례`)}`,
      )
    }
  } catch (error) {
    console.error('[llms-full] Supabase query failed:', error)
  }

  const content = `${base}
## 블로그 전체 목록

${blogLines.join('\n') || '- (현재 공개된 글이 없습니다)'}

## 포트폴리오 전체 목록

${portfolioLines.join('\n') || '- (현재 공개된 사례가 없습니다)'}
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
