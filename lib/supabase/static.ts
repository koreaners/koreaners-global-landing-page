import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Portfolio } from '@/lib/supabase'

// ISR/SSG 페이지용 읽기 전용 Supabase 클라이언트
// cookies()를 사용하지 않으므로 정적 렌더링/ISR이 가능
export function createStaticClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createSupabaseClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
  )
}

/** 홈 히어로·포트폴리오 섹션용 최신 포트폴리오 (실패 시 빈 배열 — 섹션은 비어도 성립) */
export async function getLatestPortfolios(limit = 9): Promise<Portfolio[]> {
  try {
    const { data, error } = await createStaticClient()
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  } catch (err: any) {
    console.error('[Home] 포트폴리오 조회 실패: ' + (err?.message || '알 수 없는 에러'))
    return []
  }
}
