'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogOut, ExternalLink, FileText, LayoutDashboard, CalendarDays, Briefcase, Users, UserCog, ListChecks, TrendingUp, Banknote } from 'lucide-react'
import Link from 'next/link'

// 재무 메뉴는 /admin/finance 의 tab 쿼리. 고른 연도(y), 월(m), 집계 기준(b)은 메뉴를 옮겨도 유지
const FINANCE = [
  ['summary', '개요', LayoutDashboard],
  ['calendar', '자금 캘린더', CalendarDays],
  ['contracts', '안건', Briefcase],
  ['creators', '크리에이터', Users],
  ['owners', '담당자', UserCog],
  ['basis', '기준', ListChecks],
  ['funnel', '퍼널 추이', TrendingUp],
] as const

const item = (active: boolean) =>
  `flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
    active ? 'bg-neutral-800/70 text-neutral-50' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
  }`

function Nav({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname()
  const sp = useSearchParams()
  const inFinance = pathname.startsWith('/admin/finance')
  const tab = sp.get('tab') ?? 'summary'
  const href = (k: string) => {
    const s = new URLSearchParams({ tab: k })
    for (const key of ['y', 'm', 'b']) {
      const v = inFinance ? sp.get(key) : null
      if (v) s.set(key, v)
    }
    return `/admin/finance?${s}`
  }
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
      <p className="hidden px-3 pb-1 pt-2 text-xs text-neutral-600 md:block">재무</p>
      {FINANCE.map(([k, label, Icon]) => (
        <Link key={k} href={href(k)} className={item(inFinance && tab === k)}>
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
      <Link href="/admin/payouts" className={item(pathname.startsWith('/admin/payouts'))}>
        <Banknote className="h-4 w-4" />
        정산 마스터
      </Link>
      <p className="hidden px-3 pb-1 pt-4 text-xs text-neutral-600 md:block">보고</p>
      <Link href="/admin/reports" className={item(pathname.startsWith('/admin/reports'))}>
        <FileText className="h-4 w-4" />
        경영진 보고서
      </Link>
      <div className="flex gap-1 md:mt-auto md:flex-col md:border-t md:border-neutral-800 md:pt-3">
        <Link href="/" target="_blank" className={item(false)}>
          <ExternalLink className="h-4 w-4" />
          사이트
        </Link>
        <button onClick={onSignOut} className={item(false)}>
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </nav>
  )
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    // 전역 css의 html, body overflow-x: hidden 때문에 sticky가 안 먹어, 화면 높이 껍데기 안에서 main만 스크롤
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950 md:flex-row">
      <aside className="z-50 flex shrink-0 flex-col gap-3 border-b border-neutral-800 bg-neutral-950 px-3 py-3 md:w-56 md:border-b-0 md:border-r md:py-5">
        <Link href="/admin" className="px-3 text-sm font-semibold tracking-tight text-neutral-50">
          KOREANERS
        </Link>
        <Suspense>
          <Nav onSignOut={handleSignOut} />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        <div className={`mx-auto ${pathname.startsWith('/admin/finance') || pathname.startsWith('/admin/payouts') || pathname.startsWith('/admin/reports/view') ? 'max-w-7xl' : 'max-w-5xl'}`}>{children}</div>
      </main>
    </div>
  )
}
