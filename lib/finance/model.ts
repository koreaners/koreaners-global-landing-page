// 관리자 대시보드 집계 (설계: 볼트 work/261010-설계-관리자대시보드).
// 순수 함수만 둔다. node 로 바로 돌리는 점검(model.check.mjs)이 이 파일을 타입만 지워 읽으므로
// enum, namespace 같은 지울 수 없는 문법과 런타임 import 는 쓰지 않는다.

export type Currency = 'KRW' | 'JPY' | 'USD' | 'CNY'

export type Contract = {
  id: string
  code: string
  brand: string
  corp: string
  owner: string
  isExpense: boolean
  method: string | null // 정산 방식
  supplyKrw: number | null // 공급가(원)
  supplyJpy: number | null // 공급가(엔)
  totalKrw?: number | null // 합계(원), 부가세 포함 실제 입금액
  totalJpy?: number | null // 합계(엔)
  preText: string // 선금 금액(글)
  postText: string // 잔금 금액(글)
  preDate: string | null // 선금 입금일
  postDate: string | null // 잔금 입금일
  preDue: string | null // 선금 정산일(입금 예정)
  postDue: string | null // 잔금 정산일(입금 예정)
  contractDate: string | null
  startDate: string | null
  link: string | null
}

export type Payout = {
  id: string
  pid: number | null // 지급 ID
  name: string // 제목(영문이름)
  status: string // 대기, 송금 가능, 모인 접수, 원화 이체 대기, 송금 완료, 보류
  currency: Currency | null
  amount: number | null // 지급액(원래 통화)
  krwBilled: number | null // 원화 청구액(모인)
  sentDate: string | null
  reqDate: string | null
  contractId: string | null // 수입 계약
  blocked: string[] // 막힌 사유
  deduction?: string | null // 공제 유형: 사업소득 3.3%, 세금계산서, 해외 송금
}

export type Rates = { JPY: number; USD: number; CNY: number; at: string; source: string }

// year null: 전체. upto: 연간일 때 이 달까지만(올해와 견주는 전년 같은 기간)
export type Period = { year: number | null; month: number | null; upto?: number | null }

const DONE = '송금 완료'
const IN_FLIGHT = ['송금 가능', '모인 접수', '원화 이체 대기']

export function rateOf(c: Currency | null, r: Rates): number | null {
  if (c === 'KRW') return 1
  if (c === 'JPY' || c === 'USD' || c === 'CNY') return r[c]
  return null
}

/** 계약 공급가 원화 환산. 원화 칸 우선, 없으면 엔화 칸 × 환율. 둘 다 없으면 null */
export function supplyKrw(c: Contract, r: Rates): number | null {
  if (c.supplyKrw != null) return c.supplyKrw
  if (c.supplyJpy != null) return c.supplyJpy * r.JPY
  return null
}

/** 지급 원화 환산. 모인 원화 청구액이 있으면 그 값, 없으면 지급액 × 환율 */
export function payoutKrw(p: Payout, r: Rates): number | null {
  if (p.krwBilled != null) return p.krwBilled
  const rate = rateOf(p.currency, r)
  return p.amount != null && rate != null ? p.amount * rate : null
}

/** 실제로 통장에서 나가는 금액(정산 설계 4절 실지급액): 원화 사업소득 3.3% 행은 공제액(지급액 × 0.033, 원 단위 반올림)을 뺌, 나머지는 원화 환산 그대로 */
export function netPayoutKrw(p: Payout, r: Rates): number | null {
  if (p.deduction === '사업소득 3.3%' && p.currency === 'KRW' && p.amount != null) return p.amount - Math.round(p.amount * 0.033)
  return payoutKrw(p, r)
}

/** 금액 글에서 첫 금액(1,000 이상)을 읽음. 「판매수수료 15%」 같은 비율은 금액이 아니므로 null */
export function parseAmount(text: string): number | null {
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ''))
    if (n >= 1000) return n
  }
  return null
}

export type Recognition = { date: string | null; due: string | null; share: number; estimated: boolean }

/** 공급가를 입금 회차로 나눔. 날짜가 null 인 몫은 아직 받지 않은 돈, due 는 그 회차의 입금 예정일 */
export function recognitions(c: Contract): Recognition[] {
  if (c.method === '선금+잔금') {
    const pre = parseAmount(c.preText)
    const post = parseAmount(c.postText)
    const known = pre != null && post != null && pre + post > 0
    const preShare = known ? pre / (pre + post) : 0.5
    return [
      { date: c.preDate, due: c.preDue, share: preShare, estimated: !known },
      { date: c.postDate, due: c.postDue, share: 1 - preShare, estimated: !known },
    ]
  }
  if (c.method === '선금 100%') return [{ date: c.preDate ?? c.postDate, due: c.preDue ?? c.postDue, share: 1, estimated: false }]
  return [{ date: c.postDate ?? c.preDate, due: c.postDue ?? c.preDue, share: 1, estimated: false }]
}

/** 계약 기준일: 계약일자, 없으면 시작일, 없으면 첫 입금일 */
export function contractDay(c: Contract): string | null {
  return c.contractDate ?? c.startDate ?? [c.preDate, c.postDate].filter(Boolean).sort()[0] ?? null
}

export function inPeriod(date: string | null, p: Period): boolean {
  if (p.year == null) return true
  if (!date) return false
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7))
  return y === p.year && (p.month != null ? m === p.month : p.upto == null || m <= p.upto)
}

/** 견줄 기간: 월은 전월, 연간은 전년(올해면 같은 달까지), 전체는 없음 */
export function priorPeriod(p: Period, today: string): Period | null {
  if (p.year == null) return null
  if (p.month != null) return p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 }
  const thisYear = Number(today.slice(0, 4))
  return { year: p.year - 1, month: null, upto: p.year === thisYear ? Number(today.slice(5, 7)) : null }
}

export type Bucket = { label: string; count: number; krw: number; alert: boolean }
export type OpenItem = { c: Contract; due: string | null; krw: number }

export type ContractRow = {
  c: Contract
  day: string | null
  supply: number | null
  received: number
  cost: number
  margin: number | null
  rate: number | null
  payouts: Payout[]
  estimated: boolean
}

export type CreatorRow = {
  name: string
  currencies: Currency[]
  revenue: number // 계약 공급가 가운데 지급 비율로 나눈 몫
  revenueCount: number
  paid: number // 상태 무관 지급 합
  paidCount: number
  linkedPaid: number // 매출 몫이 있는 지급만(마진율 짝)
  done: number
  inFlight: number
  held: number
  payouts: Payout[]
  shares: { c: Contract; share: number; paid: number }[]
}

export type OwnerRow = { owner: string; count: number; supply: number; received: number; cost: number; margin: number; rate: number | null }

export type Gaps = {
  unsigned: number // 유니크코드가 없는 서명 전 계약(집계에서 뺌)
  noDeposit: number // 입금일이 하나도 없는 수입 계약
  noSupply: number
  noDay: number
  estimatedSplit: number
  unlinked: { count: number; krw: number } // 수입 계약이 없는 지급
  doneNoDate: { count: number; krw: number } // 송금일 없는 송금 완료
  fxNoBilled: number // 원화 청구액 없는 외화 송금 완료
  noRate: number // 통화나 금액이 없어 환산 못 한 지급
}

export type Model = {
  summary: { revenue: number; receivable: number; settled: number; payable: number; held: number; margin: number; marginRate: number | null }
  monthly: { month: string; revenue: number; settled: number }[]
  contracts: ContractRow[]
  creators: CreatorRow[]
  owners: OwnerRow[]
  gaps: Gaps
  receivables: { buckets: Bucket[]; open: OpenItem[] } // 받을 돈 만기 구간, 회차 목록(예정일 이른 순, 없는 것 뒤)
  payables: Bucket[] // 줄 돈 상태 묶음
}

const DAY = 86_400_000
const daysFrom = (today: string, d: string) => Math.round((Date.parse(d) - Date.parse(today)) / DAY)

/** 받을 돈 회차를 입금 예정일 기준 구간으로 */
export function agingBuckets(open: OpenItem[], today: string): Bucket[] {
  const defs: [string, (d: number | null) => boolean, boolean][] = [
    ['60일 넘게 지남', (d) => d != null && d < -60, true],
    ['31~60일 지남', (d) => d != null && d >= -60 && d < -30, true],
    ['1~30일 지남', (d) => d != null && d >= -30 && d < 0, true],
    ['30일 안에 예정', (d) => d != null && d >= 0 && d <= 30, false],
    ['그 뒤 예정', (d) => d != null && d > 30, false],
    ['예정일 없음', (d) => d == null, false],
  ]
  return defs.map(([label, hit, alert]) => {
    const xs = open.filter((o) => hit(o.due ? daysFrom(today, o.due) : null))
    return { label, alert, count: xs.length, krw: xs.reduce((a, o) => a + o.krw, 0) }
  })
}

/** 지급 기준일: 송금일, 없으면 송금 요청일, 없으면 연결 계약 기준일 */
export function payoutDay(p: Payout, byId: Map<string, Contract>): string | null {
  const c = p.contractId ? byId.get(p.contractId) : undefined
  return p.sentDate ?? p.reqDate ?? (c ? contractDay(c) : null)
}

// cash: 매출은 입금된 달, 정산은 송금한 달. contract: 둘 다 계약 기준일의 달(공급가 전액, 그 계약에 연결된 지급 전체)
export type Basis = 'cash' | 'contract'

export function buildModel(contracts: Contract[], payouts: Payout[], r: Rates, period: Period, today = new Date().toISOString().slice(0, 10), basis: Basis = 'cash'): Model {
  // 봇 계약은 서명 전에 유니크코드 없이 행을 만들고 서명완료 때 코드를 발급한다. 코드 없는 행은 아직 계약이 아니라 뺀다
  const unsigned = contracts.filter((c) => !c.code).length
  contracts = contracts.filter((c) => c.code)
  const revenueContracts = contracts.filter((c) => !c.isExpense)
  const byId = new Map(contracts.map((c) => [c.id, c]))
  const krw = (p: Payout) => payoutKrw(p, r) ?? 0

  const payByContract = new Map<string, Payout[]>()
  for (const p of payouts) {
    if (!p.contractId) continue
    const list = payByContract.get(p.contractId) ?? []
    list.push(p)
    payByContract.set(p.contractId, list)
  }

  // 매출, 정산(기준에 따라 입금/송금된 달 또는 계약 기준일의 달)과 받을 돈, 줄 돈(현재 잔액)
  const totals = { revenue: 0, settled: 0 }
  let receivable = 0
  const open: OpenItem[] = []
  const monthly = new Map<string, { revenue: number; settled: number }>()
  const count = (date: string, key: 'revenue' | 'settled', v: number) => {
    if (inPeriod(date, period)) totals[key] += v
    if (period.year != null && !date.startsWith(String(period.year))) return
    const m = date.slice(0, 7)
    const row = monthly.get(m) ?? { revenue: 0, settled: 0 }
    row[key] += v
    monthly.set(m, row)
  }
  for (const c of revenueContracts) {
    const s = supplyKrw(c, r)
    if (s == null) continue
    for (const rec of recognitions(c)) {
      if (!rec.date) {
        receivable += s * rec.share
        open.push({ c, due: rec.due, krw: s * rec.share })
      } else if (basis === 'cash') count(rec.date, 'revenue', s * rec.share)
    }
    const d = contractDay(c)
    if (basis === 'contract' && d) count(d, 'revenue', s)
  }

  let payable = 0
  let held = 0
  for (const p of payouts) {
    if (p.status !== DONE) {
      payable += krw(p)
      if (p.status === '보류') held += krw(p)
    }
    if (basis === 'cash') {
      if (p.status === DONE && p.sentDate) count(p.sentDate, 'settled', krw(p))
    } else {
      const c = p.contractId ? byId.get(p.contractId) : undefined
      const d = c && !c.isExpense ? contractDay(c) : null
      if (d) count(d, 'settled', krw(p))
    }
  }
  const { revenue, settled } = totals

  // 안건별 마진: 계약 기준일이 기간 안인 수입 계약
  const rows: ContractRow[] = revenueContracts
    .map((c) => {
      const supply = supplyKrw(c, r)
      const recs = recognitions(c)
      const ps = payByContract.get(c.id) ?? []
      const cost = ps.reduce((a, p) => a + krw(p), 0)
      const received = supply == null ? 0 : recs.filter((x) => x.date).reduce((a, x) => a + supply * x.share, 0)
      const margin = supply == null ? null : supply - cost
      return {
        c,
        day: contractDay(c),
        supply,
        received,
        cost,
        margin,
        rate: margin != null && supply ? margin / supply : null,
        payouts: ps,
        estimated: recs.some((x) => x.estimated),
      }
    })
    .filter((x) => inPeriod(x.day, period))
    .sort((a, b) => (b.day ?? '').localeCompare(a.day ?? ''))

  const priced = rows.filter((x) => x.supply != null)
  const sumSupply = priced.reduce((a, x) => a + (x.supply ?? 0), 0)
  const sumMargin = priced.reduce((a, x) => a + (x.margin ?? 0), 0)

  // 크리에이터: 지급 기준일이 기간 안인 지급. 매출 몫은 계약 공급가 × (이 지급 / 그 계약 지급 합)
  const creators = new Map<string, CreatorRow>()
  for (const p of payouts) {
    if (!inPeriod(payoutDay(p, byId), period)) continue
    const row: CreatorRow = creators.get(p.name) ?? {
      name: p.name, currencies: [], revenue: 0, revenueCount: 0, paid: 0, paidCount: 0, linkedPaid: 0,
      done: 0, inFlight: 0, held: 0, payouts: [], shares: [],
    }
    const v = krw(p)
    row.paid += v
    row.paidCount += 1
    row.payouts.push(p)
    if (p.currency && !row.currencies.includes(p.currency)) row.currencies.push(p.currency)
    if (p.status === DONE) row.done += v
    else if (IN_FLIGHT.includes(p.status)) row.inFlight += v
    else row.held += v
    const c = p.contractId ? byId.get(p.contractId) : undefined
    const supply = c && !c.isExpense ? supplyKrw(c, r) : null
    if (c && supply != null) {
      const total = (payByContract.get(c.id) ?? []).reduce((a, x) => a + krw(x), 0)
      const share = total > 0 ? (supply * v) / total : 0
      row.revenue += share
      row.linkedPaid += v
      const prev = row.shares.find((s) => s.c.id === c.id)
      if (prev) {
        prev.share += share
        prev.paid += v
      } else {
        row.shares.push({ c, share, paid: v })
        row.revenueCount += 1
      }
    }
    creators.set(p.name, row)
  }

  // 담당자별
  const owners = new Map<string, OwnerRow>()
  for (const x of priced) {
    const key = x.c.owner || '미지정'
    const o = owners.get(key) ?? { owner: key, count: 0, supply: 0, received: 0, cost: 0, margin: 0, rate: null }
    o.count += 1
    o.supply += x.supply ?? 0
    o.received += x.received
    o.cost += x.cost
    o.margin += x.margin ?? 0
    o.rate = o.supply ? o.margin / o.supply : null
    owners.set(key, o)
  }

  const unlinked = payouts.filter((p) => !p.contractId)
  const doneNoDate = payouts.filter((p) => p.status === DONE && !p.sentDate)
  const gaps: Gaps = {
    unsigned,
    noDeposit: revenueContracts.filter((c) => !c.preDate && !c.postDate).length,
    noSupply: revenueContracts.filter((c) => supplyKrw(c, r) == null).length,
    noDay: revenueContracts.filter((c) => !contractDay(c)).length,
    estimatedSplit: revenueContracts.filter((c) => recognitions(c).some((x) => x.estimated)).length,
    unlinked: { count: unlinked.length, krw: unlinked.reduce((a, p) => a + krw(p), 0) },
    doneNoDate: { count: doneNoDate.length, krw: doneNoDate.reduce((a, p) => a + krw(p), 0) },
    fxNoBilled: payouts.filter((p) => p.status === DONE && p.currency && p.currency !== 'KRW' && p.krwBilled == null).length,
    noRate: payouts.filter((p) => payoutKrw(p, r) == null).length,
  }

  open.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const groups: [string, (s: string) => boolean, boolean][] = [
    ['대기', (s) => s === '대기', false],
    ['송금 진행 중', (s) => IN_FLIGHT.includes(s), false],
    ['보류', (s) => s === '보류', true],
    ['기타 상태', (s) => s !== '대기' && s !== '보류' && !IN_FLIGHT.includes(s), false],
  ]
  const pending = payouts.filter((p) => p.status !== DONE)
  const payables = groups
    .map(([label, hit, alert]) => {
      const xs = pending.filter((p) => hit(p.status))
      return { label, alert, count: xs.length, krw: xs.reduce((a, p) => a + krw(p), 0) }
    })
    .filter((b) => b.count > 0 || b.label !== '기타 상태')

  return {
    summary: { revenue, receivable, settled, payable, held, margin: sumMargin, marginRate: sumSupply ? sumMargin / sumSupply : null },
    monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    contracts: rows,
    creators: [...creators.values()].sort((a, b) => b.revenue - a.revenue || b.paid - a.paid),
    owners: [...owners.values()].sort((a, b) => b.supply - a.supply),
    gaps,
    receivables: { buckets: agingBuckets(open, today), open },
    payables,
  }
}

const monthEnd = (d: string) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0)).toISOString().slice(0, 10)

/** 지급 예정일(설계 261002-설계-자금캘린더 1절). 정기 회차는 월말 1회 가정, 마감이 20일로 확인되면 「말일 이틀 전」을 「20일」로 */
export function payoutDue(p: Payout, byId: Map<string, Contract>, today: string): string | null {
  if (p.status === DONE) return p.sentDate
  if (p.status === '모인 접수' || p.status === '원화 이체 대기') return p.reqDate
  if (p.status === '송금 가능') return monthEnd(today)
  if (p.status !== '대기') return null // 보류
  const c = p.contractId ? byId.get(p.contractId) : undefined
  const due = c ? (recognitions(c).find((x) => !x.date)?.due ?? null) : null
  if (!due) return null
  const end = monthEnd(due)
  return Date.parse(due) > Date.parse(end) - 2 * DAY ? monthEnd(new Date(Date.parse(end) + DAY).toISOString().slice(0, 10)) : end
}

export type CalItem = { kind: 'in' | 'out'; state: 'done' | 'flight' | 'due' | 'late'; date: string; krw: number; title: string; sub: string; contractId: string | null }

/** 자금 캘린더: 그 달(YYYY-MM)의 들어온 돈, 들어올 돈(입금 예정일), 나간 돈, 나갈 돈(지급 예정일). 기간 필터와 무관하게 전체 행에서 고름.
 * 들어옴은 실제 입금액(합계 칸, 부가세 포함, 영세율과 엔화는 공급가와 같음). 합계가 비면 공급가로 대신하고 표시
 * 나감은 실지급액(3.3% 공제 뒤). 세금계산서 행은 지급액이 부가세 포함인지 미확인이라 그대로 두고 표시(건우님 확인 요청 12, 13번) */
export function calendarMonth(contracts: Contract[], payouts: Payout[], r: Rates, ym: string, today: string): CalItem[] {
  const signed = contracts.filter((c) => c.code)
  const byId = new Map(signed.map((c) => [c.id, c]))
  const out: CalItem[] = []
  for (const c of signed) {
    if (c.isExpense) continue
    const total = c.totalKrw ?? (c.totalJpy != null ? c.totalJpy * r.JPY : null)
    const amt = total ?? supplyKrw(c, r)
    if (amt == null) continue
    for (const rec of recognitions(c)) {
      const date = rec.date ?? rec.due
      if (!date?.startsWith(ym)) continue
      out.push({ kind: 'in', state: rec.date ? 'done' : date < today ? 'late' : 'due', date, krw: amt * rec.share, title: c.brand || c.corp || c.code, sub: total == null ? `${c.code}, 합계 없음(공급가)` : c.code, contractId: c.id })
    }
  }
  for (const p of payouts) {
    const date = payoutDue(p, byId, today)
    if (!date?.startsWith(ym)) continue
    const c = p.contractId ? byId.get(p.contractId) : undefined
    // 모인 접수, 원화 이체 대기는 송금 요청일에 이미 나가는 중이라 지남으로 보지 않음
    const note = p.deduction === '세금계산서' ? ', 세금계산서(부가세 포함 여부 미확인)' : p.currency === 'KRW' && !p.deduction ? ', 공제 유형 빈칸' : ''
    out.push({ kind: 'out', state: p.status === DONE ? 'done' : IN_FLIGHT.includes(p.status) && p.status !== '송금 가능' ? 'flight' : date < today ? 'late' : 'due', date, krw: netPayoutKrw(p, r) ?? 0, title: p.name, sub: `${p.status}${c ? `, ${c.code}` : ''}${note}`, contractId: c?.id ?? null })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.krw - a.krw)
}
