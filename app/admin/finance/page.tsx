import Link from 'next/link'
import { getFinance } from '@/lib/finance/data'
import { getRates } from '@/lib/finance/fx'
import { buildModel, calendarMonth, payoutKrw, priorPeriod, type Basis, type CalItem, type Model, type Payout, type Rates } from '@/lib/finance/model'
import { MonthlyChart, PREV_COLOR } from './charts'

// 관리자 대시보드: 노션 Contract DB, 지급내역 DB 기준 매출, 정산, 마진 (설계: 볼트 work/261010-설계-관리자대시보드)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TABS = [
  ['summary', '개요'],
  ['calendar', '자금 캘린더'],
  ['contracts', '안건'],
  ['creators', '크리에이터'],
  ['owners', '담당자'],
  ['basis', '기준'],
] as const
type Tab = (typeof TABS)[number][0]

const won = (n: number | null | undefined) => (n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`)
const pct = (r: number | null | undefined) => (r == null ? '-' : `${(r * 100).toFixed(1)}%`)
const orig = (p: Payout) => (p.amount == null ? '-' : `${p.amount.toLocaleString('ko-KR')} ${p.currency ?? '통화 미상'}`)

type Search = { tab?: string; y?: string; m?: string; sel?: string; b?: string; d?: string }

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? 'summary') as Tab
  const thisYear = new Date().getFullYear()
  const year = sp.y === 'all' ? null : Number(sp.y) || thisYear
  const month = year != null && Number(sp.m) >= 1 && Number(sp.m) <= 12 ? Number(sp.m) : null
  const basis: Basis = sp.b === 'contract' ? 'contract' : 'cash'

  let data: Awaited<ReturnType<typeof getFinance>>
  let rates: Rates
  try {
    ;[data, rates] = await Promise.all([getFinance(), getRates()])
  } catch (e) {
    return (
      <div className="space-y-2 rounded-xl border border-red-900 bg-red-950/40 p-6">
        <h1 className="text-base font-semibold text-red-300">노션 데이터를 불러오지 못했습니다</h1>
        <p className="text-sm text-red-200/80">{e instanceof Error ? e.message : String(e)}</p>
        <p className="text-xs text-neutral-500">노션 연결(통합)이 Contract DB, 지급내역 DB에 초대되어 있는지, 환경변수가 있는지 확인하십시오.</p>
      </div>
    )
  }

  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10) // KST
  const period = { year, month }
  const model = buildModel(data.contracts, data.payouts, rates, period, today, basis)
  const pp = priorPeriod(period, today)
  const prior = pp && tab === 'summary' ? buildModel(data.contracts, data.payouts, rates, pp, today, basis) : null
  const all = tab === 'summary' ? buildModel(data.contracts, data.payouts, rates, { year: null, month: null }, today, basis) : null
  const span = (p: { year: number | null; month: number | null; upto?: number | null }) =>
    p.year == null ? '전체 기간' : p.month ? `${p.year}년 ${p.month}월` : p.upto ? `${p.year}년 1~${p.upto}월` : `${p.year}년`
  const labels = { cur: span(period), prev: pp ? span(pp) : null }
  const calYm = year == null ? today.slice(0, 7) : month ? `${year}-${String(month).padStart(2, '0')}` : year === Number(today.slice(0, 4)) ? today.slice(0, 7) : `${year}-01`
  const years = [...new Set(data.contracts.map((c) => c.contractDate?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse()
  const q = (over: Partial<Search>) => {
    const s = new URLSearchParams()
    const merged = { tab, y: year == null ? 'all' : String(year), m: month ? String(month) : undefined, b: basis === 'contract' ? basis : undefined, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) s.set(k, v)
    return `/admin/finance?${s}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">{TABS.find(([k]) => k === tab)?.[1]}</h1>
          <p className="text-xs text-neutral-500">
            노션 Contract DB, 지급내역 DB 기준, 조회 {new Date(data.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (5분 캐시){tab === 'summary' && labels.prev ? `, 비교 ${labels.prev}` : ''}
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm" action="/admin/finance">
          <input type="hidden" name="tab" value={tab} />
          <select name="y" defaultValue={year == null ? 'all' : String(year)} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
            <option value="all">전체 기간</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select name="m" defaultValue={month ? String(month) : ''} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
            <option value="">연간</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}월</option>
            ))}
          </select>
          {tab === 'summary' ? (
            <select name="b" defaultValue={basis} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
              <option value="cash">현금 기준(입금)</option>
              <option value="contract">발생 기준(계약)</option>
            </select>
          ) : (
            basis === 'contract' && <input type="hidden" name="b" value={basis} />
          )}
          <button className="rounded-md bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700">보기</button>
        </form>
      </div>

      {tab === 'summary' && all && <Overview model={model} prior={prior} all={all} labels={labels} year={year} month={month} today={today} rates={rates} q={q} basis={basis} />}
      {tab === 'calendar' && <Calendar items={calendarMonth(data.contracts, data.payouts, rates, calYm, today)} ym={calYm} today={today} sel={sp.d} q={q} />}
      {tab === 'contracts' && <Contracts model={model} rates={rates} sel={sp.sel} q={q} />}
      {tab === 'creators' && <Creators model={model} rates={rates} sel={sp.sel} q={q} />}
      {tab === 'owners' && <Owners model={model} />}
      {tab === 'basis' && <Basis model={model} rates={rates} basis={basis} />}
    </div>
  )
}

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-50">{value}</p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-xs text-neutral-500">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 text-neutral-200">{children}</tbody>
      </table>
    </div>
  )
}

const td = 'whitespace-nowrap px-3 py-2 text-right tabular-nums'
const tdl = 'px-3 py-2 text-left'

const REV = '#3987e5' // 매출 쪽 계열(받을 돈 포함)
const SET = '#d95926' // 정산 쪽 계열(줄 돈 포함)
const ALERT = '#e66767'
const won2 = (n: number) => (Math.abs(n) >= 1e8 ? `${(n / 1e8).toFixed(2)}억원` : Math.abs(n) >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원` : won(n))
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

export type Labels = { cur: string; prev: string | null }

/** 직전 기간 대비 증감. good: 오르면 좋은 지표인지(정산은 색 없이 부호만) */
function Delta({ cur, prev, good }: { cur: number; prev: number | null; good: boolean | null }) {
  if (!prev) return null // 비교 기간 기록이 없으면 증감을 쓰지 않음
  const r = (cur - prev) / Math.abs(prev)
  const up = r >= 0
  const color = good == null ? 'text-neutral-300' : up === good ? 'text-[#0ca30c]' : 'text-[#e66767]'
  return <span className={`font-medium ${color}`}>{up ? '▲' : '▼'} {Math.abs(r * 100).toFixed(1)}%</span>
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 72
  const h = 24
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (w - 6) + 3, h - 4 - (v / max) * (h - 8)])
  const last = pts[pts.length - 1]
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#525252" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last[0]} cy={last[1]} r={4} fill={color} stroke="#171717" strokeWidth={2} />}
    </svg>
  )
}

function Tile({ label, value, full, delta, note, spark }: { label: string; value: string; full: string; delta?: React.ReactNode; note: string; spark?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-neutral-400">{label}</p>
        {spark}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-neutral-50" title={full}>{value}</p>
      <p className="text-xs text-neutral-500">
        {delta}
        {delta ? ' ' : ''}
        {note}
      </p>
    </div>
  )
}

function Panel({ id, title, sub, action, children }: { id?: string; title: string; sub: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
          <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** 가로 막대 한 줄: 이름, 막대, 금액, 보조 글 */
function BarRow({ label, value, max, color, aside, href }: { label: string; value: number; max: number; color: string; aside?: string; href?: string }) {
  const name = href ? <Link href={href} className="hover:text-neutral-50 hover:underline">{label}</Link> : label
  return (
    <div className="grid grid-cols-[9rem_1fr_6.5rem] items-center gap-3 text-sm">
      <span className="truncate text-neutral-300" title={label}>{name}</span>
      <span className="h-2.5 rounded-r bg-neutral-800/60">
        <span className="block h-2.5 rounded-r" style={{ width: `${max ? Math.max(1, (value / max) * 100) : 0}%`, background: color }} />
      </span>
      <span className="text-right tabular-nums text-neutral-200">
        {won2(value)}
        {aside && <span className="block text-xs text-neutral-500">{aside}</span>}
      </span>
    </div>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex gap-4 text-xs text-neutral-400">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function Overview({ model, prior, all, labels, year, month, today, rates, q, basis }: {
  model: Model; prior: Model | null; all: Model; labels: Labels; year: number | null; month: number | null; today: string; rates: Rates; q: (o: Partial<Search>) => string; basis: Basis
}) {
  const cb = basis === 'contract'
  const s = model.summary
  const p = prior?.summary ?? null
  const byMonth = new Map(all.monthly.map((r) => [r.month, r]))
  const thisYear = Number(today.slice(0, 4))
  const thisMonth = Number(today.slice(5, 7))
  // 차트는 고른 해의 1~12월(전체면 올해), 스파크라인은 기간 끝 달까지 12개월
  const cy = year ?? thisYear
  const endY = cy
  const endM = month ?? (cy === thisYear ? thisMonth : 12)
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(endY, endM - 12 + i, 1)
    return byMonth.get(ym(d.getFullYear(), d.getMonth() + 1))
  })
  const series = (key: 'revenue' | 'settled') =>
    Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}월`, cur: byMonth.get(ym(cy, i + 1))?.[key] ?? 0, prev: byMonth.get(ym(cy - 1, i + 1))?.[key] ?? 0 }))
  const vs = (v: number | undefined, fallback: string) => (p == null ? fallback : v ? `${labels.prev} 대비, 당시 ${won2(v)}` : `${labels.prev} 기록 없음`)

  const buckets = model.receivables.buckets
  const overdue = buckets.filter((b) => b.alert)
  const overdueN = overdue.reduce((a, b) => a + b.count, 0)
  const overdueKrw = overdue.reduce((a, b) => a + b.krw, 0)
  const noDue = buckets[buckets.length - 1]
  const held = model.payables.find((b) => b.label === '보류')
  const late = model.receivables.open.filter((o) => o.due && o.due < today).slice(0, 6)
  const heldRows = all.creators
    .flatMap((c) => c.payouts)
    .filter((x) => x.status === '보류')
    .sort((a, b) => (payoutKrw(b, rates) ?? 0) - (payoutKrw(a, rates) ?? 0))
    .slice(0, 5)
  // [제목, 건수, 금액, 이동, 강조]
  const todo: [string, string, number, string, boolean][] = []
  if (overdueN) todo.push(['입금 예정일이 지난 받을 돈', `${overdueN}건`, overdueKrw, '#receivables', true])
  if (held?.count) todo.push(['보류 중인 지급', `${held.count}행`, held.krw, '#payables', true])
  if (noDue.count) todo.push(['입금 예정일이 없는 받을 돈', `${noDue.count}건`, noDue.krw, '#receivables', false])
  if (model.gaps.unlinked.count) todo.push(['수입 계약에 연결되지 않은 지급', `${model.gaps.unlinked.count}행`, model.gaps.unlinked.krw, q({ tab: 'basis' }), false])

  const bMax = Math.max(...buckets.map((b) => b.krw))
  const pMax = Math.max(1, ...model.payables.map((b) => b.krw))
  const topCreators = model.creators.filter((c) => c.revenue > 0).slice(0, 8)
  const cMax = Math.max(1, ...topCreators.map((c) => c.revenue))
  const topOwners = model.owners.slice(0, 8)
  const oMax = Math.max(1, ...topOwners.map((o) => o.supply))
  let accRev = 0
  let accSet = 0

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-xs text-neutral-400">
        <span className="font-medium text-neutral-200">노션 Contract DB에 등록된 계약만 집계합니다.</span> 모두싸인, 운영 대시보드에만 있는 지난 계약은 아직 옮기지 않아 매출, 받을 돈, 마진에 빠져 있습니다.
        {cb ? ' 지금은 발생 기준(계약): 매출은 계약일의 달에 공급가 전액, 정산은 그 계약에 연결된 지급 전체(상태 무관)입니다.' : ' 지금은 현금 기준(입금): Contract DB 선금, 잔금 입금일(은행 대조 전)과 지급 송금일로 셉니다.'}
      </p>

      {todo.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-100">지금 볼 것</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {todo.map(([title, count, krw, href, alert]) => (
              <Link key={title} href={href} className={`flex flex-col justify-between gap-3 rounded-xl border bg-neutral-900 p-4 hover:bg-neutral-800/60 ${alert ? 'border-[#e66767]/60' : 'border-neutral-800'}`}>
                <p className={`text-xs ${alert ? 'text-[#e66767]' : 'text-neutral-400'}`}>{title}</p>
                <p className="text-2xl font-semibold tracking-tight text-neutral-50" title={won(krw)}>{won2(krw)}</p>
                <p className="flex justify-between text-xs text-neutral-500">
                  <span>{count}</span>
                  <span aria-hidden>→</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label="매출 (DB 등록분)" value={won2(s.revenue)} full={won(s.revenue)} delta={<Delta cur={s.revenue} prev={p?.revenue ?? null} good />} note={vs(p?.revenue, cb ? '공급가 전액, 계약일의 달' : '공급가, 입금된 달')} spark={<Spark values={last12.map((r) => r?.revenue ?? 0)} color={REV} />} />
        <Tile label={cb ? '정산 (발생 기준)' : '정산 (송금 기준)'} value={won2(s.settled)} full={won(s.settled)} delta={<Delta cur={s.settled} prev={p?.settled ?? null} good={null} />} note={vs(p?.settled, cb ? '연결된 지급 전체, 계약일의 달' : '송금 완료, 송금한 달')} spark={<Spark values={last12.map((r) => r?.settled ?? 0)} color={SET} />} />
        <Tile label="마진 (계약 단위)" value={won2(s.margin)} full={won(s.margin)} delta={<Delta cur={s.margin} prev={p?.margin ?? null} good />} note={`마진율 ${pct(s.marginRate)}${p?.marginRate != null ? `, ${labels.prev} ${pct(p.marginRate)}` : p ? `, ${labels.prev} 기록 없음` : ''}`} />
        <Tile label="받을 돈 (현재 잔액)" value={won2(s.receivable)} full={won(s.receivable)} note={`예정일 지남 ${won2(overdueKrw)}, 기간과 무관`} />
        <Tile label="줄 돈 (현재 잔액)" value={won2(s.payable)} full={won(s.payable)} note={`보류 ${won2(s.held)} 포함, 기간과 무관`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="월별 매출" sub={`${cy}년, ${cb ? '계약일의 달 기준 공급가 전액' : '입금된 달 기준 공급가'}`} action={<Legend items={[[`${cy}년`, REV], [`${cy - 1}년`, PREV_COLOR]]} />}>
          <MonthlyChart data={series('revenue')} color={REV} curLabel={`${cy}년`} prevLabel={`${cy - 1}년`} />
        </Panel>
        <Panel title="월별 정산" sub={`${cy}년, ${cb ? '계약일의 달 기준 연결 지급액(상태 무관)' : '송금 완료한 달 기준 지급액'}`} action={<Legend items={[[`${cy}년`, SET], [`${cy - 1}년`, PREV_COLOR]]} />}>
          <MonthlyChart data={series('settled')} color={SET} curLabel={`${cy}년`} prevLabel={`${cy - 1}년`} />
        </Panel>

        <Panel id="receivables" title="받을 돈 만기" sub={`입금 전 회차 ${model.receivables.open.length}건, 입금 예정일(정산일) 기준, 오늘 ${today}`} action={<Link href={q({ tab: 'contracts' })} className="text-xs text-neutral-400 hover:text-neutral-200">안건 전체 →</Link>}>
          <div className="space-y-2.5">
            {buckets.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.krw} max={bMax} color={b.alert ? ALERT : REV} aside={`${b.count}건`} />
            ))}
          </div>
          {late.length > 0 && (
            <div className="space-y-1 border-t border-neutral-800 pt-3">
              <p className="text-xs text-neutral-500">예정일이 가장 오래 지난 회차</p>
              {late.map((o, i) => (
                <Link key={`${o.c.id}-${i}`} href={q({ tab: 'contracts', sel: o.c.id })} className="grid grid-cols-[1fr_auto_6.5rem] gap-3 rounded px-1 py-1 text-sm hover:bg-neutral-800/40">
                  <span className="truncate text-neutral-300" title={o.c.code}>{o.c.brand || o.c.code}</span>
                  <span className="text-xs tabular-nums text-neutral-500">{o.due}, {Math.round((Date.parse(today) - Date.parse(o.due!)) / 86_400_000)}일 지남</span>
                  <span className="text-right tabular-nums text-neutral-200">{won2(o.krw)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel id="payables" title="줄 돈 상태" sub="송금 완료가 아닌 지급내역, 원화 환산" action={<Link href={q({ tab: 'creators' })} className="text-xs text-neutral-400 hover:text-neutral-200">크리에이터 전체 →</Link>}>
          <div className="space-y-2.5">
            {model.payables.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.krw} max={pMax} color={b.alert ? ALERT : SET} aside={`${b.count}행`} />
            ))}
          </div>
          {heldRows.length > 0 && (
            <div className="space-y-1 border-t border-neutral-800 pt-3">
              <p className="text-xs text-neutral-500">금액이 큰 보류 지급</p>
              {heldRows.map((x) => (
                <div key={x.id} className="grid grid-cols-[1fr_auto_6.5rem] gap-3 px-1 py-1 text-sm">
                  <span className="truncate text-neutral-300">{x.name}</span>
                  <span className="max-w-56 truncate text-xs text-neutral-500" title={x.blocked.join(', ')}>{x.blocked.join(', ') || '사유 미기재'}</span>
                  <span className="text-right tabular-nums text-neutral-200">{won2(payoutKrw(x, rates) ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="크리에이터 매출 몫 상위" sub={`${labels.cur}, 계약 공급가를 지급액 비율로 나눈 몫`} action={<Link href={q({ tab: 'creators' })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 →</Link>}>
          <div className="space-y-2.5">
            {topCreators.map((c) => (
              <BarRow key={c.name} label={c.name} value={c.revenue} max={cMax} color={REV} aside={`정산 ${won2(c.paid)}`} href={q({ tab: 'creators', sel: c.name })} />
            ))}
            {!topCreators.length && <p className="text-sm text-neutral-500">이 기간에 매출 몫이 있는 크리에이터가 없습니다.</p>}
          </div>
        </Panel>

        <Panel title="담당자별 계약" sub={`${labels.cur}, 계약일 기준 공급가와 마진율`} action={<Link href={q({ tab: 'owners' })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 →</Link>}>
          <div className="space-y-2.5">
            {topOwners.map((o) => (
              <BarRow key={o.owner} label={o.owner} value={o.supply} max={oMax} color={REV} aside={`${o.count}건, 마진율 ${pct(o.rate)}`} />
            ))}
          </div>
        </Panel>
      </div>

      <details className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <summary className="cursor-pointer text-sm text-neutral-300">월별 표로 보기 ({labels.cur})</summary>
        <div className="mt-4">
          <Table head={['월', cb ? '매출(계약)' : '매출(입금)', cb ? '정산(계약)' : '정산(송금)', '매출 누적', '정산 누적']}>
            {model.monthly.map((r) => {
              accRev += r.revenue
              accSet += r.settled
              return (
                <tr key={r.month}>
                  <td className={tdl}>{r.month}</td>
                  <td className={td}>{won(r.revenue)}</td>
                  <td className={td}>{won(r.settled)}</td>
                  <td className={td}>{won(accRev)}</td>
                  <td className={td}>{won(accSet)}</td>
                </tr>
              )
            })}
          </Table>
        </div>
      </details>
    </div>
  )
}

function PayoutTable({ payouts, rates }: { payouts: Payout[]; rates: Rates }) {
  return (
    <Table head={['지급 ID', '이름', '상태', '지급액', '원화', '송금일', '막힌 사유']}>
      {payouts.map((p) => (
        <tr key={p.id}>
          <td className={tdl}>{p.pid ?? '-'}</td>
          <td className={`${td} text-left`}>{p.name}</td>
          <td className={td}>{p.status}</td>
          <td className={td}>{orig(p)}</td>
          <td className={td}>{won(payoutKrw(p, rates))}{p.krwBilled != null ? ' (청구액)' : ''}</td>
          <td className={td}>{p.sentDate ?? '-'}</td>
          <td className={td}>{p.blocked.join(', ') || '-'}</td>
        </tr>
      ))}
    </Table>
  )
}

function Contracts({ model, rates, sel, q }: { model: Model; rates: Rates; sel?: string; q: (o: Partial<Search>) => string }) {
  const picked = model.contracts.find((x) => x.c.id === sel)
  return (
    <div className="space-y-4">
      {picked && (
        <div className="space-y-3 rounded-xl border border-sky-900 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-200">
            {picked.c.code}, 공급가 {won(picked.supply)}, 변동비 {won(picked.cost)}, 마진 {won(picked.margin)} ({pct(picked.rate)})
          </p>
          {picked.payouts.length ? <PayoutTable payouts={picked.payouts} rates={rates} /> : <p className="text-xs text-neutral-500">이 계약에 연결된 지급 행이 없습니다.</p>}
        </div>
      )}
      <Table head={['코드', '브랜드', '담당자', '계약일', '공급가', '입금', '변동비', '마진', '계약서']}>
        {model.contracts.map((x) => (
          <tr key={x.c.id} className={x.c.id === sel ? 'bg-sky-950/40' : ''}>
            <td className={tdl}>
              <Link href={q({ sel: x.c.id })} className="block max-w-[11rem] truncate text-sky-300 hover:underline" title={x.c.code}>{x.c.code}</Link>
            </td>
            <td className={`${td} text-left`}>
              <span className="block max-w-[8rem] truncate" title={x.c.brand || x.c.corp}>{x.c.brand || x.c.corp}</span>
            </td>
            <td className={td}>{x.c.owner || '미지정'}</td>
            <td className={td}>{x.day ?? '-'}</td>
            <td className={td} title={won(x.supply)}>{x.supply == null ? '-' : won2(x.supply)}
              {x.c.supplyKrw == null && x.c.supplyJpy != null && <span className="block text-xs text-neutral-500">엔화 환산</span>}</td>
            <td className={td} title={won(x.received)}>{x.supply == null ? '-' : `${won2(x.received)}${x.estimated ? ' (어림)' : ''}`}</td>
            <td className={td} title={won(x.cost)}>{won2(x.cost)}</td>
            <td className={td} title={won(x.margin)}>
              {x.margin == null ? '-' : won2(x.margin)}
              <span className="block text-xs text-neutral-500">{pct(x.rate)}</span>
            </td>
            <td className={td}>{x.c.link ? <a href={x.c.link} target="_blank" className="text-sky-300 hover:underline">열기</a> : '-'}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">변동비는 이 계약에 연결된 지급 합계(상태 무관)이고, 마진 아래 숫자는 마진율입니다. 코드를 누르면 지급 행이 위에 열립니다. 금액에 마우스를 올리면 원 단위가 보입니다.</p>
    </div>
  )
}

function Creators({ model, rates, sel, q }: { model: Model; rates: Rates; sel?: string; q: (o: Partial<Search>) => string }) {
  const picked = model.creators.find((x) => x.name === sel)
  return (
    <div className="space-y-4">
      {picked && (
        <div className="space-y-3 rounded-xl border border-sky-900 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-200">
            {picked.name}, 매출 몫 {won(picked.revenue)}, 정산 {won(picked.paid)}
          </p>
          {picked.shares.length > 0 && (
            <Table head={['계약', '브랜드', '이 크리에이터 지급', '매출 몫']}>
              {picked.shares.map((s) => (
                <tr key={s.c.id}>
                  <td className={tdl}>{s.c.code}</td>
                  <td className={td}>{s.c.brand || s.c.corp}</td>
                  <td className={td}>{won(s.paid)}</td>
                  <td className={td}>{won(s.share)}</td>
                </tr>
              ))}
            </Table>
          )}
          <PayoutTable payouts={picked.payouts} rates={rates} />
        </div>
      )}
      <Table head={['이름', '통화', '매출 몫', '매출 건수', '정산 합계', '정산 건수', '마진율', '송금 완료', '진행 중', '미지급, 보류']}>
        {model.creators.map((x) => (
          <tr key={x.name} className={x.name === sel ? 'bg-sky-950/40' : ''}>
            <td className={tdl}>
              <Link href={q({ sel: x.name })} className="text-sky-300 hover:underline">{x.name}</Link>
            </td>
            <td className={td}>{x.currencies.join(', ') || '-'}</td>
            <td className={td}>{won(x.revenue)}</td>
            <td className={td}>{x.revenueCount}</td>
            <td className={td}>{won(x.paid)}</td>
            <td className={td}>{x.paidCount}</td>
            <td className={td}>{x.revenue ? pct((x.revenue - x.linkedPaid) / x.revenue) : '-'}</td>
            <td className={td}>{won(x.done)}</td>
            <td className={td}>{won(x.inFlight)}</td>
            <td className={td}>{won(x.held)}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">
        매출 몫은 계약 공급가를 그 계약의 실제 지급 비율로 나눈 값입니다. 수입 계약에 연결되지 않은 지급은 정산에만 들어가고 매출 몫은 없습니다. 마진율은 매출 몫이 있는 지급끼리만 짝짓습니다. 정산 합계는 상태와 관계없고, 송금일이 없으면 요청일이나 계약일로 기간을 고르므로 요약의 정산(송금 완료, 송금일 기준)과 합이 다릅니다.
      </p>
    </div>
  )
}

function Owners({ model }: { model: Model }) {
  return (
    <div className="space-y-2">
      <Table head={['담당자', '계약 수', '공급가', '입금액', '변동비', '마진', '마진율']}>
        {model.owners.map((o) => (
          <tr key={o.owner}>
            <td className={tdl}>{o.owner}</td>
            <td className={td}>{o.count}</td>
            <td className={td}>{won(o.supply)}</td>
            <td className={td}>{won(o.received)}</td>
            <td className={td}>{won(o.cost)}</td>
            <td className={td}>{won(o.margin)}</td>
            <td className={td}>{pct(o.rate)}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">Contract DB 「담당자(정)」 기준입니다. 세일즈 담당자 칸은 아직 없습니다. 공급가가 없는 계약은 빠집니다.</p>
    </div>
  )
}

function Basis({ model, rates, basis }: { model: Model; rates: Rates; basis: Basis }) {
  const g = model.gaps
  const rows: [string, string][] = [
    ['서명 전 계약(유니크코드 없음, 모든 집계에서 빠짐)', `${g.unsigned}건`],
    ['입금일이 하나도 없는 수입 계약', `${g.noDeposit}건`],
    ['공급가가 없는 수입 계약(합계에서 빠짐)', `${g.noSupply}건`],
    ['날짜(계약일자, 시작일, 입금일)가 없는 수입 계약', `${g.noDay}건`],
    ['선금, 잔금 금액을 읽지 못해 반반으로 나눈 계약', `${g.estimatedSplit}건`],
    ['수입 계약에 연결되지 않은 지급(매출 몫, 마진에서 빠짐)', `${g.unlinked.count}행, ${won(g.unlinked.krw)}`],
    ['송금일 없는 송금 완료(월별 정산에서 빠짐)', `${g.doneNoDate.count}행, ${won(g.doneNoDate.krw)}`],
    ['원화 청구액 없는 외화 송금 완료(환율로 환산)', `${g.fxNoBilled}행`],
    ['통화나 지급액이 없어 환산하지 못한 지급', `${g.noRate}행`],
  ]
  return (
    <div className="space-y-6 text-sm text-neutral-300">
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">집계 기준</h2>
        <ul className="list-disc space-y-1 pl-5 text-neutral-400">
          <li>매출: 수입 계약 공급가(부가세 제외)를 입금된 달에 셉니다. 선금+잔금 계약은 금액 비율로 나눕니다. P- 지출 계약은 빠집니다.</li>
          <li>정산: 지급내역 「송금 완료」 행의 지급액(원천징수 전)을 송금일의 달에 셉니다.</li>
          <li>받을 돈, 줄 돈: 기간과 관계없는 현재 잔액입니다. 줄 돈은 송금 완료가 아닌 모든 지급(보류 포함)입니다.</li>
          <li>마진: 계약 단위로 짝짓습니다. 공급가에서 그 계약에 연결된 지급 합계를 뺍니다. 기간은 계약일자(없으면 시작일, 첫 입금일)로 고릅니다.</li>
          <li>
            원화 환산: 외화 지급은 모인 원화 청구액이 있으면 그 값, 없으면 환율. 지금 환율 1엔 {rates.JPY.toFixed(4)}원, 1달러 {rates.USD.toFixed(1)}원, 1위안 {rates.CNY.toFixed(2)}원 ({rates.source}, {rates.at}).
          </li>
          <li>
            개요의 기준 선택(지금 {basis === 'contract' ? '발생 기준(계약)' : '현금 기준(입금)'}): 현금 기준은 위 매출, 정산 규칙이고 입금일은 Contract DB 선금, 잔금 입금일입니다(은행 대조 전, 클로브 계좌 연동 뒤 은행 입금으로 바꿈). 발생 기준은 계약일자(없으면 시작일, 첫 입금일)의 달에 공급가 전액과 그 계약에 연결된 지급 전체(상태 무관)를 셉니다. 수입 계약에 연결되지 않은 지급은 발생 기준 정산에서 빠집니다.
          </li>
          <li>
            자금 캘린더: 들어옴은 수입 계약 회차별 공급가로, 입금된 회차는 입금일, 아직이면 정산일(입금 예정일)에 둡니다. 나감은 지급 예정일 규칙(송금 완료는 송금일, 모인 접수와 원화 이체 대기는 송금 요청일, 송금 가능은 이번 달 말일, 대기는 수입 계약 입금 예정일이 든 달 말일이고 말일 이틀 전보다 늦으면 다음 달 말일, 보류는 빠짐)입니다. 금액은 이 화면 단위(공급가 부가세 제외, 지급액 원천징수 전, 원화 환산)이고 입금 약속일 칸은 아직 없습니다.
          </li>
          <li>Contract DB에 없는 계약은 나오지 않습니다.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">빈칸 점검</h2>
        <Table head={['항목', '현재']}>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className={tdl}>{k}</td>
              <td className={td}>{v}</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  )
}

const CAL_STATE: Record<CalItem['kind'], Record<CalItem['state'], string>> = {
  in: { done: '입금됨', due: '입금 예정', late: '예정일 지남' },
  out: { done: '송금 완료', due: '지급 예정', late: '예정일 지남' },
}

/** 자금 캘린더: 날짜별 들어오고 나가는 돈, 날짜를 누르면 안건별 입출금 */
function Calendar({ items, ym: cur, today, sel, q }: { items: CalItem[]; ym: string; today: string; sel?: string; q: (o: Partial<Search>) => string }) {
  const [y, m] = cur.split('-').map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay() // 일요일 0
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const byDay = new Map<string, CalItem[]>()
  for (const x of items) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x])
  const sum = (xs: CalItem[], kind: CalItem['kind'], states: CalItem['state'][]) => xs.filter((x) => x.kind === kind && states.includes(x.state)).reduce((a, x) => a + x.krw, 0)
  const go = (yy: number, mm: number, d?: string) => q({ y: String(yy), m: String(mm), d })
  const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1]
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1]
  const picked = sel?.startsWith(cur) ? (byDay.get(sel) ?? []) : null
  const ALL: CalItem['state'][] = ['done', 'due', 'late']
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={go(py, pm)} aria-label="이전 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">‹</Link>
          <h2 className="text-base font-semibold text-neutral-100">{y}년 {m}월</h2>
          <Link href={go(ny, nm)} aria-label="다음 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">›</Link>
        </div>
        <Legend items={[['+ 들어옴', REV], ['− 나감', SET], ['예정일 지남', ALERT]]} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card label="들어온 돈" value={won2(sum(items, 'in', ['done']))} note="Contract DB 입금일 기준(은행 대조 전)" />
        <Card label="들어올 돈 (예정)" value={won2(sum(items, 'in', ['due', 'late']))} note={`그중 예정일 지남 ${won2(sum(items, 'in', ['late']))}`} />
        <Card label="나간 돈" value={won2(sum(items, 'out', ['done']))} note="송금 완료, 송금일" />
        <Card label="나갈 돈 (예정)" value={won2(sum(items, 'out', ['due', 'late']))} note="지급 예정일 규칙, 보류 제외" />
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <div className="grid grid-cols-7 bg-neutral-900 text-center text-xs text-neutral-500">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px border-t border-neutral-800 bg-neutral-800">
          {Array.from({ length: lead }, (_, i) => (
            <div key={`e${i}`} className="bg-neutral-950" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${cur}-${String(i + 1).padStart(2, '0')}`
            const xs = byDay.get(date) ?? []
            const inK = sum(xs, 'in', ALL)
            const outK = sum(xs, 'out', ALL)
            const lateIn = xs.some((x) => x.kind === 'in' && x.state === 'late')
            const lateOut = xs.some((x) => x.kind === 'out' && x.state === 'late')
            return (
              <Link key={date} href={go(y, m, date)} className={`min-h-24 space-y-1 bg-neutral-900 p-2 text-xs hover:bg-neutral-800/70 ${date === sel ? 'ring-2 ring-inset ring-sky-500' : ''}`}>
                <span className={`inline-block ${date === today ? 'rounded bg-neutral-100 px-1 font-semibold text-neutral-900' : 'text-neutral-500'}`}>{i + 1}</span>
                {inK > 0 && <span className="block truncate tabular-nums" style={{ color: lateIn ? ALERT : REV }} title={`들어옴 ${won(inK)}${lateIn ? ', 예정일 지남 포함' : ''}`}>+ {won2(inK)}</span>}
                {outK > 0 && <span className="block truncate tabular-nums" style={{ color: lateOut ? ALERT : SET }} title={`나감 ${won(outK)}${lateOut ? ', 예정일 지남 포함' : ''}`}>− {won2(outK)}</span>}
              </Link>
            )
          })}
        </div>
      </div>
      {picked ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-100">{sel} 안건별 입출금 {picked.length}건</h3>
          {picked.length ? (
            <Table head={['안건', '구분', '상태', '금액']}>
              {picked.map((x, i) => (
                <tr key={i}>
                  <td className={tdl}>
                    {x.contractId ? <Link href={q({ tab: 'contracts', sel: x.contractId })} className="text-sky-300 hover:underline">{x.title}</Link> : x.title}
                    <span className="block text-xs text-neutral-500">{x.sub}</span>
                  </td>
                  <td className={td}>{x.kind === 'in' ? '들어옴' : '나감'}</td>
                  <td className={td} style={x.state === 'late' ? { color: ALERT } : undefined}>{CAL_STATE[x.kind][x.state]}</td>
                  <td className={td}>{won(x.krw)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-sm text-neutral-500">이 날짜에 입출금이 없습니다.</p>
          )}
        </section>
      ) : (
        <p className="text-sm text-neutral-500">날짜를 누르면 그날의 안건별 입출금이 아래에 나옵니다.</p>
      )}
      <p className="text-xs text-neutral-500">
        들어옴은 수입 계약 회차별 공급가(부가세 제외)로, 입금된 회차는 입금일, 아직이면 정산일에 둡니다. 나감은 지급액(원천징수 전, 원화 환산)을 지급 예정일에 둡니다: 송금 완료는 송금일, 모인 접수와 원화 이체 대기는 송금 요청일, 송금 가능은 이번 달 말일, 대기는 수입 계약 입금 예정일이 든 달 말일(말일 이틀 전보다 늦으면 다음 달 말일). 보류와 예정일을 정할 수 없는 행은 빠집니다.
      </p>
    </div>
  )
}
