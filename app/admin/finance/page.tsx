import Link from 'next/link'
import { getFinance } from '@/lib/finance/data'
import { refreshFinance } from './actions'
import { RefreshButton } from './refresh-button'
import { AutoForm } from './auto-form'
import { getRates } from '@/lib/finance/fx'
import { adminRole } from '@/lib/supabase/role'
import type { FinanceData } from '@/lib/finance/source'
import { buildModel, calendarMonth, dailyBalance, HIGH_MARGIN, HIGH_MARGIN_TRIAL, type CostFlag, contractDay, creatorKey, grossPayoutKrw, isDead, ownersOf, payoutKrw, priorPeriod, type Basis, type Contract, type ByCur, type CalItem, type Currency, type Model, type Payout, type Rates } from '@/lib/finance/model'
import { CashflowChart, NET_COLOR, type FlowPoint } from './charts'
import { FunnelTrendTab } from './funnel-trend'
import { Card, CUR_NAME, CURS, hit, Info, Money, orig, Panel, SearchBox, sortRows, Table, td, tdl, Tile, won, won2 } from './ui'

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
  ['funnel', '지표 모니터링'],
  ['receivables', '미수'], // 메뉴에는 receivables 역할에게만 보임(layout-client.tsx)
] as const
type Tab = (typeof TABS)[number][0]

const pct = (r: number | null | undefined) => (r == null ? '-' : `${(r * 100).toFixed(1)}%`)

type Search = { tab?: string; y?: string; m?: string; sel?: string; b?: string; d?: string; f?: string; s?: string; o?: string; k?: string; st?: string } // o: 안건 탭을 담당자 한 명으로 거름, k/st: 캘린더 표 구분(in/out)과 상태(kind.state) 필터

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  // receivables 역할(경영지원 미수 확인용)은 주소의 tab 값과 무관하게 미수 탭만 본다. proxy는 경로만 막으므로 탭은 여기서 고정
  const only = (await adminRole()) === 'receivables'
  const tab: Tab = only ? 'receivables' : ((TABS.find(([k]) => k === sp.tab)?.[0] ?? 'summary') as Tab)
  if (tab === 'funnel') return <FunnelTrendTab /> // 노션을 읽지 않고 주간 잡이 올린 파일만
  // 기본 연도도 한국 시간 오늘에서(서버는 UTC라 새해 첫날 0~9시에 전년으로 열리던 문제, 261113 감사)
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10) // KST
  const thisYear = Number(today.slice(0, 4))
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
        <p className="text-xs text-neutral-500">노션 연결(통합)이 노션 계약 DB, 지급내역 DB에 초대되어 있는지, 환경변수가 있는지 확인하십시오.</p>
      </div>
    )
  }

  const period = { year, month }
  const model = buildModel(data.contracts, data.payouts, rates, period, today, basis, data.bankLinks)
  const tw = model.receivables.twikr // 트위커 표시라 받을 돈에서 뺀 입금 전 회차(미수 탭 안내)
  const pp = priorPeriod(period, today)
  const prior = pp && tab === 'summary' ? buildModel(data.contracts, data.payouts, rates, pp, today, basis, data.bankLinks) : null
  const all = tab === 'summary' ? buildModel(data.contracts, data.payouts, rates, { year: null, month: null }, today, basis, data.bankLinks) : null
  const span = (p: { year: number | null; month: number | null; upto?: number | null }) =>
    p.year == null ? '전체 기간' : p.month ? `${p.year}년 ${p.month}월` : p.upto ? `${p.year}년 1~${p.upto}월` : `${p.year}년`
  const labels = { cur: span(period), prev: pp ? span(pp) : null }
  const calYm = year == null ? today.slice(0, 7) : month ? `${year}-${String(month).padStart(2, '0')}` : year === Number(today.slice(0, 4)) ? today.slice(0, 7) : `${year}-01`
  const years = [...new Set(data.contracts.map((c) => c.contractDate?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse()
  const q = (over: Partial<Search>) => {
    const s = new URLSearchParams()
    const keep = over.tab && over.tab !== tab ? {} : { f: sp.f, s: sp.s, o: sp.o, k: sp.k, st: sp.st } // 탭을 옮기면 검색어, 정렬, 필터는 버림
    const merged = { tab, y: year == null ? 'all' : String(year), m: month ? String(month) : undefined, b: basis === 'contract' ? basis : undefined, ...keep, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) s.set(k, v)
    return `/admin/finance?${s}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">{TABS.find(([k]) => k === tab)?.[1]}</h1>
          <div className="text-xs text-neutral-500">
            노션 계약 DB, 지급내역 DB 기준{tab === 'summary' && labels.prev ? `, 비교 ${labels.prev}` : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-neutral-500">
          {new Date(data.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} 갱신
          <Info text="5분마다 자동으로도 다시 읽습니다" align="right" />
        </span>
        <form action={refreshFinance}>
          <RefreshButton />
        </form>
        {/* 미수는 기간, 집계 기준과 무관 */}
        {tab !== 'receivables' && <AutoForm className="flex flex-wrap items-center gap-2 text-sm" action="/admin/finance">
          <input type="hidden" name="tab" value={tab} />
          {/* 기준, 기간을 바꿔도 보던 크리에이터, 계약 상세와 검색, 정렬은 그대로 */}
          {(['sel', 'f', 's', 'o'] as const).map((k) => sp[k] && <input key={k} type="hidden" name={k} value={sp[k]} />)}
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
          <select name="b" defaultValue={basis} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
            <option value="cash">현금 기준(입금)</option>
            <option value="contract">발생 기준(계약)</option>
          </select>
        </AutoForm>}
        </div>
      </div>

      {tab === 'summary' && all && <Overview model={model} prior={prior} all={all} labels={labels} year={year} month={month} today={today} rates={rates} q={q} basis={basis} src={data} />}
      {tab === 'calendar' && <Calendar items={calendarMonth(data.contracts, data.payouts, rates, calYm, today, data.bankLinks)} ym={calYm} today={today} sel={sp.d} q={q} f={sp.f} s={sp.s} k={sp.k} st={sp.st} />}
      {tab === 'contracts' && <Contracts model={model} rates={rates} sel={sp.sel} q={q} f={sp.f} s={sp.s} o={sp.o} st={sp.st} today={today} />}
      {tab === 'creators' && <Creators model={model} rates={rates} all={data.payouts} contracts={data.contracts} ig={data.ig} igError={data.igError} today={today} sel={sp.sel} q={q} f={sp.f} s={sp.s} basis={basis} />}
      {tab === 'owners' && <Owners model={model} q={q} s={sp.s} year={year} />}
      {tab === 'basis' && <Basis model={model} rates={rates} basis={basis} src={data} q={q} />}
      {tab === 'receivables' && tw.length > 0 && (
        <details className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-xs text-neutral-400">
          <summary className="cursor-pointer">트위커 공급 계약 <span className="text-neutral-200">{new Set(tw.map((x) => x.c.id)).size}건</span>(<span title={won(tw.reduce((a, x) => a + x.krw, 0))}>{won2(tw.reduce((a, x) => a + x.krw, 0))}</span>)은 미수에서 제외</summary>
          <p className="mt-2">공급자가 트위커이고 대금을 트위커 계좌로 받는 계약이라 코리너스 미수가 아닙니다. 노션 계약 비고의 「공급자 트위커」로 판정합니다.</p>
          <div className="mt-2 space-y-1 tabular-nums">
            {tw.map((x, i) => (
              <p key={`${x.c.id}-${i}`} className="grid grid-cols-[16rem_4rem_6rem_6rem] gap-3">
                <span className="text-neutral-200">{x.c.code}</span>
                <span>{x.label ?? x.part}</span>
                <span>{x.due ?? '예정일 없음'}</span>
                <span className="text-right text-neutral-200" title={won(x.krw)}>{won2(x.krw)}</span>
              </p>
            ))}
          </div>
        </details>
      )}
      {tab === 'receivables' && data.bankError && <p className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-2.5 text-xs text-[#e66767]">{bankWarn(data.bankError)}</p>}
      {tab === 'receivables' && <OverdueTable model={model} today={today} bankError={data.bankError} />}
    </div>
  )
}

/** 매출 통화별 나눔 글(원화 환산). 통화가 하나뿐이면 빈 글 */
const curSplit = (o: ByCur) => {
  const xs = CURS.filter((k) => o[k])
  return xs.length > 1 ? xs.map((k) => `${CUR_NAME[k]} ${won2(o[k] ?? 0)}`).join(', ') : ''
}

const REV = '#3987e5' // 매출 쪽 계열(받을 돈 포함)
const SET = '#d95926' // 정산 쪽 계열(줄 돈 포함)
const ALERT = '#e66767'
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

export type Labels = { cur: string; prev: string | null }

/** 직전 기간 대비 증감. good: 오르면 좋은 지표인지(정산은 색 없이 부호만) */
const thin = (cur: number, prev: number | null) => !prev || Math.abs(prev) * 10 < Math.abs(cur)

function Delta({ cur, prev, good }: { cur: number; prev: number | null; good: boolean | null }) {
  if (prev == null || thin(cur, prev)) return null // 비교 기간 기록이 없거나 너무 적으면 증감을 쓰지 않음
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="min-w-0 shrink">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#525252" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last[0]} cy={last[1]} r={4} fill={color} stroke="#171717" strokeWidth={2} />}
    </svg>
  )
}

/** 입금은 됐는데 크리에이터 지급이 하나도 연결되지 않은 계약(계약 단위 마진에서 빠짐), 안건 탭 st=nolink.
 * 개요 할 일 카드로는 쓰지 않음: 크리에이터 비용이 원래 없는 계약(월 정액 운영, 정부사업, 통과금)과 구분할 칸이 계약 DB에 없어 대부분 잡음(인혁 261113) */
const noLinkPaid = (x: Model['contracts'][number]) => x.c.source !== 'sheet' && x.supply != null && !x.payouts.length && x.received > 0

// 발생 기준의 정산은 연결된 지급만이라 매출 − 정산이 연결 없는 계약 공급가만큼 부풀어(261113 확인) 발생 기준에선 계약 단위를 씀
const NET_HINT = '이 기간 매출(입금된 공급가)에서 정산(송금 완료)을 뺀 값입니다. 계약을 고르지 않은 회사 전체 숫자이고, 입금과 송금 시점이 달라 달마다 출렁입니다. 아래 계약 단위 마진율은 지급이 연결된 계약끼리만 공급가에서 지급을 뺀 값이고, 이 기간 매출 가운데 그 계약들에서 들어온 몫의 비율을 함께 적습니다.'

const marginHint = (cb: boolean) =>
  `크리에이터 지급이 연결된 수입 계약만 셉니다. 계약마다 공급가에서 연결된 지급 합(종결, 해제 금지 보류는 뺌)을 빼고, 평균 마진율은 마진 합 ÷ 그 계약들의 공급가 합입니다. 지급이 하나도 연결되지 않은 계약은 비용을 몰라 뺍니다(공급가 전액이 마진으로 잡히지 않게). ${cb ? '기간은 매출, 정산과 같은 계약일 기준이지만, 지급 연결 없는 계약이 빠져 매출 − 정산과 다릅니다.' : '기간은 계약일 기준이라 옆의 매출(입금된 달), 정산(송금한 달)과 빼서 맞지 않습니다.'}`

/** 가로 막대 한 줄: 이름, 막대, 금액, 보조 글 */
function BarRow({ label, value, max, color, aside, href }: { label: string; value: number; max: number; color: string; aside?: string; href?: string }) {
  const name = href ? <Link href={href} className="hover:text-neutral-50 hover:underline">{label}</Link> : label
  return (
    <div className="grid grid-cols-[9rem_1fr_7.5rem] items-center gap-3 text-sm">
      <span className="truncate text-neutral-300" title={label}>{name}</span>
      <span className="h-2.5 rounded-r bg-neutral-800/60">
        <span className="block h-2.5 rounded-r" style={{ width: `${max ? Math.max(1, (value / max) * 100) : 0}%`, background: color }} />
      </span>
      <span className="text-right tabular-nums text-neutral-200">
        {won2(value)}
        {aside && <span className="block whitespace-nowrap text-xs text-neutral-500">{aside}</span>}
      </span>
    </div>
  )
}

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

type Src = Pick<FinanceData, 'bankError'>
// 은행 원장을 못 읽으면 노션만으로 계속 셈(source.ts). 개요와 미수 탭이 같은 경고(미수 역할은 미수 탭만 봄, 261113 감사)
const bankWarn = (e: string) => `은행 원장을 읽지 못해 일부 입금을 빼지 않은 회차 전액을 매출채권으로 셉니다. 수출바우처 고객사 부가세는 이미 받았어도 미수로 잡힐 수 있습니다: ${e}`

function Overview({ model, prior, all, labels, year, month, today, rates, q, basis, src }: {
  model: Model; prior: Model | null; all: Model; labels: Labels; year: number | null; month: number | null; today: string; rates: Rates; q: (o: Partial<Search>) => string; basis: Basis; src: Src
}) {
  const cb = basis === 'contract'
  const s = model.summary
  const net = cb ? s.margin : s.revenue - s.settled
  const cover = pct(s.revenue ? s.linkedRevenue / s.revenue : null) // 매출 가운데 지급이 연결된 계약의 몫(매출과 같은 기준)
  const p = prior?.summary ?? null
  // 지급내역 DB는 2025-12-30부터 쌓였고 2025년 지급은 소급 등록 중(1~6월 국내 원화 빠짐, 계약 연결 일부)이라 2025년 이전과의 정산, 마진 비교는 뜻이 없음
  const pyear = priorPeriod({ year, month }, today)?.year
  const payGap = pyear != null && pyear < 2026
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
  const flow = Array.from({ length: 12 }, (_, i) => {
    const r = byMonth.get(ym(cy, i + 1))
    const v = { in: r?.revenue ?? 0, out: r?.settled ?? 0 }
    // 올해의 오지 않은 달은 순증감 선을 끊음(0으로 떨어져 보이지 않게)
    return { label: `${i + 1}월`, ...v, net: cy === thisYear && i + 1 > thisMonth ? null : v.in - v.out }
  })
  const flowSum = flow.reduce((a, x) => ({ in: a.in + x.in, out: a.out + x.out, net: a.net + (x.net ?? 0) }), { in: 0, out: 0, net: 0 })
  const flowNames = cb ? { in: '매출(발생)', out: '정산(발생)', net: '차이' } : { in: '입금(계약)', out: '출금(크리에이터 지급)', net: '순증감' }
  const vs = (cur: number, v: number | undefined, fallback: string) =>
    p == null ? fallback : !v ? `${labels.prev} 기록 없음` : thin(cur, v) ? `${labels.prev} 기록 적음, 당시 ${won2(v)}` : `${labels.prev} 대비, 당시 ${won2(v)}`

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
    .sort((a, b) => (grossPayoutKrw(b, rates) ?? 0) - (grossPayoutKrw(a, rates) ?? 0))
    .slice(0, 5)
  // [제목, 건수, 금액, 이동, 강조]
  const todo: [string, string, number, string, boolean][] = []
  if (overdueN) todo.push(['입금 예정일이 지난 매출채권', `${overdueN}건`, overdueKrw, q({ tab: 'contracts', st: 'overdue' }), true])
  if (held?.count) todo.push(['보류 중인 지급', `${held.count}행`, held.krw, '#payables', true])
  if (noDue.count) todo.push(['입금 예정일이 없는 매출채권', `${noDue.count}건`, noDue.krw, '#receivables', false])
  if (model.gaps.unlinked.count) todo.push(['수입 계약에 연결되지 않은 지급', `${model.gaps.unlinked.count}행`, model.gaps.unlinked.krw, '/admin/payouts?v=rows&nc=none', false])

  const bMax = Math.max(...buckets.map((b) => b.krw))
  const pMax = Math.max(1, ...model.payables.map((b) => b.krw))
  const topCreators = model.creators.filter((c) => c.revenue > 0).slice(0, 8)
  const cMax = Math.max(1, ...topCreators.map((c) => c.revenue))
  const topOwners = model.owners.slice(0, 8)
  const oMax = Math.max(1, ...topOwners.map((o) => o.supply))
  let accRev = 0
  let accSet = 0
  // 월별 표 통화 칸: 고른 기간에 매출이 있는 통화가 둘 이상일 때만
  const monthCurs = CURS.filter((k) => model.monthly.some((r) => r.revenueByCur[k]))
  if (monthCurs.length < 2) monthCurs.length = 0

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-xs text-neutral-400">
        노션 계약 DB 계약만 셉니다(운영 대시보드 시트 계약은 더 이상 합치지 않음).
        {src.bankError && <span className="text-[#e66767]"> {bankWarn(src.bankError)}</span>}
        {cb ? ' 발생 기준(계약일의 달).' : ' 현금 기준(입금일, 송금일의 달).'}{' '}
        <Link href={q({ tab: 'basis' })} className="text-neutral-300 underline hover:text-neutral-100">기준 보기</Link>
      </p>

      {todo.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-100">지금 볼 것 <span className="ml-1 text-xs font-normal text-neutral-500">손이 필요한 항목, 누르면 해당 목록으로</span></h2>
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${['', 'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5'][todo.length]}`}>
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
        <Tile label={cb ? '매출 (발생 기준)' : '매출 (입금 기준)'} value={won2(s.revenue)} full={won(s.revenue)} delta={<Delta cur={s.revenue} prev={p?.revenue ?? null} good />} note={[vs(s.revenue, p?.revenue, cb ? '공급가 전액, 계약일의 달' : '공급가, 입금된 달'), curSplit(s.revenueByCur)].filter(Boolean).join('. ')} spark={<Spark values={last12.map((r) => r?.revenue ?? 0)} color={REV} />} />
        <Tile label={cb ? '정산 (발생 기준)' : '정산 (송금 기준)'} value={won2(s.settled)} full={won(s.settled)} delta={<Delta cur={s.settled} prev={payGap ? null : p?.settled ?? null} good={null} />} note={`${payGap ? `${cb ? '연결된 지급(종결 제외), 계약일의 달' : '송금 완료, 송금한 달'}. ${labels.prev}은 지급 자료가 불완전해 비교 생략` : vs(s.settled, p?.settled, cb ? '연결된 지급(종결 제외), 계약일의 달' : '송금 완료, 송금한 달')}${s.settledEst ? `, 그중 ${won2(s.settledEst)}은 신청월 어림` : ''}`} spark={<Spark values={last12.map((r) => r?.settled ?? 0)} color={SET} />} />
        <Tile label={cb ? '마진 (계약 단위)' : '마진 (현금, 전체)'} value={won2(net)} full={won(net)} delta={<Delta cur={net} prev={payGap || !p ? null : cb ? p.margin : p.revenue - p.settled} good />} side={`마진율 ${pct(cb ? s.marginRate : s.revenue ? net / s.revenue : null)}`} hint={cb ? marginHint(true) : NET_HINT} note={`${cb ? `지급 연결된 계약 ${s.marginN}건(매출의 ${cover}), 공급가 ${won2(s.marginSupply)} − 지급 ${won2(s.marginSupply - s.margin)}` : `매출 ${won2(s.revenue)} − 정산 ${won2(s.settled)}. 계약 단위 ${pct(s.marginRate)}(매출의 ${cover}만 지급 연결)`}${payGap ? `, ${labels.prev}은 지급 자료가 불완전해 비교 생략` : ''}`} />
        <Tile label="매출채권 (현재 잔액)" value={won2(s.receivable)} full={won(s.receivable)} hint="입금 전 회차의 합계(부가세 포함)에서 은행에 일부 들어온 금액을 뺀 남은 금액입니다. 수출바우처는 기관 공급가와 고객사 부가세를 따로 셉니다." note={`부가세 포함, 예정일 지남 ${won2(overdueKrw)}, 기간과 무관`} />
        <Tile label="미지급금 (현재 잔액)" value={won2(s.payable)} full={won(s.payable)} hint="세금계산서 VAT 포함은 지급액, VAT 별도는 부가세 10%를 더한 금액, 사업소득은 원천세 공제 전 금액입니다." note={`부가세 포함, 보류 ${won2(s.held)} 별도, 기간과 무관`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Panel
            title={cb ? '월별 매출과 정산 (발생 기준)' : '월별 현금 유출입 (계약 입금, 크리에이터 지급 기준)'}
            sub={cb
              ? `${cy}년, 계약일의 달 기준 공급가 전액과 연결 지급액(종결, 해제 금지 보류는 뺌)`
              : `${cy}년, 입금은 입금된 달의 공급가(부가세 제외), 출금은 송금 완료한 달의 크리에이터 지급액(원천징수 전). 통장 금액(부가세 포함, 실지급액)은 자금 캘린더`}
            action={<Legend items={[[flowNames.in, REV], [flowNames.out, SET], [flowNames.net, NET_COLOR]]} />}>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {([['in', REV], ['out', SET], ['net', NET_COLOR]] as const).map(([k, color]) => (
                <p key={k} className="space-y-0.5">
                  <span className="block text-xs text-neutral-500">{cy}년 {flowNames[k]} 합계</span>
                  <span className="text-lg font-semibold tabular-nums" style={{ color: k === 'net' && flowSum.net < 0 ? ALERT : color }} title={won(flowSum[k])}>{won2(flowSum[k])}</span>
                </p>
              ))}
            </div>
            {!cb && (
              <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
                은행 잔고 변화가 아닙니다. 출금은 지급내역 DB에 기록된 크리에이터 지급만이라 인건비, 운영비, 세금, 카드 대금이 빠져 실제 은행 출금보다 훨씬 적습니다. 입금도 노션 계약 DB에 입금일이 적힌 계약과 은행 원장에서 공급가를 따로 받은 것으로 맞춘 입금만입니다.
              </p>
            )}
            <CashflowChart data={flow} inColor={REV} outColor={SET} names={flowNames} />
          </Panel>
        </div>

        <Panel id="receivables" title="매출채권 만기" sub={`입금 전 회차 ${model.receivables.open.filter((o) => !o.label).length}건 + 고객사 부가세 ${model.receivables.open.filter((o) => o.label).length}건, 부가세 포함(일부 입금 뺀 남은 금액), 입금 예정일(정산일) 기준, 오늘 ${today}`} action={<Link href={q({ tab: 'contracts' })} className="text-xs text-neutral-400 hover:text-neutral-200">안건 전체 →</Link>}>
          <div className="space-y-2.5">
            {buckets.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.krw} max={bMax} color={b.alert ? ALERT : REV} aside={`${b.count}건`} />
            ))}
          </div>
          {model.gaps.bankOverpaidVat > 0 && <p className="text-xs text-amber-200/90">수출바우처 {model.gaps.bankOverpaidVat}건은 고객사 부가세 더 들어옴(은행 원장 부가세 입금이 계약 부가세보다 많음)</p>}
          {model.gaps.bankAmbiguous > 0 && <p className="text-xs text-amber-200/90">은행 입금 연결 {model.gaps.bankAmbiguous}건은 여러 계약 후보라 사람 판정 필요(매출채권에서 빼지 않음)</p>}
          {late.length > 0 && (
            <div className="space-y-1 border-t border-neutral-800 pt-3">
              <p className="text-xs text-neutral-500">예정일이 가장 오래 지난 회차</p>
              {late.map((o, i) => (
                <Link key={`${o.c.id}-${i}`} href={q({ tab: 'contracts', y: 'all', m: undefined, sel: o.c.id })} className="grid grid-cols-[1fr_auto_6.5rem] items-baseline gap-3 rounded px-1 py-1 text-sm hover:bg-neutral-800/40">
                  <span className="truncate text-neutral-300" title={o.c.code}>{o.c.brand || o.c.code}{o.label ? ` ${o.label}` : ''}</span>
                  <span className="text-xs tabular-nums text-neutral-500">{o.due}, {Math.round((Date.parse(today) - Date.parse(o.due!)) / 86_400_000)}일 지남</span>
                  <span className="text-right tabular-nums text-neutral-200">{won2(o.krw)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel id="payables" title="미지급금 상태" sub="송금 완료가 아닌 지급내역, 부가세 포함(세금계산서 VAT 별도는 10% 더함), 원천세 공제 전, 원화 환산" action={<span className="flex shrink-0 gap-3"><Link href="/admin/payouts" className="text-xs text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 →</Link><Link href={q({ tab: 'creators' })} className="text-xs text-neutral-400 hover:text-neutral-200">크리에이터 전체 →</Link></span>}>
          <div className="space-y-2.5">
            {model.payables.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.krw} max={pMax} color={b.alert ? ALERT : SET} aside={`${b.count}행`} />
            ))}
          </div>
          {heldRows.length > 0 && (
            <div className="space-y-1 border-t border-neutral-800 pt-3">
              <p className="text-xs text-neutral-500">금액이 큰 보류 지급</p>
              {heldRows.map((x) => (
                <div key={x.id} className="grid grid-cols-[1fr_auto_6.5rem] items-baseline gap-3 px-1 py-1 text-sm">
                  <span className="truncate text-neutral-300">{x.name}</span>
                  <span className="max-w-56 truncate text-xs text-neutral-500" title={x.blocked.join(', ')}>{x.blocked.join(', ') || '사유 미기재'}</span>
                  <span className="text-right tabular-nums text-neutral-200">{won2(grossPayoutKrw(x, rates) ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="크리에이터 매출 몫 상위" sub={`${labels.cur}, 계약 공급가를 지급액 비율로 나눈 몫${cb ? ', 계약일 기준' : ', 입금된 회차만'}`} action={<Link href={q({ tab: 'creators' })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 →</Link>}>
          <div className="space-y-2.5">
            {topCreators.map((c) => (
              <BarRow key={c.key} label={c.name} value={c.revenue} max={cMax} color={REV} aside={`정산 ${won2(c.paid)}`} href={q({ tab: 'creators', sel: c.key })} />
            ))}
            {!topCreators.length && <p className="text-sm text-neutral-500">이 기간에 매출 몫이 있는 크리에이터가 없습니다.</p>}
          </div>
        </Panel>

        <Panel title="담당자별 계약" sub={`${labels.cur}, 계약일 기준 공급가와 마진율, 여러 명이 맡은 계약은 n분의 1`} action={<Link href={q({ tab: 'owners' })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 →</Link>}>
          <div className="space-y-2.5">
            {topOwners.map((o) => (
              <BarRow key={o.owner} label={o.owner} value={o.supply} max={oMax} color={REV} aside={`${o.count}건, ${ownerRate(o, model)}`} />
            ))}
          </div>
          {(year == null || year < 2026) && <p className="text-xs text-amber-200/90">{OWNER_GAP}</p>}
        </Panel>
      </div>

      <details className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <summary className="cursor-pointer text-sm text-neutral-300">월별 표로 보기 ({year == null ? labels.cur : `${year}년`})</summary>
        <div className="mt-4">
          <Table head={['월', cb ? '매출(계약)' : '매출(입금)', ...monthCurs.map((k) => `${CUR_NAME[k]} 매출`), cb ? '정산(계약)' : '정산(송금)', flowNames.net, '매출 누적', '정산 누적', `${flowNames.net} 누적`]}>
            {model.monthly.map((r) => {
              accRev += r.revenue
              accSet += r.settled
              return (
                <tr key={r.month}>
                  <td className={tdl}>{r.month}</td>
                  <Money n={r.revenue} />
                  {monthCurs.map((k) => <Money key={k} n={r.revenueByCur[k] ?? 0} />)}
                  <Money n={r.settled} />
                  <Money n={r.revenue - r.settled} />
                  <Money n={accRev} />
                  <Money n={accSet} />
                  <Money n={accRev - accSet} />
                </tr>
              )
            })}
          </Table>
        </div>
      </details>
    </div>
  )
}

/** contracts를 넘기면 계약 코드(계약 탭 링크), 계약월, 브랜드 칸을 앞에 붙이고 계약월 최근순으로 정렬. 계약 상세에서는 이미 한 계약이라 넘기지 않음 */
function PayoutTable({ payouts, rates }: { payouts: Payout[]; rates: Rates }) {
  return (
    <Table head={['지급 ID', '이름', '상태', '지급액', '원화', '송금일', '막힌 사유']} left={2}>
      {payouts.map((p) => (
        <tr key={p.id} className={isDead(p) ? 'text-neutral-500' : ''}>
          <td className={tdl}>{p.pid ?? '-'}</td>
          <td className={tdl}>{p.name}</td>
          <td className={td}>{p.status}{isDead(p) && <span className="block text-xs">원가 제외</span>}</td>
          <td className={td}>{orig(p)}</td>
          <td className={td}>{won(payoutKrw(p, rates))}{p.krwBilled != null ? ' (청구액)' : ''}</td>
          <td className={td}>{p.sentDate ?? '-'}</td>
          <td className={td}>{p.blocked.join(', ') || '-'}</td>
        </tr>
      ))}
    </Table>
  )
}

type Line = Model['creators'][number]['lines'][number]

/** 크리에이터 상세: 지급 행마다 매출 몫, 원가, 마진. 흐린 행은 지급 기준일이 기간 밖이라 정산 합계에서 빠지고 몫만 듦 */
function CreatorLines({ lines, flags, q }: { lines: Line[]; flags: Map<string, CostFlag>; q: (o: Partial<Search>) => string }) {
  const ym = (x: Line) => (x.c && contractDay(x.c)?.slice(0, 7)) ?? ''
  const rows = [...lines].sort((a, b) => ym(b).localeCompare(ym(a)) || (b.p.pid ?? 0) - (a.p.pid ?? 0))
  const sum = (f: (x: Line) => number) => rows.reduce((a, x) => a + f(x), 0)
  const paid = sum((x) => (x.inP ? x.krw : 0))
  const rev = sum((x) => x.share)
  const cost = sum((x) => x.cost)
  return (
    <Table head={['계약', '계약월', '브랜드', '지급 ID', '상태', '지급액', '원화', '매출 몫', '원가', '마진', '송금일', '막힌 사유']} left={4}
      foot={<tr><td className={tdl} colSpan={6}>합계</td><td className={td}>{won(paid)}</td><td className={td}>{won(rev)}</td><td className={td}>{won(cost)}</td><td className={td}>{won(rev - cost)}</td><td className={td} colSpan={2} /></tr>}>
      {rows.map((x) => {
        const on = !!x.c && !x.why
        return (
          <tr key={x.p.id} className={x.inP ? '' : 'text-neutral-500'}>
            <td className={`${tdl} whitespace-nowrap`}>{x.c ? <><CodeLink c={x.c} q={q} /><CostNote f={flags.get(x.c.id) ?? null} left /></> : <span className="text-neutral-500">{x.p.notContract ? '계약 아님' : '연결 없음'}</span>}</td>
            <td className={`${tdl} whitespace-nowrap`}>{ym(x) || '-'}</td>
            <td className={tdl}>{x.c ? x.c.brand || x.c.corp : '-'}</td>
            <td className={tdl}>{x.p.pid ?? '-'}</td>
            <td className={td}>{x.p.status}</td>
            <td className={td}>{orig(x.p)}</td>
            <td className={td} title={x.inP ? undefined : '지급 기준일이 기간 밖이라 정산 합계에서 빠짐'}>{won(x.krw)}{x.p.krwBilled != null ? ' (청구액)' : ''}</td>
            <td className={td}>{on ? won(x.share) : <span className="text-neutral-500">{x.why ?? '-'}</span>}</td>
            <td className={td}>{on ? won(x.cost) : '-'}</td>
            <td className={td}>{on ? won(x.share - x.cost) : '-'}</td>
            <td className={td}>{x.p.sentDate ?? '-'}</td>
            <td className={td}>{x.p.blocked.join(', ') || '-'}</td>
          </tr>
        )
      })}
    </Table>
  )
}

/** 입금 예정일이 지난 매출채권 회차(부가세 포함, 일부 입금 뺀 남은 금액, 기간과 무관). 개요 카드에서 넘어온 안건 탭(st=overdue)과 미수 탭이 같이 씀 */
function OverdueTable({ model, today, allHref, bankError }: { model: Model; today: string; allHref?: string; bankError?: string | null }) {
    const late = model.receivables.open.filter((x) => x.due && x.due < today).sort((a, b) => a.due!.localeCompare(b.due!))
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-neutral-200">입금 예정일이 지난 매출채권 {late.length}건, {won2(late.reduce((a, x) => a + x.krw, 0))} <span className="text-xs text-neutral-500">부가세 포함, 일부 입금 뺀 남은 금액, 오늘 {today}</span></span>
          {allHref && <Link href={allHref} className="text-xs text-neutral-400 hover:text-neutral-200">전체 안건 보기</Link>}
        </div>
        <Table head={['코드', '브랜드', '담당자', '입금 예정일', '지난 날수', '남은 금액']} left={2} tall>
          {late.map((x, i) => (
            <tr key={`${x.c.id}-${i}`}>
              <td className={tdl}>
                {x.c.source === 'sheet'
                  ? <span title={x.c.code}>{x.c.code} <span className="rounded bg-neutral-800 px-1 text-[10px] text-neutral-400">시트</span></span>
                  : <a href={`https://www.notion.so/${x.c.id.replace(/-/g, '')}`} target="_blank" className="text-sky-300 hover:underline" title={`${x.c.code} (노션 열기)`}>{x.c.code}</a>}
              </td>
              <td className={tdl}>{x.c.brand || x.c.corp}{x.label ? ` ${x.label}` : ''}{bankError && x.label === '부가세(고객사)' && <span className="text-amber-200/90"> 원장 없어 확인 불가</span>}</td>
              <td className={td}>{x.c.owner || '미지정'}</td>
              <td className={td}>{x.due}</td>
              <td className={`${td} font-semibold text-red-400`}>{Math.round((Date.parse(today) - Date.parse(x.due!)) / 86_400_000)}일</td>
              <td className={td} title={won(x.krw)}>{won2(x.krw)}</td>
            </tr>
          ))}
        </Table>
      </div>
    )
}

// 원가 덜 붙음 표시(계약 단위, model costFlag). n: 크리에이터 행에서 걸린 계약 수
const COST_TIP = {
  missing: `고객 입금과 마지막 입금분 송금 회차가 끝났는데 마진율이 ${HIGH_MARGIN * 100}%(체험단 ${HIGH_MARGIN_TRIAL * 100}%) 이상이거나, 지급 합계가 계약 DB 「예상 원가(원)」의 90% 미만인 계약입니다. 빠진 지급 행이 없는지 확인하세요.`,
  pending: '마진율이 높지만 고객 입금 전이거나 마지막 입금분 송금 회차 전이라, 크리에이터 송금 신청이 아직 들어오지 않았을 수 있는 계약입니다.',
}
/** 계약 코드: 노션 계약 페이지(새 탭). 노션에 없는 시트 계약만 안건 탭 */
function CodeLink({ c, q }: { c: Contract; q?: (o: Partial<Search>) => string }) {
  const cls = 'underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200'
  if (c.source !== 'sheet') return <a href={notion(c.id)} target="_blank" className={cls} title={`${c.code} (노션 열기)`}>{c.code}</a>
  return q ? <Link href={q({ tab: 'contracts', y: 'all', m: undefined, sel: c.id })} className={cls}>{c.code}</Link> : <>{c.code}</>
}

function CostNote({ f, n, left }: { f: CostFlag; n?: number; left?: boolean }) {
  if (!f) return null
  return (
    <span className={`flex items-center gap-1 text-xs ${left ? '' : 'justify-end '}${f === 'missing' ? 'text-amber-400' : 'text-neutral-500'}`}>
      {f === 'missing' ? '원가 누락 의심' : '원가 미확정'}{n ? ` 계약 ${n}건` : ''}<Info text={COST_TIP[f]} align={left ? 'left' : 'right'} />
    </span>
  )
}

function Contracts({ model, rates, sel, q, f, s = '-day', o, st, today }: { model: Model; rates: Rates; sel?: string; q: (o: Partial<Search>) => string; f?: string; s?: string; o?: string; st?: string; today: string }) {
  // st=overdue: 개요 「입금 예정일이 지난 매출채권」 카드와 같은 회차만
  if (st === 'overdue') return <OverdueTable model={model} today={today} allHref={q({ st: undefined })} />
  const picked = model.contracts.find((x) => x.c.id === sel)
  // st=cost: 기준 탭 「원가 누락 의심」 계약만
  const all = st === 'cost' ? model.contracts.filter((x) => x.costFlag === 'missing') : st === 'nolink' ? model.contracts.filter(noLinkPaid) : model.contracts
  const pool = o ? all.filter((x) => ownersOf(x.c).includes(o)) : all
  const rows = sortRows(pool.filter((x) => hit(f, x.c.code, x.c.brand, x.c.corp, x.c.owner)), s, {
    code: (x) => x.c.code, brand: (x) => x.c.brand || x.c.corp, owner: (x) => x.c.owner, day: (x) => x.day,
    supply: (x) => x.supply, received: (x) => x.supply == null ? null : x.received, due: (x) => x.due, overdue: (x) => (x.c.twikr ? null : x.overdue), cost: (x) => x.c.source === 'sheet' ? null : x.cost, margin: (x) => x.margin,
  })
  return (
    <div className="space-y-4">
      {picked && (
        <div className="space-y-3 rounded-xl border border-sky-900 bg-neutral-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-neutral-200">
              {picked.c.code}, 공급가 {won(picked.supply)}, 변동비 {picked.c.source === 'sheet' ? '-' : won(picked.cost)}, 마진 {won(picked.margin)} ({pct(picked.rate)})
            </p>
            <Link href={q({ sel: undefined })} className="shrink-0 text-xs text-neutral-400 hover:text-neutral-200">닫기 ✕</Link>
          </div>
          {picked.payouts.length ? <PayoutTable payouts={picked.payouts} rates={rates} /> : <p className="text-xs text-neutral-500">이 계약에 연결된 지급 행이 없습니다.</p>}
        </div>
      )}
      {o && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={q({ tab: 'owners' })} className="text-sm text-sky-300 hover:underline">← 담당자 목록</Link>
          <span className="text-sm text-neutral-200">담당자 {o}의 안건</span>
          <Link href={q({ o: undefined })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 안건 보기</Link>
        </div>
      )}
      {(st === 'cost' || st === 'nolink') && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-amber-400">{st === 'cost' ? '원가 누락 의심 계약만 보는 중' : '입금은 됐는데 크리에이터 지급이 연결되지 않은 계약만 보는 중(계약 단위 마진에서 빠짐)'}</span>
          <Link href={q({ st: undefined })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 안건 보기</Link>
        </div>
      )}
      <SearchBox q={q} f={f} n={rows.length} total={pool.length} placeholder="코드, 브랜드, 법인, 담당자" />
      <Table head={['코드', '브랜드', '담당자', '계약일', '공급가', '입금', '입금 예정일', '초과 기간', '변동비', '마진', '계약서']} left={2} tall
        sort={{ keys: ['code', 'brand', 'owner', 'day', 'supply', 'received', 'due', 'overdue', 'cost', 'margin', null], cur: s, href: (k) => q({ s: k }) }}>
        {rows.map((x) => (
          <tr key={x.c.id} className={x.c.id === sel ? 'bg-sky-950/40' : (x.margin ?? 0) < 0 ? 'bg-red-950/50' : ''}>
            <td className={tdl}>
              <span className="flex max-w-[11rem] items-center gap-1 2xl:max-w-[13rem]">
                {x.c.source === 'sheet'
                  ? <Link href={q({ sel: x.c.id })} className="min-w-0 truncate text-sky-300 hover:underline" title={x.c.code}>{x.c.code}</Link>
                  : <a href={`https://www.notion.so/${x.c.id.replace(/-/g, '')}`} target="_blank" className="min-w-0 truncate text-sky-300 hover:underline" title={`${x.c.code} (노션 열기)`}>{x.c.code}</a>}
                {x.c.source === 'sheet' && <span className="inline-flex shrink-0 items-center gap-0.5"><span className="rounded bg-neutral-800 px-1 text-[10px] text-neutral-400">시트</span><Info text="노션 계약 DB에 없어 운영 대시보드 시트에서 읽은 계약" /></span>}
              </span>
            </td>
            <td className={tdl}>
              <span className="block max-w-[8rem] truncate" title={x.c.brand || x.c.corp}>{x.c.brand || x.c.corp}</span>
            </td>
            <td className={td}>{x.c.owner || '미지정'}</td>
            <td className={td}>{x.day ?? '-'}</td>
            <td className={td} title={won(x.supply)}>{x.supply == null ? '-' : won2(x.supply)}
              {x.c.supplyKrw == null && x.c.supplyJpy != null && <span className="block text-xs text-neutral-500">엔화 환산</span>}</td>
            <td className={td} title={won(x.received)}>{x.supply == null ? '-' : `${won2(x.received)}${x.estimated ? ' (어림)' : ''}`}</td>
            <td className={td}>{x.open ? (x.due ?? <span className="text-neutral-500">예정일 없음</span>) : '-'}</td>
            <td className={`${td}${x.overdue && !x.c.twikr ? ' font-semibold text-red-400' : ''}`}>{!x.overdue ? '-' : x.c.twikr ? <span className="text-neutral-500">트위커 수금</span> : `${x.overdue}일`}</td>
            <td className={td} title={x.c.source === 'sheet' ? '지급 연결 전(시트 계약)' : won(x.cost)}>{x.c.source === 'sheet' ? '-' : <Link href={q({ sel: x.c.id })} className="text-sky-300 hover:underline">{won2(x.cost)}</Link>}</td>
            <td className={`${td}${(x.margin ?? 0) < 0 ? ' font-semibold text-red-400' : ''}`} title={x.c.source === 'sheet' ? '지급 연결 전(시트 계약)' : won(x.margin)}>
              {x.margin == null ? '-' : won2(x.margin)}
              <span className="block text-xs text-neutral-500">{x.c.source !== 'sheet' && x.supply != null && !x.payouts.length ? '지급 연결 없음' : pct(x.rate)}</span>
              <CostNote f={x.costFlag} />
            </td>
            <td className={td}>{x.c.link ? <a href={x.c.link} target="_blank" className="text-sky-300 hover:underline">열기</a> : '-'}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">입금 예정일은 아직 받지 않은 회차의 가장 이른 정산일, 초과 기간은 그 날에서 오늘까지 지난 날수입니다(트위커 공급 계약은 트위커 계좌로 받아 미수가 아니라서 「트위커 수금」). 변동비는 연결된 지급 합계(종결, 해제 금지 보류는 뺌), 마진 아래 숫자는 마진율입니다. 마진이 마이너스인 계약은 빨간 줄입니다. 코드를 누르면 노션 계약 페이지가, 변동비를 누르면 지급 행이 열리고, 금액에 마우스를 올리면 원 단위가 보입니다.</p>
    </div>
  )
}

// 크리에이터 월별: 첫 달부터 마지막 달까지 빈 달도 0으로 채움(건너뛴 달이 붙어 보이지 않게), 안건 수는 보조축 선
function creatorFlow(months: Model['creators'][number]['months']): FlowPoint[] {
  const by = new Map(months.map((m) => [m.month, m]))
  const ms = months.map((m) => m.month).sort()
  if (!ms.length) return []
  const oneYear = ms[0].slice(0, 4) === ms[ms.length - 1].slice(0, 4)
  const out: FlowPoint[] = []
  for (let [y, m] = ms[0].split('-').map(Number), last = ms[ms.length - 1]; ; m === 12 ? (y++, (m = 1)) : m++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    const x = by.get(key)
    out.push({ label: oneYear ? `${m}월` : `${String(y).slice(2)}.${m}`, in: x?.revenue ?? 0, out: x?.paid ?? 0, net: null, count: x?.keys.length ?? 0 })
    if (key === last) return out
  }
}

/** 인스타 URL을 @핸들 링크로. 여러 계정이면 모두 */
function Insta({ urls }: { urls?: Set<string> }) {
  if (!urls?.size) return <span className="text-neutral-600">-</span>
  return (
    <span className="inline-flex flex-wrap gap-x-2 text-sm font-normal">
      {[...urls].map((u) => (
        <a key={u} href={u} target="_blank" className="whitespace-nowrap text-neutral-400 hover:text-sky-300 hover:underline">
          @{u.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop()}
        </a>
      ))}
    </span>
  )
}

// 크리에이터 표 머리글 설명. 기간은 buildModel의 payoutDay 기준이라 발생, 현금 전환이 표 숫자를 바꾸지 않음
const CREATOR_PERIOD = '기간은 지급 기준일(송금일, 없으면 요청일, 없으면 계약일)로 고르며 발생, 현금 전환과 무관합니다.'
const CREATOR_TIPS = [
  '지급내역의 크리에이터 이름. 누르면 이 사람만 보는 화면',
  '이 사람 지급 행에 쓰인 통화. 금액은 모두 원화 환산',
  `계약 공급가 × 이 사람 정산금 ÷ 그 계약 정산금 합(지급내역 「매출 단가」가 있는 행은 그 값). 계약 연결 없는 지급은 0. 현금 기준이면 고객사가 입금한 회차만 입금일로 기간을 고르고(입금 전 몫은 빠짐, 개요 매출과 같은 기준), 발생 기준이면 계약 기준일로 고릅니다(계약일 환율, 개요 발생 매출과 같은 기준).`,
  '매출 몫이 있는 계약 수',
  '매출 몫 ÷ 매출 건수',
  `이 매출 몫에 대응하는 이 사람 지급. 매출 몫이 있는 계약에 연결된 지급(상태 무관, 보류 포함. 종결 행과 비고 맨 윗줄에 「보류 해제 금지」 등이 적힌 중복, 반송 보류는 빠짐). 현금 기준이면 고객사가 입금한 비율만큼만 들어가고, 입금 전 회차 몫의 지급은 그 입금이 들어올 때 매출 몫과 함께 잡힙니다. 공급가 0원 계약(순수 RS 등 입금이 없는 계약)의 지급은 송금한 달에 원가로 들어갑니다. 계약 연결 없는 지급은 빠짐. 매출 몫 − 원가 = 마진`,
  '매출 몫 − 원가. 계약 마진과 같은 기준',
  '마진 ÷ 매출 건수',
  '마진 ÷ 매출 몫. 매출 몫이 정산금 비중이라 한 계약의 참여자는 모두 그 계약 마진율과 같음. 높으면 그 계약에 연결된 지급이 빠졌는지 확인',
  `이 사람 지급 행 금액 합. 상태 무관(송금 완료, 진행 중, 보류 모두, 종결 행은 빠짐). 지급 현황용이라 마진 계산에는 원가 칸을 씁니다. ${CREATOR_PERIOD}`,
  '지급 행 수(한 계약에 행이 여러 개면 여러 건)',
  '정산 합계 ÷ 정산 건수',
  '상태가 송금 완료인 지급 합',
  '상태가 송금 가능, 모인 접수, 원화 이체 대기인 지급 합',
  '그 밖의 상태(보류 등)인 지급 합',
]

function Creators({ model, rates, all, contracts, ig, igError, today, sel, q, f, s = '-revenue', basis }: { model: Model; rates: Rates; all: Payout[]; contracts: Contract[]; ig: Record<string, string>; igError: string | null; today: string; sel?: string; q: (o: Partial<Search>) => string; f?: string; s?: string; basis: Basis }) {
  // sel: 크리에이터 키(수취인 id, 없으면 이름). 이름으로 온 옛 링크는 대표 이름과 다른 이름으로 한 번 더 찾음
  const picked = sel ? (model.creators.find((x) => x.key === sel) ?? model.creators.find((x) => x.name === sel || x.aliases.includes(sel))) : undefined
  // 지급 행의 크리에이터 관계로 이름별 인스타 URL(기간과 무관하게 전체 행)
  const igs = new Map<string, Set<string>>()
  for (const p of all) for (const id of p.creatorIds ?? []) if (ig[id]) igs.set(creatorKey(p), (igs.get(creatorKey(p)) ?? new Set()).add(ig[id]))
  // 매출 몫이 0이어도 공급가 0원 계약(순수 RS)에 걸린 지급이 있으면 원가와 마진을 보임(261113 감사 #16: 매출 몫 없는 크리에이터의 원가가 합계에서 빠짐)
  const margin = (x: Model['creators'][number]) => (x.revenue || x.linkedPaid ? x.revenue - x.linkedPaid : null)
  const cost = (x: Model['creators'][number]) => (x.revenue || x.linkedPaid ? x.linkedPaid : null) // 원가: 매출 몫에 대응하는 지급(매출 몫 − 원가 = 마진)
  const rate = (x: Model['creators'][number]) => (x.revenue ? (x.revenue - x.linkedPaid) / x.revenue : null)
  // 크리에이터 마진율이 높을 때만, 원인이 된 계약의 원가 표시(누락 의심 우선). 매출 단가가 없어 몫은 계약 마진율을 그대로 받으므로 판정은 계약에서
  const costOf = (x: Model['creators'][number]): CostFlag =>
    (rate(x) ?? 0) < HIGH_MARGIN ? null : x.shares.some((s) => s.flag === 'missing') ? 'missing' : x.shares.some((s) => s.flag === 'pending') ? 'pending' : null
  // 건당 평균: 매출, 마진은 매출 몫이 있는 계약 수로, 정산은 지급 행 수로 나눔
  const avgRevenue = (x: Model['creators'][number]) => (x.revenueCount ? x.revenue / x.revenueCount : null)
  const avgPaid = (x: Model['creators'][number]) => (x.paidCount ? x.paid / x.paidCount : null)
  const avgMargin = (x: Model['creators'][number]) => (x.revenueCount && x.revenue ? (x.revenue - x.linkedPaid) / x.revenueCount : null)
  const rows = sortRows(model.creators.filter((x) => hit(f, x.name, ...x.aliases)), s, {
    name: (x) => x.name, revenue: (x) => x.revenue, revenueCount: (x) => x.revenueCount, paid: (x) => x.paid, paidCount: (x) => x.paidCount,
    cost, margin, rate, done: (x) => x.done, inFlight: (x) => x.inFlight, held: (x) => x.held, avgRevenue, avgPaid, avgMargin,
  })
  // 합계는 표에 보이는 행(검색 적용) 기준. 마진율은 매출 몫이 있는 행끼리
  const tot = rows.reduce((a, x) => ({ revenue: a.revenue + x.revenue, paid: a.paid + x.paid, cost: a.cost + (cost(x) ?? 0), margin: a.margin + (margin(x) ?? 0), rn: a.rn + x.revenueCount, pn: a.pn + x.paidCount }), { revenue: 0, paid: 0, cost: 0, margin: 0, rn: 0, pn: 0 })
  const per = (v: number, n: number) => (n ? won2(v / n) : '-')
  // 이름을 누르면 목록 위 패널이 아니라 크리에이터 한 명만 보는 화면으로 바뀜
  if (picked)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <Link href={q({ sel: undefined })} className="text-sm text-sky-300 hover:underline">← 크리에이터 목록</Link>
          <Link href={`/admin/payouts?sel=${encodeURIComponent(picked.key)}`} className="text-sm text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 →</Link>
        </div>
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-base font-semibold text-neutral-50">{picked.name}{picked.aliases.length > 0 && <span className="ml-2 text-xs font-normal text-neutral-500">다른 이름 {picked.aliases.join(', ')}</span>} <Insta urls={igs.get(picked.key)} /></h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card label="매출 몫" value={won2(picked.revenue)} note={`${picked.revenueCount}건, 건당 평균 ${per(picked.revenue, picked.revenueCount)}${picked.currencies.length ? `, ${picked.currencies.join(', ')}` : ''}`} />
            <Card label="마진" value={won2(margin(picked) ?? 0)} note={`매출 몫 − 원가 ${won2(cost(picked) ?? 0)}, 건당 평균 ${per(margin(picked) ?? 0, picked.revenueCount)}`} />
            <Card label="마진율" value={pct(rate(picked))} note={costOf(picked) ? `${costOf(picked) === 'missing' ? '원가 누락 의심' : '원가 미확정'} 계약 ${picked.shares.filter((s) => s.flag === costOf(picked)).length}건` : '마진 ÷ 매출 몫'} />
            <Card label="정산 합계" value={won2(picked.paid)} note={`상태 무관 지급 ${picked.paidCount}행, 건당 평균 ${per(picked.paid, picked.paidCount)}`} />
            <Card label="송금 완료" value={won2(picked.done)} note={`진행 중 ${won2(picked.inFlight)}, 미지급(보류) ${won2(picked.held)}`} />
          </div>
          {picked.months.length > 0 && (
            <div className="space-y-2">
              <Legend items={[['매출 몫', REV], ['정산액', SET], ['안건 수(오른쪽 축)', NET_COLOR]]} />
              <p className="text-xs text-neutral-500">
                {basis === 'contract'
                  ? '발생 기준: 매출 몫, 정산액 모두 계약 기준일의 달(계약 없는 지급은 송금일의 달)'
                  : '현금 기준: 매출 몫은 고객사가 입금한 회차의 달(선금, 잔금 나눔, 입금 전 몫은 빠짐), 정산액은 송금 완료 건의 송금일 달(없으면 송금 요청일)'}
                . 안건 수는 두 기준 모두 계약 기준일의 달. 매출 몫은 계약 공급가를 정산금 비중으로 나눈 값(지급내역 「매출 단가」가 있는 행은 그 값)
              </p>
              <CashflowChart data={creatorFlow(picked.months)} inColor={REV} outColor={SET} names={{ in: '매출 몫', out: '정산액', net: '', count: '안건 수' }} />
            </div>
          )}
          <h3 className="pt-2 text-sm font-semibold text-neutral-100">지급 행 <span className="ml-1 text-xs font-normal text-neutral-500">노션 지급내역 DB, 계약월 최근순. 매출 몫은 계약 공급가를 정산금 비중으로 나눈 몫(「매출 단가」가 있는 행은 그 값), 원가는 그 몫에 대응하는 지급. 합계 줄이 위 카드와 같음. 송금 처리는 <Link href={`/admin/payouts?sel=${encodeURIComponent(picked.key)}`} className="underline hover:text-neutral-300">정산 마스터</Link>에서</span></h3>
          <CreatorLines lines={picked.lines} flags={new Map(picked.shares.map((s) => [s.c.id, s.flag]))} q={q} />
        </div>
      </div>
    )
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card label={f ? '매출 몫 합계 (검색 결과)' : '매출 몫 합계'} value={won2(tot.revenue)} note={`${tot.rn}건, 건당 평균 ${per(tot.revenue, tot.rn)}`} />
        <Card label={f ? '마진 총액 (검색 결과)' : '마진 총액'} value={won2(tot.margin)} note={`매출 몫 − 원가 ${won2(tot.cost)}, 마진율 ${pct(tot.revenue ? tot.margin / tot.revenue : null)}, 건당 평균 ${per(tot.margin, tot.rn)}`} />
        <Card label={f ? '정산 합계 (검색 결과)' : '정산 합계'} value={won2(tot.paid)} note={`상태 무관 지급 ${tot.pn}행, 건당 평균 ${per(tot.paid, tot.pn)}`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox q={q} f={f} n={rows.length} total={model.creators.length} placeholder="크리에이터 이름" />
        <Link href="/admin/payouts" className="text-xs text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 →</Link>
      </div>
      <Table head={['이름, 인스타', '통화', '매출 몫', '매출 건수', '건당 평균 매출', '원가', '마진', '건당 평균 마진', '마진율', '정산 합계', '정산 건수', '건당 평균 정산', '송금 완료', '진행 중', '미지급, 보류']} tall tips={CREATOR_TIPS}
        groups={[['', 2], ['수익성', 7], ['지급 현황', 6]]}
        sort={{ keys: ['name', null, 'revenue', 'revenueCount', 'avgRevenue', 'cost', 'margin', 'avgMargin', 'rate', 'paid', 'paidCount', 'avgPaid', 'done', 'inFlight', 'held'], cur: s, href: (k) => q({ s: k }) }}>
        {rows.map((x) => (
          <tr key={x.key}>
            <td className={tdl}>
              <Link href={q({ sel: x.key })} className="block max-w-[11rem] truncate whitespace-nowrap text-sky-300 hover:underline" title={x.name}>{x.name}</Link>
              {igs.get(x.key)?.size ? <span className="block max-w-[11rem] truncate text-xs"><Insta urls={igs.get(x.key)} /></span> : null}
            </td>
            <td className={td}>{x.currencies.join(', ') || '-'}</td>
            <Money n={x.revenue} />
            <td className={td}>{x.revenueCount}</td>
            <Money n={avgRevenue(x)} />
            <Money n={cost(x)} />
            <Money n={margin(x)} />
            <Money n={avgMargin(x)} />
            <td className={td}>{pct(rate(x))}<CostNote f={costOf(x)} n={x.shares.filter((s) => s.flag === costOf(x)).length} /></td>
            <Money n={x.paid} />
            <td className={td}>{x.paidCount}</td>
            <Money n={avgPaid(x)} />
            <Money n={x.done} />
            <Money n={x.inFlight} />
            <Money n={x.held} />
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">
        인스타는 지급 행의 크리에이터 관계로 크리에이터 리스트 「인스타」 칸을 읽습니다{igError ? ` (${igError})` : ''}. 매출 몫은 계약 공급가를 정산금 비중으로 나눈 값이라(지급내역 「매출 단가」가 있는 행은 그 값), 한 계약의 참여자는 모두 그 계약 마진율을 받습니다. 수익성 묶음은 매출 몫 − 원가 = 마진이고, 지급 현황 묶음의 정산 합계는 상태와 관계없는 지급 합이라 원가와 다르고 개요의 정산과도 합이 다릅니다. 매출 몫과 마진은 현금 기준이면 고객사 입금일, 발생 기준이면 계약 기준일로 기간을 골라 개요 매출과 같은 기준이고, 크리에이터 지급이 없는 계약만큼 개요 매출보다 적습니다. 정산 합계는 지급일(송금일, 없으면 요청일)로 고릅니다. 계약 연결 없는 지급은 마진에서 빠져, 계약일 기준인 개요의 마진과 합이 다릅니다. <Link href={q({ tab: 'basis' })} className="text-neutral-400 underline hover:text-neutral-200">기준 탭</Link>
      </p>
    </div>
  )
}

/** 담당자 마진율. 계약 어디에도 지급이 연결되지 않았으면 100%가 아니라 「지급 연결 없음」 */
function ownerRate(o: Model['owners'][number], model: Model) {
  if (o.rate == null) return '마진율 -'
  const linked = model.contracts.some((x) => ownersOf(x.c).includes(o.owner) && x.payouts.length)
  return linked ? `마진율 ${pct(o.rate)}` : '지급 연결 없음'
}

// 2025 계약은 대부분 백필이라 원천 자료에 담당자가 없음(261113 감사: 2025년 공급가 83%가 미지정)
const OWNER_GAP = '2025년까지의 계약은 대부분 담당자(정)가 비어 있어 「미지정」으로 잡힙니다.'

function Owners({ model, q, s = '-supply', year }: { model: Model; q: (o: Partial<Search>) => string; s?: string; year: number | null }) {
  const linked = (o: Model['owners'][number]) => model.contracts.some((x) => ownersOf(x.c).includes(o.owner) && x.payouts.length)
  const rows = sortRows(model.owners, s, {
    owner: (o) => o.owner, count: (o) => o.count, supply: (o) => o.supply, received: (o) => o.received, cost: (o) => o.cost,
    margin: (o) => (o.rate == null && !o.margin ? null : o.margin), rate: (o) => (o.rate != null && linked(o) ? o.rate : null), // 지급 연결 없음은 100%로 치지 않고 끝으로
  })
  return (
    <div className="space-y-2">
      <Table head={['담당자', '계약 수', '공급가', '입금액', '변동비', '마진', '마진율']}
        sort={{ keys: ['owner', 'count', 'supply', 'received', 'cost', 'margin', 'rate'], cur: s, href: (k) => q({ s: k }) }}>
        {rows.map((o) => (
          <tr key={o.owner}>
            <td className={tdl}>
              <Link href={q({ tab: 'contracts', o: o.owner })} className="text-sky-300 hover:underline">{o.owner}</Link>
            </td>
            <td className={td}>{o.count}</td>
            <Money n={o.supply} />
            <Money n={o.received} />
            <Money n={o.cost} />
            <Money n={o.rate == null && !o.margin ? null : o.margin} />
            <td className={td}>{ownerRate(o, model).replace('마진율 ', '')}</td>
          </tr>
        ))}
      </Table>
      {(year == null || year < 2026) && <p className="text-xs text-amber-200/90">{OWNER_GAP}</p>}
      <p className="text-xs text-neutral-500">노션 계약 DB 「담당자(정)」 기준입니다. 세일즈 담당자 칸은 아직 없습니다. 공급가가 없는 계약은 빠집니다. 여러 명이 맡은 계약(「,」나 「/」로 나눔)은 공급가, 입금액, 변동비, 마진을 n분의 1씩 나누고 계약 수는 각자 1건으로 셉니다.</p>
    </div>
  )
}

function Basis({ model, rates, basis, src, q }: { model: Model; rates: Rates; basis: Basis; src: Src; q: (o: Partial<Search>) => string }) {
  const g = model.gaps
  const twc = [...new Map(model.receivables.twikr.map((o) => [o.c.id, o.c])).values()] // 입금 전 회차가 남은 트위커 공급 계약(현금 기준 매출에 없음)
  const rows: [string, React.ReactNode][] = [
    ['서명 전 계약(유니크코드 없음, 모든 집계에서 빠짐)', `${g.unsigned}건`],
    ['입금일이 하나도 없는 수입 계약', `${g.noDeposit}건`],
    ['공급가가 없는 수입 계약(합계에서 빠짐)', `${g.noSupply}건`],
    ['날짜(계약일자, 시작일, 입금일)가 없는 수입 계약', `${g.noDay}건`],
    ['선금, 잔금 금액을 읽지 못해 반반으로 나눈 계약', `${g.estimatedSplit}건`],
    ['수입 계약에 연결되지 않은 지급(매출 몫, 마진에서 빠짐)', <Link key="u" href="/admin/payouts?v=rows&nc=none" className="text-sky-300 hover:underline">{g.unlinked.count}행, {won(g.unlinked.krw)} →</Link>],
    ['송금일 없이 신청일로 센 송금 완료(정산 어림)', `${g.doneByReq.count}행, ${won(g.doneByReq.krw)}`],
    ['송금일, 신청일 모두 없는 송금 완료(정산에서 빠짐)', `${g.doneNoDate.count}행, ${won(g.doneNoDate.krw)}`],
    ['원화 청구액 없는 외화 송금 완료(환율로 환산)', `${g.fxNoBilled}행`],
    ['통화나 지급액이 없어 환산하지 못한 지급', `${g.noRate}행`],
    ['매출 단가 합이 공급가를 넘는 계약(크리에이터 매출 몫을 단가 비율로 줄임)', `${g.overPriced}건`],
    [`원가 지급이 덜 붙었을 수 있는 계약(고른 기간, 마진율 ${HIGH_MARGIN * 100}% 이상, 체험단 ${HIGH_MARGIN_TRIAL * 100}% 이상, 예상 원가(원)가 있으면 지급 합계가 그 90% 미만)`, <Link key="c" href={q({ tab: 'contracts', st: 'cost' })} className="text-sky-300 hover:underline">누락 의심 {g.highMargin.missing}건 →</Link>],
    ['같은 조건이지만 고객 입금 전이거나 마지막 입금분 송금 회차 전인 계약(원가 미확정, 송금 신청 전일 수 있음)', `${g.highMargin.pending}건`],
    ['종결이거나 비고 맨 윗줄에 해제 금지가 적힌 지급(마진, 매출 몫에서 뺌)', `${g.dead.count}행, ${won(g.dead.krw)}`],
  ]
  return (
    <div className="space-y-6 text-sm text-neutral-300">
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">집계 기준</h2>
        <ul className="list-disc space-y-1 pl-5 text-neutral-400">
          <li>매출: 수입 계약 공급가(부가세 제외)를 입금된 달에 셉니다. 선금+잔금 계약은 금액 비율로 나눕니다. P- 지출 계약은 빠집니다.</li>
          {twc.length > 0 && <li>트위커 공급 계약: 대금이 트위커 계좌로 가 입금일이 빈 {twc.length}건(공급가 {won(twc.reduce((a, c) => a + (c.supplyKrw ?? 0), 0))})은 현금 기준 매출에 아직 없습니다. 발생 기준 매출에는 계약일로 들어갑니다.</li>}
          <li>정산: 지급내역 「송금 완료」 행의 지급액(원천징수 전)을 송금일의 달에 셉니다. 송금일이 없는 행(모인을 거치지 않는 원화 송금)은 은행 송금일이 들어오기 전까지 송금 요청일(신청일)의 달로 어림합니다.</li>
          <li>매출채권, 미지급금: 기간과 관계없는 현재 잔액이고 부가세 포함입니다. 매출채권은 입금 전 회차의 합계(합계 칸이 비면 공급가)에서 은행 원장에 일부 입금(공급가, 부가세)으로 붙은 금액을 뺀 남은 금액이고, 수출바우처는 기관이 낼 공급가와 고객사가 따로 낼 부가세(부가세 칸, 없으면 공급가 10%)를 나눠 셉니다. 고객사 부가세는 입금됐거나 정산일이 지난 회차 몫만 지금 받을 돈이고 나머지는 다음 회차 정산일에 두며, 은행 원장이 시작된 2025-01-02 전 계약은 셈하지 않습니다. 미지급금은 세금계산서 VAT 포함은 지급액, VAT 별도는 부가세를 더한 금액, 사업소득은 원천세 공제 전 금액입니다. 미지급금은 송금 완료도 보류도 아닌 지급입니다. 보류는 따로 보이고, 마진에서는 원가에 들어갑니다. 비고 맨 윗줄(최신 판단)에 「보류 해제 금지」, 「다시 보내지 말 것」, 「지급 아님」이 적힌 보류(중복, 반송 종결)는 원가와 크리에이터 매출 몫에서 빠집니다. 「확인 전」 조건이 붙은 해제 금지는 이미 나갔을 수 있어 원가에 둡니다.</li>
          <li>마진: {marginHint(basis === 'contract')} 계약일자가 없으면 시작일, 첫 입금일로 기간을 고릅니다.</li>
          <li>
            원화 환산: 외화 지급은 모인 원화 청구액이 있으면 그 값, 없으면 환율. 외화 계약 공급가는 입금된 몫을 입금일 환율(유럽중앙은행 기준환율), 입금 전 몫과 매출채권을 지금 환율로 셉니다(발생 기준 매출은 계약 기준일 환율). 지금 환율 1엔 {rates.JPY.toFixed(4)}원, 1달러 {rates.USD.toFixed(1)}원, 1위안 {rates.CNY.toFixed(2)}원 ({rates.source}, {rates.at}).
          </li>
          <li>
            개요의 기준 선택(지금 {basis === 'contract' ? '발생 기준(계약)' : '현금 기준(입금)'}): 현금 기준은 위 매출, 정산 규칙이고 입금일은 노션 계약 DB 선금, 잔금 입금일이고, 은행 원장에서 공급가를 따로 받은 것으로 맞춘 입금은 그 은행 입금일입니다. 발생 기준은 계약일자(없으면 시작일, 첫 입금일)의 달에 공급가 전액과 그 계약에 연결된 지급(종결과 해제 금지 보류는 뺌, 마진 원가와 같은 기준)을 셉니다. 수입 계약에 연결되지 않은 지급은 발생 기준 정산에서 빠집니다. 지급이 하나도 연결되지 않은 계약은 공급가가 매출에는 들고 마진에는 들지 않아 매출 빼기 정산이 마진과 다릅니다.
          </li>
          <li>
            자금 캘린더
            <ul className="mt-1 list-[circle] space-y-1 pl-5">
              <li>입금: 실제 입금 예상액(합계 칸: 공급가 + 부가세, 영세율과 엔화는 부가세 없음, 엔화는 환율 환산. 합계가 빈 계약은 공급가로 대신하고 「합계 없음」 표시)을 회차로 나눠, 입금된 회차는 입금일, 아직이면 정산일(입금 예정일)에 은행 원장 일부 입금을 뺀 남은 금액으로 둡니다. 수출바우처는 기관 입금을 공급가로, 고객사 부가세를 따로 「부가세(고객사)」로 둡니다.</li>
              <li>출금 날짜: 지급 예정일 규칙(송금 완료는 송금일, 모인 접수와 원화 이체 대기는 송금 요청일이고 정기 묶음(송금일 3영업일 전에 만듦)이면 그 달 송금일(마지막 평일), 송금 가능은 이번 달 말일, 대기는 수입 계약 입금 예정일(지났으면 오늘)이 든 달의 다음 달 말일(노션 송금 예정일과 같은 규칙). 말일이 주말이면 그 전 금요일, 공휴일은 따지지 않음)입니다. 모인 접수와 원화 이체 대기는 「송금 진행 중」이라 날짜가 지나도 지남으로 보지 않습니다.</li>
              <li>색 구분: 달력의 출금 예정은 송금 가능, 송금 진행 중, 대기(고객사 입금 전), 서류·계좌 대기를 한 줄(주황)로 합쳐 보여 주고, 이 구분은 아래 안건별 목록의 상태 칸에만 둡니다. 계약 비고에 「정산일 임의」가 있는 계약(정산일을 몰라 임의로 넣은 날, 수출바우처는 계약월 +2달 말일)은 그 입금 예정과 그 날짜를 따르는 대기 출금을 보라로 따로 보여 주고, 날이 지나도 지남으로 보지 않습니다. 봇 광고주 계약이 서명 전(코드 없음)이면 그 정산일에 청록으로 따로 보여 주고 입금 예정 합계에서 뺍니다. 대기 지급 가운데 연결 계약 입금이 끝났는데 서류나 계좌로 막힌 행은 「서류·계좌 대기」로 둡니다. 출금 날짜는 노션 지급내역 「송금 예정일」이 있으면 그 날(비고에 「송금 예정일 임의」가 있으면 목록에 표시), 없으면 이번 달 말일(주말이면 그 전 금요일)입니다.</li>
              <li>빠지는 것: 달력에 잡히는 대기는 수입 계약에 입금 안 된 회차가 있는 행뿐입니다. 보류, 예정일을 정할 수 없는 행, 송금일 없는 송금 완료는 빠집니다. 입금 약속일 칸은 아직 없습니다.</li>
              <li>잔고: 칸 아래 줄은 월초 잔액을 0으로 두고 그날까지 입금에서 출금을 뺀 누적입니다(통장 잔액 아님, 달마다 0에서 다시 시작). 입금은 입금됨과 입금 예정을, 출금은 달력에 잡힌 것을 넣고, 예정일 지남과 정산일 임의(입금, 출금 모두), 서명 전 계약은 넣지 않습니다. 검색과 필터와 관계없이 그 달 전체로 셉니다.</li>
              <li>출금 금액: 실지급액(원화 사업소득 3.3% 행은 공제 뒤, 외화는 모인 원화 청구액이나 환율 환산, 세금계산서 행은 VAT 별도면 부가세를 더하고, VAT 칸이 비면 지급액 그대로)이고, 공제한 원천세를 세무서에 내는 출금은 달력에 없습니다.</li>
            </ul>
          </li>
          <li>
            크리에이터 탭: 매출 몫은 계약 공급가를 정산금 비중으로 나눈 값입니다(지급내역 「매출 단가」가 있는 행은 그 값, 부가세 제외, 계약 공급가와 같은 통화). 현금 기준이면 고객사가 입금한 회차만 입금일로(입금 전 몫은 빠짐), 발생 기준이면 계약 기준일로 기간을 골라 개요 매출과 같은 기준이고, 크리에이터 지급이 없는 계약만큼 개요 매출보다 적습니다. 수입 계약에 연결되지 않은 지급은 정산에만 들어가고 매출 몫은 없습니다. 공급가 0원 계약의 지급은 매출 몫 없이 원가로만 들어가고, 현금 기준이면 송금한 달에 셉니다. 마진율은 매출 몫이 있는 지급끼리만 짝짓습니다. 정산 합계는 상태와 관계없고, 송금일이 없으면 요청일이나 계약일로 기간을 고르므로 개요의 정산(송금 완료, 송금일 기준)과 합이 다릅니다.
          </li>
          <li>운영 대시보드 시트 계약은 더 이상 합치지 않고 노션 계약 DB 계약만 셉니다. 시트에서 더하던 계약이 노션 계약 DB 계약과 겹쳐 매출채권이 두 번 잡혔습니다.</li>
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
  in: { done: '입금됨', flight: '-', due: '입금 예정', wait: '-', late: '입금 예정일 지남', guess: '입금 예정(정산일 임의)', unsigned: '입금 예정(서명 전)', docs: '-' },
  out: { done: '송금 완료', flight: '송금 진행 중', due: '송금 가능(고객사 입금 완료)', wait: '고객사 입금 전', late: '출금 예정일 지남', guess: '고객사 입금 전(정산일 임의)', unsigned: '-', docs: '서류·계좌 대기(고객사 입금 완료)' },
}
// 들어옴: 들어온 돈 초록, 예정 회색, 예정일 지났는데 안 들어온 돈 빨강 / 나감: 정산해서 나간 돈 파랑, 나갈 돈 주황, 예정일 지남 빨강
const GOOD = '#3fae6a'
const DUE = '#a3a3a3'
const GUESS = '#a78bfa' // 정산일을 몰라 임의로 넣은 날(계약 비고 「정산일 임의」)
const UNSIGNED = '#5fb3b3' // 봇 광고주 계약 서명 전(코드 없음)
const CAL_COLOR: Record<CalItem['kind'], Record<CalItem['state'], string>> = {
  in: { done: GOOD, flight: DUE, due: DUE, wait: DUE, late: ALERT, guess: GUESS, unsigned: UNSIGNED, docs: DUE },
  // 출금 예정은 송금 준비 상태(입금 전, 서류·계좌 대기 등)를 색으로 나누지 않음, 구분은 목록 상태 칸에만(Leo 261107 「경영 가시성에 도움 안 됨」)
  out: { done: REV, flight: SET, due: SET, wait: SET, late: ALERT, guess: GUESS, unsigned: DUE, docs: SET },
}
const CAL_LINES: [CalItem['kind'], CalItem['state'][], string][] = [
  ['in', ['done'], '입금'], ['in', ['due'], '입금 예정'], ['in', ['late'], '입금 예정일 지남'], ['in', ['guess'], '입금 예정(정산일 임의)'], ['in', ['unsigned'], '입금 예정(서명 전)'],
  ['out', ['done'], '출금'], ['out', ['flight', 'due', 'wait', 'docs'], '출금 예정'], ['out', ['late'], '출금 예정일 지남'], ['out', ['guess'], '출금 예정(정산일 임의)'],
]

const LIST = 'cal-list'
// 정상 흐름이 아닌 상태(정산일 임의, 서명 전, 서류·계좌 대기)는 날이 지나도 색을 바꾸지 않고 「예정일 지남」 글자만 붙임(Leo 261026)
const ODD: CalItem['state'][] = ['guess', 'unsigned', 'docs']
const Overdue = ({ show, short }: { show: boolean; short?: boolean }) => (show ? <span style={{ color: ALERT }}>{short ? ' 지남' : ', 예정일 지남'}</span> : null)
const notion = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`
/** 안건 칸 이름: 입금은 계약 노션(시트 행은 계약 탭), 출금은 크리에이터 상세 + 지급 ID(지급내역 노션) */
function CalTitle({ x, q }: { x: CalItem; q: (o: Partial<Search>) => string }) {
  if (x.kind === 'in' && x.notionId) return <a href={notion(x.notionId)} target="_blank" className="text-sky-300 hover:underline" title="노션 열기">{x.title}</a>
  const href = x.kind === 'out' ? q({ tab: 'creators', y: 'all', m: undefined, sel: x.creator ?? x.title }) : x.contractId ? q({ tab: 'contracts', y: 'all', m: undefined, sel: x.contractId }) : null
  const name = href ? <Link href={href} className="text-sky-300 hover:underline">{x.title}</Link> : <span className="text-neutral-200">{x.title}</span>
  return x.pay ? <>{name} <a href={notion(x.pay.id)} target="_blank" className="text-xs text-sky-300/80 hover:underline" title="지급내역 노션 열기">#{x.pay.pid ?? '지급'}</a></> : name
}
/** 안건 칸 회색 줄: 계약 코드(누르면 계약 노션, 시트 행은 계약 탭), 예외 메모. 상태는 상태 칸에 */
function CalSub({ x, q }: { x: CalItem; q: (o: Partial<Search>) => string }) {
  const cls = 'underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200'
  const code = x.code && x.notionId ? <a href={notion(x.notionId)} target="_blank" className={cls} title="노션 열기">{x.code}</a> : x.code && x.contractId ? <Link href={q({ tab: 'contracts', y: 'all', m: undefined, sel: x.contractId })} className={cls}>{x.code}</Link> : x.code
  if (!code && !x.sub) return null
  return <span className="block break-words text-xs text-neutral-500">{code}{code && x.sub ? ', ' : ''}{x.sub}</span>
}
/** 캘린더 칸(모바일): 만원 단위 숫자만, 1억 이상은 억 */
const man = (n: number) => (n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n < 1e4 ? '<1' : Math.round(n / 1e4).toLocaleString('ko-KR'))

/** 자금 캘린더: 날짜별 들어오고 나가는 돈, 아래 표는 그 달 안건별 입출금 전체(날짜를 누르면 그날만, 안건명 검색) */
function Calendar({ items, ym: cur, today, sel, q, f, s = 'date', k, st }: { items: CalItem[]; ym: string; today: string; sel?: string; q: (o: Partial<Search>) => string; f?: string; s?: string; k?: string; st?: string }) {
  const [y, m] = cur.split('-').map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay() // 일요일 0
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const byDay = new Map<string, CalItem[]>()
  for (const x of items) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x])
  const bal = dailyBalance(items, cur) // 검색, 필터와 무관하게 그 달 전체
  const sum = (xs: CalItem[], kind: CalItem['kind'], states: CalItem['state'][]) => xs.filter((x) => x.kind === kind && states.includes(x.state)).reduce((a, x) => a + x.krw, 0)
  const go = (yy: number, mm: number, d?: string) => q({ y: String(yy), m: String(mm), d })
  const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1]
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1]
  const day = sel?.startsWith(cur) ? sel : undefined
  const pool = (day ? (byDay.get(day) ?? []) : items).filter((x) => hit(f, x.title, x.code, x.sub))
  const sk = (x: CalItem) => `${x.kind}.${x.state}`
  const byKind = pool.filter((x) => !k || x.kind === k)
  const rows = sortRows(byKind.filter((x) => !st || sk(x) === st), s, {
    date: (x) => x.date, title: (x) => x.title, kind: (x) => x.kind, state: (x) => CAL_STATE[x.kind][x.state], krw: (x) => x.krw,
  })
  const here = (o: Partial<Search>) => `${q({ y: String(y), m: String(m), d: day, ...o })}#${LIST}`
  // 합계는 보이는 행(검색, 필터 적용) 기준. 입금과 출금은 따로 더함
  const tot = (kind: CalItem['kind']) => { const xs = rows.filter((x) => x.kind === kind); return { n: xs.length, krw: xs.reduce((a, x) => a + x.krw, 0) } }
  const [tin, tout] = [tot('in'), tot('out')]
  const chip = (on: boolean) => `rounded-full border px-2 py-0.5 ${on ? 'border-neutral-400 text-neutral-100' : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'}`
  const states = [...new Map(byKind.map((x) => [sk(x), x])).values()]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={go(py, pm)} aria-label="이전 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">‹</Link>
          <h2 className="text-base font-semibold text-neutral-100">{y}년 {m}월</h2>
          <Link href={go(ny, nm)} aria-label="다음 달" className="rounded-md px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">›</Link>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">입금</span><Legend items={[['입금', GOOD], ['입금 예정', DUE], ['서명 전 계약', UNSIGNED]]} /></div>
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">출금</span><Legend items={[['출금', REV], ['출금 예정', SET]]} /></div>
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">공통</span><Legend items={[['예정일 지남', ALERT], ['정산일 임의', GUESS]]} /><span className="inline-flex items-center gap-1 text-neutral-300"><span aria-hidden className="inline-block h-px w-3 bg-neutral-500" />잔고<Info align="right" text="날짜 칸 아래 줄. 월초 0원에서 그날까지 입금 − 출금 누적입니다(통장 잔액 아님). 예정일 지남, 정산일 임의, 서명 전 계약은 빼고 셉니다." /></span></div>
          <p className="text-neutral-500">날짜를 누르면 아래에 그날 안건이 나옵니다</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card label="입금" value={won2(sum(items, 'in', ['done']))} note="부가세 포함, 입금일(노션 계약 DB). 공급가, 부가세를 나눠 받은 회차는 은행 입금일별로" />
        <Card label="입금 예정" value={won2(sum(items, 'in', ['due', 'late', 'guess']))} note={`부가세 포함, 그중 예정일 지남 ${won2(sum(items, 'in', ['late']))}, 정산일 임의 ${won2(sum(items, 'in', ['guess']))}, 서명 전 계약 ${won2(sum(items, 'in', ['unsigned']))}은 따로(합계 제외)`} />
        <Card label="출금" value={won2(sum(items, 'out', ['done']))} note="실지급액(3.3% 공제 뒤), 송금일" />
        <Card label="출금 예정" value={won2(sum(items, 'out', ['flight', 'due', 'wait', 'late', 'guess', 'docs']))} note={`실지급액, 그중 예정일 지남 ${won2(sum(items, 'out', ['late']))}, 정산일 임의 ${won2(sum(items, 'out', ['guess']))}, 보류 제외`} />
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
            const b = bal[i]
            const [gin, gout] = [sum(xs, 'in', ['guess']), sum(xs, 'out', ['guess'])]
            return (
              <Link key={date} href={date === day ? go(y, m) : `${go(y, m, date)}#${LIST}`} className={`flex min-h-16 flex-col space-y-1 bg-neutral-900 p-1 text-[11px] sm:min-h-32 sm:space-y-1.5 sm:p-2.5 sm:text-sm hover:bg-neutral-800/70 ${date === sel ? 'rounded-xl ring-2 ring-inset ring-sky-500' : ''}`}>
                <span className={`self-start ${date === today ? 'rounded bg-neutral-100 px-1 font-semibold text-neutral-900' : 'text-neutral-500'}`}>{i + 1}</span>
                {CAL_LINES.map(([kind, states, label]) => {
                  const k = sum(xs, kind, states)
                  return k > 0 && <span key={label} className="block break-keep tabular-nums leading-snug" style={{ color: CAL_COLOR[kind][states[0]] }} title={`${label} ${won(k)}`}>{kind === 'in' ? '+' : '−'}<span className="sm:hidden">{man(k)}</span><span className="hidden sm:inline"> {won2(k)}{states.includes('guess') ? ' 임의' : states.includes('unsigned') ? ' 서명 전' : states.includes('late') ? (kind === 'in' ? ' 입금 예정일 지남' : ' 출금 예정일 지남') : xs.some((x) => x.kind === kind && states.includes(x.state) && x.manual) ? ' 임의' : ''}<Overdue show={date < today && xs.some((x) => x.kind === kind && states.includes(x.state) && ODD.includes(x.state))} short /></span></span>
                })}
                <span className="mt-auto block border-t border-neutral-700 pt-1 tabular-nums leading-snug" style={{ color: b < 0 ? ALERT : '#d4d4d4' }} title={`잔고(월초 0 기준) ${won(b)}`}>
                  {b < 0 ? '−' : ''}<span className="sm:hidden">{b === 0 ? '0' : man(Math.abs(b))}</span><span className="hidden sm:inline">{b === 0 ? '0원' : won2(Math.abs(b))} 잔고{(gin > 0 || gout > 0) && <> <Info up align={(lead + i) % 7 >= 4 ? 'right' : 'left'} text={`정산일 임의는 잔고에 넣지 않았습니다.${gin > 0 ? ` 입금 +${won2(gin)}` : ''}${gout > 0 ? ` 출금 −${won2(gout)}` : ''}`} /></>}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-neutral-500 sm:hidden">칸 금액 단위는 만원이고, 줄 아래 숫자는 잔고입니다.</p>
      <section id={LIST} className="scroll-mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-100">
            {day ?? `${m}월 전체`} 안건별 입출금
            {day && <Link href={`${go(y, m)}#${LIST}`} className="ml-2 text-xs font-normal text-neutral-400 hover:text-neutral-200">월 전체 보기</Link>}
          </h3>
          <SearchBox q={q} f={f} n={rows.length} total={day ? (byDay.get(day) ?? []).length : items.length} placeholder="안건, 크리에이터" anchor={LIST} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {([[undefined, '전체'], ['in', '입금'], ['out', '출금']] as const).map(([v, l]) => (
            <Link key={l} href={here({ k: v, st: undefined })} className={chip(k === v)}>{l}</Link>
          ))}
          <span className="mx-1 text-neutral-700">|</span>
          <Link href={here({ st: undefined })} className={chip(!st)}>상태 전체</Link>
          {states.map((x) => (
            <Link key={sk(x)} href={here({ st: st === sk(x) ? undefined : sk(x) })} className={chip(st === sk(x))} style={{ color: CAL_COLOR[x.kind][x.state] }}>
              {CAL_STATE[x.kind][x.state]} {byKind.filter((r) => sk(r) === sk(x)).length}
            </Link>
          ))}
        </div>
        {rows.length ? (<>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 sm:hidden">
            {rows.map((x, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="block text-xs tabular-nums text-neutral-500">{x.date.slice(5).replace('-', '/')} {x.kind === 'in' ? '입금' : '출금'}</span>
                  <CalTitle x={x} q={q} />
                  <CalSub x={x} q={q} />
                </div>
                <div className="shrink-0 text-right">
                  <span className="block tabular-nums text-neutral-100">{x.kind === 'in' ? '+' : '−'}{won(x.krw)}</span>
                  <span className="block text-xs" style={{ color: CAL_COLOR[x.kind][x.state] }}>{CAL_STATE[x.kind][x.state].replace(/\(.*\)/, '')}<Overdue show={ODD.includes(x.state) && x.date < today} /></span>
                </div>
              </li>
            ))}
            <li className="flex justify-between gap-3 px-3 py-2.5 text-sm text-neutral-100">
              <span>합계 {rows.length}건</span>
              <span className="text-right tabular-nums">{tin.n > 0 && <span className="block">입금 {tin.n}건 +{won(tin.krw)}</span>}{tout.n > 0 && <span className="block">출금 {tout.n}건 −{won(tout.krw)}</span>}</span>
            </li>
          </ul>
          <div className="hidden sm:block">
          <Table head={['날짜', '안건', '구분', '상태', '금액']} left={2}
            sort={{ keys: ['date', 'title', 'kind', 'state', 'krw'], cur: s, href: (v) => here({ s: v }) }}
            foot={
              <tr>
                <td className={tdl} colSpan={2}>합계 {rows.length}건</td>
                <td className={td}>{tin.n > 0 && <span className="block">입금 {tin.n}건</span>}{tout.n > 0 && <span className="block">출금 {tout.n}건</span>}</td>
                <td className={td} />
                <td className={`${td} tabular-nums`}>{tin.n > 0 && <span className="block">{won(tin.krw)}</span>}{tout.n > 0 && <span className="block">{won(tout.krw)}</span>}</td>
              </tr>
            }>
            {rows.map((x, i) => (
              <tr key={i}>
                <td className={`${tdl} whitespace-nowrap tabular-nums`}>
                  <Link href={`${go(y, m, x.date)}#${LIST}`} className="text-neutral-400 hover:text-neutral-100">{x.date.slice(5).replace('-', '/')}</Link>
                </td>
                <td className={tdl}>
                  <CalTitle x={x} q={q} />
                  <CalSub x={x} q={q} />
                </td>
                <td className={td}>{x.kind === 'in' ? '입금' : '출금'}</td>
                <td className={td} style={{ color: CAL_COLOR[x.kind][x.state] }}>{CAL_STATE[x.kind][x.state]}<Overdue show={ODD.includes(x.state) && x.date < today} /></td>
                <td className={td}>{won(x.krw)}</td>
              </tr>
            ))}
          </Table>
          </div>
        </>) : (
          <p className="text-sm text-neutral-500">{f ? '찾는 안건이 없습니다.' : day ? '이 날짜에 입출금이 없습니다.' : '이 달에 입출금이 없습니다.'}</p>
        )}
      </section>
      <p className="text-xs text-neutral-500">
        입금은 부가세 포함 입금 예상액, 출금은 실지급액입니다. 날짜를 정하는 규칙은 <Link href={q({ tab: 'basis' })} className="text-neutral-400 underline hover:text-neutral-200">기준 탭</Link>에 있습니다.
      </p>
    </div>
  )
}
