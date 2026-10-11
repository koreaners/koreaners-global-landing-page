// 집계 점검: node lib/finance/model.check.mjs
// 라이브 대조(노션 실제 조회, 집계만 출력): NODE_OPTIONS=--dns-result-order=ipv4first node lib/finance/model.check.mjs --live
import assert from 'node:assert/strict'
import { agingBuckets, buildModel, calendarMonth, netPayoutKrw, parseAmount, payoutDue, priorPeriod, recognitions } from './model.ts'
import { sheetContracts } from './sheet.ts'

const R = { JPY: 10, USD: 1000, CNY: 200, at: 't', source: 't' }
const base = { brand: '', corp: '', owner: '', isExpense: false, supplyJpy: null, preText: '', postText: '', preDate: null, postDate: null, preDue: null, postDue: null, contractDate: null, startDate: null, link: null }

assert.equal(parseAmount('₩ 2,970,000 (10% VAT 포함)'), 2970000)
assert.equal(parseAmount('판매수수료 15% (VAT포함, 집계 후 확정)'), null)
assert.deepEqual(recognitions({ ...base, method: '선금+잔금', preText: '1,000,000', postText: '3,000,000', preDate: '2026-01-05' }).map((x) => x.share), [0.25, 0.75])
assert.equal(recognitions({ ...base, method: '선금+잔금', preText: '50%', postText: '' })[0].estimated, true)

const contracts = [
  { ...base, id: 'a', code: '2601-S-A-001', owner: '담당A', method: '선금+잔금', supplyKrw: 1000, preText: '500', postText: '500', preDate: '2026-01-10', contractDate: '2026-01-01' },
  { ...base, id: 'b', code: '2602-S-B-001', method: '잔금 100%', supplyKrw: null, supplyJpy: 100, postDate: null, contractDate: '2026-02-01' },
  { ...base, id: 'p', code: 'P-2602-001', isExpense: true, method: null, supplyKrw: 999, contractDate: '2026-02-01' },
]
// 선금+잔금은 금액 글이 1,000 미만이라 반반 어림
const pay = (o) => ({ pid: 1, status: '송금 완료', currency: 'KRW', amount: 0, krwBilled: null, sentDate: null, reqDate: null, contractId: null, blocked: [], ...o })
const payouts = [
  pay({ id: '1', name: 'X', amount: 300, contractId: 'a', sentDate: '2026-02-03' }),
  pay({ id: '2', name: 'Y', amount: 100, contractId: 'a', status: '보류' }),
  pay({ id: '3', name: 'Y', currency: 'JPY', amount: 50, contractId: 'b', status: '모인 접수' }),
  pay({ id: '4', name: 'Z', amount: 70, sentDate: '2026-03-01' }),
]
const m = buildModel(contracts, payouts, R, { year: 2026, month: null })
assert.equal(m.summary.revenue, 500) // a 선금 몫만 입금
assert.equal(m.summary.receivable, 500 + 1000) // a 잔금 + b(엔화 100 × 10)
assert.equal(m.summary.settled, 300 + 70)
assert.equal(m.summary.payable, 100 + 500)
assert.equal(m.summary.held, 100)
assert.equal(m.contracts.length, 2) // 지출 계약 제외
assert.equal(m.summary.margin, (1000 - 400) + (1000 - 500))
const x = m.creators.find((c) => c.name === 'X')
assert.equal(x.revenue, 750) // a 공급가 1000 × 300/400
const y = m.creators.find((c) => c.name === 'Y')
assert.equal(y.revenue, 250 + 1000)
assert.equal(y.held, 100)
assert.equal(y.inFlight, 500)
assert.equal(m.gaps.unlinked.count, 1)
assert.equal(m.gaps.estimatedSplit, 1)
assert.deepEqual(m.monthly.map((r) => r.month), ['2026-01', '2026-02', '2026-03'])
assert.equal(buildModel(contracts, payouts, R, { year: 2026, month: 2 }).summary.settled, 300)
// 서명 전(유니크코드 없음) 계약과 거기 연결된 지급: 받을 돈, 안건, 마진, 크리에이터 매출 몫에서 빠짐
const u = { ...base, id: 'u', code: '', method: '잔금 100%', supplyKrw: 777, contractDate: '2026-02-01' }
const mu = buildModel([...contracts, u], [...payouts, pay({ id: '5', name: 'Y', amount: 10, contractId: 'u', status: '대기' })], R, { year: 2026, month: null })
assert.equal(mu.summary.receivable, m.summary.receivable)
assert.equal(mu.summary.margin, m.summary.margin)
assert.equal(mu.contracts.length, 2)
assert.equal(mu.creators.find((c) => c.name === 'Y').revenue, y.revenue)
assert.equal(mu.gaps.unsigned, 1)
// 견줄 기간: 월은 전월(1월은 전년 12월), 올해 연간은 전년 같은 달까지, 전체는 없음
assert.deepEqual(priorPeriod({ year: 2026, month: 1 }, '2026-10-10'), { year: 2025, month: 12 })
assert.deepEqual(priorPeriod({ year: 2026, month: null }, '2026-10-10'), { year: 2025, month: null, upto: 10 })
assert.equal(priorPeriod({ year: 2025, month: null }, '2026-10-10').upto, null)
assert.equal(priorPeriod({ year: null, month: null }, '2026-10-10'), null)
assert.equal(buildModel(contracts, payouts, R, { year: 2026, month: null, upto: 2 }).summary.settled, 300)
// 받을 돈 만기 구간: 예정일 기준, 없으면 「예정일 없음」
const ag = agingBuckets([{ due: '2026-08-01', krw: 5 }, { due: '2026-10-01', krw: 7 }, { due: '2026-10-20', krw: 11 }, { due: null, krw: 13 }], '2026-10-10')
assert.deepEqual(ag.map((b) => b.krw), [5, 0, 7, 11, 0, 13])
const dueModel = buildModel([{ ...contracts[1], postDue: '2026-03-01' }], [], R, { year: 2026, month: null }, '2026-10-10')
assert.equal(dueModel.receivables.buckets[0].krw, 1000) // b 엔화 100 × 10, 예정일 223일 지남
// 줄 돈 상태: 송금 완료 뺀 나머지를 대기, 진행 중, 보류로
assert.deepEqual(m.payables.map((b) => [b.label, b.krw]), [['대기', 0], ['송금 진행 중', 500], ['보류', 100]])
// 계약 기준: 계약일의 달에 공급가 전액, 연결된 지급 전체(상태 무관). 연결 없는 지급은 빠짐. 받을 돈, 줄 돈은 같음
const mc = buildModel(contracts, payouts, R, { year: 2026, month: null }, '2026-10-10', 'contract')
assert.equal(mc.summary.revenue, 1000 + 1000)
assert.equal(mc.summary.settled, 300 + 100 + 500)
assert.equal(mc.summary.receivable, m.summary.receivable)
assert.equal(mc.summary.payable, m.summary.payable)
assert.deepEqual(mc.monthly.map((r) => [r.month, r.revenue, r.settled]), [['2026-01', 1000, 400], ['2026-02', 1000, 500]])
// 지급 예정일: 대기는 수입 계약 입금 예정일이 든 달 말일, 말일 이틀 전보다 늦으면 다음 달 말일
const due = (d) => new Map([['c', { ...base, id: 'c', code: 'c', method: '잔금 100%', postDue: d }]])
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-10-20'), '2026-10-10'), '2026-10-31')
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-10-30'), '2026-10-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '송금 가능' }), due(null), '2026-02-10'), '2026-02-28')
assert.equal(payoutDue(pay({ status: '보류', contractId: 'c' }), due('2026-10-20'), '2026-10-10'), null)
// 캘린더: 입금된 회차는 입금일, 안 된 회차는 예정일(지났으면 late), 지급은 지급 예정일
const cal = calendarMonth([{ ...contracts[0], postDue: '2026-01-20' }], [pay({ id: '9', name: 'W', amount: 40, status: '대기', contractId: 'a' })], R, '2026-01', '2026-01-15')
assert.deepEqual(cal.map((x) => [x.kind, x.state, x.date, x.krw]), [['in', 'done', '2026-01-10', 500], ['in', 'due', '2026-01-20', 500], ['out', 'due', '2026-01-31', 40]])
// 들어옴은 합계(부가세 포함) 우선, 엔화 합계는 환율
const ct = calendarMonth([{ ...contracts[0], totalKrw: 1100 }, { ...contracts[1], totalJpy: 100, postDue: '2026-01-25' }], [], R, '2026-01', '2026-01-15')
assert.deepEqual(ct.map((x) => [x.date, x.krw]), [['2026-01-10', 550], ['2026-01-25', 1000]])
// 실지급액: 원화 사업소득 3.3%만 공제(원 단위 반올림), 세금계산서와 외화는 그대로
assert.equal(netPayoutKrw(pay({ amount: 1000000, deduction: '사업소득 3.3%' }), R), 967000)
assert.equal(netPayoutKrw(pay({ amount: 123456, deduction: '사업소득 3.3%' }), R), 123456 - 4074)
assert.equal(netPayoutKrw(pay({ amount: 1100000, deduction: '세금계산서' }), R), 1100000)
assert.equal(netPayoutKrw(pay({ currency: 'JPY', amount: 100, deduction: '해외 송금', krwBilled: 950 }), R), 950)
const fl = calendarMonth([], [pay({ id: 'f', name: 'F', amount: 10, status: '모인 접수', reqDate: '2026-01-05' })], R, '2026-01', '2026-01-15')
assert.deepEqual(fl.map((x) => [x.state, x.date]), [['flight', '2026-01-05']])
// 운영 대시보드 시트: 코드는 첫 칸(머리글 「F」), 진행 전·DB에 있는 코드는 빠짐. DB 고아 행과 법인명+금액이 같은 행은 중복 후보로 적되 집계에 포함
const H = ['F', '법인명', '브랜드명', '운영-status', '담당자-정', '계약 금액 / 원 (부가세X)', '계약 금액 / 엔 (부가세X)', '계약 금액 / USD (부가세X)', '계약일자', '선금 정산일', '잔금 정산일']
const dbM = { ...base, id: 'm', code: '2609-O-M-001', method: '선금+잔금', supplyKrw: 100 }
const dbN = { ...base, id: 'n', code: '2609-O-N-001', method: '선금+잔금', supplyKrw: 100, preDate: '2026-09-01' }
const dbS = { ...base, id: 's', code: '2606-S-S-001', method: '잔금 100%', supplyKrw: null, supplyJpy: null }
const dbZ = { ...base, id: 'z', code: '2607-O-Z-001', method: '잔금 100%', supplyKrw: null, supplyJpy: null }
const sh = sheetContracts([H,
  ['2604-S-K-001', '주식회사 케이', 'K', '진행 완료', '소희', '', '', '$1,000', '2026. 4. 1', '', '2026. 5. 7'],
  ['2604-S-W-001', 'W', 'W', '진행 전', '', '₩500', '', '', '', '', ''],
  ['2604-S-A-001', 'A', 'A', '진행 완료', '', '₩700', '', '', '', '', ''],
  ['2604-S-D-002', '(주) 디 랩', 'D', '진행 중', '', '\uFEFF₩1,234,000', '', '', '', '2026. 4. 2', ''],
  ['', '코드없음', 'E', '진행 완료', '', '₩300', '', '', '', '', '2026. 6. 1'],
  ['TBD-V-레디영약국-001', '레디', 'R', '', '', '₩200', '', '', '', '2026. 6. 2', ''],
  ['R123', 'DB에 있음', 'X', '진행 완료', '', '₩900', '', '', '', '', ''],
  ['', '드랍', 'Y', '드랍', '', '₩900', '', '', '', '', ''],
  ['2609-O-M-001', 'M', 'M', '진행 완료', '', '₩100', '', '', '', '2026. 9. 3', '2026. 9. 30'],
  ['2609-O-N-001', 'N', 'N', '진행 완료', '', '₩100', '', '', '', '2026. 9. 4', '2026. 9. 29'],
  ['2606-S-S-001', 'S', 'S', '진행 완료', '', '', '¥100,000', '', '', '', ''],
  ['2607-O-Z-001', 'Z', 'Z', '진행 완료', '', '', '', '', '', '', ''],
], [{ ...base, id: 'a', code: '2604-S-A-001', supplyKrw: 700 }, { ...base, id: 'd', code: '2604-S-D-001', corp: '디랩 주식회사', supplyKrw: 1234000 }, { ...base, id: 'r', code: 'R123', supplyKrw: 900 }, dbM, dbN, dbS, dbZ])
assert.deepEqual(sh.dups, ['2604-S-D-002'])
assert.equal(sh.codeless, 2)
assert.deepEqual(sh.contracts.map((c) => [c.id, c.code, c.supplyUsd ?? c.supplyKrw, c.method, c.postDate, c.source]), [
  ['sheet:2604-S-K-001', '2604-S-K-001', 1000, '잔금 100%', '2026-05-07', 'sheet'],
  ['sheet:2604-S-D-002', '2604-S-D-002', 1234000, '선금 100%', null, 'sheet'], // 중복 후보도 집계에 포함
  ['sheet-row:6', '시트 6', 300, '잔금 100%', '2026-06-01', 'sheet'], // 코드 없는 행
  ['sheet-row:7', 'TBD-V-레디영약국-001', 200, '선금 100%', null, 'sheet'], // 형식 다른 코드, status 빈칸
])
// 입금일 둘 다 없는 DB 계약만 같은 코드 시트 행의 정산일로 채움(DB 날짜는 덮지 않음)
assert.deepEqual([dbM.preDate, dbM.postDate, dbM.paidFrom], ['2026-09-03', '2026-09-30', 'sheet'])
assert.deepEqual([dbN.preDate, dbN.postDate, dbN.paidFrom], ['2026-09-01', null, undefined])
assert.deepEqual(sh.paidFrom, ['2609-O-M-001'])
// 공급가(원, 엔) 둘 다 빈 DB 계약만 시트 계약 금액으로 채움. DB 공급가 있는 계약(dbM 100원)은 그대로, 시트에도 금액 없으면 계속 비어 공급가 없는 계약
assert.deepEqual([dbS.supplyJpy, dbS.supplyFrom, dbZ.supplyKrw, dbZ.supplyJpy, dbZ.supplyFrom, dbM.supplyKrw, dbM.supplyFrom, sh.supplyFrom], [100000, 'sheet', null, null, undefined, 100, undefined, ['2606-S-S-001']])
assert.equal(buildModel(sh.contracts.slice(0, 1), [], R, { year: 2026, month: 5 }).summary.revenue, 1000 * 1000) // 달러 × 환율
// 시트 계약은 지급 연결 전이라 마진, 마진율, 담당자 마진율에서 빠짐(매출, 담당자 공급가에는 듦)
const ms = buildModel([...contracts, { ...sh.contracts[0], contractDate: '2026-01-02' }], payouts, R, { year: 2026, month: null })
assert.deepEqual([ms.summary.margin, ms.summary.marginRate], [m.summary.margin, m.summary.marginRate])
console.log('model check ok')

if (process.argv.includes('--live')) {
  const { loadFinance } = await import('./source.ts')
  const d = await loadFinance(process.env)
  const cnt = (xs, f) => xs.reduce((a, x) => ((a[f(x)] = (a[f(x)] ?? 0) + 1), a), {})
  console.log('contracts', d.contracts.length, 'expense', d.contracts.filter((c) => c.isExpense).length,
    'jpySupply', d.contracts.filter((c) => c.supplyJpy != null).length, 'methods', cnt(d.contracts, (c) => c.method))
  console.log('payouts', d.payouts.length, 'status', cnt(d.payouts, (p) => p.status),
    'noContract', d.payouts.filter((p) => !p.contractId).length, 'sentDate', d.payouts.filter((p) => p.sentDate).length)
  const live = buildModel(d.contracts, d.payouts, R, { year: 2026, month: null })
  console.log('gaps', JSON.stringify(live.gaps), 'contracts2026', live.contracts.length, 'creators2026', live.creators.length, 'owners', live.owners.length)
}
