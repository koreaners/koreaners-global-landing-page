import { Client } from '@notionhq/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { absent, addMonth, SKIP, thisMonth, type Absent, type Att, type Leave, type Member } from './time'
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

// 미출근 명단: 노션 「구성원 (결재 조직도)」 재직자(출퇴근 봇 hr.org()와 같은 DB). 휴가: hr_leave_uses 예약, 사용(봇과 같은 상태)
const MEMBER_DS = '73cb2d1b-4a7c-4e36-ba1d-bb5383d0f5b7'
type Prop = { type: string; [k: string]: any }

async function roster(): Promise<Member[]> {
  const notion = new Client({ auth: process.env.NOTION_TOKEN })
  const text = (p?: Prop) => ((p?.[p.type] ?? []) as { plain_text: string }[]).map((t) => t.plain_text).join('').trim()
  const out: Member[] = []
  let cursor: string | undefined
  do {
    const res = await notion.dataSources.query({
      data_source_id: MEMBER_DS,
      filter: { property: '재직', select: { equals: '재직' } },
      start_cursor: cursor,
      page_size: 100,
    })
    for (const x of res.results as unknown as { properties: Record<string, Prop> }[]) {
      const p = x.properties
      const slack = text(p['슬랙 ID'])
      if (slack) out.push({ slack, name: text(p['이름']), email: p['이메일']?.email ?? '', joined: p['입사일']?.date?.start?.slice(0, 10) ?? null })
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return out
}

async function leaves(m: string): Promise<Leave[]> {
  const { data, error } = await createAdminClient()
    .from('hr_leave_uses')
    .select('member_email, type_code, start_date, end_date')
    .in('status', ['reserved', 'used'])
    .lt('start_date', `${addMonth(m, 1)}-01`)
    .gte('end_date', `${m}-01`)
  if (error) throw new Error(`휴가 기록 조회 실패: ${error.message}`)
  return (data ?? []) as Leave[]
}

type SlackUser = { id: string; name?: string; real_name?: string; profile?: { display_name?: string; real_name?: string } }

// 이름: 슬랙 표시 이름(슬랙 ID로 users.list, 1시간 캐시). 못 읽으면 회사 메일 앞부분, 그것도 없으면 slack id
async function slackNames(): Promise<Record<string, string>> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return {}
  try {
    const res = await fetch('https://slack.com/api/users.list?limit=500', {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    })
    const j = (await res.json()) as { ok: boolean; error?: string; members?: SlackUser[] }
    if (!j.ok) {
      console.error(`[attendance] users.list ${j.error}`)
      return {}
    }
    const out: Record<string, string> = {}
    for (const u of j.members ?? []) {
      const n = u.profile?.display_name || u.profile?.real_name || u.real_name || u.name
      if (n) out[u.id] = n
    }
    return out
  } catch (e) {
    console.error('[attendance] users.list failed', e)
    return {}
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
  // 미출근은 명단이나 휴가를 못 읽으면 빼고(null) 표는 그대로 보여 줌
  const [slack, absents] = await Promise.all([
    slackNames(),
    Promise.all([roster(), leaves(m)]).then(
      ([ms, ls]) => ({ list: absent(ms, rows, ls, m), ms }),
      (e) => {
        console.error('[attendance] absent failed', e)
        return null
      },
    ),
  ])
  // 정정자(fix_by)도 같은 표로 찾음
  const names: Record<string, string> = {}
  for (const r of rows) names[r.slack_id] = slack[r.slack_id] || r.member_email?.split('@')[0] || names[r.slack_id] || r.slack_id
  for (const p of absents?.ms ?? []) if (!SKIP.has(p.slack)) names[p.slack] ??= slack[p.slack] || p.name || p.slack
  if (sp.u) names[sp.u] ??= slack[sp.u] || sp.u
  const missed: Absent[] | null = absents?.list ?? null
  return <AttendanceView m={m} u={sp.u || undefined} rows={rows} absents={missed} names={names} />
}
