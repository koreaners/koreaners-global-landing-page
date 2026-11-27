import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { getFinance } from '@/lib/finance/data'
import { refreshFinance } from './actions'
import { RefreshButton } from './refresh-button'
import { AutoForm } from './auto-form'
import { AheadHeatmap, type HeatRow } from './ahead-heatmap'
import { getRates } from '@/lib/finance/fx'
import { adminRole } from '@/lib/supabase/role'
import type { FinanceData } from '@/lib/finance/source'
import { buildModel, calendarMonth, dailyBalance, HIGH_MARGIN, HIGH_MARGIN_TRIAL, type CostFlag, contractDay, creatorKey, grossPayoutKrw, isDead, ownersOf, cnt, defaultQuarter, quarterLabel, quarters, quarterSheet, quarterTitle, payoutKrw, priorPeriod, type Basis, type Contract, type ByCur, type CalItem, type Currency, type Model, type Payout, type Rates } from '@/lib/finance/model'
import { CashflowChart, NET_COLOR, type FlowPoint } from './charts'
import { DOT } from './signal-table'
import { FunnelTrendTab, readTrend } from './funnel-trend'
import type { FunnelTrend } from '@/lib/reports'
import { COLOR } from './colors'
import { Card, CUR_NAME, Fetched, CURS, hit, Info, LINK, Money, Notes, orig, Panel, SearchBox, sortRows, Table, td, tdl, Tile, won, won2 } from './ui'

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

type Search = { tab?: string; y?: string; m?: string; sel?: string; b?: string; d?: string; f?: string; s?: string; o?: string; k?: string; st?: string; qt?: string } // o: 안건 탭을 담당자 한 명으로 거름, k/st: 캘린더 표 구분(in/out)과 상태(kind.state) 필터, qt: 담당자 탭 분기(2026-Q4)

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  // receivables 역할(경영지원 미수 확인용)은 주소의 tab 값과 무관하게 미수 탭만 본다. proxy는 경로만 막으므로 탭은 여기서 고정
  const only = (await adminRole()) === 'receivables'
  const tab: Tab = only ? 'receivables' : ((TABS.find(([k]) => k === sp.tab)?.[0] ?? 'summary') as Tab)
  if (tab === 'funnel') return <FunnelTrendTab y={sp.y} m={sp.m} /> // 노션을 읽지 않고 주간 잡이 올린 파일만
  // 기본 연도도 한국 시간 오늘에서(서버는 UTC라 새해 첫날 0~9시에 전년으로 열리던 문제, 261113 감사)
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10) // KST
  const thisYear = Number(today.slice(0, 4))
  const year = sp.y === 'all' ? null : Number(sp.y) || thisYear
  const month = year != null && Number(sp.m) >= 1 && Number(sp.m) <= 12 ? Number(sp.m) : null
  const basis: Basis = sp.b === 'contract' ? 'contract' : 'cash'

  let data: Awaited<ReturnType<typeof getFinance>>
  let rates: Rates
  let trend: FunnelTrend | null
  try {
    // 추이 파일(주간 잡): 안건별 정담당은 담당자를 쓰는 탭(개요 패널, 안건 담당자 필터, 담당자)에서, 사람 단면은 담당자 탭에서. 없거나 못 읽으면 지금처럼 계약 담당자(정)
    ;[data, rates, trend] = await Promise.all([getFinance(), getRates(), ['summary', 'contracts', 'owners'].includes(tab) ? readTrend().catch(() => null) : null])
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
  const model = buildModel(data.contracts, data.payouts, rates, period, today, basis, data.bankLinks, data.alias, trend?.deal_owner ?? {})
  const tw = model.receivables.twikr // 트위커 표시라 받을 돈에서 뺀 입금 전 회차(미수 탭 안내)
  const pp = priorPeriod(period, today)
  const prior = pp && tab === 'summary' ? buildModel(data.contracts, data.payouts, rates, pp, today, basis, data.bankLinks, data.alias, trend?.deal_owner ?? {}) : null
  const all = tab === 'summary' ? buildModel(data.contracts, data.payouts, rates, { year: null, month: null }, today, basis, data.bankLinks, data.alias, trend?.deal_owner ?? {}) : null
  const span = (p: { year: number | null; month: number | null; upto?: number | null }) =>
    p.year == null ? '전체 기간' : p.month ? `${p.year}년 ${p.month}월` : p.upto ? `${p.year}년 1~${p.upto}월` : `${p.year}년`
  const labels = { cur: span(period), prev: pp ? span(pp) : null }
  const calYm = year == null ? today.slice(0, 7) : month ? `${year}-${String(month).padStart(2, '0')}` : year === Number(today.slice(0, 4)) ? today.slice(0, 7) : `${year}-01`
  const years = [...new Set(data.contracts.map((c) => c.contractDate?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse()
  const q = (over: Partial<Search>) => {
    const s = new URLSearchParams()
    const keep = over.tab && over.tab !== tab ? {} : { f: sp.f, s: sp.s, o: sp.o, k: sp.k, st: sp.st, qt: sp.qt } // 탭을 옮기면 검색어, 정렬, 필터는 버림
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
        <Fetched t={data.fetchedAt} />
        <form action={refreshFinance}>
          <RefreshButton />
        </form>
        {/* 미수는 기간, 집계 기준과 무관 */}
        {tab !== 'receivables' && <AutoForm className="flex flex-wrap items-center gap-2 text-sm" action="/admin/finance">
          <input type="hidden" name="tab" value={tab} />
          {/* 기준, 기간을 바꿔도 보던 크리에이터, 계약 상세와 검색, 정렬은 그대로 */}
          {(['sel', 'f', 's', 'o', 'qt'] as const).map((k) => sp[k] && <input key={k} type="hidden" name={k} value={sp[k]} />)}
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
      {tab === 'calendar' && data.bankError && <p className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-2.5 text-xs text-red-400">은행 원장을 읽지 못해 일부 입금 줄이 빠지고, 그 회차는 일부 입금을 빼지 않은 전액을 들어올 돈으로 표시합니다: {data.bankError}</p>}
      {tab === 'calendar' && <Calendar items={calendarMonth(data.contracts, data.payouts, rates, calYm, today, data.bankLinks)} ym={calYm} today={today} sel={sp.d} q={q} f={sp.f} s={sp.s} k={sp.k} st={sp.st} />}
      {tab === 'contracts' && <Contracts model={model} rates={rates} sel={sp.sel} q={q} f={sp.f} s={sp.s} o={sp.o} st={sp.st} today={today} />}
      {tab === 'creators' && <Creators model={model} rates={rates} all={data.payouts} contracts={data.contracts} ig={data.ig} igError={data.igError} today={today} sel={sp.sel} q={q} f={sp.f} s={sp.s} basis={basis} />}
      {tab === 'owners' && <Owners model={model} q={q} s={sp.s} year={year} trend={trend} sel={sp.sel} qt={sp.qt} />}
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
      {tab === 'receivables' && data.bankError && <p className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-2.5 text-xs text-red-400">{bankWarn(data.bankError)}</p>}
      {tab === 'receivables' && <OverdueTable model={model} today={today} bankError={data.bankError} />}
    </div>
  )
}

/** 매출 통화별 나눔 글(원화 환산). 통화가 하나뿐이면 빈 글 */
const curSplit = (o: ByCur) => {
  const xs = CURS.filter((k) => o[k])
  return xs.length > 1 ? xs.map((k) => `${CUR_NAME[k]} ${won2(o[k] ?? 0)}`).join(', ') : ''
}

const REV = COLOR.in // 매출 쪽 계열(받을 돈 포함)
const SET = COLOR.out // 정산 쪽 계열(줄 돈 포함)
const ALERT = COLOR.bad
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

export type Labels = { cur: string; prev: string | null }

/** 직전 기간 대비 증감. good: 오르면 좋은 지표인지(정산은 색 없이 부호만) */
const thin = (cur: number, prev: number | null) => !prev || Math.abs(prev) * 10 < Math.abs(cur)

function Delta({ cur, prev, good }: { cur: number; prev: number | null; good: boolean | null }) {
  if (prev == null || thin(cur, prev)) return null // 비교 기간 기록이 없거나 너무 적으면 증감을 쓰지 않음
  const r = (cur - prev) / Math.abs(prev)
  const up = r >= 0
  const color = good == null ? undefined : up === good ? COLOR.good : COLOR.bad
  return <span className="font-medium text-neutral-300" style={{ color }}>{up ? '▲' : '▼'} {Math.abs(r * 100).toFixed(1)}%</span>
}

// 텍스트 화살표 대신 lucide 아이콘(261116 감사). 링크에 inline-flex items-center gap-1 whitespace-nowrap 을 같이 줘 줄바꿈되지 않게
const Arrow = () => <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
const MORE = 'inline-flex items-center gap-1 whitespace-nowrap text-xs text-neutral-400 hover:text-neutral-200'

/** 입금은 됐는데 크리에이터 지급이 하나도 연결되지 않은 계약(계약 단위 마진에서 빠짐), 안건 탭 st=nolink.
 * 개요 할 일 카드로는 쓰지 않음(인혁 261113). 계약 DB 「크리에이터 지급 없음」 체크 계약은 원래 비용이 없어 뺌(261120) */
const noLinkPaid = (x: Model['contracts'][number]) => x.c.source !== 'sheet' && !x.c.noPayout && x.supply != null && !x.payouts.length && x.received > 0

// 발생 기준의 정산은 연결된 지급만이라 매출 − 정산이 연결 없는 계약 공급가만큼 부풀어(261113 확인) 발생 기준에선 계약 단위를 씀
const NET_HINT = '이 기간 매출(입금된 공급가)에서 정산(송금 완료)을 뺀 값입니다. 계약을 고르지 않은 회사 전체 숫자이고, 입금과 송금 시점이 달라 달마다 출렁입니다. 아래 계약 단위 마진율은 지급이 연결된 계약끼리만 공급가에서 지급을 뺀 값이고, 이 기간 매출 가운데 그 계약들에서 들어온 몫의 비율을 함께 적습니다.'

// 개요 카드 부가세 기준(인혁 261125): 손익(매출, 정산, 마진)은 부가세 제외, 잔액(매출채권, 미지급금)은 실제 주고받을 돈이라 부가세 포함
const REVENUE_HINT = (cb: boolean) =>
  `부가세: 부가세를 뺀 공급가로 셉니다. 부가세는 고객사에게 받아 세무서에 내는 돈이라 매출이 아닙니다.\n기간: ${cb ? '계약일이 속한 달에 계약 공급가 전액을 넣습니다.' : '고객사가 입금한 달에 그 회차 공급가를 넣습니다.'}`
const SETTLED_HINT = '부가세: 부가세를 뺀 공급가로 셉니다. 세금계산서 VAT 포함 지급은 1.1로 나눕니다. 부가세는 매입세액 공제로 돌려받아 비용이 아닙니다.\n원천세: 3.3% 공제 전 지급액입니다.\n범위: 지급내역 DB의 크리에이터 지급만 셉니다. 인건비, 운영비, 카드 대금은 빠집니다.'
const RECEIVABLE_HINT = '정의: 입금 전 회차의 합계에서 은행에 일부 들어온 금액을 뺀 남은 금액입니다.\n부가세: 부가세까지 셉니다. 고객사가 실제로 보내야 할 돈이기 때문입니다. 부가세까지 다 들어와야 입금 완료로 봅니다.\n수출바우처: 기관 공급가와 고객사 부가세를 따로 셉니다.'
const PAYABLE_HINT = '부가세: 부가세까지 셉니다. 크리에이터에게 실제로 보낼 돈이기 때문입니다. 세금계산서 VAT 포함은 지급액 그대로, VAT 별도는 부가세 10%를 더합니다.\n원천세: 사업소득은 3.3% 공제 전 금액입니다. 원천세도 세무서로 나가는 돈입니다.'

const marginHint = (cb: boolean) =>
  `크리에이터 지급이 연결된 수입 계약만 셉니다. 계약마다 공급가에서 연결된 지급 합(종결, 해제 금지 보류는 뺌)을 빼고, 평균 마진율은 마진 합 ÷ 그 계약들의 공급가 합입니다. 지급이 하나도 연결되지 않은 계약은 비용을 몰라 뺍니다(공급가 전액이 마진으로 잡히지 않게). 계약 DB에 「크리에이터 지급 없음」을 체크한 계약은 원가 0으로 넣습니다. ${cb ? '기간은 매출, 정산과 같은 계약일 기준이지만, 지급 연결 없는 계약이 빠져 매출 − 정산과 다릅니다.' : '기간은 계약일 기준이라 옆의 매출(입금된 달), 정산(송금한 달)과 빼서 맞지 않습니다.'}`

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
  // 차트는 고른 해의 1~12월(전체면 올해)
  const cy = year ?? thisYear
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
        {src.bankError && <span className="text-red-400"> {bankWarn(src.bankError)}</span>}
        {cb ? ' 발생 기준(계약일의 달).' : ' 현금 기준(입금일, 송금일의 달).'}{' '}
        <Link href={q({ tab: 'basis' })} className="text-neutral-300 underline hover:text-neutral-100">기준 보기</Link>
      </p>

      {todo.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-100">지금 볼 것 <span className="ml-1 text-xs font-normal text-neutral-500">손이 필요한 항목, 누르면 해당 목록으로</span></h2>
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${['', 'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5'][todo.length]}`}>
            {todo.map(([title, count, krw, href, alert]) => (
              <Link key={title} href={href} className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800/60">
                <p className={`text-xs ${alert ? 'text-red-400' : 'text-neutral-400'}`}>{title}</p>
                <p className="text-2xl font-semibold text-neutral-50" title={won(krw)}>{won2(krw)}</p>
                <p className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{count}</span>
                  <Arrow />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label={cb ? '매출 (발생 기준)' : '매출 (입금 기준)'} value={won2(s.revenue)} full={won(s.revenue)} delta={<Delta cur={s.revenue} prev={p?.revenue ?? null} good />} hint={REVENUE_HINT(cb)} tipAlign="left" note={[`부가세 제외, ${vs(s.revenue, p?.revenue, cb ? '계약 전액, 계약일의 달' : '입금된 달')}`, curSplit(s.revenueByCur)].filter(Boolean).join('. ')} />
        <Tile label={cb ? '정산 (발생 기준)' : '정산 (송금 기준)'} value={won2(s.settled)} full={won(s.settled)} delta={<Delta cur={s.settled} prev={payGap ? null : p?.settled ?? null} good={null} />} hint={SETTLED_HINT} note={`부가세 제외, ${payGap ? `${cb ? '연결된 지급(종결 제외), 계약일의 달' : '송금 완료, 송금한 달'}. ${labels.prev}은 지급 자료가 불완전해 비교 생략` : vs(s.settled, p?.settled, cb ? '연결된 지급(종결 제외), 계약일의 달' : '송금 완료, 송금한 달')}${s.settledEst ? `, 그중 ${won2(s.settledEst)}은 신청월 어림` : ''}`} />
        <Tile label={cb ? '마진 (계약 단위)' : '마진 (현금, 전체)'} value={won2(net)} full={won(net)} delta={<Delta cur={net} prev={payGap || !p ? null : cb ? p.margin : p.revenue - p.settled} good />} side={`마진율 ${pct(cb ? s.marginRate : s.revenue ? net / s.revenue : null)}`} hint={`${cb ? marginHint(true) : NET_HINT}\n부가세: 매출과 지급 모두 부가세를 뺀 금액끼리 뺍니다.`} note={`부가세 제외, ${cb ? `지급 연결된 계약 ${s.marginN}건(매출의 ${cover}), 공급가 ${won2(s.marginSupply)} − 지급 ${won2(s.marginSupply - s.margin)}` : `매출 ${won2(s.revenue)} − 정산 ${won2(s.settled)}. 계약 단위 ${pct(s.marginRate)}(매출의 ${cover}만 지급 연결)`}${payGap ? `, ${labels.prev}은 지급 자료가 불완전해 비교 생략` : ''}`} />
        <Tile label="매출채권 (현재 잔액)" href={q({ tab: 'contracts', st: 'receivable' })} value={won2(s.receivable)} full={won(s.receivable)} hint={RECEIVABLE_HINT} note={`부가세 포함, 예정일 지남 ${won2(overdueKrw)}, 기간과 무관`} />
        <Tile label="미지급금 (현재 잔액)" href="/admin/payouts" value={won2(s.payable)} full={won(s.payable)} hint={PAYABLE_HINT} note={`부가세 포함, 보류 ${won2(s.held)} 별도, 기간과 무관`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Panel
            title={cb ? '월별 매출과 정산 (발생 기준)' : '월별 현금 유출입 (계약 입금, 크리에이터 지급 기준)'}
            sub={cb
              ? `${cy}년, 부가세 제외. 계약일의 달 기준 계약 전액과 연결 지급액(종결, 해제 금지 보류는 뺌)`
              : `${cy}년, 부가세 제외. 입금은 입금된 달의 공급가, 출금은 송금 완료한 달의 크리에이터 지급액(원천징수 전). 통장 금액(부가세 포함, 실지급액)은 자금 캘린더`}
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
              <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2">
                <Notes className="text-amber-200/90" items={[
                  '은행 잔고 변화가 아닙니다.',
                  '출금은 지급내역 DB의 크리에이터 지급만입니다. 인건비, 운영비, 세금, 카드 대금이 빠져 실제 은행 출금보다 훨씬 적습니다.',
                  '입금은 노션 계약 DB에 입금일이 적힌 계약과, 은행 원장에서 공급가를 따로 받은 것으로 맞춘 입금만입니다.',
                ]} />
              </div>
            )}
            <CashflowChart data={flow} inColor={REV} outColor={SET} names={flowNames} />
          </Panel>
        </div>

        <Panel id="receivables" title="매출채권 만기" sub={`입금 전 회차 ${model.receivables.open.filter((o) => !o.label).length}건 + 고객사 부가세 ${model.receivables.open.filter((o) => o.label).length}건, 부가세 포함(일부 입금 뺀 남은 금액), 입금 예정일(정산일) 기준, 오늘 ${today}`} action={<Link href={q({ tab: 'contracts', st: 'receivable' })} className={MORE}>매출채권 전체 <Arrow /></Link>}>
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

        <Panel id="payables" title="미지급금 상태" sub="송금 완료가 아닌 지급내역, 부가세 포함(세금계산서 VAT 별도는 10% 더함), 원천세 공제 전, 원화 환산" action={<span className="flex shrink-0 gap-3"><Link href="/admin/payouts" className={MORE}>정산 마스터에서 보기 <Arrow /></Link><Link href={q({ tab: 'creators' })} className={MORE}>크리에이터 전체 <Arrow /></Link></span>}>
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

        <Panel title="크리에이터 매출 몫 상위" sub={`${labels.cur}, 계약 공급가를 지급액 비율로 나눈 몫${cb ? ', 계약일 기준' : ', 입금된 회차만'}`} action={<Link href={q({ tab: 'creators' })} className={MORE}>전체 <Arrow /></Link>}>
          <div className="space-y-2.5">
            {topCreators.map((c) => (
              <BarRow key={c.key} label={c.name} value={c.revenue} max={cMax} color={REV} aside={`정산 ${won2(c.paid)}`} href={q({ tab: 'creators', sel: c.key })} />
            ))}
            {!topCreators.length && <p className="text-sm text-neutral-500">이 기간에 매출 몫이 있는 크리에이터가 없습니다.</p>}
          </div>
        </Panel>

        <Panel title="담당자별 계약" sub={`${labels.cur}, 계약일 기준 공급가와 마진율, 여러 명이 맡은 계약은 n분의 1`} action={<Link href={q({ tab: 'owners' })} className={MORE}>전체 <Arrow /></Link>}>
          <div className="space-y-2.5">
            {topOwners.map((o) => (
              <BarRow key={o.owner} label={o.owner} value={o.supply} max={oMax} color={REV} aside={`${cnt(o.count)}건, ${ownerRate(o, model)}`} />
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

// 담당 칸: 정담당 전체 이름이 여럿이면 칸이 넓어져 표 오른쪽 칸이 화면 밖으로 밀림(261126 캡처). 최대 폭 안에서 이름 사이로 줄바꿈
const Owner = ({ names }: { names: string[] }) => <span className="inline-block max-w-[8rem] whitespace-normal break-keep">{names.join(', ')}</span>

/** 입금 예정일이 지난 매출채권 회차(부가세 포함, 일부 입금 뺀 남은 금액, 기간과 무관). 개요 카드에서 넘어온 안건 탭(st=overdue)과 미수 탭이 같이 씀.
 * all이면 지난 것만이 아니라 매출채권 전체(개요 「매출채권」 카드 잔액과 같은 회차, 안건 탭 st=receivable) */
function OverdueTable({ model, today, allHref, bankError, all }: { model: Model; today: string; allHref?: string; bankError?: string | null; all?: boolean }) {
    const late = all ? model.receivables.open : model.receivables.open.filter((x) => x.due && x.due < today).sort((a, b) => a.due!.localeCompare(b.due!))
    const days = (due: string) => Math.round((Date.parse(today) - Date.parse(due)) / 86_400_000)
    const overN = late.filter((x) => x.due && x.due < today).length
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-neutral-200">{all ? `매출채권 ${late.length}건(예정일 지남 ${overN}건)` : `입금 예정일이 지난 매출채권 ${late.length}건`}, {won2(late.reduce((a, x) => a + x.krw, 0))} <span className="text-xs text-neutral-500">부가세 포함, 일부 입금 뺀 남은 금액, 오늘 {today}</span></span>
          {allHref && <Link href={allHref} className="text-xs text-neutral-400 hover:text-neutral-200">전체 안건 보기</Link>}
        </div>
        <Table head={['코드', '브랜드', '담당자', '입금 예정일', all ? '예정일까지' : '지난 날수', '남은 금액']} left={2} tall>
          {late.map((x, i) => (
            <tr key={`${x.c.id}-${i}`}>
              <td className={tdl}>
                {x.c.source === 'sheet'
                  ? <span title={x.c.code}>{x.c.code} <span className="rounded bg-neutral-800 px-1 text-[10px] text-neutral-400">시트</span></span>
                  : <a href={`https://www.notion.so/${x.c.id.replace(/-/g, '')}`} target="_blank" className={LINK} title={`${x.c.code} (노션 열기)`}>{x.c.code}</a>}
              </td>
              <td className={tdl}>{x.c.brand || x.c.corp}{x.label ? ` ${x.label}` : ''}{bankError && x.label === '부가세(고객사)' && <span className="text-amber-200/90"> 원장 없어 확인 불가</span>}</td>
              <td className={td}><Owner names={ownersOf(x.c, model.alias, model.dealOwner)} /></td>
              <td className={td}>{x.due ?? '-'}</td>
              {all
                ? <td data-sort={x.due ? days(x.due) : ''} className={`${td} ${x.due && days(x.due) > 0 ? 'font-semibold text-red-400' : ''}`}>{!x.due ? '예정일 없음' : days(x.due) > 0 ? `${days(x.due)}일 지남` : days(x.due) < 0 ? `${-days(x.due)}일 남음` : '오늘'}</td>
                : <td className={`${td} font-semibold text-red-400`}>{days(x.due!)}일</td>}
              <td className={td} title={won(x.krw)} data-sort={x.krw}>{won2(x.krw)}</td>
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
  // st=receivable: 개요 「매출채권」 카드 잔액을 이루는 회차 전체
  if (st === 'receivable') return <OverdueTable model={model} today={today} all allHref={q({ st: undefined })} />
  const picked = model.contracts.find((x) => x.c.id === sel)
  // st=cost: 기준 탭 「원가 누락 의심」 계약만
  // st=voucher: 계약 DB 「수출바우처」 칸에 값이 있는 계약만
  const all = st === 'cost' ? model.contracts.filter((x) => x.costFlag === 'missing') : st === 'nolink' ? model.contracts.filter(noLinkPaid) : st === 'voucher' ? model.contracts.filter((x) => x.c.voucher) : model.contracts
  // 담당자 칸, 검색, 정렬, o 필터 모두 같은 담당(주간 잡 정담당 우선, ownersOf)
  const who = (x: (typeof all)[number]) => ownersOf(x.c, model.alias, model.dealOwner)
  const pool = o ? all.filter((x) => who(x).includes(o)) : all
  const rows = sortRows(pool.filter((x) => hit(f, x.c.code, x.c.brand, x.c.corp, who(x).join(', '))), s, {
    code: (x) => x.c.code, brand: (x) => x.c.brand || x.c.corp, owner: (x) => who(x).join(', '), day: (x) => x.day,
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
          <Link href={q({ tab: 'owners' })} className={`text-sm ${LINK}`}>← 담당자 목록</Link>
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
      {st === 'voucher' && (() => {
        const sum = (k: (x: (typeof rows)[number]) => number) => rows.reduce((a, x) => a + k(x), 0)
        const supply = sum((x) => x.supply ?? 0), margin = sum((x) => x.margin ?? 0), marginSupply = sum((x) => (x.margin != null ? x.supply ?? 0 : 0))
        return (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-sky-300">
              수출바우처 계약만 보는 중: {rows.length}건, 공급가 <span title={won(supply)}>{won2(supply)}</span>, 변동비 <span title={won(sum((x) => x.cost))}>{won2(sum((x) => x.cost))}</span>, 마진 <span title={won(margin)}>{won2(margin)}</span> ({pct(marginSupply ? margin / marginSupply : null)})
            </span>
            <Link href={q({ st: undefined })} className="text-xs text-neutral-400 hover:text-neutral-200">전체 안건 보기</Link>
          </div>
        )
      })()}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox q={q} f={f} n={rows.length} total={pool.length} placeholder="코드, 브랜드, 법인, 담당자" />
        {st !== 'voucher' && <Link href={q({ st: 'voucher', sel: undefined })} className={`text-sm ${LINK}`}>수출바우처만</Link>}
      </div>
      <Table head={['코드', '브랜드', '담당자', '계약일', '공급가', '입금', '입금 예정일', '초과 기간', '변동비', '마진', '계약서']} left={2} tall
        sort={{ keys: ['code', 'brand', 'owner', 'day', 'supply', 'received', 'due', 'overdue', 'cost', 'margin', null], cur: s, href: (k) => q({ s: k }) }}>
        {rows.map((x) => (
          <tr key={x.c.id} className={x.c.id === sel ? 'bg-sky-950/40' : (x.margin ?? 0) < 0 ? 'bg-red-950/50' : ''}>
            <td className={tdl}>
              <span className="flex max-w-[11rem] items-center gap-1 2xl:max-w-[13rem]">
                {x.c.source === 'sheet'
                  ? <Link href={q({ sel: x.c.id })} className={`min-w-0 truncate ${LINK}`} title={x.c.code}>{x.c.code}</Link>
                  : <a href={`https://www.notion.so/${x.c.id.replace(/-/g, '')}`} target="_blank" className={`min-w-0 truncate ${LINK}`} title={`${x.c.code} (노션 열기)`}>{x.c.code}</a>}
                {x.c.source === 'sheet' && <span className="inline-flex shrink-0 items-center gap-0.5"><span className="rounded bg-neutral-800 px-1 text-[10px] text-neutral-400">시트</span><Info text="노션 계약 DB에 없어 운영 대시보드 시트에서 읽은 계약" /></span>}
              </span>
            </td>
            <td className={tdl}>
              <span className="block max-w-[8rem] truncate" title={x.c.brand || x.c.corp}>{x.c.brand || x.c.corp}</span>
            </td>
            <td className={td}><Owner names={who(x)} /></td>
            <td className={td}>{x.day ?? '-'}</td>
            <td className={td} title={won(x.supply)}>{x.supply == null ? '-' : won2(x.supply)}
              {x.c.supplyKrw == null && x.c.supplyJpy != null && <span className="block text-xs text-neutral-500">엔화 환산</span>}</td>
            <td className={td} title={won(x.received)}>{x.supply == null ? '-' : `${won2(x.received)}${x.estimated ? ' (어림)' : ''}`}</td>
            <td className={td}>{x.open ? (x.due ?? <span className="text-neutral-500">예정일 없음</span>) : '-'}</td>
            <td className={`${td}${x.overdue && !x.c.twikr ? ' font-semibold text-red-400' : ''}`}>{!x.overdue ? '-' : x.c.twikr ? <span className="text-neutral-500">트위커 수금</span> : `${x.overdue}일`}</td>
            <td className={td} title={x.c.source === 'sheet' ? '지급 연결 전(시트 계약)' : won(x.cost)}>{x.c.source === 'sheet' ? '-' : <Link href={q({ sel: x.c.id })} className={LINK}>{won2(x.cost)}</Link>}</td>
            <td className={`${td}${(x.margin ?? 0) < 0 ? ' font-semibold text-red-400' : ''}`} title={x.c.source === 'sheet' ? '지급 연결 전(시트 계약)' : won(x.margin)}>
              {x.margin == null ? '-' : won2(x.margin)}
              <span className="block text-xs text-neutral-500">{x.c.source !== 'sheet' && x.supply != null && !x.payouts.length ? '지급 연결 없음' : pct(x.rate)}</span>
              <CostNote f={x.costFlag} />
            </td>
            <td className={td}>{x.c.link ? <a href={x.c.link} target="_blank" className={LINK}>열기</a> : '-'}</td>
          </tr>
        ))}
      </Table>
      <Notes items={[
        '입금 예정일: 아직 받지 않은 회차의 가장 이른 정산일입니다.',
        '초과 기간: 입금 예정일에서 오늘까지 지난 날수입니다.',
        '트위커 공급 계약은 트위커 계좌로 받아 미수가 아니라서 「트위커 수금」으로 보입니다.',
        '변동비: 연결된 지급 합계입니다. 종결, 해제 금지 보류는 뺍니다.',
        '마진 아래 숫자는 마진율이고, 마진이 마이너스인 계약은 빨간 줄입니다.',
        '코드를 누르면 노션 계약 페이지, 변동비를 누르면 지급 행이 열립니다.',
        '금액에 마우스를 올리면 원 단위가 보입니다.',
      ]} />
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
        <a key={u} href={u} target="_blank" className="whitespace-nowrap text-neutral-400 hover:text-neutral-100 hover:underline">
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
          <Link href={q({ sel: undefined })} className={`text-sm ${LINK}`}>← 크리에이터 목록</Link>
          <Link href={`/admin/payouts?sel=${encodeURIComponent(picked.key)}`} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 <Arrow /></Link>
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
        <Link href="/admin/payouts" className={MORE}>정산 마스터에서 보기 <Arrow /></Link>
      </div>
      <Table head={['이름, 인스타', '통화', '매출 몫', '매출 건수', '건당 평균 매출', '원가', '마진', '건당 평균 마진', '마진율', '정산 합계', '정산 건수', '건당 평균 정산', '송금 완료', '진행 중', '미지급, 보류']} tall tips={CREATOR_TIPS}
        groups={[['', 2], ['수익성', 7], ['지급 현황', 6]]}
        sort={{ keys: ['name', null, 'revenue', 'revenueCount', 'avgRevenue', 'cost', 'margin', 'avgMargin', 'rate', 'paid', 'paidCount', 'avgPaid', 'done', 'inFlight', 'held'], cur: s, href: (k) => q({ s: k }) }}>
        {rows.map((x) => (
          <tr key={x.key}>
            <td className={tdl}>
              <Link href={q({ sel: x.key })} className={`block max-w-[11rem] truncate whitespace-nowrap ${LINK}`} title={x.name}>{x.name}</Link>
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
      <Notes items={[
        <>인스타: 지급 행의 크리에이터 관계로 크리에이터 리스트 「인스타」 칸을 읽습니다{igError ? ` (${igError})` : ''}.</>,
        '매출 몫: 계약 공급가를 정산금 비중으로 나눈 값입니다(지급내역 「매출 단가」가 있는 행은 그 값). 그래서 한 계약의 참여자는 모두 그 계약 마진율을 받습니다.',
        '수익성 묶음: 매출 몫 − 원가 = 마진입니다.',
        '지급 현황 묶음의 정산 합계는 상태와 관계없는 지급 합이라 원가와 다르고, 개요의 정산과도 합이 다릅니다.',
        '매출 몫과 마진의 기간: 현금 기준이면 고객사 입금일, 발생 기준이면 계약 기준일입니다(개요 매출과 같은 기준).',
        '크리에이터 지급이 없는 계약만큼 개요 매출보다 적습니다.',
        '정산 합계의 기간: 지급일(송금일, 없으면 요청일)입니다.',
        '계약 연결 없는 지급은 마진에서 빠져, 계약일 기준인 개요의 마진과 합이 다릅니다.',
        <Link key="b" href={q({ tab: 'basis' })} className="text-neutral-400 underline hover:text-neutral-200">전체 기준은 기준 탭</Link>,
      ]} />
    </div>
  )
}

/** 담당자 마진율. 계약 어디에도 지급이 연결되지 않았으면 100%가 아니라 「지급 연결 없음」 */
function ownerRate(o: Model['owners'][number], model: Model) {
  if (o.rate == null) return '마진율 -'
  const linked = model.contracts.some((x) => ownersOf(x.c, model.alias, model.dealOwner).includes(o.owner) && x.payouts.length)
  return linked ? `마진율 ${pct(o.rate)}` : '지급 연결 없음'
}

// 2025 계약은 대부분 백필이라 원천 자료에 담당자가 없음(261113 감사: 2025년 공급가 83%가 담당자 없음)
const OWNER_GAP = '2025년까지의 계약은 대부분 담당자(정)가 비어 있어 「미배정」으로 잡힙니다.'

function Owners({ model, q, s = '-supply', year, trend, sel, qt }: { model: Model; q: (o: Partial<Search>) => string; s?: string; year: number | null; trend: FunnelTrend | null; sel?: string; qt?: string }) {
  const linked = (o: Model['owners'][number]) => model.contracts.some((x) => ownersOf(x.c, model.alias, model.dealOwner).includes(o.owner) && x.payouts.length)
  const people = Array.isArray(trend?.people?.months) && Array.isArray(trend?.people?.rows) ? trend!.people! : null
  const inPeople = (n: string) => !!people?.rows.some((r) => r.name === n)
  const rows = sortRows(model.owners, s, {
    owner: (o) => o.owner, count: (o) => o.count, supply: (o) => o.supply, received: (o) => o.received, cost: (o) => o.cost,
    margin: (o) => (o.rate == null && !o.margin ? null : o.margin), rate: (o) => (o.rate != null && linked(o) ? o.rate : null), // 지급 연결 없음은 100%로 치지 않고 끝으로
  })
  return (
    <div className="space-y-2">
      <Load people={people} />
      <Ahead people={people} />
      <Table head={['담당자', '계약 수', '공급가', '입금액', '변동비', '마진', '마진율']}
        sort={{ keys: ['owner', 'count', 'supply', 'received', 'cost', 'margin', 'rate'], cur: s, href: (k) => q({ s: k, sel }) }}>
        {rows.map((o) => (
          <tr key={o.owner} className={o.owner === sel ? 'bg-neutral-800/60' : ''}>
            <td className={tdl}>
              {/* 사람 단면에 있는 이름은 분기 한 장으로, 없으면(주간 잡 전, 사람 단면에 없는 이름) 지금처럼 그 사람 안건 목록으로 */}
              <Link href={inPeople(o.owner) ? `${q({ sel: o.owner })}#quarter` : q({ tab: 'contracts', o: o.owner })} className={LINK}>{o.owner}</Link>
            </td>
            <td className={td}>{cnt(o.count)}</td>
            <Money n={o.supply} />
            <Money n={o.received} />
            <Money n={o.cost} />
            <Money n={o.rate == null && !o.margin ? null : o.margin} />
            <td className={td}>{ownerRate(o, model).replace('마진율 ', '')}</td>
          </tr>
        ))}
      </Table>
      {(year == null || year < 2026) && <p className="text-xs text-amber-200/90">{OWNER_GAP}</p>}
      <Notes items={[
        Object.keys(model.dealOwner).length
          ? '주간 잡 안건별 정담당(운영보드 우선, 퇴사자 인계 반영) 기준입니다. 담당 표에 없는 계약은 노션 계약 DB 「담당자(정)」 기준입니다. 세일즈 담당자 칸은 아직 없습니다.'
          : '노션 계약 DB 「담당자(정)」 기준입니다. 세일즈 담당자 칸은 아직 없습니다.',
        Object.keys(model.dealOwner).length > 0 && '담당 표는 매주 월요일 07:00 주간 잡에서 갱신해 주중에 바뀐 운영보드 담당은 다음 월요일에 반영됩니다.',
        '공급가가 없는 계약은 빠집니다.',
        '여러 명이 맡은 계약은 계약 수, 공급가, 입금액, 변동비, 마진을 정담당 n분의 1씩 나눕니다. 계약 수는 정수가 아니면 소수 한 자리입니다.',
        people && '담당자 이름을 누르면 아래에 그 사람의 분기 한 장이 나옵니다.',
      ]} />
      <Quarter model={model} q={q} people={people} actions={trend?.actions ?? {}} sel={sel} qt={qt} />
    </div>
  )
}

/** 운영 인력 리소스 게이지(인혁 261127): 사람마다 지금 진행 중 안건의 크리에이터 수 합 ÷ 상한. 값은 주간 잡 사람 단면 load, 미배정과 인계 미지정은 끝에 */
function Load({ people }: { people: NonNullable<FunnelTrend['people']> | null }) {
  const cap = people?.load_cap
  const all = (people?.rows ?? []).filter((r) => r.load?.deals).sort((a, b) => b.load!.heads - a.load!.heads)
  if (!cap || !all.length) return null
  // 운영팀(구성원 DB 기능 「운영」)을 위에, 운영팀 밖 담당과 미배정, 인계 미지정은 아래 묶음으로
  const ops = all.filter((r) => r.roles.includes('운영'))
  const rest = all.filter((r) => !r.roles.includes('운영'))
  // 한 격자: 이름 | 크리에이터 | 막대(남는 폭 전부, 80% 눈금) | % | 안건 | 미상. 좁은 화면은 뒤 두 칸 숨김
  const grid = 'grid grid-cols-[6rem_3rem_minmax(4rem,1fr)_2.5rem] items-center gap-x-3 sm:grid-cols-[8rem_4rem_minmax(8rem,1fr)_4rem_5rem_5rem] sm:gap-x-5'
  const num = 'text-right tabular-nums'
  const line = (r: (typeof all)[number]) => {
    const l = r.load!
    const p = (100 * l.heads) / cap
    const tone = p >= 100 ? 'red' : p >= 80 ? 'yellow' : 'green'
    return (
      <li key={r.name} className={`${grid} py-1 text-sm`}>
        <span className="truncate text-neutral-200">{r.name}</span>
        <span className={`${num} font-medium text-neutral-100`}>{Math.round(l.heads)}명</span>
        <span className="relative h-2 rounded-full bg-neutral-800">
          <i className={`absolute inset-y-0 left-0 rounded-full ${DOT[tone]}`} style={{ width: `${Math.min(p, 100)}%` }} />
          <i className="absolute -inset-y-1 left-[80%] w-px bg-neutral-500" aria-hidden />
        </span>
        <span className={`${num} text-neutral-400`}>{Math.round(p)}%</span>
        <span className={`${num} hidden text-neutral-400 sm:block`}>{cnt(l.deals)}건</span>
        <span className={`${num} hidden sm:block ${l.unknown ? 'text-neutral-400' : 'text-neutral-600'}`}>{l.unknown ? `${cnt(l.unknown)}건` : '-'}</span>
      </li>
    )
  }
  return (
    <Panel title="운영 리소스" sub={`진행 중 안건의 크리에이터 수 합, ${cap}명 대비. 세로선은 80%`}>
      <div>
        <div className={`${grid} whitespace-nowrap border-b border-neutral-800 pb-1.5 text-xs text-neutral-500`}>
          <span>담당</span>
          <span className={num}>크리에이터</span>
          <span />
          <span className={num}>비율</span>
          <span className={`${num} hidden sm:block`}>안건</span>
          <span className={`${num} hidden sm:block`}>인원 미상</span>
        </div>
        <ul className="pt-1">{ops.map(line)}</ul>
        {rest.length > 0 && (
          <>
            <p className="mt-2 border-t border-neutral-800 pt-2 text-xs text-neutral-500">운영팀 밖 담당, 미배정, 인계 미지정</p>
            <ul className="pt-1 opacity-80">{rest.map(line)}</ul>
          </>
        )}
      </div>
      <Notes items={[
        `크리에이터 수는 안건마다 지급내역 받는 사람 수와 봇 크리에이터 계약 요청 수 중 큰 값입니다. 둘 다 없는 안건은 인원 미상으로 세고 막대에는 넣지 않습니다.`,
        '진행 중은 운영보드 상태 「진행 중」입니다. 담당은 운영보드 「정:」에 적힌 사람이고 여러 명이면 n분의 1, 비어 있으면 미배정입니다(계약 「담당자(정)」은 계약서를 올린 사람일 수 있어 쓰지 않음).',
        `막대는 ${cap}명의 80% 이상이면 노랑, 100% 이상이면 빨강입니다. 매주 월요일 07:00 주간 잡에서 갱신합니다.`,
      ]} />
    </Panel>
  )
}

/** 리소스 예측(인혁 261127): 수주할 때 누가 언제 새 크리에이터를 받을 수 있는지. 칸 값은 상한 − 그날에도 진행 중일 크리에이터 수(주간 잡 people.ahead) */
function Ahead({ people }: { people: NonNullable<FunnelTrend['people']> | null }) {
  const cap = people?.load_cap
  const at = people?.ahead_at
  const all = (people?.rows ?? []).filter((r) => r.ahead && r.load && (r.load.deals || r.ahead.soon)).sort((a, b) => b.load!.heads - a.load!.heads)
  if (!cap || !at?.length || !all.length) return null
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
  // 칸: 지금(load.heads) + ahead_at 주마다. 히트맵(색, 드래그, 필요 인원)은 클라이언트 컴포넌트
  const row = (r: (typeof all)[number]): HeatRow => {
    const a = r.ahead!
    return {
      name: r.name,
      free: [r.load!.heads, ...a.at].map((x) => Math.round(cap - x)),
      est: [0, ...a.est_freed],
      stale: a.stale ? `${Math.round(a.stale)}명, ${cnt(a.stale_list.reduce((s, x) => s + x.share, 0))}건` : '-',
      soon: a.soon ? `${cnt(a.soon)}건${a.soon_heads ? `, ${Math.round(a.soon_heads)}명` : ''}` : '-',
    }
  }
  const ops = all.filter((r) => r.roles.includes('운영')).map(row)
  const rest = all.filter((r) => !r.roles.includes('운영')).map(row)
  const stale = all.flatMap((r) => r.ahead!.stale_list.map((x) => ({ ...x, who: r.name })))
  return (
    <Panel title="리소스 예측" sub={`안건 시작일과 필요 인원을 넣으면 그날 새로 받을 수 있는 크리에이터 수(${cap}명 − 그날에도 진행 중일 크리에이터)가 많은 순. 수주할 때 담당 고르기용`}>
      <AheadHeatmap cap={cap} cols={['지금', ...at.map(md)]} dates={at} ops={ops} rest={rest} />
      {stale.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-200">정리 필요 안건 {stale.length}줄 보기(종료일이 지났거나 없는데 운영보드 상태가 진행 중)</summary>
          <Table head={['담당', '안건', '종료일', '크리에이터']} left={3}>
            {stale.map((x, i) => (
              <tr key={i}>
                <td className={tdl}>{x.who}</td>
                <td className={tdl}>{x.name}{x.share !== 1 ? ` (${cnt(x.share)})` : ''}</td>
                <td className={tdl}>{x.end ? `${x.end}${x.est ? ' (시작일 + ' + (people?.ahead_est_days ?? 30) + '일 추정)' : ''}` : '없음'}</td>
                <td className={td}>{x.heads}명</td>
              </tr>
            ))}
          </Table>
        </details>
      )}
      <Notes items={[
        '여유는 그날에도 진행 중일 안건의 크리에이터 수를 상한에서 뺀 값입니다. 새 안건은 들어가지 않아 여유는 시간이 갈수록 늘기만 하므로, 안건 기간 중 가장 빠듯한 날은 시작일입니다(종료일은 넣지 않음). 주 단위로 계산해 시작일이 주 사이면 앞 주 값을 씁니다. 여러 명이 나눠 맡으면 「명이서」에 담당 수를 넣으면 1인당 필요 인원(올림)으로 판정합니다. 0명 이하는 빨강, 상한의 20% 미만은 노랑입니다.',
        `종료일은 계약 종료일, 없으면 운영보드 종료일입니다. 둘 다 없으면 시작일 + ${people?.ahead_est_days ?? 30}일로 추정하고, 추정으로 풀린 인원이 든 칸은 점선 밑줄을 긋습니다(칸에 마우스를 올리면 명수).`,
        '종료일이 지났거나 시작일도 없는 안건은 운영보드 상태가 바뀔 때까지 모든 칸을 차지합니다(「정리 필요」). 운영보드에서 상태나 종료일을 고치면 다음 주간 잡부터 여유가 늘어납니다.',
        '곧 시작은 운영보드 상태 「진행 전」, 「섭외 중」 안건입니다. 인원을 아는 것만 명수를 붙이고 칸 값에는 넣지 않습니다. 인원 미상 안건도 칸 값에 들어가지 않습니다. 담당은 위 운영 리소스와 같이 운영보드 「정:」 기준입니다.',
      ]} />
    </Panel>
  )
}

const TWIKR_TIP ='트위커 분기 정산을 계약별로 나눈 추정값이 원가에 들어 있어 이 공헌이익은 순위 판단에 쓰지 않습니다.'
const signed = (n: number, f: (n: number) => string) => `${n > 0 ? '+' : ''}${f(n)}`
// 안건 목록: 한 줄에 한 안건, 몫이 1이 아니면 이름 뒤에 몫. 8줄 넘으면 나머지는 접음(JS 없이 details).
// 이름 안의 「 · 」는 앞 글자와 붙여(줄 바꿈 없는 공백) 「·」가 줄 첫머리로 넘어가지 않게
const LIST_MAX = 8
function Items({ xs }: { xs: { code: string; name?: string; share?: number | null }[] }) {
  if (!xs.length) return <p className="text-neutral-500">없음</p>
  const line = (x: (typeof xs)[number], i: number) => (
    <li key={i} className="break-keep">{(x.name || x.code).replace(/ ·/g, '\u00a0·')}{x.share != null && x.share !== 1 ? `(${cnt(x.share)})` : ''}</li>
  )
  return (
    <div className="text-neutral-200">
      <ul className="space-y-0.5">{xs.slice(0, LIST_MAX).map(line)}</ul>
      {xs.length > LIST_MAX && (
        <details className="mt-0.5">
          <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-200">나머지 {xs.length - LIST_MAX}줄 보기</summary>
          <ul className="mt-0.5 space-y-0.5">{xs.slice(LIST_MAX).map(line)}</ul>
        </details>
      )}
    </div>
  )
}

/** 담당자 탭 분기 한 장: 사람과 분기를 고르면 기여, 재계약, 절차, 흐름, 변화. 값은 주간 잡 사람 단면(추이 파일 people)의 석 달 합, 점수와 순위는 없음(설계 261125 결정 4) */
function Quarter({ model, q, people, actions, sel, qt }: { model: Model; q: (o: Partial<Search>) => string; people: NonNullable<FunnelTrend['people']> | null; actions: FunnelTrend['actions']; sel?: string; qt?: string }) {
  if (!people?.rows.length || !people.months.length) return <p id="quarter" className="text-sm text-neutral-500">사람 단면은 다음 주간 잡(월요일 07:00) 뒤에 표시됩니다</p>
  const qs = quarters(people)
  const cq = qt && qs.includes(qt) ? qt : defaultQuarter(people)
  const x = sel ? quarterSheet(people, sel, cq, actions, model.alias) : null
  const chip = (on: boolean) => `rounded-md px-2 py-0.5 text-xs ${on ? 'bg-neutral-700 text-neutral-50' : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'}`
  const block = 'space-y-2 rounded-lg border border-neutral-800 p-4 text-sm'
  const h3 = 'text-xs font-semibold text-neutral-300'
  const twikr = !!x && x.cur.twikr_est > 0
  const share = (r: number | null | undefined) => (x?.share && r != null ? `${x.roles.join(', ')} 담당 전체의 ${pct(r)}` : '')
  return (
    <Panel id="quarter" title={x ? `${sel}, ${quarterTitle(people, cq)}` : '분기 한 장'} sub={x ? `입금 달 기준 ${x.months.map((m) => `${Number(m.slice(5))}월`).join(', ')} 합` : '사람을 고르면 입금 달 기준 석 달 합'}
      action={x && model.owners.some((o) => o.owner === sel) ? <Link href={q({ tab: 'contracts', o: sel })} className={MORE}>안건 목록 <Arrow /></Link> : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {qs.map((k) => <Link key={k} href={`${q({ sel, qt: k })}#quarter`} className={chip(k === cq)}>{quarterTitle(people, k)}</Link>)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.rows.map((r) => <Link key={r.name} href={`${q({ sel: r.name, qt })}#quarter`} className={chip(r.name === sel)}>{r.name}{r.status === '퇴사' ? ' (퇴사)' : ''}</Link>)}
      </div>
      {sel && !x && <p className="text-sm text-neutral-500">{sel}: 사람 단면에 없는 이름입니다</p>}
      {x && (
        <div className="space-y-4">
          <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="안건 수" value={`${cnt(x.cur.deals)}건`} full={`${x.cur.deals}건`} note={share(x.share?.deals)} tipAlign="left" />
            <Tile label="계약 공급가" value={won2(x.cur.supply)} full={won(x.cur.supply)} note={share(x.share?.supply)} />
            <Tile label="공헌이익" value={won2(x.cur.contrib)} full={won(x.cur.contrib)} note={[twikr && '트위커 추정 포함', share(x.share?.contrib)].filter(Boolean).join(', ')} hint={twikr ? TWIKR_TIP : undefined} />
            <Tile label="재계약" value={won2(x.cur.rep_amt)} side={`${cnt(x.cur.rep_n)}건`} full={won(x.cur.rep_amt)} note="" />
          </div>
          <section className={block}>
            <h3 className={h3}>기여</h3>
            <Table head={['법인', '코드', '몫', '공급가', '공헌이익']} left={2}>
              {x.deals.map((d) => (
                <tr key={d.code}>
                  <td className={tdl}>{d.corp || '-'}{d.twikr && <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-amber-200/90">트위커 추정 포함 <Info text={TWIKR_TIP} /></span>}</td>
                  <td className={tdl}>{d.code}</td>
                  <td className={td} data-sort={d.share ?? undefined}>{d.share == null ? '-' : cnt(d.share)}</td>
                  <Money n={d.supply} />
                  <Money n={d.contrib} />
                </tr>
              ))}
            </Table>
            {!x.deals.length && <p className="text-xs text-neutral-500">이 분기 안건 없음</p>}
          </section>
          {!!x.rep?.length && (
            <section className={block}>
              <h3 className={h3}>재계약</h3>
              <Table head={['법인', '코드', '몫', '금액']} left={2}>
                {x.rep.map((d) => (
                  <tr key={d.code}>
                    <td className={tdl}>{d.corp || '-'}</td>
                    <td className={tdl}>{d.code}</td>
                    <td className={td} data-sort={d.share ?? undefined}>{d.share == null ? '-' : cnt(d.share)}</td>
                    <Money n={d.amt} />
                  </tr>
                ))}
              </Table>
            </section>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            <section className={block}>
              <h3 className={h3}>절차</h3>
              {([['exc', '절차 예외'], ['late_creator', '사후 크리에이터 계약'], ['blocked', '막힌 지급'], ['margin', '마진 미달']] as const).map(([k, l]) => (
                <div key={k}><p className="text-neutral-400">{l} {cnt(x.proc[k].n)}건</p><Items xs={x.proc[k].items} /></div>
              ))}
            </section>
            <section className={block}>
              <h3 className={`${h3} inline-flex items-center gap-1`}>흐름 <span className="font-normal text-neutral-500">현재 기준</span> <Info text="분기와 상관없이 지금 열려 있는 안건입니다. 본인이 입력하는 상태 값이라 면담 자료로만 봅니다." /></h3>
              <div><p className="text-neutral-400">적체 안건 {cnt(x.open.backlog.n)}건</p><Items xs={x.open.backlog.items} /></div>
              <div><p className="text-neutral-400">열린 안건 {cnt(x.open.open.n)}건</p><Items xs={x.open.open.items} /></div>
            </section>
            <section className={block}>
              <h3 className={h3}>변화</h3>
              {x.prev ? (
                <p className="text-neutral-200">
                  <span className="text-neutral-400">{quarterLabel(x.prevQ)} 대비</span><br />
                  안건 수 {signed(x.cur.deals - x.prev.deals, (n) => `${cnt(n)}건`)}, 계약 공급가 {signed(x.cur.supply - x.prev.supply, won2)}, 공헌이익 {signed(x.cur.contrib - x.prev.contrib, won2)}, 재계약 금액 {signed(x.cur.rep_amt - x.prev.rep_amt, won2)}
                </p>
              ) : <p className="text-neutral-500">{x.prevMonths.length ? '분기 진행 중이라 전 분기와 비교하지 않습니다' : `${quarterLabel(x.prevQ)} 값 없음`}</p>}
              <p className="text-neutral-400">하이라키 액션</p>
              {x.actions.length ? x.actions.map((a, i) => <p key={i} className="text-neutral-200">{Number(a.month.slice(5))}월 {a.title}{a.text ? `: ${a.text}` : ''}</p>) : <p className="text-neutral-500">없음</p>}
            </section>
          </div>
        </div>
      )}
    </Panel>
  )
}

/** 기준 탭 절 하나: 제목과 한 줄에 사실 하나씩(인혁 261125: 줄글 금지, 불렛으로) */
function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="font-semibold text-neutral-100">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-neutral-400 marker:text-neutral-600">{children}</ul>
    </section>
  )
}
const Sub = ({ children }: { children: React.ReactNode }) => <ul className="mt-1 list-[circle] space-y-1 pl-5">{children}</ul>

// 숫자별 부가세, 원천세 기준(개요 카드 툴팁과 같은 말)
const VAT_BASIS: [string, string, string, string][] = [
  ['매출', '제외', '-', '부가세는 고객사에게 받아 세무서에 내는 돈'],
  ['정산, 원가', '제외', '공제 전', '부가세는 매입세액 공제로 돌려받음'],
  ['마진', '제외', '공제 전', '매출과 원가 모두 부가세 뺀 금액끼리'],
  ['매출채권', '포함', '-', '고객사가 실제로 보내야 할 돈'],
  ['미지급금', '포함', '공제 전', '실제로 보낼 돈, 원천세도 세무서로 나감'],
  ['자금 캘린더 입금', '포함', '-', '통장에 들어올 금액'],
  ['자금 캘린더 출금', '포함', '공제 후', '통장에서 나갈 금액(실지급액)'],
  ['크리에이터 매출 몫', '제외', '-', '계약 공급가를 나눈 값'],
]

function Basis({ model, rates, basis, q }: { model: Model; rates: Rates; basis: Basis; src: Src; q: (o: Partial<Search>) => string }) {
  const g = model.gaps
  const twc = [...new Map(model.receivables.twikr.map((o) => [o.c.id, o.c])).values()] // 입금 전 회차가 남은 트위커 공급 계약(현금 기준 매출에 없음)
  const rows: [string, React.ReactNode][] = [
    ['서명 전 계약(유니크코드 없음, 모든 집계에서 빠짐)', `${g.unsigned}건`],
    ['입금일이 하나도 없는 수입 계약', `${g.noDeposit}건`],
    ['공급가가 없는 수입 계약(합계에서 빠짐)', `${g.noSupply}건`],
    ['날짜(계약일자, 시작일, 입금일)가 없는 수입 계약', `${g.noDay}건`],
    ['선금, 잔금 금액을 읽지 못해 반반으로 나눈 계약', `${g.estimatedSplit}건`],
    ['수입 계약에 연결되지 않은 지급(매출 몫, 마진에서 빠짐)', <Link key="u" href="/admin/payouts?v=rows&nc=none" className={`${LINK} inline-flex items-center gap-1 whitespace-nowrap`}>{g.unlinked.count}행, {won(g.unlinked.krw)} <Arrow /></Link>],
    ['송금일 없이 신청일로 센 송금 완료(정산 어림)', `${g.doneByReq.count}행, ${won(g.doneByReq.krw)}`],
    ['송금일, 신청일 모두 없는 송금 완료(정산에서 빠짐)', `${g.doneNoDate.count}행, ${won(g.doneNoDate.krw)}`],
    ['원화 청구액 없는 외화 송금 완료(환율로 환산)', `${g.fxNoBilled}행`],
    ['통화나 지급액이 없어 환산하지 못한 지급', `${g.noRate}행`],
    ['매출 단가 합이 공급가를 넘는 계약(크리에이터 매출 몫을 단가 비율로 줄임)', `${g.overPriced}건`],
    [`원가 지급이 덜 붙었을 수 있는 계약(고른 기간, 마진율 ${HIGH_MARGIN * 100}% 이상, 체험단 ${HIGH_MARGIN_TRIAL * 100}% 이상, 예상 원가(원)가 있으면 지급 합계가 그 90% 미만)`, <Link key="c" href={q({ tab: 'contracts', st: 'cost' })} className={`${LINK} inline-flex items-center gap-1 whitespace-nowrap`}>누락 의심 {g.highMargin.missing}건 <Arrow /></Link>],
    ['같은 조건이지만 고객 입금 전이거나 마지막 입금분 송금 회차 전인 계약(원가 미확정, 송금 신청 전일 수 있음)', `${g.highMargin.pending}건`],
    ['종결이거나 비고 맨 윗줄에 해제 금지가 적힌 지급(마진, 매출 몫에서 뺌)', `${g.dead.count}행, ${won(g.dead.krw)}`],
  ]
  return (
    <div className="space-y-6 text-sm text-neutral-300">
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">부가세, 원천세 기준</h2>
        <p className="text-xs text-neutral-500">손익(매출, 정산, 마진)은 부가세 제외, 잔액과 통장 금액은 부가세 포함입니다. 지금 개요 기준: {basis === 'contract' ? '발생 기준(계약일)' : '현금 기준(입금일, 송금일)'}</p>
        <Table head={['숫자', '부가세', '원천세 3.3%', '이유']} left={4}>
          {VAT_BASIS.map(([k, v, w, why]) => (
            <tr key={k}>
              <td className={tdl}>{k}</td>
              <td className={tdl}>{v}</td>
              <td className={tdl}>{w}</td>
              <td className={tdl}>{why}</td>
            </tr>
          ))}
        </Table>
      </section>

      <div className="grid grid-cols-1 gap-3 items-start lg:grid-cols-2">
        <Rule title="매출">
          <li>수입 계약 공급가(부가세 제외)를 셉니다.</li>
          <li>현금 기준: 입금된 달에 셉니다.</li>
          <li>입금일은 노션 계약 DB 선금, 잔금 입금일입니다. 은행 원장에서 공급가를 따로 받은 것으로 맞춘 입금은 그 은행 입금일입니다.</li>
          <li>발생 기준: 계약일자(없으면 시작일, 첫 입금일)의 달에 공급가 전액을 셉니다.</li>
          <li>선금+잔금 계약은 금액 비율로 나눕니다.</li>
          <li>P- 지출 계약은 빠집니다.</li>
          <li>노션 계약 DB 계약만 셉니다. 운영 대시보드 시트 계약은 노션과 겹쳐 매출채권이 두 번 잡혀서 합치지 않습니다.</li>
          {twc.length > 0 && <li>트위커 공급 계약 {twc.length}건(공급가 {won(twc.reduce((a, c) => a + (c.supplyKrw ?? 0), 0))}): 대금이 트위커 계좌로 가 입금일이 비어 현금 기준 매출에 아직 없습니다. 발생 기준에는 계약일로 들어갑니다.</li>}
        </Rule>

        <Rule title="정산">
          <li>지급내역 「송금 완료」 행의 지급액(부가세 제외, 원천징수 전)을 셉니다.</li>
          <li>현금 기준: 송금일의 달에 셉니다.</li>
          <li>송금일이 없는 행(모인을 거치지 않는 원화 송금)은 은행 송금일이 들어오기 전까지 송금 요청일(신청일)의 달로 어림합니다.</li>
          <li>발생 기준: 계약일자의 달에 그 계약에 연결된 지급을 셉니다. 종결과 해제 금지 보류는 뺍니다.</li>
          <li>수입 계약에 연결되지 않은 지급은 발생 기준 정산에서 빠집니다.</li>
        </Rule>

        <Rule title="마진">
          {marginHint(basis === 'contract').split(/(?<=\.)\s+/).map((s) => <li key={s}>{s}</li>)}
          <li>계약일자가 없으면 시작일, 첫 입금일로 기간을 고릅니다.</li>
          {basis !== 'contract' && <li>지급이 하나도 연결되지 않은 계약은 매출에는 들고 마진에는 들지 않아, 매출 − 정산이 마진과 다릅니다.</li>}
        </Rule>

        <Rule title="매출채권">
          <li>기간과 관계없는 현재 잔액이고 부가세 포함입니다.</li>
          <li>입금 전 회차의 합계(합계 칸이 비면 공급가)에서 은행 원장에 일부 입금(공급가, 부가세)으로 붙은 금액을 뺀 남은 금액입니다.</li>
          <li>수출바우처는 기관이 낼 공급가와 고객사가 따로 낼 부가세(부가세 칸, 없으면 공급가 10%)를 나눠 셉니다.</li>
          <li>고객사 부가세는 입금됐거나 정산일이 지난 회차 몫만 지금 받을 돈이고, 나머지는 다음 회차 정산일에 둡니다.</li>
          <li>은행 원장이 시작된 2025-01-02 전 계약은 셈하지 않습니다.</li>
        </Rule>

        <Rule title="미지급금, 보류">
          <li>기간과 관계없는 현재 잔액이고 부가세 포함입니다.</li>
          <li>송금 완료도 보류도 아닌 지급입니다.</li>
          <li>세금계산서 VAT 포함은 지급액, VAT 별도는 부가세를 더한 금액, 사업소득은 원천세 공제 전 금액입니다.</li>
          <li>보류는 따로 보이고, 마진에서는 원가에 들어갑니다.</li>
          <li>비고 맨 윗줄(최신 판단)에 「보류 해제 금지」, 「다시 보내지 말 것」, 「지급 아님」이 적힌 보류(중복, 반송 종결)는 원가와 크리에이터 매출 몫에서 빠집니다.</li>
          <li>「확인 전」 조건이 붙은 해제 금지는 이미 나갔을 수 있어 원가에 둡니다.</li>
        </Rule>

        <Rule title="원화 환산">
          <li>외화 지급: 모인 원화 청구액이 있으면 그 값, 없으면 환율로 셉니다.</li>
          <li>외화 계약 공급가: 입금된 몫은 입금일 환율(유럽중앙은행 기준환율), 입금 전 몫과 매출채권은 지금 환율로 셉니다.</li>
          <li>발생 기준 매출은 계약 기준일 환율로 셉니다.</li>
          <li>지금 환율: 1엔 {rates.JPY.toFixed(4)}원, 1달러 {rates.USD.toFixed(1)}원, 1위안 {rates.CNY.toFixed(2)}원 ({rates.source}, {rates.at})</li>
        </Rule>

        <Rule title="자금 캘린더: 입금">
          <li>실제 입금 예상액(합계 칸: 공급가 + 부가세)입니다.</li>
          <li>영세율과 엔화는 부가세가 없고, 엔화는 환율로 환산합니다.</li>
          <li>합계가 빈 계약은 공급가로 대신하고 「합계 없음」을 표시합니다.</li>
          <li>입금된 회차는 입금일, 아직이면 정산일(입금 예정일)에 둡니다.</li>
          <li>은행 원장에 일부 입금이 있으면 그 금액을 뺀 남은 금액입니다.</li>
          <li>수출바우처는 기관 입금을 공급가로, 고객사 부가세를 「부가세(고객사)」로 따로 둡니다.</li>
        </Rule>

        <Rule title="자금 캘린더: 출금">
          <li>금액은 실지급액입니다.
            <Sub>
              <li>원화 사업소득 3.3% 행은 공제 뒤 금액</li>
              <li>외화는 모인 원화 청구액이나 환율 환산</li>
              <li>세금계산서 VAT 별도는 부가세를 더함, VAT 칸이 비면 지급액 그대로</li>
              <li>공제한 원천세를 세무서에 내는 출금은 달력에 없음</li>
            </Sub>
          </li>
          <li>날짜는 상태별로 정합니다. 송금일은 그 달 마지막 평일이고, 공휴일은 따지지 않습니다.
            <Sub>
              <li>송금 완료: 송금일</li>
              <li>모인 접수, 원화 이체 대기: 송금 요청일(없으면 오늘)이 든 달의 송금일</li>
              <li>송금 가능: 노션 「송금 예정일」, 없으면 이번 회차 송금일(송금일 3영업일 전 묶음 생성일이 지났으면 다음 달)</li>
              <li>대기(서류·계좌, 고객사 입금 완료): 송금 가능과 같음</li>
              <li>대기(고객사 입금 전): 노션 「송금 예정일」, 없으면 입금 예정일(지났으면 오늘)이 든 달의 다음 달 송금일</li>
            </Sub>
          </li>
          <li>비고에 「송금 예정일 임의」가 있으면 그 날을 쓰고 목록에 표시합니다.</li>
          <li>모인 접수와 원화 이체 대기는 「송금 진행 중」이라 날짜가 지나도 지남으로 보지 않습니다.</li>
        </Rule>

        <Rule title="자금 캘린더: 색과 빠지는 것">
          <li>출금 예정(송금 가능, 송금 진행 중, 대기, 서류·계좌 대기)은 달력에서 회색 한 줄로 합칩니다. 구분은 아래 안건별 목록의 상태 칸에 있습니다.</li>
          <li>계약 비고에 「정산일 임의」가 있는 계약(정산일을 몰라 임의로 넣은 날, 수출바우처는 계약월 +2달 말일)은 그 입금 예정과 따르는 대기 출금을 진한 회색으로 따로 보입니다.</li>
          <li>정산일 임의도 날이 지나면 「예정일 지남」으로 봅니다.</li>
          <li>봇 광고주 계약이 서명 전(코드 없음)이면 그 정산일에 회색으로 따로 보이고 입금 예정 합계에서 뺍니다.</li>
          <li>막힌 사유가 사람이 풀어야 하는 것(출금 확인, 계약서, 문서, 업로드, 계좌 등)인 지급은 출금 예정에서 뺍니다. 사유가 지워지면 다시 넣습니다.</li>
          <li>보류, 예정일을 정할 수 없는 행, 송금일 없는 송금 완료는 빠집니다.</li>
          <li>입금 약속일 칸은 아직 없습니다.</li>
        </Rule>

        <Rule title="자금 캘린더: 잔고 줄">
          <li>월초 0원에서 그날까지 입금 − 출금 누적입니다. 통장 잔액이 아니고 달마다 0에서 다시 시작합니다.</li>
          <li>입금은 입금됨과 입금 예정, 출금은 달력에 잡힌 것을 넣습니다.</li>
          <li>예정일 지남, 정산일 임의(입금, 출금 모두), 서명 전 계약은 넣지 않습니다.</li>
          <li>검색과 필터와 관계없이 그 달 전체로 셉니다.</li>
        </Rule>

        <Rule title="크리에이터 탭">
          <li>매출 몫: 계약 공급가를 정산금 비중으로 나눈 값입니다(부가세 제외, 계약 공급가와 같은 통화).</li>
          <li>지급내역 「매출 단가」가 있는 행은 그 값을 씁니다.</li>
          <li>현금 기준은 고객사가 입금한 회차만 입금일로 고릅니다. 입금 전 몫은 빠집니다.</li>
          <li>발생 기준은 계약 기준일로 고릅니다.</li>
          <li>크리에이터 지급이 없는 계약만큼 개요 매출보다 적습니다.</li>
          <li>수입 계약에 연결되지 않은 지급은 정산에만 들어가고 매출 몫은 없습니다.</li>
          <li>공급가 0원 계약의 지급은 매출 몫 없이 원가로만 들어가고, 현금 기준이면 송금한 달에 셉니다.</li>
          <li>마진율은 매출 몫이 있는 지급끼리만 짝짓습니다.</li>
          <li>정산 합계는 상태와 관계없고, 송금일이 없으면 요청일이나 계약일로 기간을 골라 개요의 정산과 합이 다릅니다.</li>
        </Rule>
      </div>

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
// 개요와 같은 뜻: 들어온 돈 파랑, 나간 돈 주황, 예정은 입출금 모두 회색(칸의 +, − 부호로 구분), 예정일 지남 빨강(261116 감사, 전엔 입금 초록, 출금 파랑)
const DUE = COLOR.due
const GUESS = COLOR.guess
const UNSIGNED = COLOR.unsigned
const CAL_COLOR: Record<CalItem['kind'], Record<CalItem['state'], string>> = {
  in: { done: REV, flight: DUE, due: DUE, wait: DUE, late: ALERT, guess: GUESS, unsigned: UNSIGNED, docs: DUE },
  // 출금 예정은 송금 준비 상태(입금 전, 서류·계좌 대기 등)를 색으로 나누지 않음, 구분은 목록 상태 칸에만(Leo 261107 「경영 가시성에 도움 안 됨」)
  out: { done: SET, flight: DUE, due: DUE, wait: DUE, late: ALERT, guess: GUESS, unsigned: DUE, docs: DUE },
}
const CAL_LINES: [CalItem['kind'], CalItem['state'][], string][] = [
  ['in', ['done'], '입금'], ['in', ['due'], '입금 예정'], ['in', ['late'], '입금 예정일 지남'], ['in', ['guess'], '입금 예정(정산일 임의)'], ['in', ['unsigned'], '입금 예정(서명 전)'],
  ['out', ['done'], '출금'], ['out', ['flight', 'due', 'wait', 'docs'], '출금 예정'], ['out', ['late'], '출금 예정일 지남'], ['out', ['guess'], '출금 예정(정산일 임의)'],
]

const LIST = 'cal-list'
// 정상 흐름이 아닌 상태(서명 전, 서류·계좌 대기, 아직 안 지난 정산일 임의)는 날이 지나도 색을 바꾸지 않고 「예정일 지남」 글자만 붙임(Leo 261026). 입금 쪽 정산일 임의는 지나면 late(인혁 261120)
const ODD: CalItem['state'][] = ['guess', 'unsigned', 'docs']
const Overdue = ({ show, short }: { show: boolean; short?: boolean }) => (show ? <span style={{ color: ALERT }}>{short ? ' 지남' : ', 예정일 지남'}</span> : null)
const notion = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`
/** 안건 칸 이름: 입금은 계약 노션(시트 행은 계약 탭), 출금은 크리에이터 상세 + 지급 ID(지급내역 노션) */
function CalTitle({ x, q }: { x: CalItem; q: (o: Partial<Search>) => string }) {
  if (x.kind === 'in' && x.notionId) return <a href={notion(x.notionId)} target="_blank" className={LINK} title="노션 열기">{x.title}</a>
  const href = x.kind === 'out' ? q({ tab: 'creators', y: 'all', m: undefined, sel: x.creator ?? x.title }) : x.contractId ? q({ tab: 'contracts', y: 'all', m: undefined, sel: x.contractId }) : null
  const name = href ? <Link href={href} className={LINK}>{x.title}</Link> : <span className="text-neutral-200">{x.title}</span>
  return x.pay ? <>{name} <a href={notion(x.pay.id)} target="_blank" className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline" title="지급내역 노션 열기">#{x.pay.pid ?? '지급'}</a></> : name
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
  // 칩 글자는 중립색, 고른 칩만 표면 한 단계(261116 감사: 상태 칩마다 다른 색이라 강조가 묻힘)
  const chip = (on: boolean) => `rounded-full border border-neutral-800 px-2 py-0.5 ${on ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'}`
  const states = [...new Map(byKind.map((x) => [sk(x), x])).values()]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={go(py, pm)} aria-label="이전 달" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"><ChevronLeft className="h-4 w-4" aria-hidden /></Link>
          <h2 className="text-base font-semibold text-neutral-100">{y}년 {m}월</h2>
          <Link href={go(ny, nm)} aria-label="다음 달" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"><ChevronRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">입금</span><Legend items={[['입금', REV], ['입금 예정', DUE], ['서명 전 계약', UNSIGNED]]} /></div>
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">출금</span><Legend items={[['출금', SET], ['출금 예정', DUE]]} /></div>
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">공통</span><Legend items={[['예정일 지남', ALERT], ['정산일 임의', GUESS]]} /><span className="inline-flex items-center gap-1 text-neutral-300"><span aria-hidden className="inline-block h-px w-3 bg-neutral-500" />잔고<Info align="right" text="날짜 칸 아래 줄. 월초 0원에서 그날까지 입금 − 출금 누적입니다(통장 잔액 아님). 예정일 지남, 정산일 임의, 서명 전 계약은 빼고 셉니다." /></span></div>
          <p className="text-neutral-500">날짜를 누르면 아래에 그날 안건이 나옵니다</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card label="입금" value={won2(sum(items, 'in', ['done']))} note="부가세 포함, 입금일(노션 계약 DB). 공급가, 부가세를 나눠 받은 회차는 은행 입금일별로" />
        <Card label="입금 예정" value={won2(sum(items, 'in', ['due', 'late', 'guess']))} note={`부가세 포함, 그중 예정일 지남 ${won2(sum(items, 'in', ['late']))}, 정산일 임의 ${won2(sum(items, 'in', ['guess']))}, 서명 전 계약 ${won2(sum(items, 'in', ['unsigned']))}은 따로(합계 제외)`} />
        <Card label="출금" value={won2(sum(items, 'out', ['done']))} note="실지급액(3.3% 공제 뒤), 송금일" />
        <Card label="출금 예정" value={won2(sum(items, 'out', ['flight', 'due', 'wait', 'late', 'guess', 'docs']))} note={`실지급액, 그중 예정일 지남 ${won2(sum(items, 'out', ['late']))}, 정산일 임의 ${won2(sum(items, 'out', ['guess']))}, 보류, 사람 확인으로 막힌 행 제외`} />
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
                  return k > 0 && <span key={label} className="block break-keep tabular-nums leading-snug" style={{ color: CAL_COLOR[kind][states[0]] }} title={`${label} ${won(k)}`}>{kind === 'in' ? '+' : '−'}<span className="sm:hidden">{man(k)}</span><span className="hidden sm:inline"> {won2(k)}{states.includes('guess') ? ' 임의' : states.includes('unsigned') ? ' 서명 전' : states.includes('late') ? (kind === 'in' ? ' 입금 예정일 지남' : ' 출금 예정일 지남') : ''}<Overdue show={date < today && xs.some((x) => x.kind === kind && states.includes(x.state) && ODD.includes(x.state))} short /></span></span>
                })}
                <span className="mt-auto block border-t border-neutral-700 pt-1 tabular-nums leading-snug" style={{ color: b < 0 ? ALERT : 'var(--color-neutral-300)' }} title={`잔고(월초 0 기준) ${won(b)}`}>
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
            <Link key={sk(x)} href={here({ st: st === sk(x) ? undefined : sk(x) })} className={chip(st === sk(x))}>
              {CAL_STATE[x.kind][x.state]} {byKind.filter((r) => sk(r) === sk(x)).length}
            </Link>
          ))}
        </div>
        {rows.length ? (<>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 sm:hidden">
            {rows.map((x, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="block text-xs tabular-nums text-neutral-500">{x.date} {x.kind === 'in' ? '입금' : '출금'}</span>
                  <CalTitle x={x} q={q} />
                  <CalSub x={x} q={q} />
                </div>
                <div className="shrink-0 text-right">
                  <span className="block tabular-nums text-neutral-100">{x.kind === 'in' ? '+' : '−'}{won(x.krw)}</span>
                  <span className="block text-xs text-neutral-400"><span style={x.state === 'late' ? { color: ALERT } : undefined}>{CAL_STATE[x.kind][x.state].replace(/\(.*\)/, '')}</span><Overdue show={ODD.includes(x.state) && x.date < today} /></span>
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
                  <Link href={`${go(y, m, x.date)}#${LIST}`} className="text-neutral-400 hover:text-neutral-100">{x.date}</Link>
                </td>
                <td className={tdl}>
                  <CalTitle x={x} q={q} />
                  <CalSub x={x} q={q} />
                </td>
                <td className={td}>{x.kind === 'in' ? '입금' : '출금'}</td>
                {/* 상태 칸은 중립색, 예정일 지남만 빨강(261116 감사) */}
                <td className={`${td} text-neutral-400`}><span style={x.state === 'late' ? { color: ALERT } : undefined}>{CAL_STATE[x.kind][x.state]}</span><Overdue show={ODD.includes(x.state) && x.date < today} /></td>
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
