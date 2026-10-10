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
  preText: string // 선금 금액(글)
  postText: string // 잔금 금액(글)
  preDate: string | null // 선금 입금일
  postDate: string | null // 잔금 입금일
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
}

export type Rates = { JPY: number; USD: number; CNY: number; at: string; source: string }

export type Period = { year: number | null; month: number | null } // year null: 전체

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

/** 금액 글에서 첫 금액(1,000 이상)을 읽음. 「판매수수료 15%」 같은 비율은 금액이 아니므로 null */
export function parseAmount(text: string): number | null {
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ''))
    if (n >= 1000) return n
  }
  return null
}

export type Recognition = { date: string | null; share: number; estimated: boolean }

/** 공급가를 입금 회차로 나눔. 날짜가 null 인 몫은 아직 받지 않은 돈 */
export function recognitions(c: Contract): Recognition[] {
  if (c.method === '선금+잔금') {
    const pre = parseAmount(c.preText)
    const post = parseAmount(c.postText)
    const known = pre != null && post != null && pre + post > 0
    const preShare = known ? pre / (pre + post) : 0.5
    return [
      { date: c.preDate, share: preShare, estimated: !known },
      { date: c.postDate, share: 1 - preShare, estimated: !known },
    ]
  }
  if (c.method === '선금 100%') return [{ date: c.preDate ?? c.postDate, share: 1, estimated: false }]
  if (c.method === '잔금 100%') return [{ date: c.postDate ?? c.preDate, share: 1, estimated: false }]
  return [{ date: c.postDate ?? c.preDate, share: 1, estimated: false }]
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
  return y === p.year && (p.month == null || m === p.month)
}

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
}

/** 지급 기준일: 송금일, 없으면 송금 요청일, 없으면 연결 계약 기준일 */
export function payoutDay(p: Payout, byId: Map<string, Contract>): string | null {
  const c = p.contractId ? byId.get(p.contractId) : undefined
  return p.sentDate ?? p.reqDate ?? (c ? contractDay(c) : null)
}

export function buildModel(contracts: Contract[], payouts: Payout[], r: Rates, period: Period): Model {
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

  // 매출(입금 기준)과 받을 돈(현재 잔액)
  let revenue = 0
  let receivable = 0
  const monthly = new Map<string, { revenue: number; settled: number }>()
  const bump = (date: string, key: 'revenue' | 'settled', v: number) => {
    const m = date.slice(0, 7)
    const row = monthly.get(m) ?? { revenue: 0, settled: 0 }
    row[key] += v
    monthly.set(m, row)
  }
  for (const c of revenueContracts) {
    const s = supplyKrw(c, r)
    if (s == null) continue
    for (const rec of recognitions(c)) {
      if (!rec.date) receivable += s * rec.share
      else {
        if (inPeriod(rec.date, period)) revenue += s * rec.share
        if (period.year == null || rec.date.startsWith(String(period.year))) bump(rec.date, 'revenue', s * rec.share)
      }
    }
  }

  // 정산(송금 기준)과 줄 돈(현재 잔액)
  let settled = 0
  let payable = 0
  let held = 0
  for (const p of payouts) {
    if (p.status === DONE) {
      if (p.sentDate && inPeriod(p.sentDate, period)) settled += krw(p)
      if (p.sentDate && (period.year == null || p.sentDate.startsWith(String(period.year)))) bump(p.sentDate, 'settled', krw(p))
    } else {
      payable += krw(p)
      if (p.status === '보류') held += krw(p)
    }
  }

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

  return {
    summary: { revenue, receivable, settled, payable, held, margin: sumMargin, marginRate: sumSupply ? sumMargin / sumSupply : null },
    monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    contracts: rows,
    creators: [...creators.values()].sort((a, b) => b.revenue - a.revenue || b.paid - a.paid),
    owners: [...owners.values()].sort((a, b) => b.supply - a.supply),
    gaps,
  }
}
