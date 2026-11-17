import type { Metadata } from 'next'
import { AdminLayoutClient } from './layout-client'
import { cookies } from 'next/headers'
import { adminRole } from '@/lib/supabase/role'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '어드민',
  robots: { index: false, follow: false },
}

/**
 * Admin Layout
 * 인증은 middleware.ts에서 처리 (리다이렉트 루프 방지)
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 역할은 메뉴 표시용으로만 넘김(접근 통제는 proxy.ts와 각 페이지)
  // 라이트/다크는 쿠키(admin-theme)로 서버에서 정해 첫 그림부터 맞춤(깜빡임 없음)
  const theme = (await cookies()).get('admin-theme')?.value === 'light' ? 'light' : 'dark'
  return <AdminLayoutClient role={await adminRole()} theme={theme}>{children}</AdminLayoutClient>
}
