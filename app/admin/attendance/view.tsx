import Link from 'next/link'
import { AutoForm } from '../finance/auto-form'
import { Info, Table, td, tdl } from '../finance/ui'
import { addMonth, dayLabel, hm, kstDate, view, type Att } from './time'

const WORK_TIP = '출근부터 퇴근까지 머문 시간에서 휴게를 뺀 시간입니다. 머문 시간이 5시간 이상이면 1시간, 4시간 30분 이상이면 30분을 빼고, 그 미만은 빼지 않습니다(슬랙 출퇴근 봇과 같은 계산).'
const STATE_TIP = '누락: 출근과 마지막 기록이 1시간 안이라 퇴근 기록이 없는 날입니다. 정정: 고친 날이며(빠진 평일을 8시간 근무로 자동으로 채운 날 포함), ⓘ에 처음 기록과 정정자가 있습니다.'

const badge = 'rounded px-1.5 py-0.5 text-[11px]'

/** 근무일 다음 날 새벽 시각은 (+1) */
const time = (iso: string, day: string) => `${hm(iso)}${kstDate(iso) > day ? '(+1)' : ''}`

export function AttendanceView({ m, u, rows, names }: { m: string; u?: string; rows: Att[]; names: Record<string, string> }) {
  // auto8: 봇이 빠진 평일을 8시간 근무로 채운 줄(인혁, 건우, 보람)
  const name = (id: string) => (id === 'auto8' ? '자동(8시간)' : names[id] ?? id)
  const shown = u ? rows.filter((r) => r.slack_id === u) : rows
  const people = Object.entries(names).sort((a, b) => a[1].localeCompare(b[1], 'ko'))
  const link = (ym: string) => `/admin/attendance?${new URLSearchParams({ m: ym, ...(u ? { u } : {}) })}`
  const fixTip = (r: Att) =>
    [
      r.source === 'fix' ? '처음 기록: 없음(정정으로 만든 줄)' : `처음 기록: 출근 ${time(r.first_at, r.workday)}, 퇴근 ${time(r.last_at, r.workday)}`,
      `정정자: ${name(r.fix_by!)}`,
      r.fix_note ? `메모: ${r.fix_note}` : null,
    ]
      .filter(Boolean)
      .join('. ')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">근태</h1>
          <p className="text-sm text-neutral-500">슬랙 출퇴근 봇 기록입니다. 하루는 05:00에 바뀌고, 정정 요청은 #96-근태-휴가에서 상위 조직장을 태그해 받습니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={link(addMonth(m, -1))} className="rounded-md bg-neutral-800 px-2 py-1 text-neutral-200 hover:bg-neutral-700">이전 달</Link>
          <AutoForm className="flex items-center gap-2" action="/admin/attendance">
            <input type="month" name="m" defaultValue={m} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200" />
            <select name="u" defaultValue={u ?? ''} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
              <option value="">전체</option>
              {people.map(([id, n]) => (
                <option key={id} value={id}>{n}</option>
              ))}
            </select>
          </AutoForm>
          <Link href={link(addMonth(m, 1))} className="rounded-md bg-neutral-800 px-2 py-1 text-neutral-200 hover:bg-neutral-700">다음 달</Link>
          <span className="text-xs text-neutral-500">{shown.length}건</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-neutral-500">이 기간 기록이 없습니다.</p>
      ) : (
        <Table head={['날짜', '이름', '출근', '퇴근', '근로시간(휴게 제외)', '탭 수', '상태']} left={2} tips={[undefined, undefined, undefined, undefined, WORK_TIP, undefined, STATE_TIP]}>
          {shown.map((r) => {
            const v = view(r)
            return (
              <tr key={`${r.slack_id}-${r.workday}`}>
                <td className={`${tdl} whitespace-nowrap tabular-nums`}>{dayLabel(r.workday)}</td>
                <td className={tdl}>{name(r.slack_id)}</td>
                <td className={td}>{time(v.first, r.workday)}</td>
                <td className={td}>{v.missing ? <span className={`${badge} bg-amber-950 text-amber-300`}>누락</span> : time(v.last, r.workday)}</td>
                <td className={td}>{v.worked ?? '—'}</td>
                <td className={td}>{r.taps}</td>
                <td className={td}>
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {v.missing && <span className={`${badge} bg-amber-950 text-amber-300`}>누락</span>}
                    {v.fixed && (
                      <>
                        <span className={`${badge} bg-sky-950 text-sky-300`}>정정</span>
                        <Info text={fixTip(r)} align="right" />
                      </>
                    )}
                  </span>
                </td>
              </tr>
            )
          })}
        </Table>
      )}
    </div>
  )
}
