import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET } from '@/lib/reports'
import { UploadReport } from './upload'

export const dynamic = 'force-dynamic'

// 비공개 버킷의 HTML 보고서 목록. 읽기 권한은 storage RLS(app_metadata.role admin, exec)가 정한다.
export default async function ReportsPage() {
  const supabase = await createClient()
  const [{ data: files, error }, { data: { user } }] = await Promise.all([
    supabase.storage.from(REPORTS_BUCKET).list('', { sortBy: { column: 'updated_at', order: 'desc' } }),
    supabase.auth.getUser(),
  ])
  const isAdmin = user?.app_metadata?.role === 'admin'
  const reports = (files ?? []).filter((f) => f.name.endsWith('.html'))

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">보고서</h1>
        <p className="text-sm text-neutral-500">경영진, 리더십 공유용 보고서</p>
      </div>

      {isAdmin && <UploadReport />}

      {error && <p className="text-sm text-red-400">목록을 불러오지 못했습니다: {error.message}</p>}
      {!error && reports.length === 0 && <p className="text-sm text-neutral-500">올라온 보고서가 없습니다.</p>}

      <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
        {reports.map((f) => (
          <li key={f.name}>
            <Link
              href={`/admin/reports/view?name=${encodeURIComponent(f.name)}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-800/60"
            >
              <span className="flex items-center gap-2 text-sm text-neutral-100">
                <FileText className="h-4 w-4 text-neutral-500" />
                {f.name.replace(/\.html$/, '')}
              </span>
              <span className="text-xs text-neutral-500">
                {f.updated_at ? new Date(f.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
