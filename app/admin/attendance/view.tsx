import Link from 'next/link'
import { AutoForm } from '../finance/auto-form'
import { Card, Info, Table, td, tdl } from '../finance/ui'
import { fixAttendance } from './actions'
import { addMonth, ATT_FROM, dayLabel, dayState, hm, kstDate, today, view as view0, type Absent, type Att } from './time'

const WORK_TIP = '출근부터 퇴근까지 머문 시간에서 휴게를 뺀 시간입니다. 머문 시간이 5시간 이상이면 1시간, 4시간 30분 이상이면 30분을 빼고, 그 미만은 빼지 않습니다(슬랙 출퇴근 봇과 같은 계산).'
const STATE_TIP = '미출근과 누락은 그날 자정이 지난 뒤에 판정합니다. 미출근: 출근 기록이 아예 없는 평일입니다(공휴일, 휴가 예약이나 사용 날, 입사 전은 뺌. 시간 연차는 출근하는 날이라 포함). 누락: 출근과 마지막 기록이 1시간 안이라 퇴근 기록이 없는 날입니다(자정 전에는 근무 중). 정정: 고친 날이며(빠진 평일을 8시간 근무로 자동으로 채운 날 포함), ⓘ에 처음 기록과 정정자가 있습니다.'
const LIST = 'att-list'
const EDIT = 'att-edit'
const ROW = 'att-row'
const inp = 'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200'

// 자금 캘린더와 같은 색(GOOD, ALERT)
const GOOD = '#3fae6a'
const ALERT = '#e66767'
const WARN = '#e0a84f'
const FIX = '#5aa9e6'
const MUTED = '#a3a3a3'

/** 줄 상태: 칩 필터와 상태 칸이 함께 씀 */
type St = 'absent' | 'missing' | 'open' | 'fixed' | 'ok'
const ST: [St, string, string][] = [
  ['absent', '미출근', ALERT],
  ['missing', '퇴근 누락', WARN],
  ['open', '근무 중', MUTED],
  ['fixed', '정정', FIX],
  ['ok', '정상', GOOD],
]
const stLabel = (s: St) => ST.find((x) => x[0] === s)!

/** 근무일 다음 날 새벽 시각은 (+1) */
const time = (iso: string, day: string) => `${hm(iso)}${kstDate(iso) > day ? '(+1)' : ''}`

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

type Edit = { e?: string; err?: string; emails: Record<string, string> }

export function AttendanceView({ m, u, d, st, rows, absents, names, edit, at = Date.now() }: { m: string; u?: string; d?: string; st?: string; rows: Att[]; absents: Absent[] | null; names: Record<string, string>; edit?: Edit; at?: number }) {
  // auto8: 봇이 빠진 평일을 8시간 근무로 채운 줄(인혁, 건우, 보람)
  const name = (id: string) => (id === 'auto8' ? '자동(8시간)' : names[id] ?? id)
  const view = (r: Att) => view0(r, at)
  const state = (r: Att | Absent): St => {
    if (!('taps' in r)) return 'absent'
    const v = view(r)
    return v.missing ? 'missing' : v.open ? 'open' : v.fixed ? 'fixed' : 'ok'
  }
  const mine = u ? rows.filter((r) => r.slack_id === u) : rows
  const missed = absents && absents.filter((a) => !u || a.slack_id === u)
  const people = Object.entries(names).sort((a, b) => a[1].localeCompare(b[1], 'ko'))
  const link = (o: { m?: string; d?: string; e?: string; st?: string }, hash = '') =>
    `/admin/attendance?${new URLSearchParams(Object.entries({ m, u, st, ...o }).filter((kv): kv is [string, string] => !!kv[1]))}${hash}`
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
  const tail = (7 - ((lead + days) % 7)) % 7
  const now = today(at)
  const on = (day: string) => ({ rs: mine.filter((r) => r.workday === day), as: missed && missed.filter((a) => a.workday === day) })
  const all: (Att | Absent)[] = [...mine, ...(missed ?? [])]
  const count = (xs: (Att | Absent)[], s: St) => xs.filter((x) => state(x) === s).length

  // 목록: 고른 날(없으면 그 달 전체), 상태 칩. 날짜별로 기록 줄 다음에 미출근 줄(이름순), sort 는 안정 정렬
  const day = d?.startsWith(m) ? d : undefined
  const pool = day ? all.filter((x) => x.workday === day) : all
  const lines = pool
    .filter((x) => !st || state(x) === st)
    .sort((a, b) => ('taps' in a ? 0 : 1) - ('taps' in b ? 0 : 1) || ('taps' in a ? 0 : name(a.slack_id).localeCompare(name(b.slack_id), 'ko')))
    .sort((a, b) => b.workday.localeCompare(a.workday))
  const chip = (on: boolean) => `rounded-full border px-2 py-0.5 ${on ? 'border-neutral-400 text-neutral-100' : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'}`

  // 고치는 줄
  const [es, ed] = edit?.e?.split(':') ?? []
  const target = es && ed ? (rows.find((r) => r.slack_id === es && r.workday === ed) ?? (absents?.some((a) => a.slack_id === es && a.workday === ed) ? null : undefined)) : undefined
  const tv = target ? view(target) : null
  const editLink = (slack: string, wd: string, hash = EDIT) => link({ d: day, e: `${slack}:${wd}` }, `#${hash}`)
  const editing = (x: Att | Absent) => edit && target !== undefined && x.slack_id === es && x.workday === ed
  const firstDef = tv ? hm(tv.first) : '09:00'
  const lastDef = tv && !tv.missing && !tv.open ? hm(tv.last) : '18:00'
  // 모바일 패널과 표 줄 확인 폼이 함께 씀
  const hidden = edit && [['slack_id', es], ['workday', ed], ['email', edit.emails[es] ?? target?.member_email ?? ''], ['m', m], ['u', u ?? ''], ['d', day ?? '']].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
  const memo = <input type="text" name="note" maxLength={200} defaultValue={target?.fix_note ?? ''} placeholder="메모(예: 외근, 리더기 고장)" className={`${inp} w-full`} />
  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <button name="op" value="save" className="rounded-md border border-neutral-600 bg-neutral-800 px-3 py-1 text-neutral-100 hover:bg-neutral-700">저장</button>
      {target && (target.fix_by || target.taps === 0) && (
        <button name="op" value="clear" formNoValidate className="rounded-md border border-neutral-800 px-3 py-1 text-neutral-300 hover:bg-neutral-800">
          {target.taps === 0 ? '줄 지우기' : '정정 지우기'}
        </button>
      )}
      <Link href={link({ d: day }, `#${LIST}`)} className="px-2 text-neutral-400 hover:text-neutral-200">취소</Link>
      <span className="text-xs text-neutral-500">퇴근이 05:00 전이면 다음 날입니다. {target?.taps === 0 ? '탭 기록이 없는 줄이라 지우면 미출근으로 돌아갑니다.' : '정정 지우기는 처음 탭 기록으로 되돌립니다.'}</span>
    </div>
  )
  const head = ['날짜', '이름', '출근', '퇴근', '근로시간(휴게 제외)', '탭 수', '상태', ...(edit ? [''] : [])]
  const tips = [undefined, undefined, undefined, undefined, WORK_TIP, undefined, STATE_TIP]
  const stCell = (x: Att | Absent) => {
    const [s, label, color] = stLabel(state(x))
    return (
      <span className="inline-flex items-center justify-end gap-1.5" style={{ color }}>
        {label}
        {s === 'fixed' && 'taps' in x && <Info text={fixTip(x)} align="right" />}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">근태</h1>
          <div className="text-xs text-neutral-500">슬랙 출퇴근 봇(NFC) 기록, 노션 구성원 DB 재직자 기준</div>
        </div>
        <AutoForm className="flex flex-wrap items-center gap-2 text-sm" action="/admin/attendance">
          <input type="hidden" name="m" value={m} />
          <select name="u" defaultValue={u ?? ''} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
            <option value="">전체 인원</option>
            {people.map(([id, n]) => (
              <option key={id} value={id}>{n}</option>
            ))}
          </select>
        </AutoForm>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {m > ATT_FROM.slice(0, 7) ? (
              <Link href={link({ m: addMonth(m, -1), st: undefined })} aria-label="이전 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">‹</Link>
            ) : (
              <span className="px-2 py-0.5 text-neutral-700">‹</span>
            )}
            <h2 className="text-base font-semibold text-neutral-100">{y}년 {mo}월</h2>
            <Link href={link({ m: addMonth(m, 1), st: undefined })} aria-label="다음 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">›</Link>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="w-8 text-neutral-500">테두리</span>
              <Legend items={[['이슈 없음', GOOD], ['미출근이나 퇴근 누락 있음', ALERT]]} />
              <Info align="right" text="기록은 NFC 출퇴근을 시작한 11/09부터입니다. 테두리는 그 뒤 평일 중 자정이 지난 날에만 붙습니다. 주말, 공휴일, 오늘과 그 뒤는 테두리가 없습니다." />
            </div>
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="w-8 text-neutral-500">칸</span>
              <Legend items={ST.slice(0, 4).map(([, l, c]) => [l, c])} />
            </div>
            <p className="text-neutral-500">날짜를 누르면 아래에 그날 목록이 나옵니다</p>
          </div>
        </div>

        {!absents && <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">재직자 명단이나 휴가 기록을 읽지 못해 미출근은 표시하지 않았습니다(초록 테두리도 쓰지 않음).</p>}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card label="출근 기록" value={`${mine.length}건`} note="이 달 출근이 찍힌 날(정정, 자동 채움 포함)" />
          <Card label="미출근" value={missed ? `${missed.length}건` : '-'} note="자정이 지난 평일 중 기록도 휴가도 없는 날" />
          <Card label="퇴근 누락" value={`${count(mine, 'missing')}건`} note="자정이 지나도 퇴근 기록이 없는 날" />
          <Card label="정정" value={`${count(mine, 'fixed')}건`} note="고친 날(자동 8시간 채움 포함)" />
        </div>

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
              const date = `${m}-${String(i + 1).padStart(2, '0')}`
              const { rs, as } = on(date)
              const ds = dayState(date, rs, as, at)
              const xs: (Att | Absent)[] = [...rs, ...(as ?? [])]
              const ring = date === day ? 'rounded-xl ring-2 ring-inset ring-sky-500' : ''
              return (
                <Link
                  key={date}
                  href={date === day ? link({}, `#${LIST}`) : link({ d: date }, `#${LIST}`)}
                  className={`flex min-h-16 flex-col space-y-1 bg-neutral-900 p-1 text-[11px] sm:min-h-32 sm:space-y-1.5 sm:p-2.5 sm:text-sm hover:bg-neutral-800/70 ${ring}`}
                  style={ds === 'na' || date === day ? undefined : { boxShadow: `inset 0 0 0 2px ${ds === 'ok' ? GOOD : ALERT}` }}
                >
                  <span className={`self-start ${date === now ? 'rounded bg-neutral-100 px-1 font-semibold text-neutral-900' : 'text-neutral-500'}`}>{i + 1}</span>
                  {ST.slice(0, 4).map(([s, label, color]) => {
                    const n = count(xs, s)
                    return n > 0 && <span key={s} className="block leading-snug tabular-nums" style={{ color }}>{label} {n}</span>
                  })}
                  {rs.length > 0 && <span className="mt-auto block border-t border-neutral-700 pt-1 tabular-nums leading-snug text-neutral-300">출근 {rs.length}명</span>}
                </Link>
              )
            })}
            {Array.from({ length: tail }, (_, i) => (
              <div key={`t${i}`} className="bg-neutral-950" />
            ))}
          </div>
        </div>

        <section id={LIST} className="scroll-mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-100">
              {day ? dayLabel(day) : `${mo}월 전체`} 출퇴근
              {day && <Link href={link({}, `#${LIST}`)} className="ml-2 text-xs font-normal text-neutral-400 hover:text-neutral-200">월 전체 보기</Link>}
            </h3>
            <span className="text-xs text-neutral-500">{lines.length}건</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Link href={link({ d: day, st: undefined }, `#${LIST}`)} className={chip(!st)}>상태 전체 {pool.length}</Link>
            {ST.map(([s, label, color]) => {
              const n = count(pool, s)
              return n > 0 && <Link key={s} href={link({ d: day, st: st === s ? undefined : s }, `#${LIST}`)} className={chip(st === s)} style={{ color }}>{label} {n}</Link>
            })}
          </div>

          {edit && target !== undefined && (
            <>
              {/* 모바일: 카드 목록이라 위에 패널로 고침 */}
              <form id={EDIT} action={fixAttendance} className="scroll-mt-4 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm sm:hidden">
                <p className="font-medium text-neutral-100">
                  {name(es)} {dayLabel(ed)} 정정{' '}
                  <span className="font-normal text-neutral-400">{target ? `지금 출근 ${time(tv!.first, ed)}, 퇴근 ${tv!.missing ? '누락' : tv!.open ? '아직 없음' : time(tv!.last, ed)}` : '기록 없음(새 줄을 만듭니다)'}</span>
                </p>
                {edit.err && <p className="text-red-300">{edit.err}</p>}
                {hidden}
                <div className="flex flex-wrap items-end gap-3">
                  <label className="space-y-1">
                    <span className="block text-xs text-neutral-500">출근</span>
                    <input type="time" name="first" required defaultValue={firstDef} className={inp} />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-xs text-neutral-500">퇴근</span>
                    <input type="time" name="last" required defaultValue={lastDef} className={inp} />
                  </label>
                  <div className="min-w-48 flex-1">{memo}</div>
                </div>
                {buttons}
              </form>
              {/* 데스크톱: 표 줄의 출근, 퇴근 칸이 입력칸으로 바뀌고 수정 자리가 확인. tr 은 form 을 감쌀 수 없어 입력칸은 form 속성으로 이 폼에 묶임. 메모는 있던 값 그대로 */}
              <form id={`${ROW}-f`} action={fixAttendance} className="hidden">
                {hidden}
                <input type="hidden" name="note" value={target?.fix_note ?? ''} />
              </form>
            </>
          )}

          {lines.length ? (
            <>
              <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 sm:hidden">
                {lines.map((x) => {
                  const v = 'taps' in x ? view(x) : null
                  return (
                    <li key={`${x.slack_id}-${x.workday}`} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <span className="block text-xs tabular-nums text-neutral-500">{dayLabel(x.workday)}</span>
                        <span className="block text-neutral-100">{name(x.slack_id)}</span>
                        {v && <span className="block text-xs tabular-nums text-neutral-400">{time(v.first, x.workday)} ~ {v.missing || v.open ? '' : time(v.last, x.workday)}{v.worked ? `, ${v.worked}` : ''}</span>}
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        {stCell(x)}
                        {edit && <Link href={editLink(x.slack_id, x.workday)} className="mt-1 block text-neutral-400 hover:text-neutral-100">수정</Link>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="hidden sm:block">
                <Table head={head} left={2} tips={tips}>
                  {lines.map((x) => {
                    const v = 'taps' in x ? view(x) : null
                    const on = editing(x)
                    const f = `${ROW}-f`
                    const tIn = (n: string, val: string, label: string) => (
                      <input form={f} name={n} defaultValue={val} required autoFocus={n === 'first'} pattern="([01]\d|2[0-3]):[0-5]\d" title="HH:MM(24시간). 퇴근이 05:00 전이면 다음 날" inputMode="numeric" maxLength={5} aria-label={label} className="w-14 rounded border border-neutral-600 bg-neutral-950 px-1 py-0.5 text-right tabular-nums text-neutral-100" />
                    )
                    return (
                      <tr key={`${x.slack_id}-${x.workday}`} id={on ? ROW : undefined} className={on ? 'scroll-mt-16 bg-neutral-800/60' : undefined}>
                        <td className={`${tdl} whitespace-nowrap tabular-nums`}>
                          <Link href={link({ d: x.workday }, `#${LIST}`)} className="text-neutral-400 hover:text-neutral-100">{dayLabel(x.workday)}</Link>
                        </td>
                        <td className={tdl}>{name(x.slack_id)}</td>
                        <td className={td}>{on ? tIn('first', firstDef, '출근') : v ? time(v.first, x.workday) : '—'}</td>
                        <td className={td}>{on ? tIn('last', lastDef, '퇴근') : v && !v.missing && !v.open ? time(v.last, x.workday) : '—'}</td>
                        <td className={td}>{v?.worked ?? '—'}</td>
                        <td className={td}>{'taps' in x ? x.taps : 0}</td>
                        <td className={td}>{on && edit?.err ? <span className="text-red-300">{edit.err}</span> : stCell(x)}</td>
                        {edit && (
                          <td className={td}>
                            {on ? (
                              <span className="inline-flex gap-3">
                                <button form={f} name="op" value="save" className="text-sky-300 hover:text-sky-100">확인</button>
                                {target && (target.fix_by || target.taps === 0) && (
                                  <button form={f} name="op" value="clear" formNoValidate className="text-neutral-400 hover:text-red-300">
                                    {target.taps === 0 ? '줄 지우기' : '정정 지우기'}
                                  </button>
                                )}
                                <Link href={link({ d: day }, `#${LIST}`)} className="text-neutral-400 hover:text-neutral-100">취소</Link>
                              </span>
                            ) : (
                              <Link href={editLink(x.slack_id, x.workday, ROW)} className="text-neutral-400 hover:text-neutral-100">수정</Link>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </Table>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">{st ? '이 상태의 줄이 없습니다.' : day ? '이 날짜에 기록이 없습니다.' : '이 달에 기록이 없습니다.'}</p>
          )}
        </section>

        <p className="text-xs text-neutral-500">하루는 05:00에 바뀌고, 미출근과 퇴근 누락은 그날 자정이 지나면 판정합니다. 정정 요청은 #96-근태-휴가에서 상위 조직장을 태그해 받습니다.</p>
      </div>
    </div>
  )
}
