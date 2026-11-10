import type { Metadata } from 'next'
import { AdminLayoutClient } from './layout-client'
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
  return <AdminLayoutClient role={await adminRole()}>{children}</AdminLayoutClient>
}
