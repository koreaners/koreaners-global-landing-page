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
  excluded?: boolean // Contract DB 「매출 제외」: 코리너스 매출이 아닌 계약(에츠코 직접 계약, 중복 코드). 매출, 받을 돈에서 뺌
  method: string | null // 정산 방식
  supplyKrw: number | null // 공급가(원)
  supplyJpy: number | null // 공급가(엔)
  totalKrw?: number | null // 합계(원), 부가세 포함 실제 입금액
  totalJpy?: number | null // 합계(엔)
  vatKrw?: number | null // 부가세(원)
  voucher?: string | null // 수출바우처(중진공, KOTRA): 기관이 공급가만 내고 고객사가 부가세를 따로 냄
  preText: string // 선금 금액(글)
  postText: string // 잔금 금액(글)
  preDate: string | null // 선금 입금일
  postDate: string | null // 잔금 입금일
  preDue: string | null // 선금 정산일(입금 예정)
  postDue: string | null // 잔금 정산일(입금 예정)
  contractDate: string | null
  startDate: string | null
  link: string | null
  unsigned?: boolean // 봇 광고주 계약 서명 전(제목 「(서명 전) 」, 코드 없음). 캘린더에 따로 표시(Leo 261026)
  dueGuess?: boolean // 비고에 「정산일 임의」: 정산일을 모르는 계약에 임의로 넣은 날(수출바우처 계약월 +2달 말일 등, Leo 261026). 캘린더 색을 따로
  twikr?: boolean // 비고에 「공급자 트위커」: 대금이 트위커 국민 계좌로 가는 계약. 코리너스 받을 돈, 자금 캘린더 들어옴에서 뺌(매출은 그대로, 인혁 261105)
  supplyUsd?: number | null // 공급가(달러), 운영 대시보드 시트 행만
  currency?: Currency | null // Contract DB 통화 칸(매출 통화별 나눔용, 금액은 공급가(원) 그대로)
  source?: 'sheet' // Contract DB에 없어 운영 대시보드 시트에서 읽은 행(코드 받기와 코드 대조 전 임시)
  supplyFrom?: 'sheet' // Contract DB 공급가(원, 엔)가 둘 다 비어 같은 코드 시트 행의 계약 금액으로 채운 계약
  expectedCost?: number | null // Contract DB 「예상 원가(원)」: 크리에이터 지급 원가 예상 합계(부가세 제외). 있으면 원가 덜 붙음을 마진율 대신 이 값으로 판정(인혁 261112)
}

export type Payout = {
  id: string
  pid: number | null // 지급 ID
  name: string // 제목(영문이름)
  payeeId?: string | null // 수취인 관계(계좌). 크리에이터 묶기 기준: 이름이 바뀌어도 같은 사람(Leo 261102 UEDA FUKA = OKANO FUKA)
  status: string // 대기, 송금 가능, 모인 접수, 원화 이체 대기, 송금 완료, 보류
  currency: Currency | null
  amount: number | null // 지급액(원래 통화)
  krwBilled: number | null // 원화 청구액(모인)
  sentDate: string | null
  reqDate: string | null
  contractId: string | null // 수입 계약
  blocked: string[] // 막힌 사유
  notContract?: boolean // 계약 아님(캠페인 계약에 붙지 않는 지급, 용역비 등): 계약 연결 없는 지급에서만 뺌
  deduction?: string | null // 공제 유형: 사업소득 3.3%, 세금계산서, 해외 송금
  vat?: string | null // VAT: 포함, 별도(세금계산서 행. 별도면 지급액이 공급가라 부가세를 더해 보냄)
  creatorIds?: string[] // 크리에이터 리스트(인플루언서 DB) 관계
  note?: string // 비고. 보류 가운데 나가지 않을 행(중복, 반송 종결)을 가림
  price?: number | null // 매출 단가: 고객사가 이 크리에이터 몫으로 낸 공급가(부가세 제외, 계약 공급가 칸과 같은 통화). 크리에이터 매출 몫에 씀(Leo 261030)
  dueOn?: string | null // 송금 예정일: 정산 람다가 매일 밤 채우는 이 지급을 보내는 날(고객사 입금 전이거나 계약 연결이 없으면 빈칸)
  dueManual?: boolean // 비고에 「송금 예정일 임의」: 사람이 임의로 정한 송금 예정일(인혁 261110)
}

// 은행 원장 bank_transactions.links 한 항목(계약 연결, 정산 람다가 씀). kind 공급가, 부가세는 회차 일부 입금이고
// kind 전액이나 없음은 노션 입금일로 이미 반영된 줄. ambiguous는 한 줄이 여러 계약 후보라 사람 판정 전(빼지 않음). at: 그 줄의 은행 입금일(YYYY-MM-DD)
export type BankLink = { db: string; code?: string; page: string; part?: string; kind?: string; amount?: number | null; ambiguous?: boolean; at?: string }

// daily: 통화별 날짜 → 원화 환율(fx.ts 일별 기준환율). 없으면 모든 날짜에 오늘 환율
export type Rates = { JPY: number; USD: number; CNY: number; at: string; source: string; daily?: Partial<Record<'JPY' | 'USD' | 'CNY', Record<string, number>>> }

// year null: 전체. upto: 연간일 때 이 달까지만(올해와 견주는 전년 같은 기간)
export type Period = { year: number | null; month: number | null; upto?: number | null }

const DONE = '송금 완료'
export const CLOSED = '종결' // 중복, 지급 아님 등 끝난 행(인혁 261106). 나가지 않을 돈이라 미지급금, 보류, 원가, 매출 몫에서 모두 뺌
// 원가 덜 붙음 판정(계약 단위, 261102 → 인혁 261112). 계약 DB 「예상 원가(원)」가 있으면 지급 합계가 그 90% 미만,
// 없으면 마진율이 문턱 이상. 체험단(T)은 원래 마진이 높아 문턱을 따로 둠
// ponytail: 유형별 고정 문턱, 예상 원가 칸이 채워지면 그쪽이 우선
export const HIGH_MARGIN = 0.7
export const HIGH_MARGIN_TRIAL = 0.85
const EXPECTED_SLACK = 0.9 // 외화 지급의 환율 차이 여유
export const marginCap = (c: Contract) => (/^\d{4}-T-/.test(c.code) ? HIGH_MARGIN_TRIAL : HIGH_MARGIN)
// missing: 고객 입금이 다 끝나고 마지막 입금분 송금 회차도 지남(빠진 지급 행 확인 대상), pending: 아직 송금 신청 전일 수 있음
export type CostFlag = 'missing' | 'pending' | null
function costFlag(c: Contract, cost: number, rate: number | null, today: string): CostFlag {
  const low = c.expectedCost != null ? cost < c.expectedCost * EXPECTED_SLACK : rate != null && rate >= marginCap(c)
  if (!low) return null
  const last = recognitions(c, today).map((x) => x.date).filter((d): d is string => !!d).sort().at(-1)
  return paidUp(c, today) && last && cyclePayday(last) < today ? 'missing' : 'pending'
}
const IN_FLIGHT = ['송금 가능', '모인 접수', '원화 이체 대기']

export function rateOf(c: Currency | null, r: Rates): number | null {
  if (c === 'KRW') return 1
  if (c === 'JPY' || c === 'USD' || c === 'CNY') return r[c]
  return null
}

/** 그날 환율. 주말, 휴일은 앞선 7일 안의 가장 가까운 날, 날짜가 없거나 일별 환율이 없으면 오늘 환율 */
export function rateOn(cur: 'JPY' | 'USD' | 'CNY', r: Rates, date?: string | null): number {
  const d = date ? r.daily?.[cur] : undefined
  if (d) for (let i = 0; i < 7; i++) {
    const v = d[new Date(Date.parse(date!) - i * 86_400_000).toISOString().slice(0, 10)]
    if (v) return v
  }
  return r[cur]
}

/** 계약 공급가 원화 환산. 원화 칸 우선, 없으면 엔화 칸 × 환율. 둘 다 없으면 null. date를 주면 그날 환율(입금일 환산) */
export function supplyKrw(c: Contract, r: Rates, date?: string | null): number | null {
  if (c.supplyKrw != null) return c.supplyKrw
  if (c.supplyJpy != null) return c.supplyJpy * rateOn('JPY', r, date)
  if (c.supplyUsd != null) return c.supplyUsd * rateOn('USD', r, date)
  return null
}

/** 입금된 몫은 입금일 환율, 입금 전 몫은 오늘 환율로 환산한 공급가 합(외화 계약의 매출, 마진용) */
export function realizedSupplyKrw(c: Contract, r: Rates, today: string): number | null {
  const recs = recognitions(c, today)
  if (supplyKrw(c, r) == null || !recs.length) return supplyKrw(c, r)
  return recs.reduce((a, x) => a + supplyKrw(c, r, x.date)! * x.share, 0)
}

/** 계약 통화: Contract DB 통화 칸, 없으면 채워진 공급가 칸(원 → KRW, 엔 → JPY, 달러 → USD) */
export function contractCurrency(c: Contract): Currency {
  return c.currency ?? (c.supplyKrw != null ? 'KRW' : c.supplyJpy != null ? 'JPY' : c.supplyUsd != null ? 'USD' : 'KRW')
}

export type ByCur = Partial<Record<Currency, number>>

/** 지급 원화 환산(공급가). 모인 원화 청구액이 있으면 그 값, 없으면 지급액 × 환율.
 * 원화 세금계산서 VAT 포함 행은 지급액에 부가세가 들어 있어 1.1로 나눔(부가세는 매입세액 공제로 돌려받아 원가 아님, Leo 261102) */
export function payoutKrw(p: Payout, r: Rates): number | null {
  if (p.krwBilled != null) return p.krwBilled
  if (vatIncluded(p)) return Math.round(p.amount! / 1.1)
  const rate = rateOf(p.currency, r)
  return p.amount != null && rate != null ? p.amount * rate : null
}

/** 줄 돈(미지급금, 부가세 포함 현금 의무, Leo 261105): 원화 세금계산서 VAT 포함은 지급액, VAT 별도는 지급액 + 부가세 10%(원 단위 반올림),
 * 나머지는 원화 환산 그대로(3.3% 원천세도 세무서로 나가는 돈이라 공제 전). 마진, 정산은 payoutKrw(공급가) */
export function grossPayoutKrw(p: Payout, r: Rates): number | null {
  if (vatIncluded(p)) return p.amount
  if (p.deduction === '세금계산서' && p.vat === '별도' && p.currency === 'KRW' && p.amount != null) return p.amount + Math.round(p.amount * 0.1)
  return payoutKrw(p, r)
}

/** 실제로 통장에서 나가는 금액(정산 설계 4절 실지급액): 원화 사업소득 3.3% 행은 공제액(지급액 × 0.033, 원 단위 반올림)을 뺌,
 * 원화 세금계산서 VAT 별도 행은 부가세(10%, 원 단위 반올림)를 더함(정산 람다 rules.net_pay와 같음), 나머지는 원화 환산 그대로.
 * 정산과 마진은 지급액(공급가)으로 셈: 부가세는 매입세액 공제로 돌려받아 비용이 아님 */
export function netPayoutKrw(p: Payout, r: Rates): number | null {
  if (p.deduction === '사업소득 3.3%' && p.currency === 'KRW' && p.amount != null) return p.amount - Math.round(p.amount * 0.033)
  if (p.deduction === '세금계산서' && p.vat === '별도' && p.currency === 'KRW' && p.amount != null) return p.amount + Math.round(p.amount * 0.1)
  if (vatIncluded(p)) return p.amount
  return payoutKrw(p, r)
}

const vatIncluded = (p: Payout) => p.deduction === '세금계산서' && p.vat === '포함' && p.currency === 'KRW' && p.amount != null

/** 금액 글에서 첫 금액(1,000 이상)을 읽음. 「판매수수료 15%」 같은 비율은 금액이 아니므로 null */
export function parseAmount(text: string): number | null {
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ''))
    if (n >= 1000) return n
  }
  return null
}

export type Recognition = { date: string | null; due: string | null; share: number; estimated: boolean; part: '선금' | '잔금' } // part: 은행 원장 links 회차 이름(정산 람다 installments와 같음)

/** 공급가를 입금 회차로 나눔. 날짜가 null 인 몫은 아직 받지 않은 돈, due 는 그 회차의 입금 예정일.
 * today 를 주면 오늘 뒤의 입금일은 아직 받지 않은 돈으로 보고 그 날을 예정일로 씀(입금일 칸에 예정일을 적는 경우, Leo 261012) */
export function recognitions(c: Contract, today?: string): Recognition[] {
  const rs = split(c)
  return today ? rs.map((x) => (x.date && x.date > today ? { ...x, date: null, due: x.date } : x)) : rs
}

/** 공급가 0원 계약(무상 진행 등): 받을 돈이 없어 수금 완료로 봄 */
const isFree = (c: Contract) => (c.supplyKrw ?? c.supplyJpy ?? c.supplyUsd) === 0

function split(c: Contract): Recognition[] {
  if (isFree(c)) return []
  if (c.method === '선금+잔금') {
    const pre = parseAmount(c.preText)
    const post = parseAmount(c.postText)
    const known = pre != null && post != null && pre + post > 0
    const preShare = known ? pre / (pre + post) : 0.5
    return [
      { date: c.preDate, due: c.preDue, share: preShare, estimated: !known, part: '선금' },
      { date: c.postDate, due: c.postDue, share: 1 - preShare, estimated: !known, part: '잔금' },
    ]
  }
  if (c.method === '선금 100%') return [{ date: c.preDate ?? c.postDate, due: c.preDue ?? c.postDue, share: 1, estimated: false, part: '선금' }]
  return [{ date: c.postDate ?? c.preDate, due: c.postDue ?? c.preDue, share: 1, estimated: false, part: '잔금' }]
}

/** 은행 원장 일부 입금 합: 「계약 page:회차:kind」 → 원. 사람 판정 필요(ambiguous), 금액 없는 항목, kind 전액이나 없음은 뺌 */
export function partialPaid(links: BankLink[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of links) {
    if (l.ambiguous || l.amount == null || (l.kind !== '공급가' && l.kind !== '부가세')) continue
    const k = `${l.page}:${l.part ?? ''}:${l.kind}`
    m.set(k, (m.get(k) ?? 0) + l.amount)
  }
  return m
}

/** partialPaid와 같은 줄을 은행 입금일과 함께: 「계약 page:회차:kind」 → [{at, amount}]. 입금일 없는 줄은 뺌(자금 캘린더 현금 표시용) */
export type DatedPaid = Map<string, { at: string; amount: number }[]>
export function partialDated(links: BankLink[]): DatedPaid {
  const m: DatedPaid = new Map()
  for (const l of links) {
    if (l.ambiguous || l.amount == null || !l.at || (l.kind !== '공급가' && l.kind !== '부가세')) continue
    const k = `${l.page}:${l.part ?? ''}:${l.kind}`
    m.set(k, [...(m.get(k) ?? []), { at: l.at, amount: l.amount }])
  }
  return m
}

const PARTS = ['선금', '잔금', '']
const sumPaid = (paid: Map<string, number>, page: string, parts: string[], kinds: string[]) =>
  parts.reduce((a, p) => a + kinds.reduce((b, k) => b + (paid.get(`${page}:${p}:${k}`) ?? 0), 0), 0)
// 은행 원장은 2025-01-02부터라 그 전 계약은 고객사 부가세 입금을 확인할 수 없음(Leo 261105): 부가세(고객사) 줄을 만들지 않음
const VAT_LEDGER_START = '2025-01-01'

/** 수출바우처 고객사 부가세: 부가세 칸(없으면 원화 공급가 10%)과 원장 부가세 입금 합. 바우처가 아니거나 원장 시작 전 계약은 null */
export function clientVat(c: Contract, paid: Map<string, number>): { vat: number; got: number } | null {
  if (!c.voucher) return null
  const d = contractDay(c)
  if (d && d < VAT_LEDGER_START) return null
  const vat = c.vatKrw ?? (contractCurrency(c) === 'KRW' && c.supplyKrw != null ? Math.round(c.supplyKrw * 0.1) : 0)
  return { vat, got: sumPaid(paid, c.id, PARTS, ['부가세']) }
}
export type Inflow = { date: string | null; due: string | null; krw: number; label?: string; noTotal?: boolean; part?: '선금' | '잔금' }

/** 계약에서 들어올(들어온) 현금, 부가세 포함(Leo 261105). 회차 금액은 합계 칸 × 몫(엔화 합계와 외화 공급가는 입금된 회차면 입금일 환율, 입금 전이면 오늘 환율), 합계가 비면 공급가(영세율, 해외).
 * 입금 전 회차는 은행 원장 일부 입금(공급가, 부가세)을 뺀 남은 금액, 입금일 있는 회차는 다 받은 것으로 봄. 한 회차 계약은 원장 회차 이름과 무관하게 뺌.
 * 수출바우처는 기관이 공급가만 내므로 회차는 공급가 × 몫(일부 입금은 공급가만 뺌). 고객사가 따로 내는 부가세 「부가세(고객사)」(clientVat)는
 * 이미 입금됐거나 정산일이 오늘 이전인 회차 몫만큼 지금 받을 돈(예정일: 지난 입금 전 회차 정산일, 없으면 마지막 입금 회차 입금일),
 * 나머지 몫은 다음 회차 정산일에 받을 돈. 원장 부가세 입금은 지금 몫에서 먼저 빼고 남으면 나머지 몫에서. 0원 이하는 뺌 */
export function inflows(c: Contract, r: Rates, today: string, paid: Map<string, number>, dated?: DatedPaid): Inflow[] {
  return c.twikr ? [] : cashIn(c, r, today, paid, dated) // 트위커 계좌로 받는 돈은 코리너스 통장에 들어오지 않음
}

/** 트위커 표시를 보지 않는 inflows. 미수 탭 「트위커 공급 계약 제외」 목록이 씀.
 * dated(자금 캘린더만 줌): 은행 원장 일부 입금을 그 은행 입금일의 들어온 돈 줄로 내고, 노션 입금일 있는 회차는 그만큼 뺀 나머지만 입금일에 둠
 * (공급가, 부가세를 다른 날 받은 회차가 부가세 들어온 날 하루에 합계 전액으로 찍히던 문제, 인혁 261113) */
function cashIn(c: Contract, r: Rates, today: string, paid: Map<string, number>, dated?: DatedPaid): Inflow[] {
  // 입금된 회차는 입금일 환율, 입금 전 회차(date null)는 오늘 환율(개요 매출과 같은 기준, 261113 감사)
  const baseOn = (d: string | null) => {
    const s = supplyKrw(c, r, d)
    const total = c.totalKrw ?? (c.totalJpy != null ? c.totalJpy * rateOn('JPY', r, d) : null)
    return c.voucher ? s : (total ?? s)
  }
  if (baseOn(null) == null) return []
  const got = (parts: string[], kinds: string[]) => sumPaid(paid, c.id, parts, kinds)
  const kinds = c.voucher ? ['공급가'] : ['공급가', '부가세']
  const recs = recognitions(c, today)
  const partsOf = (x: Recognition) => (recs.length === 1 ? PARTS : [x.part])
  // 입금일 있는 회차는 은행 입금일이 있어 따로 찍히는 일부 입금만 뺌(입금일 없는 옛 캐시 링크면 예전처럼 전액)
  const banked = (x: Recognition) => partsOf(x).reduce((a, p) => a + kinds.reduce((b, k) => b + (dated?.get(`${c.id}:${p}:${k}`) ?? []).reduce((s, y) => s + y.amount, 0), 0), 0)
  const out: Inflow[] = recs.map((x) => ({
    date: x.date,
    due: x.due,
    krw: baseOn(x.date)! * x.share - (x.date ? banked(x) : got(partsOf(x), kinds)),
    noTotal: !c.voucher && c.totalKrw == null && c.totalJpy == null,
    part: x.part,
  }))
  if (dated) {
    for (const x of recs) for (const p of partsOf(x)) for (const k of kinds) for (const b of dated.get(`${c.id}:${p}:${k}`) ?? []) out.push({ date: b.at, due: null, krw: b.amount, label: `은행 일부 입금(${k})`, part: x.part })
    if (c.voucher) for (const p of PARTS) for (const b of dated.get(`${c.id}:${p}:부가세`) ?? []) out.push({ date: b.at, due: null, krw: b.amount, label: '부가세(고객사) 입금' })
  }
  const cv = clientVat(c, paid)
  if (cv && cv.got <= cv.vat) {
    const early = (xs: (string | null)[]) => xs.filter((d): d is string => !!d).sort()[0] ?? null
    const unpaid = recs.filter((x) => !x.date)
    const nowShare = recs.filter((x) => x.date || (x.due && x.due <= today)).reduce((a, x) => a + x.share, 0)
    const now = cv.vat * nowShare - cv.got
    const later = cv.vat * (1 - nowShare) + Math.min(0, now)
    const lastPaid = recs.map((x) => x.date).filter((d): d is string => !!d).sort().pop() ?? null
    out.push({ date: null, due: early(unpaid.filter((x) => x.due && x.due <= today).map((x) => x.due)) ?? lastPaid, krw: now, label: '부가세(고객사)' })
    out.push({ date: null, due: early(unpaid.filter((x) => !x.due || x.due > today).map((x) => x.due)), krw: later, label: '부가세(고객사)' })
  }
  return out.filter((x) => x.krw > 0)
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
export type OpenItem = { c: Contract; due: string | null; krw: number; label?: string; part?: '선금' | '잔금' } // label: 수출바우처 「부가세(고객사)」 줄

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
  open: boolean // 아직 받지 않은 회차가 있음
  due: string | null // 받지 않은 회차 가운데 가장 이른 입금 예정일(정산일)
  overdue: number | null // 그 예정일이 오늘보다 앞이면 지난 날수
  costFlag: CostFlag
}

export type CreatorRow = {
  name: string // 같은 수취인 지급 가운데 가장 최근 이름
  key: string // 수취인 id, 없으면 이름
  aliases: string[] // 같은 수취인의 다른 이름
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
  estimated: number // 매출 몫 가운데 매출 단가 없이 지급 비율로 나눈 추정 몫(여러 명이 든 계약)
  shares: { c: Contract; share: number; paid: number; estimated: boolean; flag: CostFlag }[]
  lines: { p: Payout; c?: Contract; krw: number; share: number; cost: number; inP: boolean; why: string | null }[] // 상세 화면 표: 지급 행마다 매출 몫과 원가. inP는 정산 합계에 든 행, why는 몫이 없는 이유
  months: { month: string; revenue: number; paid: number; keys: string[] }[] // 기준(basis)에 따른 달별, keys: 안건(계약, 계약 없으면 지급 행), 기준과 무관하게 계약 기준일의 달
}

export type OwnerRow = { owner: string; count: number; supply: number; received: number; cost: number; margin: number; rate: number | null }

export type Gaps = {
  unsigned: number // 유니크코드가 없는 서명 전 계약(집계에서 뺌)
  noDeposit: number // 입금일이 하나도 없는 수입 계약
  noSupply: number
  noDay: number
  estimatedSplit: number
  unlinked: { count: number; krw: number } // 수입 계약이 없는 지급
  doneByReq: { count: number; krw: number } // 송금일 없이 송금 요청일(신청일)로 센 송금 완료(어림)
  doneNoDate: { count: number; krw: number } // 송금일, 송금 요청일이 모두 없는 송금 완료(정산에서 빠짐)
  fxNoBilled: number // 원화 청구액 없는 외화 송금 완료
  noRate: number // 통화나 금액이 없어 환산 못 한 지급
  overPriced: number // 매출 단가 합이 공급가를 넘어 단가 비율로 줄인 계약
  highMargin: { missing: number; pending: number } // 고른 기간 계약 중 원가 덜 붙음(costFlag) 건수
  dead: { count: number; krw: number } // 종결이거나 비고 맨 윗줄에 해제 금지가 적혀 마진, 매출 몫에서 뺀 지급(수입 계약 연결분, isDead)
  bankAmbiguous: number // 은행 원장에서 여러 계약 후보라 사람 판정이 필요한 연결(받을 돈에서 빼지 않음)
  bankOverpaidVat: number // 원장 부가세 입금이 계약 부가세보다 많은 수출바우처 계약(부가세 더 들어옴, 받을 돈 줄 없음)
}

export type Model = {
  summary: { revenue: number; revenueByCur: ByCur; receivable: number; settled: number; settledEst: number; payable: number; held: number; margin: number; marginRate: number | null; marginSupply: number; marginN: number; linkedRevenue: number }
  monthly: { month: string; revenue: number; settled: number; revenueByCur: ByCur }[] // revenueByCur: 매출을 계약 통화별로(원화 환산)
  contracts: ContractRow[]
  creators: CreatorRow[]
  owners: OwnerRow[]
  gaps: Gaps
  receivables: { buckets: Bucket[]; open: OpenItem[]; twikr: OpenItem[] } // twikr: 트위커 표시라 받을 돈에서 뺀 계약의 입금 전 회차(미수 탭 안내). 받을 돈(부가세 포함, 일부 입금 뺀 남은 금액) 만기 구간, 회차 목록(예정일 이른 순, 없는 것 뒤)
  payables: Bucket[] // 줄 돈 상태 묶음(부가세 포함, grossPayoutKrw)
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

/** 계약 담당자(정) 목록: 「,」와 「/」로 나누고 앞뒤 공백을 지워 중복 없이(「리카, 사야카」 = 「사야카/리카」), 비면 미지정.
 * 실명과 짧은 이름(마스다 리카, 리카)은 맞추지 않음(별칭 표는 확인 전, 인혁 261113) */
export const ownersOf = (c: Contract): string[] => {
  const xs = [...new Set(c.owner.split(/[,/]/).map((s) => s.trim()).filter(Boolean))]
  return xs.length ? xs : ['미지정']
}

/** 지급 기준일: 송금일, 없으면 송금 요청일, 없으면 연결 계약 기준일 */
/** 크리에이터 묶기 키: 수취인(계좌)이 같으면 이름이 달라도 한 사람 */
export const creatorKey = (p: Payout) => p.payeeId || p.name
// 크리에이터 대표 이름: 같은 키 지급 가운데 가장 최근(송금일, 없으면 요청일, 같으면 지급 ID 큰 것)의 이름. 재무와 정산 마스터가 같이 씀
const recency = (p: Payout) => (p.sentDate ?? p.reqDate ?? '') + String(p.pid ?? 0).padStart(6, '0')
export const latestName = (ps: Payout[]) => ps.reduce((a, p) => (recency(p) > recency(a) ? p : a)).name

export function payoutDay(p: Payout, byId: Map<string, Contract>): string | null {
  const c = p.contractId ? byId.get(p.contractId) : undefined
  return p.sentDate ?? p.reqDate ?? (c ? contractDay(c) : null)
}

// cash: 매출은 입금된 달, 정산은 송금한 달. contract: 둘 다 계약 기준일의 달(공급가 전액, 그 계약에 연결된 지급 가운데 종결, 해제 금지 보류를 뺀 것)
export type Basis = 'cash' | 'contract'

// 나가지 않을 보류: 비고 맨 윗줄(최신 판단)에 해제 금지 표시(중복 행, 반송 종결, 지급 아님). 마진 원가와 크리에이터 매출 몫에서 뺌(Leo 261102)
// 아랫줄은 옛 기록이라 보지 않고(#983), 「확인 전」 조건부 해제 금지는 이미 나갔을 수 있는 돈이라 원가에 둠(#955)
const DEAD = /보류 해제 금지|다시 보내지 말 것|지급 아님/
// 수입 계약 연결이 필요한 지급: 계약 아님, 종결, 2025 옛 시트 소급 등록(비고 첫 줄 「YYMMDD 소급 등록」, 확실한 것만 연결하고 나머지는 일부러 비워 둠, Leo 261113)은 뺌
export const needsLink = (p: Payout) => !p.contractId && !p.notContract && p.status !== CLOSED && !/^\d{6} 소급 등록/.test(p.note ?? '')

export const isDead = (p: Payout) => {
  const top = (p.note ?? '').split('\n')[0]
  return p.status === CLOSED || (p.status === '보류' && DEAD.test(top) && !top.includes('확인 전'))
}

export function buildModel(contracts: Contract[], payouts: Payout[], r: Rates, period: Period, today = new Date().toISOString().slice(0, 10), basis: Basis = 'cash', links: BankLink[] = []): Model {
  // 봇 계약은 서명 전에 유니크코드 없이 행을 만들고 서명완료 때 코드를 발급한다. 코드 없는 행은 아직 계약이 아니라 뺀다
  const unsigned = contracts.filter((c) => !c.code).length
  const dayById = new Map(contracts.map((c) => [c.id, c])) // 서명 전 계약 포함: 지급 기준일(payoutDay)에만 씀(서명 전 계약에 걸린 지급이 기간을 고르면 사라지던 문제, 261113 감사)
  contracts = contracts.filter((c) => c.code)
  const revenueContracts = contracts.filter((c) => !c.isExpense && !c.excluded)
  const byId = new Map(contracts.map((c) => [c.id, c]))
  const krw = (p: Payout) => payoutKrw(p, r) ?? 0
  const gross = (p: Payout) => grossPayoutKrw(p, r) ?? 0
  const paid = partialPaid(links)

  const payByContract = new Map<string, Payout[]>()
  for (const p of payouts) {
    if (!p.contractId) continue
    const list = payByContract.get(p.contractId) ?? []
    list.push(p)
    payByContract.set(p.contractId, list)
  }

  // 매출, 정산(기준에 따라 입금/송금된 달 또는 계약 기준일의 달, 공급가)과 받을 돈, 줄 돈(현재 잔액, 부가세 포함)
  const totals = { revenue: 0, settled: 0 }
  const revenueByCur: ByCur = {}
  let receivable = 0
  const open: OpenItem[] = []
  const twikr: OpenItem[] = []
  const monthly = new Map<string, { revenue: number; settled: number; revenueByCur: ByCur }>()
  const addCur = (o: ByCur, cur: Currency | undefined, v: number) => {
    if (cur) o[cur] = (o[cur] ?? 0) + v
  }
  const count = (date: string, key: 'revenue' | 'settled', v: number, cur?: Currency) => {
    if (inPeriod(date, period)) {
      totals[key] += v
      addCur(revenueByCur, cur, v)
    }
    if (period.year != null && !date.startsWith(String(period.year))) return
    const m = date.slice(0, 7)
    const row = monthly.get(m) ?? { revenue: 0, settled: 0, revenueByCur: {} }
    row[key] += v
    addCur(row.revenueByCur, cur, v)
    monthly.set(m, row)
  }
  // 매출 가운데 지급이 연결된 계약(계약 단위 마진을 셈하는 계약)의 몫. 마진 카드 「매출의 X%만 지급 연결」의 분자라 매출과 같은 기준으로 셈
  let linkedRevenue = 0
  for (const c of revenueContracts) {
    const s = supplyKrw(c, r)
    if (s == null) continue
    const cur = contractCurrency(c)
    const linked = c.source !== 'sheet' && (payByContract.get(c.id) ?? []).some((p) => !isDead(p))
    const add = (date: string, v: number) => {
      count(date, 'revenue', v, cur)
      if (linked && inPeriod(date, period)) linkedRevenue += v
    }
    for (const rec of recognitions(c, today)) if (rec.date && basis === 'cash') add(rec.date, supplyKrw(c, r, rec.date)! * rec.share)
    for (const x of inflows(c, r, today, paid)) {
      if (x.date) continue
      receivable += x.krw
      open.push({ c, due: x.due, krw: x.krw, label: x.label })
    }
    if (c.twikr) for (const x of cashIn(c, r, today, paid)) if (!x.date) twikr.push({ c, due: x.due, krw: x.krw, label: x.label, part: x.part })
    const d = contractDay(c)
    if (basis === 'contract' && d) add(d, supplyKrw(c, r, d)!)
  }

  let payable = 0
  let held = 0
  let settledEst = 0 // 현금 기준 정산 중 송금일이 없어 신청월로 센 몫
  for (const p of payouts) {
    // 보류는 미지급금에서 빼고 따로 셈(Leo 261029). 마진 원가에는 들어감(Leo 261102)
    if (p.status === '보류') held += gross(p)
    else if (p.status !== DONE && p.status !== CLOSED) payable += gross(p)
    if (basis === 'cash') {
      // 원화 송금은 모인 기록이 없어 송금일이 빈 행이 있음: 은행 송금일이 들어오기 전까지 송금 요청일(신청일)의 달로 어림(Leo 261011 A안)
      const d = p.status === DONE ? (p.sentDate ?? p.reqDate) : null
      if (d) {
        count(d, 'settled', krw(p))
        if (!p.sentDate && inPeriod(d, period)) settledEst += krw(p)
      }
    } else {
      // 마진 원가와 같은 기준: 매출 제외 계약, 종결, 해제 금지 보류는 뺌(261113 감사, 종결 28행이 정산에 들어가 있었음)
      const c = p.contractId ? byId.get(p.contractId) : undefined
      const d = c && !c.isExpense && !c.excluded && !isDead(p) ? contractDay(c) : null
      if (d) count(d, 'settled', krw(p))
    }
  }
  const { revenue, settled } = totals

  // 안건별 마진: 계약 기준일이 기간 안인 수입 계약. 원가 덜 붙음 표시는 기간 밖 계약도 크리에이터 몫에 쓰므로 전부 기록
  const flagOf = new Map<string, CostFlag>()
  const rows: ContractRow[] = revenueContracts
    .map((c) => {
      const supply = realizedSupplyKrw(c, r, today)
      const recs = recognitions(c, today)
      const ps = payByContract.get(c.id) ?? []
      // 보류도 원가(11/30로 밀림, 단건 송금 대기 등 결국 나갈 돈). 비고에 해제 금지가 적힌 보류(중복, 반송 종결)만 뺌(Leo 261102)
      const costPs = ps.filter((p) => !isDead(p))
      const cost = costPs.reduce((a, p) => a + krw(p), 0)
      const received = supply == null ? 0 : recs.filter((x) => x.date).reduce((a, x) => a + supplyKrw(c, r, x.date)! * x.share, 0)
      // 지급이 하나도 연결되지 않은 계약(시트 계약 포함)은 비용을 몰라 마진을 셈하지 않음(공급가 전액이 마진으로 부풀려짐, Leo 261012)
      const margin = supply == null || c.source === 'sheet' || !costPs.length ? null : supply - cost
      const unpaid = recs.filter((x) => !x.date)
      const due = unpaid.map((x) => x.due).filter((d): d is string => !!d).sort()[0] ?? null
      const late = due ? -daysFrom(today, due) : 0
      const rate = margin != null && supply ? margin / supply : null
      const flag = supply == null || c.source === 'sheet' ? null : costFlag(c, cost, rate, today)
      flagOf.set(c.id, flag)
      return {
        c,
        day: contractDay(c),
        supply,
        received,
        cost,
        margin,
        rate,
        costFlag: flag,
        payouts: ps,
        estimated: recs.some((x) => x.estimated),
        open: unpaid.length > 0,
        due,
        overdue: late > 0 ? late : null,
      }
    })
    .filter((x) => inPeriod(x.day, period))
    .sort((a, b) => (b.day ?? '').localeCompare(a.day ?? ''))

  const priced = rows.filter((x) => x.supply != null)
  const margined = priced.filter((x) => x.margin != null)
  const sumSupply = margined.reduce((a, x) => a + (x.supply ?? 0), 0)
  const sumMargin = margined.reduce((a, x) => a + (x.margin ?? 0), 0)

  // 크리에이터 매출 몫: 매출 단가가 있는 지급은 그 값(계약 통화 → 원화는 공급가 환산 비율), 남은 공급가는 단가 없는 지급끼리 지급액 비율로.
  // 지급 비율 배분은 한 계약의 참여자 전원에게 계약 마진율을 똑같이 매겨서, 여러 명이 든 계약이면 추정으로 표시(뉴믹스, Leo 261030)
  // 보류 지급도 몫을 받고 원가에 듦, 나가지 않을 보류(isDead)는 둘 다 빠짐(계약 마진과 같은 기준이라 크리에이터 마진 합 = 계약 마진). 매출 단가 합이 공급가를 넘으면 단가 비율로 줄여 공급가에 맞추고 점검에 셈
  const shareOf = new Map<string, { share: number; estimated: boolean }>()
  let overPriced = 0
  for (const [cid, all] of payByContract) {
    const c = byId.get(cid)
    const supply = c && !c.isExpense && !c.excluded ? realizedSupplyKrw(c, r, today) : null // 매출 제외 계약은 개요 매출처럼 몫도 없음
    if (!c || supply == null) continue
    const ps = all.filter((p) => !isDead(p))
    const face = c.supplyKrw ?? c.supplyJpy ?? c.supplyUsd ?? 0
    const toKrw = face ? supply / face : 0
    const priced = ps.filter((p) => p.price != null && face)
    const rest = ps.filter((p) => !(p.price != null && face))
    const pricedSum = priced.reduce((a, p) => a + p.price! * toKrw, 0)
    const scale = pricedSum > supply ? supply / pricedSum : 1
    if (scale < 1) overPriced += 1
    const left = Math.max(0, supply - pricedSum * scale)
    const total = rest.reduce((a, p) => a + krw(p), 0)
    const estimated = priced.length > 0 || new Set(rest.map((p) => p.name)).size > 1
    for (const p of priced) shareOf.set(p.id, { share: p.price! * toKrw * scale, estimated: false })
    for (const p of rest) shareOf.set(p.id, { share: total > 0 ? (left * krw(p)) / total : 0, estimated })
  }

  // 크리에이터: 정산(지급 행)은 지급 기준일이 기간 안인 지급. 매출 몫과 그 원가(마진 짝)는 현금 기준이면 고객사 입금 회차 가운데 기간 안에 든 공급가 비율만큼(지급일과 무관, 입금 전 몫은 빠짐, 개요 매출과 같은 기준, Leo 261111), 발생 기준이면 계약 기준일이 기간 안인 계약의 몫 전부(계약일 환율, 개요 발생 매출과 같은 기준, Leo 261111)
  // 크리에이터: 수취인으로 묶고 이름은 가장 최근 지급의 이름(기간과 무관하게 전체 지급 기준)
  const latest = new Map<string, Payout>()
  for (const p of payouts) {
    const k = creatorKey(p), o = latest.get(k)
    if (!o || recency(p) > recency(o)) latest.set(k, p)
  }
  const creators = new Map<string, CreatorRow>()
  for (const p of payouts) {
    if (p.status === CLOSED) continue // 종결(중복, 지급 아님)은 나가지 않을 돈이라 정산 합계, 건수, 미지급·보류에서도 뺌(261112, 중복 행이 정산에 두 번 잡힘)
    const day = payoutDay(p, dayById)
    const inP = inPeriod(day, period)
    const c = p.contractId ? byId.get(p.contractId) : undefined
    const so = c ? shareOf.get(p.id) : undefined
    const full = c && so ? realizedSupplyKrw(c, r, today) ?? 0 : 0
    const got = basis === 'cash' && full > 0 ? recognitions(c!, today).filter((x) => x.date && inPeriod(x.date, period)).map((x) => ({ date: x.date!, frac: (supplyKrw(c!, r, x.date)! * x.share) / full })) : []
    const cd = c ? contractDay(c) : null
    // frac: 원가(지급)를 기간에 넣는 비율, revMul: 매출 몫에 곱하는 값(발생은 입금일 환율로 나눈 몫을 계약일 환율로 다시 맞춤)
    const frac = basis === 'cash' ? got.reduce((a, x) => a + x.frac, 0) : so && cd && inPeriod(cd, period) ? 1 : 0
    const revMul = basis === 'contract' && frac && full > 0 ? supplyKrw(c!, r, cd)! / full : frac
    if (!inP && !frac) continue
    const k = creatorKey(p)
    const row: CreatorRow = creators.get(k) ?? {
      name: latest.get(k)!.name, key: k, aliases: [], currencies: [], revenue: 0, revenueCount: 0, paid: 0, paidCount: 0, linkedPaid: 0, estimated: 0,
      done: 0, inFlight: 0, held: 0, payouts: [], shares: [], lines: [], months: [],
    }
    const v = krw(p)
    if (inP) {
      row.paid += v
      row.paidCount += 1
      row.payouts.push(p)
      if (p.currency && !row.currencies.includes(p.currency)) row.currencies.push(p.currency)
      if (p.status === DONE) row.done += v
      else if (IN_FLIGHT.includes(p.status)) row.inFlight += v
      else row.held += v
    }
    const share = (so?.share ?? 0) * revMul
    const on = !!(c && so && frac)
    row.lines.push({ p, c, krw: v, share: on ? share : 0, cost: on ? v * frac : 0, inP, why: on || !c ? null : !so ? '제외' : basis === 'cash' && !recognitions(c, today).some((x) => x.date) ? '입금 전' : '기간 밖' })
    if (c && so && frac) {
      row.revenue += share
      row.linkedPaid += v * frac
      if (so.estimated) row.estimated += share
      const prev = row.shares.find((s) => s.c.id === c.id)
      if (prev) {
        prev.share += share
        prev.paid += v * frac
        prev.estimated ||= so.estimated
      } else {
        row.shares.push({ c, share, paid: v * frac, estimated: so.estimated, flag: flagOf.get(c.id) ?? null })
        row.revenueCount += 1
      }
    }
    // 월별: 발생은 매출 몫, 정산 모두 계약 기준일의 달(계약 없으면 지급 기준일). 현금은 매출 몫을 고객사 입금 회차의 달로 나누고, 정산은 송금 완료의 송금일(없으면 요청일) 달
    // 안건 수는 두 기준 모두 계약 기준일의 달(Leo 261028 「안건은 계약기준으로」), 기준 전환은 돈만 옮김
    const key = p.contractId ?? `p:${p.id}`
    const kd = (c && contractDay(c)) ?? day
    const put = (d: string | null | undefined, rev: number, paid: number) => {
      if (!d) return
      const ym = d.slice(0, 7)
      let mo = row.months.find((x) => x.month === ym)
      if (!mo) row.months.push((mo = { month: ym, revenue: 0, paid: 0, keys: [] }))
      if ((inP || frac) && d === kd && !mo.keys.includes(key)) mo.keys.push(key)
      mo.revenue += rev
      mo.paid += paid
    }
    if (basis === 'contract') put(kd, share, inP ? v : 0)
    else {
      if (inP) put(kd, 0, 0)
      if (inP && p.status === DONE) put(p.sentDate ?? p.reqDate, 0, v)
      if (so) for (const x of got) put(x.date, so.share * x.frac, 0)
    }
    if (p.name !== row.name && !row.aliases.includes(p.name)) row.aliases.push(p.name)
    creators.set(k, row)
  }
  for (const c of creators.values()) c.months.sort((a, b) => b.month.localeCompare(a.month))

  // 담당자별. 여러 명이 맡은 계약은 돈을 n분의 1씩, 건수는 각자 1건(인혁 261113). 담당자 줄 돈의 합 = 회사 합계
  const owners = new Map<string, OwnerRow>()
  const marginSupply = new Map<string, number>() // 마진율 분모: 마진을 셈한 계약 공급가만
  for (const x of priced) {
    const keys = ownersOf(x.c)
    const f = 1 / keys.length
    for (const key of keys) {
      const o = owners.get(key) ?? { owner: key, count: 0, supply: 0, received: 0, cost: 0, margin: 0, rate: null }
      o.count += 1
      o.supply += (x.supply ?? 0) * f
      o.received += x.received * f
      o.cost += x.cost * f
      o.margin += (x.margin ?? 0) * f
      const ms = (marginSupply.get(key) ?? 0) + (x.margin != null ? (x.supply ?? 0) * f : 0)
      marginSupply.set(key, ms)
      o.rate = ms ? o.margin / ms : null
      owners.set(key, o)
    }
  }

  const unlinked = payouts.filter(needsLink)
  const doneByReq = payouts.filter((p) => p.status === DONE && !p.sentDate && p.reqDate)
  const doneNoDate = payouts.filter((p) => p.status === DONE && !p.sentDate && !p.reqDate)
  const deadPs = payouts.filter((p) => p.contractId && isDead(p))
  const gaps: Gaps = {
    unsigned,
    noDeposit: revenueContracts.filter((c) => !c.preDate && !c.postDate && !isFree(c)).length,
    noSupply: revenueContracts.filter((c) => supplyKrw(c, r) == null).length,
    noDay: revenueContracts.filter((c) => !contractDay(c)).length,
    estimatedSplit: revenueContracts.filter((c) => recognitions(c).some((x) => x.estimated)).length,
    unlinked: { count: unlinked.length, krw: unlinked.reduce((a, p) => a + krw(p), 0) },
    doneByReq: { count: doneByReq.length, krw: doneByReq.reduce((a, p) => a + krw(p), 0) },
    doneNoDate: { count: doneNoDate.length, krw: doneNoDate.reduce((a, p) => a + krw(p), 0) },
    fxNoBilled: payouts.filter((p) => p.status === DONE && p.currency && p.currency !== 'KRW' && p.krwBilled == null).length,
    noRate: payouts.filter((p) => payoutKrw(p, r) == null).length,
    overPriced,
    highMargin: { missing: rows.filter((x) => x.costFlag === 'missing').length, pending: rows.filter((x) => x.costFlag === 'pending').length },
    dead: { count: deadPs.length, krw: deadPs.reduce((a, p) => a + krw(p), 0) },
    bankAmbiguous: links.filter((l) => l.ambiguous).length,
    bankOverpaidVat: revenueContracts.filter((c) => { const v = clientVat(c, paid); return !!v && v.got > v.vat }).length,
  }

  open.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  twikr.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const groups: [string, (s: string) => boolean, boolean][] = [
    ['대기', (s) => s === '대기', false],
    ['송금 진행 중', (s) => IN_FLIGHT.includes(s), false],
    ['보류', (s) => s === '보류', true],
    ['기타 상태', (s) => s !== '대기' && s !== '보류' && !IN_FLIGHT.includes(s), false],
  ]
  const pending = payouts.filter((p) => p.status !== DONE && p.status !== CLOSED)
  const payables = groups
    .map(([label, hit, alert]) => {
      const xs = pending.filter((p) => hit(p.status))
      return { label, alert, count: xs.length, krw: xs.reduce((a, p) => a + gross(p), 0) }
    })
    .filter((b) => b.count > 0 || b.label !== '기타 상태')

  return {
    summary: { revenue, revenueByCur, receivable, settled, settledEst, payable, held, margin: sumMargin, marginRate: sumSupply ? sumMargin / sumSupply : null, marginSupply: sumSupply, marginN: margined.length, linkedRevenue },
    monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    contracts: rows,
    creators: [...creators.values()].sort((a, b) => b.revenue - a.revenue || b.paid - a.paid),
    owners: [...owners.values()].sort((a, b) => b.supply - a.supply),
    gaps,
    receivables: { buckets: agingBuckets(open, today), open, twikr },
    payables,
  }
}

export const monthEnd = (d: string) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0)).toISOString().slice(0, 10)
/** 토요일이면 금요일, 일요일이면 금요일로. 공휴일은 안 봄 */
export const weekdayBack = (d: string) => {
  const t = Date.parse(d)
  const w = new Date(t).getUTCDay()
  return w === 6 || w === 0 ? new Date(t - (w === 6 ? 1 : 2) * DAY).toISOString().slice(0, 10) : d
}

/** d에서 평일 n일 앞(정산 람다 handler.weekdays_before와 같은 규칙). 공휴일은 안 봄 */
export const weekdaysBefore = (d: string, n: number) => {
  let t = Date.parse(d)
  while (n) {
    t -= DAY
    const w = new Date(t).getUTCDay()
    if (w !== 0 && w !== 6) n--
  }
  return new Date(t).toISOString().slice(0, 10)
}

// 정기 회차(정산 handler.py): 송금일은 그 달 마지막 평일, 묶음은 송금일 3평일 전에 만듦. 공휴일은 안 봄
export const payday = (ym: string) => weekdayBack(monthEnd(`${ym}-01`))
export const bundleDay = (ym: string) => weekdaysBefore(payday(ym), 3)
export const addMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}
/** d에 송금 가능이 된 행의 송금일: 그 달 묶음 생성일 전이면 그 달 송금일, 아니면 다음 달 송금일 */
const cyclePayday = (d: string) => payday(d < bundleDay(d.slice(0, 7)) ? d.slice(0, 7) : addMonth(d.slice(0, 7), 1))

const paidUp = (c: Contract, today: string) => {
  const rs = recognitions(c, today)
  return rs.length > 0 && rs.every((x) => x.date)
}

/** 지급 예정일. 정산 마스터와 자금 캘린더가 같이 씀(설계 261028-설계-크리에이터-정산포털 「날짜 규칙」, Leo 261029 통일).
 * 송금 완료: 송금일. 모인 접수, 원화 이체 대기: 요청일(없으면 오늘) 달의 송금일. 송금 가능: 오늘 기준 회차 송금일. 보류: 없음
 * 대기는 정산 마스터에선 미정이고, 자금 캘린더용으로 고객사 입금이 끝났으면 오늘 기준 회차 송금일, 입금 전이면 노션 규칙(입금 다음 달 마지막 평일)대로
 * max(첫 미입금 회차 정산일, 오늘)이 든 달의 다음 달 송금일(인혁 261110)
 * 노션 「송금 예정일」(dueOn)이 있으면 송금 가능, 대기는 그 날을 그대로 씀. 모인 접수, 원화 이체 대기는 요청일 기록이 우선이고 임의 날짜(dueManual)만 따름(인혁 261110) */
export function payoutDue(p: Payout, byId: Map<string, Contract>, today: string): string | null {
  if (p.status === DONE) return p.sentDate
  // 요청일이 비면 오늘이 든 달의 송금일(정산 람다 portal.due와 같은 규칙, 261113 감사: 원화 이체 대기 6행이 어느 회차에도 안 나옴)
  if (p.status === '모인 접수' || p.status === '원화 이체 대기') return p.dueManual && p.dueOn ? p.dueOn : payday((p.reqDate ?? today).slice(0, 7))
  if (p.status !== '송금 가능' && p.status !== '대기') return null // 보류
  if (p.dueOn) return p.dueOn
  if (p.status === '송금 가능') return cyclePayday(today)
  const c = p.contractId ? byId.get(p.contractId) : undefined
  // 고객사 입금은 끝났는데 서류, 계좌로 대기인 행: 송금 가능과 같은 날(「서류·계좌 대기」, Leo 261026)
  if (c && paidUp(c, today)) return cyclePayday(today)
  const due = c ? (recognitions(c, today).find((x) => !x.date)?.due ?? null) : null
  return due ? payday(addMonth((due > today ? due : today).slice(0, 7), 1)) : null
}

// 나감 due: 송금 가능(고객사 입금 끝남), wait: 대기(고객사 입금 전, 계약 입금 예정일로 잡은 날짜)
export type CalItem = { kind: 'in' | 'out'; state: 'done' | 'flight' | 'due' | 'wait' | 'late' | 'guess' | 'unsigned' | 'docs'; date: string; krw: number; title: string; sub: string; code: string | null; contractId: string | null; notionId: string | null; pay?: { id: string; pid: number | null }; manual?: boolean; creator?: string } // notionId: 계약 노션 페이지(시트 행은 null), pay: 출금의 지급내역 노션 행, creator: 출금의 크리에이터 키(creatorKey)

/** 자금 캘린더: 그 달(YYYY-MM)의 들어온 돈, 들어올 돈(입금 예정일), 나간 돈, 나갈 돈(지급 예정일). 기간 필터와 무관하게 전체 행에서 고름.
 * 들어옴은 inflows(합계 칸, 부가세 포함, 영세율과 엔화는 공급가와 같음, 은행 원장 일부 입금은 그 은행 입금일에 따로, 회차 줄은 그만큼 뺀 남은 금액, 수출바우처는 기관 공급가와 고객사 부가세 줄).
 * 합계가 비면 공급가로 대신하고 표시. 나감은 실지급액(3.3% 공제 뒤, 세금계산서 VAT 별도는 부가세 더함). VAT 칸이 빈 세금계산서 행은 그대로 두고 표시 */
export function calendarMonth(contracts: Contract[], payouts: Payout[], r: Rates, ym: string, today: string, links: BankLink[] = []): CalItem[] {
  const signed = contracts.filter((c) => c.code)
  const byId = new Map(signed.map((c) => [c.id, c]))
  const out: CalItem[] = []
  const paid = partialPaid(links)
  const dated = partialDated(links)
  for (const c of contracts) {
    if (!c.code && !c.unsigned) continue
    if (c.isExpense || c.excluded) continue
    for (const x of inflows(c, r, today, paid, dated)) {
      const date = x.date ?? x.due
      if (!date?.startsWith(ym)) continue
      out.push({ kind: 'in', state: x.date ? 'done' : c.unsigned ? 'unsigned' : c.dueGuess ? 'guess' : date < today ? 'late' : 'due', date, krw: x.krw, title: c.brand || c.corp || c.code, sub: x.label ?? (x.noTotal ? '합계 없음(공급가)' : ''), code: c.code, contractId: c.id, notionId: c.source === 'sheet' ? null : c.id })
    }
  }
  for (const p of payouts) {
    const date = payoutDue(p, byId, today)
    if (!date?.startsWith(ym)) continue
    const c = p.contractId ? byId.get(p.contractId) : undefined
    // 모인 접수, 원화 이체 대기는 송금 요청일에 이미 나가는 중이라 지남으로 보지 않음
    const note = [p.dueManual && date === p.dueOn ? '송금 예정일 임의' : '', p.deduction === '세금계산서' && !p.vat ? '세금계산서(VAT 포함, 별도 미정)' : p.currency === 'KRW' && !p.deduction ? '공제 유형 빈칸' : ''].filter(Boolean).join(', ')
    out.push({ kind: 'out', state: p.status === DONE ? 'done' : IN_FLIGHT.includes(p.status) && p.status !== '송금 가능' ? 'flight' : p.status === '대기' && c && paidUp(c, today) ? 'docs' : date < today ? 'late' : p.status === '대기' ? (c?.dueGuess ? 'guess' : 'wait') : 'due', date, krw: netPayoutKrw(p, r) ?? 0, title: p.name, sub: note, code: c?.code ?? null, contractId: c?.id ?? null, notionId: c && c.source !== 'sheet' ? c.id : null, pay: { id: p.id, pid: p.pid }, manual: !!(p.dueManual && date === p.dueOn), creator: creatorKey(p) })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.krw - a.krw)
}

/** 자금 캘린더 잔고: 월초 0에서 그날까지 입금 − 출금 누적(통장 잔액 아님). 예정일 지남, 정산일 임의(입금, 출금), 서명 전 계약은 넣지 않음. [i]가 i+1일 */
export function dailyBalance(items: CalItem[], ym: string): number[] {
  const net: number[] = Array(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()).fill(0)
  for (const x of items) if (x.date.startsWith(ym) && !['late', 'guess', 'unsigned'].includes(x.state)) net[+x.date.slice(8) - 1] += x.kind === 'in' ? x.krw : -x.krw
  let b = 0
  return net.map((n) => (b += n))
}
