// 집계 점검: node lib/finance/model.check.mjs
// 라이브 대조(노션 실제 조회, 집계만 출력): NODE_OPTIONS=--dns-result-order=ipv4first node lib/finance/model.check.mjs --live
import assert from 'node:assert/strict'
import { agingBuckets, buildModel, parseAmount, priorPeriod, recognitions } from './model.ts'

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
