import { supabase } from './supabase/client'

// 클라이언트 사이드: 현재 세션 확인
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// 클라이언트 사이드: 로그인
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// 클라이언트 사이드: 구글 로그인(koreaners.com 계정). 돌아오는 곳은 /auth/callback, 역할별 이동은 proxy
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { hd: 'koreaners.com', prompt: 'select_account' },
    },
  })
}

// 클라이언트 사이드: 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}
