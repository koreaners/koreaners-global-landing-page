import Link from 'next/link'
import { AutoForm } from '../finance/auto-form'
import { Info, Table, td, tdl } from '../finance/ui'
import { fixAttendance } from './actions'
import { addMonth, ATT_FROM, dayLabel, dayState, hm, kstDate, today, view as view0, type Absent, type Att } from './time'

const WORK_TIP = '출근부터 퇴근까지 머문 시간에서 휴게를 뺀 시간입니다. 머문 시간이 5시간 이상이면 1시간, 4시간 30분 이상이면 30분을 빼고, 그 미만은 빼지 않습니다(슬랙 출퇴근 봇과 같은 계산).'
const STATE_TIP = '미출근과 누락은 그날 자정이 지난 뒤에 판정합니다. 미출근: 출근 기록이 아예 없는 평일입니다(공휴일, 휴가 예약이나 사용 날, 입사 전은 뺌. 시간 연차는 출근하는 날이라 포함). 누락: 출근과 마지막 기록이 1시간 안이라 퇴근 기록이 없는 날입니다(자정 전에는 근무 중). 정정: 고친 날이며(빠진 평일을 8시간 근무로 자동으로 채운 날 포함), ⓘ에 처음 기록과 정정자가 있습니다.'
const LIST = 'att-list'
const EDIT = 'att-edit'

const badge = 'rounded px-1.5 py-0.5 text-[11px]'
const RING = { ok: 'ring-2 ring-inset ring-emerald-600', issue: 'ring-2 ring-inset ring-red-500', na: '' }

/** 근무일 다음 날 새벽 시각은 (+1) */
const time = (iso: string, day: string) => `${hm(iso)}${kstDate(iso) > day ? '(+1)' : ''}`

type Edit = { e?: string; err?: string; emails: Record<string, string> }

export function AttendanceView({ m, u, d, rows, absents, names, edit, at = Date.now() }: { m: string; u?: string; d?: string; rows: Att[]; absents: Absent[] | null; names: Record<string, string>; edit?: Edit; at?: number }) {
  // auto8: 봇이 빠진 평일을 8시간 근무로 채운 줄(인혁, 건우, 보람)
  const name = (id: string) => (id === 'auto8' ? '자동(8시간)' : names[id] ?? id)
  const mine = u ? rows.filter((r) => r.slack_id === u) : rows
  const missed = absents && absents.filter((a) => !u || a.slack_id === u)
  const people = Object.entries(names).sort((a, b) => a[1].localeCompare(b[1], 'ko'))
  const link = (o: { m?: string; d?: string; e?: string }, hash = '') =>
    `/admin/attendance?${new URLSearchParams(Object.entries({ m, u, ...o }).filter((kv): kv is [string, string] => !!kv[1]))}${hash}`
  const fixTip = (r: Att) =>
    [
      r.taps === 0 ? '처음 기록: 없음(정정이나 자동 채움으로 만든 줄)' : `처음 기록: 출근 ${time(r.first_at, r.workday)}, 퇴근 ${time(r.last_at, r.workday)}`,
      `정정자: ${name(r.fix_by!)}`,
      r.fix_note ? `메모: ${r.fix_note}` : null,
    ]
      .filter(Boolean)
      .join('. ')

  // 달력
  const [y, mo] = m.split('-').map(Number)
  const lead = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const now = today(at)
  const view = (r: Att) => view0(r, at)
  const on = (day: string) => ({ rs: mine.filter((r) => r.workday === day), as: missed && missed.filter((a) => a.workday === day) })

  // 목록: 고른 날(없으면 그 달 전체). 날짜별로 기록 줄 다음에 미출근 줄(이름순), sort 는 안정 정렬
  const pick = <T extends { workday: string }>(xs: T[]) => (d ? xs.filter((x) => x.workday === d) : xs)
  const recs = pick(mine)
  const abs = pick(missed ?? [])
  const lines: (Att | Absent)[] = [...recs, ...[...abs].sort((a, b) => name(a.slack_id).localeCompare(name(b.slack_id), 'ko'))].sort((a, b) => b.workday.localeCompare(a.workday))
  const nMissing = recs.filter((r) => view(r).missing).length

  // 고치는 줄
  const [es, ed] = edit?.e?.split(':') ?? []
  const target = es && ed ? (rows.find((r) => r.slack_id === es && r.workday === ed) ?? (absents?.some((a) => a.slack_id === es && a.workday === ed) ? null : undefined)) : undefined
  const tv = target ? view(target) : null
  const editLink = (slack: string, day: string) => link({ d, e: `${slack}:${day}` }, `#${EDIT}`)
  const head = ['날짜', '이름', '출근', '퇴근', '근로시간(휴게 제외)', '탭 수', '상태', ...(edit ? [''] : [])]
  const tips = [undefined, undefined, undefined, undefined, WORK_TIP, undefined, STATE_TIP]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">근태</h1>
        <p className="text-sm text-neutral-500">슬랙 출퇴근 봇 기록입니다. 하루는 05:00에 바뀌고, 정정 요청은 #96-근태-휴가에서 상위 조직장을 태그해 받습니다.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {m > ATT_FROM.slice(0, 7) ? (
            <Link href={link({ m: addMonth(m, -1) })} aria-label="이전 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">‹</Link>
          ) : (
            <span className="px-2 py-0.5 text-neutral-700">‹</span>
          )}
          <h2 className="text-base font-semibold text-neutral-100">{y}년 {mo}월</h2>
          <Link href={link({ m: addMonth(m, 1) })} aria-label="다음 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">›</Link>
          <AutoForm className="ml-2" action="/admin/attendance">
            <input type="hidden" name="m" value={m} />
            <select name="u" defaultValue={u ?? ''} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-200">
              <option value="">전체</option>
              {people.map(([id, n]) => (
                <option key={id} value={id}>{n}</option>
              ))}
            </select>
          </AutoForm>
        </div>
        <div className="space-y-1 text-xs text-neutral-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm ring-2 ring-inset ring-emerald-600" />이슈 없음</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm ring-2 ring-inset ring-red-500" />미출근이나 퇴근 누락 있음</span>
            <Info align="right" text="기록은 NFC 출퇴근을 시작한 11/09부터입니다. 테두리는 그 뒤 평일 중 자정이 지난 날에만 붙습니다. 주말, 공휴일, 오늘과 그 뒤는 테두리가 없습니다." />
          </div>
          <p className="text-neutral-500">날짜를 누르면 아래에 그날 목록이 나옵니다</p>
        </div>
      </div>

      {!absents && <p className="text-sm text-amber-300/80">재직자 명단이나 휴가 기록을 읽지 못해 미출근은 표시하지 않았습니다(초록 테두리도 쓰지 않음).</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <div className="grid grid-cols-7 bg-neutral-900 text-center text-xs text-neutral-500">
          {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
            <div key={w} className="py-2">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px border-t border-neutral-800 bg-neutral-800">
          {Array.from({ length: lead }, (_, i) => (
            <div key={`e${i}`} className="bg-neutral-950" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = `${m}-${String(i + 1).padStart(2, '0')}`
            const { rs, as } = on(day)
            const st = dayState(day, rs, as, at)
            const miss = rs.filter((r) => view(r).missing).length
            return (
              <Link
                key={day}
                href={day === d ? link({}, `#${LIST}`) : link({ d: day }, `#${LIST}`)}
                className={`flex min-h-16 flex-col gap-0.5 rounded-lg p-1 text-[11px] sm:min-h-24 sm:p-2 sm:text-sm hover:bg-neutral-800 ${day === d ? 'bg-neutral-800' : 'bg-neutral-900'} ${RING[st]}`}
              >
                <span className={`self-start ${day === now ? 'rounded bg-neutral-100 px-1 font-semibold text-neutral-900' : 'text-neutral-500'}`}>{i + 1}</span>
                {rs.length > 0 && <span className="text-neutral-300">출근 {rs.length}</span>}
                {!!as?.length && <span className="text-red-300">미출근 {as.length}</span>}
                {miss > 0 && <span className="text-amber-300">누락 {miss}</span>}
              </Link>
            )
          })}
        </div>
      </div>

      <section id={LIST} className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-100">
            {d ? dayLabel(d) : `${mo}월 전체`} 목록
            {d && <Link href={link({}, `#${LIST}`)} className="ml-2 text-xs font-normal text-neutral-400 hover:text-neutral-200">월 전체 보기</Link>}
          </h3>
          <span className="text-xs text-neutral-500">기록 {recs.length}건{missed && `, 미출근 ${abs.length}건`}, 퇴근 누락 {nMissing}건</span>
        </div>

        {edit && target !== undefined && (
          <form id={EDIT} action={fixAttendance} className="scroll-mt-4 space-y-3 rounded-xl border border-sky-900 bg-sky-950/20 p-4 text-sm">
            <p className="font-medium text-neutral-100">
              {name(es)} {dayLabel(ed)} 정정{' '}
              <span className="font-normal text-neutral-400">{target ? `지금 출근 ${time(tv!.first, ed)}, 퇴근 ${tv!.missing ? '누락' : tv!.open ? '아직 없음' : time(tv!.last, ed)}` : '기록 없음(새 줄을 만듭니다)'}</span>
            </p>
            {edit.err && <p className="text-red-300">{edit.err}</p>}
            {[['slack_id', es], ['workday', ed], ['email', edit.emails[es] ?? target?.member_email ?? ''], ['m', m], ['u', u ?? ''], ['d', d ?? '']].map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-xs text-neutral-400">출근</span>
                <input type="time" name="first" required defaultValue={tv ? hm(tv.first) : '09:00'} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-neutral-400">퇴근(05:00 전은 다음 날)</span>
                <input type="time" name="last" required defaultValue={tv && !tv.missing && !tv.open ? hm(tv.last) : '18:00'} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
              </label>
              <label className="min-w-48 flex-1 space-y-1">
                <span className="block text-xs text-neutral-400">메모</span>
                <input type="text" name="note" maxLength={200} defaultValue={target?.fix_note ?? ''} placeholder="예: 외근, 리더기 고장" className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button name="op" value="save" className="rounded-md bg-sky-700 px-3 py-1.5 text-neutral-50 hover:bg-sky-600">저장</button>
              {target && (target.fix_by || target.taps === 0) && (
                <button name="op" value="clear" formNoValidate className="rounded-md bg-neutral-800 px-3 py-1.5 text-neutral-200 hover:bg-neutral-700">
                  {target.taps === 0 ? '줄 지우기' : '정정 지우기'}
                </button>
              )}
              <Link href={link({ d }, `#${LIST}`)} className="px-2 text-neutral-400 hover:text-neutral-200">취소</Link>
              <span className="text-xs text-neutral-500">{target?.taps === 0 ? '탭 기록이 없는 줄이라 지우면 미출근으로 돌아갑니다.' : '정정 지우기는 처음 탭 기록으로 되돌립니다.'}</span>
            </div>
          </form>
        )}

        {lines.length === 0 ? (
          <p className="text-sm text-neutral-500">{d ? '이 날짜에 기록이 없습니다.' : '이 달에 기록이 없습니다.'}</p>
        ) : (
          <Table head={head} left={2} tips={tips}>
            {lines.map((r) => {
              if (!('taps' in r))
                return (
                  <tr key={`${r.slack_id}-${r.workday}-absent`}>
                    <td className={`${tdl} whitespace-nowrap tabular-nums`}>{dayLabel(r.workday)}</td>
                    <td className={tdl}>{name(r.slack_id)}</td>
                    <td className={td}><span className={`${badge} bg-red-950 text-red-300`}>미출근</span></td>
                    <td className={td}>—</td>
                    <td className={td}>—</td>
                    <td className={td}>0</td>
                    <td className={td}><span className={`${badge} bg-red-950 text-red-300`}>미출근</span></td>
                    {edit && <td className={td}><Link href={editLink(r.slack_id, r.workday)} className="text-sky-400 hover:text-sky-300">수정</Link></td>}
                  </tr>
                )
              const v = view(r)
              return (
                <tr key={`${r.slack_id}-${r.workday}`}>
                  <td className={`${tdl} whitespace-nowrap tabular-nums`}>{dayLabel(r.workday)}</td>
                  <td className={tdl}>{name(r.slack_id)}</td>
                  <td className={td}>{time(v.first, r.workday)}</td>
                  <td className={td}>{v.missing ? <span className={`${badge} bg-amber-950 text-amber-300`}>누락</span> : v.open ? <span className={`${badge} bg-neutral-800 text-neutral-300`}>근무 중</span> : time(v.last, r.workday)}</td>
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
                  {edit && <td className={td}><Link href={editLink(r.slack_id, r.workday)} className="text-sky-400 hover:text-sky-300">수정</Link></td>}
                </tr>
              )
            })}
          </Table>
        )}
      </section>
    </div>
  )
}
