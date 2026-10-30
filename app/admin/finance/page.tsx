import Link from 'next/link'
import { getFinance } from '@/lib/finance/data'
import { refreshFinance } from './actions'
import { RefreshButton } from './refresh-button'
import { AutoForm } from './auto-form'
import { getRates } from '@/lib/finance/fx'
import type { FinanceData } from '@/lib/finance/source'
import { buildModel, calendarMonth, contractDay, payoutDue, payoutKrw, priorPeriod, type Basis, type Contract, type ByCur, type CalItem, type Currency, type Model, type Payout, type Rates } from '@/lib/finance/model'
import { CashflowChart, NET_COLOR, type FlowPoint } from './charts'
import { FunnelTrendTab } from './funnel-trend'
import { Card, CUR_NAME, CURS, hit, Money, orig, Panel, SearchBox, sortRows, Table, td, tdl, Tile, won, won2 } from './ui'

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
  ['funnel', '퍼널 추이'],
] as const
type Tab = (typeof TABS)[number][0]

const pct = (r: number | null | undefined) => (r == null ? '-' : `${(r * 100).toFixed(1)}%`)

type Search = { tab?: string; y?: string; m?: string; sel?: string; b?: string; d?: string; f?: string; s?: string; o?: string } // o: 안건 탭을 담당자 한 명으로 거름

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? 'summary') as Tab
  if (tab === 'funnel') return <FunnelTrendTab /> // 노션을 읽지 않고 주간 잡이 올린 파일만
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
        <p className="text-xs text-neutral-500">노션 연결(통합)이 노션 계약 DB, 지급내역 DB에 초대되어 있는지, 환경변수가 있는지 확인하십시오.</p>
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
    const keep = over.tab && over.tab !== tab ? {} : { f: sp.f, s: sp.s, o: sp.o } // 탭을 옮기면 검색어, 정렬은 버림
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
        <span className="whitespace-nowrap text-xs text-neutral-500" title="5분마다 자동으로도 다시 읽습니다">
          {new Date(data.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} 갱신
        </span>
        <form action={refreshFinance}>
          <RefreshButton />
        </form>
        <AutoForm className="flex flex-wrap items-center gap-2 text-sm" action="/admin/finance">
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
        </AutoForm>
        </div>
      </div>

      {tab === 'summary' && all && <Overview model={model} prior={prior} all={all} labels={labels} year={year} month={month} today={today} rates={rates} q={q} basis={basis} src={data} />}
      {tab === 'calendar' && <Calendar items={calendarMonth(data.contracts, data.payouts, rates, calYm, today)} ym={calYm} today={today} sel={sp.d} q={q} f={sp.f} />}
      {tab === 'contracts' && <Contracts model={model} rates={rates} sel={sp.sel} q={q} f={sp.f} s={sp.s} o={sp.o} />}
      {tab === 'creators' && <Creators model={model} rates={rates} all={data.payouts} contracts={data.contracts} ig={data.ig} igError={data.igError} today={today} sel={sp.sel} q={q} f={sp.f} s={sp.s} basis={basis} />}
      {tab === 'owners' && <Owners model={model} q={q} s={sp.s} />}
      {tab === 'basis' && <Basis model={model} rates={rates} basis={basis} src={data} />}
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

const marginHint = (cb: boolean) =>
  `크리에이터 지급이 연결된 수입 계약만 셉니다. 계약마다 공급가에서 연결된 지급 합(상태 무관)을 빼고, 평균 마진율은 마진 합 ÷ 그 계약들의 공급가 합입니다. 지급이 하나도 연결되지 않은 계약은 비용을 몰라 뺍니다(공급가 전액이 마진으로 잡히지 않게). ${cb ? '기간은 매출, 정산과 같은 계약일 기준이지만, 지급 연결 없는 계약이 빠져 매출 − 정산과 다릅니다.' : '기간은 계약일 기준이라 옆의 매출(입금된 달), 정산(송금한 달)과 빼서 맞지 않습니다.'}`

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

type Src = Pick<FinanceData, 'sheet' | 'sheetError'>

function Overview({ model, prior, all, labels, year, month, today, rates, q, basis, src }: {
  model: Model; prior: Model | null; all: Model; labels: Labels; year: number | null; month: number | null; today: string; rates: Rates; q: (o: Partial<Search>) => string; basis: Basis; src: Src
}) {
  const cb = basis === 'contract'
  const s = model.summary
  const sheetN = model.contracts.filter((x) => x.c.source === 'sheet').length // 지급 연결 전이라 마진에서 빠진 시트 계약
  const unlinkedN = model.contracts.filter((x) => x.c.source !== 'sheet' && x.supply != null && !x.payouts.length).length // 지급 연결 없어 마진에서 빠진 계약
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
    .sort((a, b) => (payoutKrw(b, rates) ?? 0) - (payoutKrw(a, rates) ?? 0))
    .slice(0, 5)
  // [제목, 건수, 금액, 이동, 강조]
  const todo: [string, string, number, string, boolean][] = []
  if (overdueN) todo.push(['입금 예정일이 지난 매출채권', `${overdueN}건`, overdueKrw, '#receivables', true])
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
        {src.sheet
          ? <>노션 계약 DB에 아직 안 올라온 계약 <span className="text-neutral-200">{src.sheet.added}건</span>은 운영 대시보드 시트에서 읽어 함께 셉니다(같은 계약인지 확인 중 {src.sheet.dups.length}건, 계약 코드가 없는 행 {src.sheet.codeless}건).</>
          : <span className="text-[#e66767]">운영 대시보드 시트를 읽지 못해 노션 계약 DB 계약만 집계합니다: {src.sheetError ?? '원인 미상'}</span>}
        {cb ? ' 발생 기준(계약일의 달).' : ' 현금 기준(입금일, 송금일의 달).'}{' '}
        <Link href={q({ tab: 'basis' })} className="text-neutral-300 underline hover:text-neutral-100">기준 보기</Link>
      </p>

      {todo.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-100">지금 볼 것 <span className="ml-1 text-xs font-normal text-neutral-500">손이 필요한 항목, 누르면 해당 목록으로</span></h2>
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${['', 'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4'][todo.length]}`}>
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
        <Tile label={cb ? '정산 (발생 기준)' : '정산 (송금 기준)'} value={won2(s.settled)} full={won(s.settled)} delta={<Delta cur={s.settled} prev={p?.settled ?? null} good={null} />} note={`${vs(s.settled, p?.settled, cb ? '연결된 지급 전체, 계약일의 달' : '송금 완료, 송금한 달')}${s.settledEst ? `, 그중 ${won2(s.settledEst)}은 신청월 어림` : ''}`} spark={<Spark values={last12.map((r) => r?.settled ?? 0)} color={SET} />} />
        <Tile label="마진 (계약 단위)" value={won2(s.margin)} full={won(s.margin)} delta={<Delta cur={s.margin} prev={p?.margin ?? null} good />} side={`평균 마진율 ${pct(s.marginRate)}`} hint={marginHint(cb)} note={`지급 연결된 계약 ${s.marginN}건, 공급가 ${won2(s.marginSupply)} − 지급 ${won2(s.marginSupply - s.margin)}${p?.marginRate != null ? `, ${labels.prev} ${pct(p.marginRate)}` : p ? `, ${labels.prev} 기록 없음` : ''}${unlinkedN ? `, 지급 연결 없음 ${unlinkedN}건 제외` : ''}${sheetN ? `, 시트 계약 ${sheetN}건 제외` : ''}`} />
        <Tile label="매출채권 (현재 잔액)" value={won2(s.receivable)} full={won(s.receivable)} note={`예정일 지남 ${won2(overdueKrw)}, 기간과 무관`} />
        <Tile label="미지급금 (현재 잔액)" value={won2(s.payable)} full={won(s.payable)} note={`보류 ${won2(s.held)} 별도, 기간과 무관`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Panel
            title={cb ? '월별 매출과 정산 (발생 기준)' : '월별 현금 유출입 (계약 입금, 크리에이터 지급 기준)'}
            sub={cb
              ? `${cy}년, 계약일의 달 기준 공급가 전액과 연결 지급액(상태 무관)`
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
                은행 잔고 변화가 아닙니다. 출금은 지급내역 DB에 기록된 크리에이터 지급만이라 인건비, 운영비, 세금, 카드 대금이 빠져 실제 은행 출금보다 훨씬 적습니다. 입금도 노션 계약 DB에 입금일이 적힌 계약만입니다.
              </p>
            )}
            <CashflowChart data={flow} inColor={REV} outColor={SET} names={flowNames} />
          </Panel>
        </div>

        <Panel id="receivables" title="매출채권 만기" sub={`입금 전 회차 ${model.receivables.open.length}건, 입금 예정일(정산일) 기준, 오늘 ${today}`} action={<Link href={q({ tab: 'contracts' })} className="text-xs text-neutral-400 hover:text-neutral-200">안건 전체 →</Link>}>
          <div className="space-y-2.5">
            {buckets.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.krw} max={bMax} color={b.alert ? ALERT : REV} aside={`${b.count}건`} />
            ))}
          </div>
          {late.length > 0 && (
            <div className="space-y-1 border-t border-neutral-800 pt-3">
              <p className="text-xs text-neutral-500">예정일이 가장 오래 지난 회차</p>
              {late.map((o, i) => (
                <Link key={`${o.c.id}-${i}`} href={q({ tab: 'contracts', sel: o.c.id })} className="grid grid-cols-[1fr_auto_6.5rem] items-baseline gap-3 rounded px-1 py-1 text-sm hover:bg-neutral-800/40">
                  <span className="truncate text-neutral-300" title={o.c.code}>{o.c.brand || o.c.code}</span>
                  <span className="text-xs tabular-nums text-neutral-500">{o.due}, {Math.round((Date.parse(today) - Date.parse(o.due!)) / 86_400_000)}일 지남</span>
                  <span className="text-right tabular-nums text-neutral-200">{won2(o.krw)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel id="payables" title="미지급금 상태" sub="송금 완료가 아닌 지급내역, 원화 환산" action={<span className="flex shrink-0 gap-3"><Link href="/admin/payouts" className="text-xs text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 →</Link><Link href={q({ tab: 'creators' })} className="text-xs text-neutral-400 hover:text-neutral-200">크리에이터 전체 →</Link></span>}>
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
              <BarRow key={o.owner} label={o.owner} value={o.supply} max={oMax} color={REV} aside={`${o.count}건, ${ownerRate(o, model)}`} />
            ))}
          </div>
        </Panel>
      </div>

      <details className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <summary className="cursor-pointer text-sm text-neutral-300">월별 표로 보기 ({labels.cur})</summary>
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
function PayoutTable({ payouts, rates, contracts, q }: { payouts: Payout[]; rates: Rates; contracts?: Map<string, Contract>; q?: (o: Partial<Search>) => string }) {
  const con = (p: Payout) => (p.contractId ? contracts?.get(p.contractId) : undefined)
  const ym = (p: Payout) => { const c = con(p); return (c && contractDay(c)?.slice(0, 7)) ?? null }
  const rows = contracts ? [...payouts].sort((a, b) => (ym(b) ?? '').localeCompare(ym(a) ?? '') || (b.pid ?? 0) - (a.pid ?? 0)) : payouts
  return (
    <Table head={[...(contracts ? ['계약', '계약월', '브랜드'] : []), '지급 ID', ...(contracts ? [] : ['이름']), '상태', '지급액', '원화', '송금일', '막힌 사유']} left={contracts ? 4 : 2}>
      {rows.map((p) => {
        const c = con(p)
        return (
          <tr key={p.id}>
            {contracts && (
              <>
                <td className={`${tdl} whitespace-nowrap`}>{c ? (q ? <Link href={q({ tab: 'contracts', y: 'all', m: undefined, sel: c.id })} className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200">{c.code}</Link> : c.code) : <span className="text-neutral-500">{p.notContract ? '계약 아님' : '연결 없음'}</span>}</td>
                <td className={`${tdl} whitespace-nowrap`}>{ym(p) ?? '-'}</td>
                <td className={tdl}>{c ? c.brand || c.corp : '-'}</td>
              </>
            )}
            <td className={tdl}>{p.pid ?? '-'}</td>
            {!contracts && <td className={tdl}>{p.name}</td>}
            <td className={td}>{p.status}</td>
            <td className={td}>{orig(p)}</td>
            <td className={td}>{won(payoutKrw(p, rates))}{p.krwBilled != null ? ' (청구액)' : ''}</td>
            <td className={td}>{p.sentDate ?? '-'}</td>
            <td className={td}>{p.blocked.join(', ') || '-'}</td>
          </tr>
        )
      })}
    </Table>
  )
}

function Contracts({ model, rates, sel, q, f, s = '-day', o }: { model: Model; rates: Rates; sel?: string; q: (o: Partial<Search>) => string; f?: string; s?: string; o?: string }) {
  const picked = model.contracts.find((x) => x.c.id === sel)
  const pool = o ? model.contracts.filter((x) => (x.c.owner || '미지정') === o) : model.contracts
  const rows = sortRows(pool.filter((x) => hit(f, x.c.code, x.c.brand, x.c.corp, x.c.owner)), s, {
    code: (x) => x.c.code, brand: (x) => x.c.brand || x.c.corp, owner: (x) => x.c.owner, day: (x) => x.day,
    supply: (x) => x.supply, received: (x) => x.supply == null ? null : x.received, due: (x) => x.due, overdue: (x) => x.overdue, cost: (x) => x.c.source === 'sheet' ? null : x.cost, margin: (x) => x.margin,
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
                {x.c.source === 'sheet' && <span className="shrink-0 rounded bg-neutral-800 px-1 text-[10px] text-neutral-400" title="노션 계약 DB에 없어 운영 대시보드 시트에서 읽은 계약">시트</span>}
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
            <td className={`${td}${x.overdue ? ' font-semibold text-red-400' : ''}`}>{x.overdue ? `${x.overdue}일` : '-'}</td>
            <td className={td} title={x.c.source === 'sheet' ? '지급 연결 전(시트 계약)' : won(x.cost)}>{x.c.source === 'sheet' ? '-' : <Link href={q({ sel: x.c.id })} className="text-sky-300 hover:underline">{won2(x.cost)}</Link>}</td>
            <td className={`${td}${(x.margin ?? 0) < 0 ? ' font-semibold text-red-400' : ''}`} title={x.c.source === 'sheet' ? '지급 연결 전(시트 계약)' : won(x.margin)}>
              {x.margin == null ? '-' : won2(x.margin)}
              <span className="block text-xs text-neutral-500">{x.c.source !== 'sheet' && x.supply != null && !x.payouts.length ? '지급 연결 없음' : pct(x.rate)}</span>
            </td>
            <td className={td}>{x.c.link ? <a href={x.c.link} target="_blank" className="text-sky-300 hover:underline">열기</a> : '-'}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">입금 예정일은 아직 받지 않은 회차의 가장 이른 정산일, 초과 기간은 그 날에서 오늘까지 지난 날수입니다. 변동비는 연결된 지급 합계(상태 무관), 마진 아래 숫자는 마진율입니다. 마진이 마이너스인 계약은 빨간 줄입니다. 코드를 누르면 노션 계약 페이지가, 변동비를 누르면 지급 행이 열리고, 금액에 마우스를 올리면 원 단위가 보입니다.</p>
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

/** 크리에이터가 볼 화면 미리보기: 브랜드, 지급액, 지급일, 지급 완료만(설계 261028-설계-크리에이터-정산포털). 기간 필터와 무관하게 이 이름의 전체 지급 행.
 * 지급일은 정산 마스터와 같은 규칙(payoutDue, 대기 보류는 미정). 공급가, 유니크코드, 막힌 사유는 보이지 않음 */
function CreatorView({ payouts, contracts, today }: { payouts: Payout[]; contracts: Contract[]; today: string }) {
  const byId = new Map(contracts.map((c) => [c.id, c]))
  const rows = payouts
    .map((p) => {
      const c = p.contractId ? byId.get(p.contractId) : undefined
      const done = p.status === '송금 완료'
      // 계약 맵을 넘기지 않아 대기는 미정(정산 마스터와 같음). 송금일 없는 송금 완료는 요청일
      const due = done ? (p.sentDate ?? p.reqDate) : payoutDue(p, new Map(), today)
      return { p, brand: c?.brand || '-', due, done }
    })
    .sort((a, b) => Number(a.done) - Number(b.done) || (b.due ?? '9999').localeCompare(a.due ?? '9999'))
  return (
    <div className="space-y-2 rounded-xl border border-sky-900 bg-neutral-900 p-4">
      <h2 className="text-sm font-semibold text-neutral-50">크리에이터가 보는 화면 <span className="ml-1 text-xs font-normal text-neutral-500">크리에이터 정산 포털(설계 중)에서 이 사람에게 보일 내용 미리보기. 공급가, 유니크코드, 막힌 사유는 보이지 않음</span></h2>
      <Table head={['브랜드', '지급액', '지급일', '지급 완료']} left={1}>
        {rows.map(({ p, brand, due, done }) => (
          <tr key={p.id}>
            <td className={tdl}>{brand}</td>
            <td className={td}>{orig(p)}</td>
            <td className={td}>{due ? `${due}${done ? '' : ' 예정'}` : '미정'}</td>
            <td className={td}>{done ? '✓' : ''}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
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
  `계약 공급가 × 이 사람 정산금 ÷ 그 계약 정산금 합(지급내역 「매출 단가」가 있는 행은 그 값). 계약 연결 없는 지급은 0. ${CREATOR_PERIOD}`,
  '매출 몫이 있는 계약 수',
  '매출 몫 ÷ 매출 건수',
  `이 사람 지급 행 금액 합. 상태 무관(송금 완료, 진행 중, 보류 모두). ${CREATOR_PERIOD}`,
  '지급 행 수(한 계약에 행이 여러 개면 여러 건)',
  '정산 합계 ÷ 정산 건수',
  `매출 몫 − 그 매출 몫과 연결된 지급(상태 무관). 계약 연결 없는 지급은 빠짐. 기간이 전체면 누적, 기간을 고르면 그 기간 지급분만. ${CREATOR_PERIOD}`,
  '마진 ÷ 매출 건수',
  '마진 ÷ 매출 몫. 매출 몫이 정산금 비중이라 한 계약의 참여자는 모두 그 계약 마진율과 같음. 높으면 그 계약에 연결된 지급이 빠졌는지 확인',
  '상태가 송금 완료인 지급 합',
  '상태가 송금 가능, 모인 접수, 원화 이체 대기인 지급 합',
  '그 밖의 상태(보류 등)인 지급 합',
]

function Creators({ model, rates, all, contracts, ig, igError, today, sel, q, f, s = '-revenue', basis }: { model: Model; rates: Rates; all: Payout[]; contracts: Contract[]; ig: Record<string, string>; igError: string | null; today: string; sel?: string; q: (o: Partial<Search>) => string; f?: string; s?: string; basis: Basis }) {
  const picked = model.creators.find((x) => x.name === sel)
  // 지급 행의 크리에이터 관계로 이름별 인스타 URL(기간과 무관하게 전체 행)
  const igs = new Map<string, Set<string>>()
  for (const p of all) for (const id of p.creatorIds ?? []) if (ig[id]) igs.set(p.name, (igs.get(p.name) ?? new Set()).add(ig[id]))
  const margin = (x: Model['creators'][number]) => (x.revenue ? x.revenue - x.linkedPaid : null)
  const rate = (x: Model['creators'][number]) => (x.revenue ? (x.revenue - x.linkedPaid) / x.revenue : null)
  // 건당 평균: 매출, 마진은 매출 몫이 있는 계약 수로, 정산은 지급 행 수로 나눔
  const avgRevenue = (x: Model['creators'][number]) => (x.revenueCount ? x.revenue / x.revenueCount : null)
  const avgPaid = (x: Model['creators'][number]) => (x.paidCount ? x.paid / x.paidCount : null)
  const avgMargin = (x: Model['creators'][number]) => (x.revenueCount && x.revenue ? (x.revenue - x.linkedPaid) / x.revenueCount : null)
  const rows = sortRows(model.creators.filter((x) => hit(f, x.name)), s, {
    name: (x) => x.name, revenue: (x) => x.revenue, revenueCount: (x) => x.revenueCount, paid: (x) => x.paid, paidCount: (x) => x.paidCount,
    margin, rate, done: (x) => x.done, inFlight: (x) => x.inFlight, held: (x) => x.held, avgRevenue, avgPaid, avgMargin,
  })
  // 합계는 표에 보이는 행(검색 적용) 기준. 마진율은 매출 몫이 있는 행끼리
  const tot = rows.reduce((a, x) => ({ revenue: a.revenue + x.revenue, paid: a.paid + x.paid, margin: a.margin + (margin(x) ?? 0), rn: a.rn + x.revenueCount, pn: a.pn + x.paidCount }), { revenue: 0, paid: 0, margin: 0, rn: 0, pn: 0 })
  const per = (v: number, n: number) => (n ? won2(v / n) : '-')
  // 이름을 누르면 목록 위 패널이 아니라 크리에이터 한 명만 보는 화면으로 바뀜
  if (picked)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <Link href={q({ sel: undefined })} className="text-sm text-sky-300 hover:underline">← 크리에이터 목록</Link>
          <Link href={`/admin/payouts?sel=${encodeURIComponent(picked.name)}`} className="text-sm text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 →</Link>
        </div>
        <CreatorView payouts={all.filter((p) => p.name === picked.name)} contracts={contracts} today={today} />
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-base font-semibold text-neutral-50">{picked.name} <Insta urls={igs.get(picked.name)} /></h2>
          <p className="text-sm text-neutral-200">
            매출 몫 {won(picked.revenue)}, 정산 {won(picked.paid)}
          </p>
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
          {picked.shares.length > 0 && (
            <h3 className="pt-2 text-sm font-semibold text-neutral-100">계약별 매출 몫 <span className="ml-1 text-xs font-normal text-neutral-500">이 크리에이터가 들어간 계약. 계약 공급가를 정산금 비중으로 나눈 몫(「매출 단가」가 있는 행은 그 값)</span></h3>
          )}
          {picked.shares.length > 0 && (
            <Table head={['계약', '브랜드', '이 크리에이터 지급', '매출 몫']}>
              {picked.shares.map((s) => (
                <tr key={s.c.id}>
                  <td className={tdl}><Link href={q({ tab: 'contracts', y: 'all', m: undefined, sel: s.c.id })} className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200">{s.c.code}</Link></td>
                  <td className={td}>{s.c.brand || s.c.corp}</td>
                  <Money n={s.paid} />
                  <Money n={s.share} />
                </tr>
              ))}
            </Table>
          )}
          <h3 className="pt-2 text-sm font-semibold text-neutral-100">지급 행 <span className="ml-1 text-xs font-normal text-neutral-500">노션 지급내역 DB, 계약월 최근순. 송금 처리는 <Link href={`/admin/payouts?sel=${encodeURIComponent(picked.name)}`} className="underline hover:text-neutral-300">정산 마스터</Link>에서</span></h3>
          <PayoutTable payouts={picked.payouts} rates={rates} contracts={new Map(contracts.map((c) => [c.id, c]))} q={q} />
        </div>
      </div>
    )
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card label={f ? '매출 몫 합계 (검색 결과)' : '매출 몫 합계'} value={won2(tot.revenue)} note={`${tot.rn}건, 건당 평균 ${per(tot.revenue, tot.rn)}`} />
        <Card label={f ? '마진 총액 (검색 결과)' : '마진 총액'} value={won2(tot.margin)} note={`마진율 ${pct(tot.revenue ? tot.margin / tot.revenue : null)}, 건당 평균 ${per(tot.margin, tot.rn)}`} />
        <Card label={f ? '정산 합계 (검색 결과)' : '정산 합계'} value={won2(tot.paid)} note={`상태 무관 지급 ${tot.pn}행, 건당 평균 ${per(tot.paid, tot.pn)}`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox q={q} f={f} n={rows.length} total={model.creators.length} placeholder="크리에이터 이름" />
        <Link href="/admin/payouts" className="text-xs text-neutral-400 hover:text-neutral-200">정산 마스터에서 보기 →</Link>
      </div>
      <Table head={['이름, 인스타', '통화', '매출 몫', '매출 건수', '건당 평균 매출', '정산 합계', '정산 건수', '건당 평균 정산', '마진', '건당 평균 마진', '마진율', '송금 완료', '진행 중', '미지급, 보류']} tall tips={CREATOR_TIPS}
        sort={{ keys: ['name', null, 'revenue', 'revenueCount', 'avgRevenue', 'paid', 'paidCount', 'avgPaid', 'margin', 'avgMargin', 'rate', 'done', 'inFlight', 'held'], cur: s, href: (k) => q({ s: k }) }}>
        {rows.map((x) => (
          <tr key={x.name}>
            <td className={tdl}>
              <Link href={q({ sel: x.name })} className="block max-w-[11rem] truncate whitespace-nowrap text-sky-300 hover:underline" title={x.name}>{x.name}</Link>
              {igs.get(x.name)?.size ? <span className="block max-w-[11rem] truncate text-xs"><Insta urls={igs.get(x.name)} /></span> : null}
            </td>
            <td className={td}>{x.currencies.join(', ') || '-'}</td>
            <Money n={x.revenue} />
            <td className={td}>{x.revenueCount}</td>
            <Money n={avgRevenue(x)} />
            <Money n={x.paid} />
            <td className={td}>{x.paidCount}</td>
            <Money n={avgPaid(x)} />
            <Money n={margin(x)} />
            <Money n={avgMargin(x)} />
            <td className={td}>{pct(rate(x))}</td>
            <Money n={x.done} />
            <Money n={x.inFlight} />
            <Money n={x.held} />
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">
        인스타는 지급 행의 크리에이터 관계로 크리에이터 리스트 「인스타」 칸을 읽습니다{igError ? ` (${igError})` : ''}. 매출 몫은 계약 공급가를 정산금 비중으로 나눈 값이라(지급내역 「매출 단가」가 있는 행은 그 값), 한 계약의 참여자는 모두 그 계약 마진율을 받습니다. 정산 합계는 상태와 관계없어 개요의 정산과 합이 다릅니다. 마진은 매출 몫에서 그 몫이 있는 지급을 뺀 값입니다. 기간을 지급일(송금일, 없으면 요청일)로 고르고 계약 연결 없는 지급은 빠져, 계약일 기준인 개요의 마진과 합이 다릅니다. <Link href={q({ tab: 'basis' })} className="text-neutral-400 underline hover:text-neutral-200">기준 탭</Link>
      </p>
    </div>
  )
}

/** 담당자 마진율. 계약 어디에도 지급이 연결되지 않았으면 100%가 아니라 「지급 연결 없음」 */
function ownerRate(o: Model['owners'][number], model: Model) {
  if (o.rate == null) return '마진율 -'
  const linked = model.contracts.some((x) => (x.c.owner || '미지정') === o.owner && x.payouts.length)
  return linked ? `마진율 ${pct(o.rate)}` : '지급 연결 없음'
}

function Owners({ model, q, s = '-supply' }: { model: Model; q: (o: Partial<Search>) => string; s?: string }) {
  const linked = (o: Model['owners'][number]) => model.contracts.some((x) => (x.c.owner || '미지정') === o.owner && x.payouts.length)
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
      <p className="text-xs text-neutral-500">노션 계약 DB 「담당자(정)」 기준입니다. 세일즈 담당자 칸은 아직 없습니다. 공급가가 없는 계약은 빠집니다.</p>
    </div>
  )
}

function Basis({ model, rates, basis, src }: { model: Model; rates: Rates; basis: Basis; src: Src }) {
  const g = model.gaps
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
  ]
  return (
    <div className="space-y-6 text-sm text-neutral-300">
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">집계 기준</h2>
        <ul className="list-disc space-y-1 pl-5 text-neutral-400">
          <li>매출: 수입 계약 공급가(부가세 제외)를 입금된 달에 셉니다. 선금+잔금 계약은 금액 비율로 나눕니다. P- 지출 계약은 빠집니다.</li>
          <li>정산: 지급내역 「송금 완료」 행의 지급액(원천징수 전)을 송금일의 달에 셉니다. 송금일이 없는 행(모인을 거치지 않는 원화 송금)은 은행 송금일이 들어오기 전까지 송금 요청일(신청일)의 달로 어림합니다.</li>
          <li>매출채권, 미지급금: 기간과 관계없는 현재 잔액입니다. 미지급금은 송금 완료도 보류도 아닌 지급입니다. 보류(중복 행, 반송 등 안 나갈 수 있는 돈)는 따로 보입니다.</li>
          <li>마진: {marginHint(basis === 'contract')} 계약일자가 없으면 시작일, 첫 입금일로 기간을 고릅니다.</li>
          <li>
            원화 환산: 외화 지급은 모인 원화 청구액이 있으면 그 값, 없으면 환율. 외화 계약 공급가는 입금된 몫을 입금일 환율(유럽중앙은행 기준환율), 입금 전 몫과 매출채권을 지금 환율로 셉니다(발생 기준 매출은 계약 기준일 환율). 지금 환율 1엔 {rates.JPY.toFixed(4)}원, 1달러 {rates.USD.toFixed(1)}원, 1위안 {rates.CNY.toFixed(2)}원 ({rates.source}, {rates.at}).
          </li>
          <li>
            개요의 기준 선택(지금 {basis === 'contract' ? '발생 기준(계약)' : '현금 기준(입금)'}): 현금 기준은 위 매출, 정산 규칙이고 입금일은 노션 계약 DB 선금, 잔금 입금일입니다(은행 대조 전, 클로브 계좌 연동 뒤 은행 입금으로 바꿈). 발생 기준은 계약일자(없으면 시작일, 첫 입금일)의 달에 공급가 전액과 그 계약에 연결된 지급 전체(상태 무관)를 셉니다. 수입 계약에 연결되지 않은 지급은 발생 기준 정산에서 빠지고, 공급가가 없는 계약의 지급은 정산에는 들고 마진에는 들지 않아 매출 빼기 정산이 마진과 조금 다릅니다.
          </li>
          <li>
            자금 캘린더
            <ul className="mt-1 list-[circle] space-y-1 pl-5">
              <li>입금: 실제 입금 예상액(합계 칸: 공급가 + 부가세, 영세율과 엔화는 부가세 없음, 엔화는 환율 환산. 합계가 빈 계약은 공급가로 대신하고 「합계 없음」 표시)을 회차로 나눠, 입금된 회차는 입금일, 아직이면 정산일(입금 예정일)에 둡니다.</li>
              <li>출금 날짜: 지급 예정일 규칙(송금 완료는 송금일, 모인 접수와 원화 이체 대기는 송금 요청일이고 정기 묶음(송금일 3영업일 전에 만듦)이면 그 달 송금일(마지막 평일), 송금 가능은 이번 달 말일, 대기는 수입 계약 입금 예정일이 든 달 말일이고 말일 이틀 전보다 늦으면 다음 달 말일. 말일이 주말이면 그 전 금요일, 공휴일은 따지지 않음)입니다. 모인 접수와 원화 이체 대기는 「송금 진행 중」이라 날짜가 지나도 지남으로 보지 않습니다.</li>
              <li>색 구분: 출금 예정은 송금 가능(고객사 입금 완료, 주황)과 대기(고객사 입금 전, 노랑)를 나눠 보여 줍니다. 계약 비고에 「정산일 임의」가 있는 계약(정산일을 몰라 임의로 넣은 날, 수출바우처는 계약월 +2달 말일)은 그 입금 예정과 그 날짜를 따르는 대기 출금을 보라로 따로 보여 주고, 날이 지나도 지남으로 보지 않습니다. 봇 광고주 계약이 서명 전(코드 없음)이면 그 정산일에 청록으로 따로 보여 주고 입금 예정 합계에서 뺍니다. 대기 지급 가운데 연결 계약 입금이 끝났는데 서류나 계좌로 막힌 행은 이번 달 말일(주말이면 그 전 금요일)에 분홍 「서류·계좌 대기」로 둡니다.</li>
              <li>빠지는 것: 달력에 잡히는 대기는 수입 계약에 입금 안 된 회차가 있는 행뿐입니다. 보류, 예정일을 정할 수 없는 행, 송금일 없는 송금 완료는 빠집니다. 입금 약속일 칸은 아직 없습니다.</li>
              <li>출금 금액: 실지급액(원화 사업소득 3.3% 행은 공제 뒤, 외화는 모인 원화 청구액이나 환율 환산, 세금계산서 행은 VAT 별도면 부가세를 더하고, VAT 칸이 비면 지급액 그대로)이고, 공제한 원천세를 세무서에 내는 출금은 달력에 없습니다.</li>
            </ul>
          </li>
          <li>
            크리에이터 탭: 매출 몫은 계약 공급가를 정산금 비중으로 나눈 값입니다(지급내역 「매출 단가」가 있는 행은 그 값, 부가세 제외, 계약 공급가와 같은 통화). 수입 계약에 연결되지 않은 지급은 정산에만 들어가고 매출 몫은 없습니다. 마진율은 매출 몫이 있는 지급끼리만 짝짓습니다. 정산 합계는 상태와 관계없고, 송금일이 없으면 요청일이나 계약일로 기간을 고르므로 개요의 정산(송금 완료, 송금일 기준)과 합이 다릅니다.
          </li>
          <li>
            {src.sheet
              ? `운영 대시보드 시트(${src.sheet.tab})에서 노션 계약 DB에 없는 계약 ${src.sheet.added}건(코드 없는 행 ${src.sheet.codeless}건 포함)을 더했습니다(코드 받기와 코드 대조 전 임시). 중복 후보(확인 요청 중, 집계에 포함): ${src.sheet.dups.join(', ') || '없음'}. 공급가를 시트에서 채운 계약 ${src.sheet.supplyFrom.length}건.`
              : `운영 대시보드 시트를 읽지 못해 노션 계약 DB 계약만 집계합니다: ${src.sheetError ?? '원인 미상'}`}
          </li>
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
const WAIT = '#e0b35a' // 고객사 입금 전이라 아직 못 보내는 출금 예정
const GUESS = '#a78bfa' // 정산일을 몰라 임의로 넣은 날(계약 비고 「정산일 임의」)
const UNSIGNED = '#5fb3b3' // 봇 광고주 계약 서명 전(코드 없음)
const DOCS = '#e98bb7' // 고객사 입금은 끝났는데 서류, 계좌로 대기인 출금
const CAL_COLOR: Record<CalItem['kind'], Record<CalItem['state'], string>> = {
  in: { done: GOOD, flight: DUE, due: DUE, wait: DUE, late: ALERT, guess: GUESS, unsigned: UNSIGNED, docs: DUE },
  out: { done: REV, flight: SET, due: SET, wait: WAIT, late: ALERT, guess: GUESS, unsigned: DUE, docs: DOCS },
}
const CAL_LINES: [CalItem['kind'], CalItem['state'][], string][] = [
  ['in', ['done'], '입금'], ['in', ['due'], '입금 예정'], ['in', ['late'], '입금 예정일 지남'], ['in', ['guess'], '입금 예정(정산일 임의)'], ['in', ['unsigned'], '입금 예정(서명 전)'],
  ['out', ['done'], '출금'], ['out', ['flight', 'due'], '출금 예정(고객사 입금 완료)'], ['out', ['wait'], '출금 예정(고객사 입금 전)'], ['out', ['late'], '출금 예정일 지남'], ['out', ['guess'], '출금 예정(정산일 임의)'], ['out', ['docs'], '출금 예정(서류·계좌 대기)'],
]

const LIST = 'cal-list'
// 정상 흐름이 아닌 상태(정산일 임의, 서명 전, 서류·계좌 대기)는 날이 지나도 색을 바꾸지 않고 「예정일 지남」 글자만 붙임(Leo 261026)
const ODD: CalItem['state'][] = ['guess', 'unsigned', 'docs']
const Overdue = ({ show, short }: { show: boolean; short?: boolean }) => (show ? <span style={{ color: ALERT }}>{short ? ' 지남' : ', 예정일 지남'}</span> : null)
/** 안건 칸 이름: 입금은 계약, 출금은 크리에이터 상세로 */
function CalTitle({ x, q }: { x: CalItem; q: (o: Partial<Search>) => string }) {
  const href = x.kind === 'out' ? q({ tab: 'creators', y: 'all', m: undefined, sel: x.title }) : x.contractId ? q({ tab: 'contracts', y: 'all', m: undefined, sel: x.contractId }) : null
  return href ? <Link href={href} className="text-sky-300 hover:underline">{x.title}</Link> : <span className="text-neutral-200">{x.title}</span>
}
/** 안건 칸 회색 줄: 계약 코드(누르면 계약), 예외 메모. 상태는 상태 칸에 */
function CalSub({ x, q }: { x: CalItem; q: (o: Partial<Search>) => string }) {
  const code = x.code && x.contractId ? <Link href={q({ tab: 'contracts', y: 'all', m: undefined, sel: x.contractId })} className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200">{x.code}</Link> : x.code
  if (!code && !x.sub) return null
  return <span className="block break-words text-xs text-neutral-500">{code}{code && x.sub ? ', ' : ''}{x.sub}</span>
}
/** 캘린더 칸(모바일): 만원 단위 숫자만, 1억 이상은 억 */
const man = (n: number) => (n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n < 1e4 ? '<1' : Math.round(n / 1e4).toLocaleString('ko-KR'))

/** 자금 캘린더: 날짜별 들어오고 나가는 돈, 아래 표는 그 달 안건별 입출금 전체(날짜를 누르면 그날만, 안건명 검색) */
function Calendar({ items, ym: cur, today, sel, q, f }: { items: CalItem[]; ym: string; today: string; sel?: string; q: (o: Partial<Search>) => string; f?: string }) {
  const [y, m] = cur.split('-').map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay() // 일요일 0
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const byDay = new Map<string, CalItem[]>()
  for (const x of items) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x])
  const sum = (xs: CalItem[], kind: CalItem['kind'], states: CalItem['state'][]) => xs.filter((x) => x.kind === kind && states.includes(x.state)).reduce((a, x) => a + x.krw, 0)
  const go = (yy: number, mm: number, d?: string) => q({ y: String(yy), m: String(mm), d })
  const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1]
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1]
  const day = sel?.startsWith(cur) ? sel : undefined
  const rows = (day ? (byDay.get(day) ?? []) : [...items].sort((a, b) => a.date.localeCompare(b.date))).filter((x) => hit(f, x.title, x.code, x.sub))
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
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">출금</span><Legend items={[['출금', REV], ['예정(고객사 입금 완료)', SET], ['예정(고객사 입금 전)', WAIT], ['서류, 계좌 대기', DOCS]]} /></div>
          <div className="flex flex-wrap items-center gap-x-2"><span className="w-8 text-neutral-500">공통</span><Legend items={[['예정일 지남', ALERT], ['정산일 임의', GUESS]]} /></div>
          <p className="text-neutral-500">날짜를 누르면 아래에 그날 안건이 나옵니다</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card label="입금" value={won2(sum(items, 'in', ['done']))} note="부가세 포함, 입금일(노션 계약 DB 먼저, 없으면 시트, 은행 대조 전)" />
        <Card label="입금 예정" value={won2(sum(items, 'in', ['due', 'late', 'guess']))} note={`부가세 포함, 그중 예정일 지남 ${won2(sum(items, 'in', ['late']))}, 정산일 임의 ${won2(sum(items, 'in', ['guess']))}, 서명 전 계약 ${won2(sum(items, 'in', ['unsigned']))}은 따로(합계 제외)`} />
        <Card label="출금" value={won2(sum(items, 'out', ['done']))} note="실지급액(3.3% 공제 뒤), 송금일" />
        <Card label="출금 예정" value={won2(sum(items, 'out', ['flight', 'due', 'wait', 'late', 'guess', 'docs']))} note={`실지급액, 고객사 입금 완료 ${won2(sum(items, 'out', ['flight', 'due']))}, 고객사 입금 전 ${won2(sum(items, 'out', ['wait', 'guess']))}, 서류·계좌 대기 ${won2(sum(items, 'out', ['docs']))}, 보류 제외`} />
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
            return (
              <Link key={date} href={date === day ? go(y, m) : `${go(y, m, date)}#${LIST}`} className={`min-h-16 space-y-1 bg-neutral-900 p-1 text-[11px] sm:min-h-32 sm:space-y-1.5 sm:p-2.5 sm:text-sm hover:bg-neutral-800/70 ${date === sel ? 'rounded-xl ring-2 ring-inset ring-sky-500' : ''}`}>
                <span className={`inline-block ${date === today ? 'rounded bg-neutral-100 px-1 font-semibold text-neutral-900' : 'text-neutral-500'}`}>{i + 1}</span>
                {CAL_LINES.map(([kind, states, label]) => {
                  const k = sum(xs, kind, states)
                  return k > 0 && <span key={label} className="block break-keep tabular-nums leading-snug" style={{ color: CAL_COLOR[kind][states[0]] }} title={`${label} ${won(k)}`}>{kind === 'in' ? '+' : '−'}<span className="sm:hidden">{man(k)}</span><span className="hidden sm:inline"> {won2(k)}{kind === 'out' && states.includes('due') ? (xs.some((x) => x.kind === 'out' && x.state === 'due') ? (xs.some((x) => x.kind === 'out' && x.state === 'flight') ? ' 송금 진행 중, 가능' : ' 송금 가능') : ' 송금 진행 중') : states.includes('wait') ? ' 입금 전' : states.includes('guess') ? ' 임의' : states.includes('unsigned') ? ' 서명 전' : states.includes('docs') ? ' 서류 대기' : states.includes('late') ? (kind === 'in' ? ' 입금 예정일 지남' : ' 출금 예정일 지남') : ''}<Overdue show={ODD.includes(states[0]) && date < today} short /></span></span>
                })}
              </Link>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-neutral-500 sm:hidden">칸 금액 단위는 만원입니다.</p>
      <section id={LIST} className="scroll-mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-100">
            {day ?? `${m}월 전체`} 안건별 입출금
            {day && <Link href={`${go(y, m)}#${LIST}`} className="ml-2 text-xs font-normal text-neutral-400 hover:text-neutral-200">월 전체 보기</Link>}
          </h3>
          <SearchBox q={q} f={f} n={rows.length} total={day ? (byDay.get(day) ?? []).length : items.length} placeholder="안건, 크리에이터" anchor={LIST} />
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
          </ul>
          <div className="hidden sm:block">
          <Table head={['날짜', '안건', '구분', '상태', '금액']} left={2}>
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
