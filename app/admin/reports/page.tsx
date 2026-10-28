import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET, parseReportKey } from '@/lib/reports'

export const dynamic = 'force-dynamic'

const WD = ['일', '월', '화', '수', '목', '금', '토']
// '2026-10-12' -> '10. 12.(월)'
const day = (iso: string) => `${+iso.slice(5, 7)}. ${+iso.slice(8)}.(${WD[new Date(`${iso}T12:00:00Z`).getUTCDay()]})`

// 비공개 버킷의 보고서 목록(brain-weekly 가 매주 월 07:00 올림). 읽기 권한은 storage RLS(app_metadata.role admin, exec)가 정한다.
export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: files, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .list('', { sortBy: { column: 'name', order: 'desc' } })
  const reports = (files ?? []).flatMap((f) => {
    const k = parseReportKey(f.name)
    return k ? [{ ...k, name: f.name, updated: f.updated_at }] : []
  }).sort((a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start)) // 키 이름순이면 10/19~ 가 10/1~10/31 마감보다 위로 온다

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">경영진 보고서</h1>
        <p className="text-sm text-neutral-500">매주 월요일 07:00에 이번 달 1일부터 지난 일요일까지 누적 리포트가 올라옵니다. 달 첫 주에는 지난달 마감 리포트입니다.</p>
      </div>

      {error && <p className="text-sm text-red-400">목록을 불러오지 못했습니다: {error.message}</p>}
      {!error && reports.length === 0 && <p className="text-sm text-neutral-500">올라온 보고서가 없습니다.</p>}

      {reports.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">보고서</th>
                <th className="px-4 py-2.5 font-medium">기간</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">만든 시각</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {reports.map((r, i) => (
                <tr key={r.name} className="group relative hover:bg-neutral-900/60">
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    <Link href={`/admin/reports/view?name=${encodeURIComponent(r.name)}`} className="after:absolute after:inset-0">
                      {r.title}
                    </Link>
                    {i === 0 && <span className="ml-2 rounded bg-sky-950 px-1.5 py-0.5 text-[11px] text-sky-300">최신</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-400">
                    {r.start.slice(0, 4)}. {day(r.start)} ~ {day(r.end)}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-neutral-500 sm:table-cell">
                    {r.updated ? new Date(r.updated).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </td>
                  <td className="pr-3 text-neutral-600 group-hover:text-neutral-300">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
