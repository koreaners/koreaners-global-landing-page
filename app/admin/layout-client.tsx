'use client'

import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogOut, ExternalLink, FileText } from 'lucide-react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/admin" className="text-sm font-semibold tracking-tight text-neutral-50">
            KOREANERS
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/admin/reports" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">보고서</span>
            </Link>
            <Link href="/" target="_blank" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300">
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">사이트</span>
            </Link>
            <button onClick={handleSignOut} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300">
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
