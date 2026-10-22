'use client'

// 관리자 페이지는 빌드 타임에 정적으로 생성하지 않고 런타임에 동적으로 생성
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSession, signInWithGoogle, signOut } from '@/lib/admin-auth'
import { useToast } from '@/hooks/use-toast'

// 로그인은 회사 구글 계정(koreaners.com)만. 들어온 뒤 역할 판정은 proxy(admin 전체, exec 보고서와 재무)
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // 이미 인증된 경우 대시보드로 리다이렉트
    async function checkAuth() {
      try {
        // 권한 없는 계정으로 들어온 경우: 세션을 지우고 머문다 (리다이렉트 루프 방지)
        if (new URLSearchParams(window.location.search).has('denied')) {
          await signOut()
          toast({ title: '접근 권한 없음', description: '관리자 권한이 있는 회사 계정으로 로그인해 주세요.', variant: 'destructive' })
          return
        }
        const session = await getSession()
        if (session) {
          router.push('/admin')
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Admin] 세션 확인 오류:', error instanceof Error ? error.message : '')
        }
      }
    }
    checkAuth()
  }, [router, toast])

  async function handleGoogle() {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      toast({ title: '구글 로그인 실패', description: error.message, variant: 'destructive' })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-card border-border">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">관리자 로그인</h1>
            <p className="text-muted-foreground mt-2">회사 구글 계정(koreaners.com)으로 로그인하세요</p>
          </div>
          <Button type="button" variant="outline" size="lg" className="w-full gap-3" disabled={loading} onClick={handleGoogle}>
            <GoogleLogo />
            {loading ? '구글로 이동 중...' : 'Google 계정으로 로그인'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
