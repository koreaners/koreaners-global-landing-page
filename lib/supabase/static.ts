import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
