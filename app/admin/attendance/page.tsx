import { createAdminClient } from '@/lib/supabase/admin'
import { addMonth, thisMonth, type Att } from './time'
import { AttendanceView } from './view'

// 근태: Supabase hr_attendance(슬랙 출퇴근 봇이 씀, RLS로 service_role만 읽음) 조회 전용 (관리자 전용, proxy가 exec를 막음)
export const dynamic = 'force-dynamic'

const COLS = 'slack_id, member_email, workday, first_at, last_at, taps, source, fix_first_at, fix_last_at, fix_by, fix_note'

async function load(m: string): Promise<Att[]> {
  const sb = createAdminClient()
  const out: Att[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('hr_attendance')
      .select(COLS)
      .gte('workday', `${m}-01`)
      .lt('workday', `${addMonth(m, 1)}-01`)
      .order('workday', { ascending: false })
      .order('first_at')
      .range(from, from + 999)
    if (error) throw new Error(`근태 기록 조회 실패: ${error.message}`)
    out.push(...((data ?? []) as Att[]))
    if ((data ?? []).length < 1000) return out
  }
}

// m: 달(YYYY-MM, 기본 이번 달), u: 사람(slack id)
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ m?: string; u?: string }> }) {
  const sp = await searchParams
  const m = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m ?? '') ? sp.m! : thisMonth()
  let rows: Att[]
  try {
    rows = await load(m)
  } catch (e) {
    return (
      <div className="space-y-2 rounded-xl border border-red-900 bg-red-950/40 p-6">
        <h1 className="text-base font-semibold text-red-300">근태 기록을 불러오지 못했습니다</h1>
        <p className="text-sm text-red-200/80">{e instanceof Error ? e.message : String(e)}</p>
      </div>
    )
  }
  // 이름 칸이 없어 회사 메일 앞부분으로 보임(메일이 없는 줄은 slack id). 정정자(fix_by)도 같은 표로 찾음
  const names: Record<string, string> = {}
  for (const r of rows) if (r.member_email || !names[r.slack_id]) names[r.slack_id] = r.member_email?.split('@')[0] || r.slack_id
  if (sp.u) names[sp.u] ??= sp.u
  return <AttendanceView m={m} u={sp.u || undefined} rows={rows} names={names} />
}
