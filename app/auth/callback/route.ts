import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 구글 로그인에서 돌아오는 곳. code 를 세션 쿠키로 바꾸고 /admin 으로 보낸다(역할 확인과 exec 의 보고서 이동은 proxy).
// 실패하면 로그인 화면으로
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL('/admin', url.origin))
  }
  return NextResponse.redirect(new URL('/admin/login', url.origin))
}
