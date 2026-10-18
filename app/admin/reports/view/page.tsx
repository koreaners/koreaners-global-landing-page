import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET } from '@/lib/reports'

export const dynamic = 'force-dynamic'

export default async function ReportViewPage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name = '' } = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(REPORTS_BUCKET).download(name)
  const html = data ? await data.text() : ''

  return (
    <div className="space-y-4">
      <Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300">
        <ArrowLeft className="h-3 w-3" /> 보고서 목록
      </Link>
      {error || !data ? (
        <p className="text-sm text-red-400">보고서를 열 수 없습니다.</p>
      ) : (
        // allow-same-origin 을 주지 않는다: 올린 HTML 이 어드민 세션 쿠키나 부모 창에 접근하지 못하게
        // 보고서 카드를 누르면 같은 탭에서 어드민 화면으로 넘어가도록, 사용자가 누를 때만 상위 창 이동 허용(올리기는 admin 만)
        <iframe
          title={name}
          srcDoc={html}
          sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation"
          className="h-[85vh] w-full rounded-xl border border-neutral-800 bg-white"
        />
      )}
    </div>
  )
}
