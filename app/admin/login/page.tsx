'use client'

// 관리자 페이지는 빌드 타임에 정적으로 생성하지 않고 런타임에 동적으로 생성
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { getSession, signIn, signOut } from '@/lib/admin-auth'
import { useToast } from '@/hooks/use-toast'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // 환경 변수 체크
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Admin] Supabase 환경 변수 누락')
      }
      toast({
        title: '환경 변수 오류',
        description: 'Supabase 연결 설정이 올바르지 않습니다. .env.local 파일을 확인해주세요.',
        variant: 'destructive',
      })
    }
  }, [toast])

  useEffect(() => {
    // 이미 인증된 경우 대시보드로 리다이렉트
    async function checkAuth() {
      try {
        // 권한 없는 계정으로 들어온 경우: 세션을 지우고 머문다 (리다이렉트 루프 방지)
        if (new URLSearchParams(window.location.search).has('denied')) {
          await signOut()
          toast({ title: '접근 권한 없음', description: '어드민 권한이 있는 계정으로 로그인해 주세요.', variant: 'destructive' })
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
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // 환경 변수 재확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      const errorMsg = 'Supabase 연결 설정이 올바르지 않습니다. .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.'
      
      alert('환경 변수 오류\n\n' + errorMsg)
      toast({
        title: '환경 변수 오류',
        description: errorMsg,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Admin] 로그인 실패:', error.message ?? '')
        }
        const errorMsg = error.message || '이메일 또는 비밀번호가 올바르지 않습니다.'
        
        // alert로 즉시 알림
        alert('로그인 실패\n\n' + errorMsg)
        
        toast({
          title: '로그인 실패',
          description: errorMsg,
          variant: 'destructive',
        })
        setPassword('')
        return
      }

      // 에러가 없고 세션이 있는 경우: 로그인 성공 처리 및 페이지 이동
      if (data?.session) {
        console.log('✅ 로그인 성공:', {
          user: data.user?.email,
          session: !!data.session,
          fullData: data,
        })
        
        // 세션이 브라우저에 확실히 안착했는지 확인
        try {
          const verifiedSession = await getSession()
          
          if (!verifiedSession) {
            console.warn('⚠️ 세션이 브라우저에 저장되지 않음, 잠시 대기 후 재시도')
            // 잠시 대기 후 재확인
            await new Promise(resolve => setTimeout(resolve, 500))
            const retrySession = await getSession()
            
            if (!retrySession) {
              console.error('❌ 세션 저장 실패, 강제 새로고침으로 이동')
              window.location.href = '/admin'
              return
            }
            console.log('✅ 재시도 후 세션 확인됨')
          } else {
            console.log('✅ 세션 확인됨:', { userId: verifiedSession.user.id })
          }
        } catch (sessionError) {
          console.error('❌ 세션 확인 중 예외:', sessionError)
          // 세션 확인 실패해도 이동 시도
        }
        
        // 성공 토스트 표시
        toast({
          title: '로그인 성공',
          description: '관리자 패널로 이동합니다.',
        })

        // 세션 정보 새로고침: Middleware가 로그인 사실을 즉시 인지하도록 (먼저 실행)
        // await를 사용하여 refresh가 완료된 후 이동
        try {
          await router.refresh()
          console.log('✅ router.refresh() 완료')
        } catch (refreshError) {
          console.error('⚠️ router.refresh() 오류:', refreshError)
        }

        // 페이지 이동: 관리자 메인 페이지로 이동
        // Next.js router.push가 실패할 경우를 대비해 window.location.href로 강제 이동
        try {
          router.push('/admin')
          console.log('✅ router.push(/admin) 실행됨')
          
          // router.push가 실패할 경우를 대비한 fallback (2초 후 강제 이동)
          setTimeout(() => {
            if (window.location.pathname === '/admin/login') {
              console.warn('⚠️ router.push 실패 감지, window.location.href로 강제 이동')
              window.location.href = '/admin'
            }
          }, 2000)
        } catch (pushError) {
          console.error('❌ router.push 실패, window.location.href로 강제 이동:', pushError)
          window.location.href = '/admin'
        }
        
        return
      }

      // 세션이 없는 경우: 예상치 못한 상황
      console.warn('⚠️ 로그인 응답에 세션이 없습니다:', data)
      const errorMsg = '세션을 생성할 수 없습니다. 다시 시도해주세요.'
      
      alert('로그인 실패\n\n' + errorMsg)
      toast({
        title: '로그인 실패',
        description: errorMsg,
        variant: 'destructive',
      })
    } catch (error) {
      // 예외 발생 시: 에러 처리
      console.error('❌ 로그인 중 예외 발생:', error)
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      
      alert('오류 발생\n\n' + errorMsg)
      toast({
        title: '오류 발생',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      // 반드시 실행: 로딩 상태 강제 종료 (무한 로딩 방지)
      setLoading(false)
      console.log('🔄 로딩 상태 해제됨')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-8">
      <Card className="w-full max-w-md p-4 sm:p-6 md:p-8 bg-card border-border">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">관리자 로그인</h1>
            <p className="text-muted-foreground mt-2">
              이메일과 비밀번호를 입력하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
