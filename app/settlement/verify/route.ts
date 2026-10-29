import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 로그인 메일 링크: token_hash를 세션으로 바꾸고 정산 화면으로(요청한 기기와 다른 기기에서 열어도 됨)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const lang = q.get('lang') ?? ''
  const token_hash = q.get('token_hash')
  const back = new URL(`/settlement${lang ? `?lang=${encodeURIComponent(lang)}` : ''}`, request.url)
  if (token_hash) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    if (!error) return NextResponse.redirect(back)
  }
  back.searchParams.set('expired', '1')
  return NextResponse.redirect(back)
}
