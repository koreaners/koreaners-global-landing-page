import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET, parseReportKey, type WeeklyReport } from '@/lib/reports'
import { ReportView } from './report-view'

export const dynamic = 'force-dynamic'

export default async function ReportViewPage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name = '' } = await searchParams
  const back = (
    <Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300">
      <ArrowLeft className="h-3 w-3" /> 보고서 목록
    </Link>
  )
  let r: WeeklyReport | null = null
  if (parseReportKey(name)) {
    const supabase = await createClient()
    const { data } = await supabase.storage.from(REPORTS_BUCKET).download(name)
    try {
      const j = data ? JSON.parse(await data.text()) : null
      if (j?.version === 1) r = j
    } catch {}
  }
  if (!r) return <div className="space-y-4">{back}<p className="text-sm text-red-400">보고서를 열 수 없습니다.</p></div>
  return <ReportView r={r} back={back} />
}
