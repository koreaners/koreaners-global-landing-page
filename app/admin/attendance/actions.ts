'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { editorOf, fixTimes } from './time'

// 근태 정정(인혁, 건우만). 정정 칸(fix_*)에만 쓰고 봇이 쓰는 처음 기록(first_at, last_at)은 두므로 봇 탭과 겹치지 않음.
// 기록이 없는 날(미출근)은 source 'fix', taps 0 줄을 새로 만듦. 지우기: 탭이 0인 줄(정정, auto8로 만든 줄)은 줄째 지우고, 탭이 있으면 정정 칸만 비움
export async function fixAttendance(fd: FormData) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  const by = editorOf(user?.email)
  if (!by) throw new Error('권한 없음')
  const s = (k: string) => String(fd.get(k) ?? '').trim()
  const slack = s('slack_id')
  const day = s('workday')
  if (!/^U[A-Z0-9]+$/.test(slack) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('잘못된 요청')
  const back = (o: Record<string, string> = {}) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ m: s('m'), u: s('u'), d: s('d'), ...o })) if (v) p.set(k, v)
    return `/admin/attendance?${p}#att-list`
  }

  const db = createAdminClient()
  const { data: cur, error } = await db.from('hr_attendance').select('id, taps').eq('slack_id', slack).eq('workday', day).maybeSingle()
  if (error) throw new Error(`근태 조회 실패: ${error.message}`)

  if (s('op') === 'clear') {
    if (cur) {
      const q =
        cur.taps === 0
          ? db.from('hr_attendance').delete().eq('id', cur.id)
          : db.from('hr_attendance').update({ fix_first_at: null, fix_last_at: null, fix_by: null, fix_note: null }).eq('id', cur.id)
      const { error: e } = await q
      if (e) throw new Error(`정정 지우기 실패: ${e.message}`)
    }
    redirect(back())
  }

  let t: { first: string; last: string }
  try {
    t = fixTimes(day, s('first'), s('last'))
  } catch (e) {
    redirect(back({ e: `${slack}:${day}`, err: e instanceof Error ? e.message : String(e) }))
  }
  const fix = { fix_first_at: t.first, fix_last_at: t.last, fix_by: by, fix_note: s('note').slice(0, 200) || null, updated_at: new Date().toISOString() }
  const email = s('email')
  const { error: e } = cur
    ? await db.from('hr_attendance').update(fix).eq('id', cur.id)
    : await db.from('hr_attendance').insert({
        slack_id: slack,
        member_email: /^[^@\s]+@[^@\s]+$/.test(email) ? email : null,
        workday: day,
        first_at: t.first,
        last_at: t.last,
        taps: 0,
        source: 'fix',
        ...fix,
      })
  if (e) throw new Error(`정정 저장 실패: ${e.message}`)
  redirect(back())
}
