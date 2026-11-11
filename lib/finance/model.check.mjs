// 집계 점검: node lib/finance/model.check.mjs
// 라이브 대조(노션 실제 조회, 집계만 출력): NODE_OPTIONS=--dns-result-order=ipv4first node lib/finance/model.check.mjs --live
//   env: NOTION_TOKEN, NOTION_CONTRACT_DS_ID=4eb8ad43-1870-40b7-af18-5c3a8e71a3e1(Contract DB), NOTION_PAYOUT_DS_ID=856f8275-6986-4e95-ac95-347227925bed(지급내역 DB)
import assert from 'node:assert/strict'
import { agingBuckets, buildModel, calendarMonth, dailyBalance, grossPayoutKrw, netPayoutKrw, parseAmount, payoutDue, payoutKrw, priorPeriod, recognitions } from './model.ts'
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
// 매출 통화별 나눔: 통화 칸이 USD면 공급가(원) 그대로 달러 몫으로, 통화 칸이 없으면 공급가 칸으로 판정
const mcur = buildModel([...contracts, { ...base, id: 'u', code: '2603-S-U-001', method: '잔금 100%', supplyKrw: 2000, currency: 'USD', postDate: '2026-03-02' }], [], R, { year: 2026, month: null })
assert.deepEqual(mcur.summary.revenueByCur, { KRW: 500, USD: 2000 })
assert.deepEqual(mcur.monthly.find((x) => x.month === '2026-03').revenueByCur, { USD: 2000 })
assert.equal(m.summary.receivable, 500 + 1000) // a 잔금 + b(엔화 100 × 10)
assert.equal(m.summary.settled, 300 + 70)
assert.equal(m.summary.settledEst, 0)
// 송금일 없는 송금 완료: 송금 요청일(신청일)이 있으면 그 달로 어림, 날짜가 하나도 없으면 빠짐
const me = buildModel(contracts, [...payouts, pay({ id: '7', name: 'W', amount: 40, reqDate: '2026-04-02' }), pay({ id: '8', name: 'V', amount: 9 })], R, { year: 2026, month: 4 })
assert.deepEqual([me.summary.settled, me.summary.settledEst, me.gaps.doneByReq.count, me.gaps.doneNoDate.count], [40, 40, 1, 1])
assert.equal(m.summary.payable, 500) // 보류 100은 held로만
assert.equal(m.summary.held, 100)
assert.equal(m.summary.held, 100)
assert.equal(m.contracts.length, 2) // 지출 계약 제외
assert.equal(m.summary.margin, (1000 - 300 - 100) + (1000 - 500)) // a의 보류 100도 원가(Leo 261102)
assert.deepEqual([m.summary.marginSupply, m.summary.marginN], [2000, 2]) // 마진 모수: 지급이 연결된 계약의 공급가와 건수
// 지급이 하나도 연결되지 않은 계약은 마진, 마진율에서 빠짐(공급가 전액이 마진이 되지 않게)
const mn = buildModel([...contracts, { ...base, id: 'n', code: '2601-S-N-001', method: '잔금 100%', supplyKrw: 5000, contractDate: '2026-01-03' }], payouts, R, { year: 2026, month: null })
assert.deepEqual([mn.summary.margin, mn.summary.marginRate, mn.contracts.find((x) => x.c.id === 'n').margin], [m.summary.margin, m.summary.marginRate, null])
// 보류 지급만 연결된 계약도 보류를 원가로 마진을 셈
assert.equal(buildModel([{ ...base, id: 'h', code: '2601-S-H-001', method: '잔금 100%', supplyKrw: 800, contractDate: '2026-01-04' }], [pay({ id: '9', name: 'Q', amount: 50, contractId: 'h', status: '보류' })], R, { year: 2026, month: null }).contracts[0].margin, 750)
const x = m.creators.find((c) => c.name === 'X')
assert.equal(x.revenue, 375) // a 공급가 1000 × 300/400 = 750 가운데 입금된 선금 몫 절반만(현금 기준, Leo 261111), 보류인 Y도 몫을 받음(Leo 261102)
assert.equal(x.estimated, 375) // a는 X, Y 두 명이라 지급 비율 배분은 추정
assert.equal(buildModel(contracts, payouts, R, { year: 2026, month: null }, undefined, 'contract').creators.find((c) => c.name === 'X').revenue, 750) // 발생 기준은 몫 전부
// 매출 단가: 단가 있는 지급은 그 값(엔화 계약은 공급가 환산 비율), 남은 공급가는 단가 없는 지급끼리 지급액 비율로 나누고 추정 표시
const kc = [
  { ...base, id: 'k', code: '2603-V-K-001', method: '잔금 100%', supplyKrw: 1000, contractDate: '2026-03-01', postDate: '2026-03-20' },
  { ...base, id: 'j', code: '2603-V-J-001', method: '잔금 100%', supplyKrw: null, supplyJpy: 100, contractDate: '2026-03-01', postDate: '2026-03-20' },
]
const mk = buildModel(kc, [
  pay({ id: 'k1', name: 'A', amount: 200, contractId: 'k', price: 600 }),
  pay({ id: 'k2', name: 'B', amount: 100, contractId: 'k' }),
  pay({ id: 'k3', name: 'C', amount: 100, contractId: 'k' }),
  pay({ id: 'j1', name: 'D', amount: 10, contractId: 'j', price: 30 }),
  pay({ id: 'j2', name: 'E', amount: 10, contractId: 'j' }),
], R, { year: 2026, month: null })
const cr = (n) => mk.creators.find((c) => c.name === n)
assert.deepEqual(['A', 'B', 'C', 'D', 'E'].map((n) => [cr(n).revenue, cr(n).estimated]), [[600, 0], [200, 200], [200, 200], [300, 0], [700, 700]])
assert.equal(mk.contracts.find((c) => c.c.id === 'k').margin, 1000 - 400) // 계약 마진은 그대로
// 한 사람만 든 계약은 지급 비율 배분이어도 추정이 아님(b는 Y 혼자)
assert.equal(buildModel(contracts, payouts, R, { year: 2026, month: null }, undefined, 'contract').creators.find((c) => c.name === 'Y').shares.find((s) => s.c.id === 'b').estimated, false) // b는 입금 전이라 발생 기준으로 봄
// 여러 명이 든 계약에 보류가 섞여도 크리에이터 마진 합 = 계약 마진(보류도 몫을 받고 원가에 듦, Leo 261102)
{
  const cs = [{ ...base, id: 'h2', code: '2604-S-H-002', method: '잔금 100%', supplyKrw: 1000, contractDate: '2026-04-01', postDate: '2026-04-20' }]
  const mh = buildModel(cs, [
    pay({ id: 'h1', name: 'A', amount: 200, contractId: 'h2' }),
    pay({ id: 'h2', name: 'B', amount: 100, contractId: 'h2' }),
    pay({ id: 'h3', name: 'C', amount: 300, contractId: 'h2', status: '보류' }),
    pay({ id: 'h4', name: 'D', amount: 400, contractId: 'h2', status: '보류', note: '261028 Leo: 중복 행, 보류 해제 금지. 같은 건은 #h1' }),
  ], R, { year: 2026, month: null })
  const cm = mh.creators.reduce((a, c) => a + c.shares.reduce((b, s) => b + s.share - s.paid, 0), 0)
  assert.equal(mh.contracts[0].margin, 1000 - 600)
  assert.equal(Math.round(cm), mh.contracts[0].margin)
  assert.equal(mh.creators.find((c) => c.name === 'C').revenue, 500) // 1000 × 300/600
  assert.equal(mh.creators.find((c) => c.name === 'D').revenue, 0) // 해제 금지 보류는 몫도 원가도 없음
  assert.deepEqual(mh.gaps.dead, { count: 1, krw: 400 })
  // 맨 윗줄만 봄: 옛 줄의 해제 금지(#983), 「확인 전」 조건부 해제 금지(#955)는 나갈 돈이라 원가
  const keep = [
    pay({ id: 'k1', name: 'E', amount: 100, contractId: 'h2', status: '보류', note: '261029 Leo: 11/30 정기 송금, 이 행으로 지급\n261028 Leo: 중복 행으로 닫음, 보류 해제 금지' }),
    pay({ id: 'k2', name: 'F', amount: 100, contractId: 'h2', status: '보류', note: '261029 Leo: 언제 나갔는지 확인 전 보류 해제 금지' }),
  ]
  assert.equal(buildModel(cs, keep, R, { year: 2026, month: null }).contracts[0].margin, 1000 - 200)
  assert.equal(mh.creators.find((c) => c.name === 'C').held, 300) // 정산 쪽 상태별 합은 그대로
}
// 매출 단가 합이 공급가를 넘으면 단가 비율로 줄여 몫 합 = 공급가, 점검에 1건
{
  const cs = [{ ...base, id: 'o', code: '2604-S-O-001', method: '잔금 100%', supplyKrw: 1000, contractDate: '2026-04-01', postDate: '2026-04-20' }]
  const mo = buildModel(cs, [
    pay({ id: 'o1', name: 'A', amount: 100, contractId: 'o', price: 900 }),
    pay({ id: 'o2', name: 'B', amount: 100, contractId: 'o', price: 600 }),
    pay({ id: 'o3', name: 'C', amount: 100, contractId: 'o' }),
  ], R, { year: 2026, month: null })
  assert.deepEqual(['A', 'B', 'C'].map((n) => mo.creators.find((c) => c.name === n).revenue), [600, 400, 0])
  assert.equal(mo.gaps.overPriced, 1)
  assert.equal(m.gaps.overPriced, 0)
  assert.equal(mo.gaps.highMargin, 1) // 공급가 1000에 지급 300, 마진율 70%
  assert.equal(m.gaps.highMargin, 0)
}
const y = m.creators.find((c) => c.name === 'Y')
// 크리에이터 월별: 현금은 매출 몫을 입금 회차의 달, 정산은 송금 완료만 송금일 달. Y는 a 선금(1/10 입금) 몫 250 × 0.5만, 보류, 접수 지급은 정산에서 빠짐
// 안건 수는 현금에서도 계약 기준일의 달: Y의 b(2월 계약, 입금 전)는 돈 0인 2월 안건 1건, X의 a(1월 계약)는 송금이 2월이어도 1월에만 셈
assert.deepEqual(y.months.map((o) => [o.month, o.keys.length, o.revenue, o.paid]), [['2026-02', 1, 0, 0], ['2026-01', 1, 125, 0]])
assert.deepEqual(x.months.map((o) => [o.month, o.keys.length, o.revenue, o.paid]), [['2026-02', 0, 0, 300], ['2026-01', 1, 375, 0]])
// 발생은 계약 기준일의 달, 최근 달 먼저, 합계는 상세 화면 총계와 같음
const mcb = buildModel(contracts, payouts, R, { year: 2026, month: null }, undefined, 'contract')
assert.deepEqual(mcb.creators.find((c) => c.name === 'Y').months.map((o) => [o.month, o.keys.length]), [['2026-02', 1], ['2026-01', 1]])
for (const c of mcb.creators.filter((c) => c.name !== 'Z')) assert.deepEqual([c.months.reduce((a, o) => a + o.revenue, 0), c.months.reduce((a, o) => a + o.paid, 0)], [c.revenue, c.paid])
assert.equal(y.revenue, 125) // a 몫 250 가운데 입금된 선금 절반만, b(입금 전) 몫 1000은 빠짐
// 현금 기준: 매출 몫 합 = 개요 매출(입금된 계약이 모두 지급 연결일 때), 월별 합 = 총계
assert.equal(m.creators.reduce((a, c) => a + c.revenue, 0), m.summary.revenue)
for (const c of m.creators) assert.equal(c.months.reduce((a, o) => a + o.revenue, 0), c.revenue)
// 현금 기준 기간은 지급일이 아니라 입금일: 2025년 지급이라도 2026년 입금이면 2026년 몫, 2025년 입금은 2026년 지급이어도 빠짐. 정산은 지급일 그대로
{
  const cs = [
    { ...base, id: 'e1', code: '2512-S-E-001', method: '잔금 100%', supplyKrw: 1000, contractDate: '2025-12-01', postDate: '2026-01-15' },
    { ...base, id: 'e2', code: '2511-S-E-002', method: '잔금 100%', supplyKrw: 800, contractDate: '2025-11-01', postDate: '2025-12-15' },
    { ...base, id: 'e3', code: '2601-S-E-003', method: '잔금 100%', supplyKrw: 600, contractDate: '2026-01-01', postDate: '2026-01-20', excluded: true },
  ]
  const ps = [
    pay({ id: 'e1p', name: 'P', amount: 400, contractId: 'e1', sentDate: '2025-12-20' }),
    pay({ id: 'e2p', name: 'P', amount: 300, contractId: 'e2', sentDate: '2026-01-05' }),
    pay({ id: 'e3p', name: 'Q', amount: 200, contractId: 'e3', sentDate: '2026-01-25' }),
  ]
  const me2 = buildModel(cs, ps, R, { year: 2026, month: null })
  const pr = me2.creators.find((c) => c.name === 'P')
  assert.deepEqual([pr.revenue, pr.revenueCount, pr.linkedPaid, pr.paid, pr.paidCount], [1000, 1, 400, 300, 1])
  assert.equal(me2.creators.find((c) => c.name === 'Q').revenue, 0) // 매출 제외 계약은 몫 없음(정산은 남음)
  assert.equal(me2.creators.reduce((a, c) => a + c.revenue, 0), me2.summary.revenue)
  // 발생 기준은 계약 기준일로: e1, e2(2025년 계약)는 2026년 지급이어도 빠지고, 2025년에 미리 보낸 e4(2026년 계약, 입금 전)는 들어감. 정산은 지급일 그대로
  const cs4 = [...cs, { ...base, id: 'e4', code: '2602-S-E-004', method: '잔금 100%', supplyKrw: 500, contractDate: '2026-02-01' }]
  const mc2 = buildModel(cs4, [...ps, pay({ id: 'e4p', name: 'P', amount: 100, contractId: 'e4', sentDate: '2025-12-28' })], R, { year: 2026, month: null }, undefined, 'contract')
  const pc = mc2.creators.find((c) => c.name === 'P')
  assert.deepEqual([pc.revenue, pc.revenueCount, pc.linkedPaid, pc.paid], [500, 1, 100, 300])
  assert.equal(mc2.creators.reduce((a, c) => a + c.revenue, 0), mc2.summary.revenue)
  assert.deepEqual([pc.months.reduce((a, o) => a + o.revenue, 0), pc.months.reduce((a, o) => a + o.paid, 0)], [pc.revenue, pc.paid])
}
assert.equal(y.held, 100)
assert.equal(y.inFlight, 500)
assert.equal(m.gaps.unlinked.count, 1)
assert.equal(buildModel(contracts, [...payouts, pay({ notContract: true })], R, { year: 2026, month: null }).gaps.unlinked.count, 1) // 계약 아님 표시 행은 빼고 셈
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
// 비고 「공급자 트위커」 계약: 받을 돈, 캘린더 들어옴 0(트위커 계좌로 받음). 매출은 그대로, 일반 계약은 그대로
const tw = { ...contracts[1], id: 't', postDue: '2026-03-01', twikr: true }
const mt = buildModel([tw, { ...contracts[1], postDue: '2026-03-01' }], [], R, { year: 2026, month: null }, '2026-10-10')
assert.deepEqual(mt.receivables.open.map((o) => [o.c.id, o.krw]), [['b', 1000]])
assert.equal(mt.summary.receivable, 1000)
assert.equal(calendarMonth([tw], [], R, '2026-03', '2026-10-10').length, 0)
// 미수 탭 안내 목록: 트위커 미입금 회차만 금액이 잡힘(받을 돈은 그대로), 입금 끝난 트위커 계약과 일반 계약은 없음
const mtl = buildModel([tw, { ...tw, id: 't2', postDate: '2026-04-01' }, { ...contracts[1], postDue: '2026-03-01' }], [], R, { year: 2026, month: null }, '2026-10-10')
assert.equal(mtl.summary.receivable, 1000)
assert.deepEqual(mtl.receivables.twikr.map((o) => [o.c.id, o.krw, o.part, o.due]), [['t', 1000, '잔금', '2026-03-01']])
assert.equal(buildModel([{ ...contracts[0], twikr: true }], [], R, { year: 2026, month: null }).summary.revenue, buildModel([contracts[0]], [], R, { year: 2026, month: null }).summary.revenue)
// 줄 돈 상태: 송금 완료 뺀 나머지를 대기, 진행 중, 보류로
assert.deepEqual(m.payables.map((b) => [b.label, b.krw]), [['대기', 0], ['송금 진행 중', 500], ['보류', 100]])
// 계약 기준: 계약일의 달에 공급가 전액, 연결된 지급 전체(상태 무관). 연결 없는 지급은 빠짐. 받을 돈, 줄 돈은 같음
const mc = buildModel(contracts, payouts, R, { year: 2026, month: null }, '2026-10-10', 'contract')
assert.equal(mc.summary.revenue, 1000 + 1000)
assert.equal(mc.summary.settled, 300 + 100 + 500)
assert.equal(mc.summary.receivable, m.summary.receivable)
assert.equal(mc.summary.payable, m.summary.payable)
assert.deepEqual(mc.monthly.map((r) => [r.month, r.revenue, r.settled]), [['2026-01', 1000, 400], ['2026-02', 1000, 500]])
// 지급 예정일(정산 마스터와 같은 규칙): 송금일은 그 달 마지막 평일, 묶음 생성일(송금일 3평일 전) 이후면 다음 달. 대기(입금 전)는 max(계약 입금 예정일, 오늘)의 다음 달 송금일(노션 규칙, 인혁 261110)
const due = (d) => new Map([['c', { ...base, id: 'c', code: 'c', method: '잔금 100%', postDue: d }]])
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-10-20'), '2026-10-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-10-29'), '2026-10-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-10-30'), '2026-10-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-05-10'), '2026-05-01'), '2026-06-30')
assert.equal(payoutDue(pay({ status: '송금 가능' }), due(null), '2026-02-10'), '2026-02-27') // 2/28 토
assert.equal(payoutDue(pay({ status: '송금 가능' }), due(null), '2026-10-26'), '2026-10-30')
assert.equal(payoutDue(pay({ status: '송금 가능' }), due(null), '2026-10-27'), '2026-11-30') // 묶음 생성일 당일부터 다음 회차
assert.equal(payoutDue(pay({ status: '보류', contractId: 'c' }), due('2026-10-20'), '2026-10-10'), null)
// 송금 진행 중: 요청일 달의 송금일(비정기 요청도 같은 회차로)
assert.equal(payoutDue(pay({ status: '모인 접수', reqDate: '2026-10-27' }), due(null), '2026-10-27'), '2026-10-30')
assert.equal(payoutDue(pay({ status: '원화 이체 대기', reqDate: '2026-10-29' }), due(null), '2026-10-29'), '2026-10-30')
assert.equal(payoutDue(pay({ status: '모인 접수', reqDate: '2026-10-26' }), due(null), '2026-10-26'), '2026-10-30')
assert.equal(payoutDue(pay({ status: '모인 접수', reqDate: '2026-10-07' }), due(null), '2026-10-07'), '2026-10-30')
assert.equal(payoutDue(pay({ status: '모인 접수', reqDate: '2026-05-26' }), due(null), '2026-05-26'), '2026-05-29') // 5/31 일, 송금일 5/29 금, 3영업일 전 5/26 화
// 노션 송금 예정일(dueOn): 송금 가능, 대기는 그대로(지난 날이어도), 없으면 기존 계산. 송금 완료, 송금 접수 행은 기록 우선, 임의만 따름. 보류는 없음
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c', dueOn: '2026-12-31' }), due('2026-10-20'), '2026-10-10'), '2026-12-31')
assert.equal(payoutDue(pay({ status: '송금 가능', dueOn: '2026-09-30' }), due(null), '2026-10-10'), '2026-09-30')
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c', dueOn: null }), due('2026-10-20'), '2026-10-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-12-31'), '2026-11-10'), '2027-01-29') // 1/31 일
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c' }), due('2026-09-30'), '2026-11-10'), '2026-12-31') // 정산일 지난 미입금은 오늘 기준
assert.equal(payoutDue(pay({ status: '대기', contractId: 'c', dueOn: '2026-11-30' }), due('2026-09-30'), '2026-11-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '송금 가능', dueOn: null }), due(null), '2026-10-27'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '송금 완료', sentDate: '2026-10-30', dueOn: '2026-11-30', dueManual: true }), due(null), '2026-11-10'), '2026-10-30')
assert.equal(payoutDue(pay({ status: '모인 접수', reqDate: '2026-11-10', dueOn: '2026-09-30' }), due(null), '2026-11-10'), '2026-11-30')
assert.equal(payoutDue(pay({ status: '원화 이체 대기', reqDate: '2026-11-02', dueOn: '2026-11-15', dueManual: true }), due(null), '2026-11-10'), '2026-11-15')
assert.equal(payoutDue(pay({ status: '보류', dueOn: '2026-09-30' }), due(null), '2026-11-10'), null)
// 임의 날짜는 캘린더 출금 줄 설명에 「송금 예정일 임의」
const mc2 = calendarMonth([], [pay({ id: '6', name: 'G', amount: 10, status: '송금 가능', deduction: '해외 송금', dueOn: '2026-11-15', dueManual: true }), pay({ id: '5', name: 'H', amount: 10, status: '송금 가능', deduction: '해외 송금', dueOn: '2026-11-16' })], R, '2026-11', '2026-11-10')
assert.deepEqual(mc2.map((x) => [x.title, x.date, x.state, x.sub, x.manual]), [['G', '2026-11-15', 'due', '송금 예정일 임의', true], ['H', '2026-11-16', 'due', '', false]])
// 원화 이체 대기(flight)의 임의 날짜도 칸 「임의」 플래그(manual), 잔고에는 그대로 들어감
const mc3 = calendarMonth([], [pay({ id: 'k', name: 'K', amount: 10, status: '원화 이체 대기', deduction: '사업소득 3.3%', reqDate: '2026-11-02', dueOn: '2026-11-15', dueManual: true })], R, '2026-11', '2026-11-10')
assert.deepEqual(mc3.map((x) => [x.date, x.state, x.manual]), [['2026-11-15', 'flight', true]])
assert.equal(dailyBalance(mc3, '2026-11')[14], -(netPayoutKrw(pay({ amount: 10, deduction: '사업소득 3.3%' }), R) ?? 0))
// 캘린더: 입금된 회차는 입금일, 안 된 회차는 예정일(지났으면 late), 지급은 지급 예정일
// 지급은 송금 가능(고객사 입금 완료) due, 대기(고객사 입금 전) wait로 나눔
const cal = calendarMonth([{ ...contracts[0], postDue: '2026-01-20' }], [pay({ id: '9', name: 'W', amount: 40, status: '대기', contractId: 'a' }), pay({ id: '8', name: 'R', amount: 30, status: '송금 가능' })], R, '2026-01', '2026-01-15')
assert.deepEqual(cal.map((x) => [x.kind, x.state, x.date, x.krw]), [['in', 'done', '2026-01-10', 500], ['in', 'due', '2026-01-20', 500], ['out', 'due', '2026-01-30', 30]]) // 1/31 토
// 대기(입금 전) W는 입금 예정 1/20의 다음 달 송금일
assert.deepEqual(calendarMonth([{ ...contracts[0], postDue: '2026-01-20' }], [pay({ id: '9', name: 'W', amount: 40, status: '대기', contractId: 'a' })], R, '2026-02', '2026-01-15').map((x) => [x.kind, x.state, x.date, x.krw]), [['out', 'wait', '2026-02-27', 40]])
// 잔고: 월초 0, 날짜별 누적. 예정일 지남, 정산일 임의, 서명 전 계약은 빼고 1/31 토는 1/30 값 유지
const bal = dailyBalance([...cal, { kind: 'out', state: 'wait', date: '2026-01-30', krw: 40 }, { kind: 'in', state: 'late', date: '2026-01-05', krw: 999 }, { kind: 'in', state: 'unsigned', date: '2026-01-06', krw: 999 }, { kind: 'in', state: 'guess', date: '2026-01-07', krw: 999 }, { kind: 'out', state: 'guess', date: '2026-01-30', krw: 999 }], '2026-01')
assert.deepEqual([bal.length, bal[0], bal[9], bal[18], bal[19], bal[29], bal[30]], [31, 0, 500, 500, 1000, 930, 930])
// 비고 「정산일 임의」 계약: 입금 예정과 그 날짜를 따르는 대기 지급은 guess(지난 날짜여도)
const gs = calendarMonth([{ ...contracts[0], postDue: '2026-01-05', dueGuess: true }], [pay({ id: '9', name: 'W', amount: 40, status: '대기', contractId: 'a' })], R, '2026-01', '2026-01-15')
assert.deepEqual(gs.map((x) => [x.kind, x.state, x.date]), [['in', 'guess', '2026-01-05'], ['in', 'done', '2026-01-10']])
assert.deepEqual(calendarMonth([{ ...contracts[0], postDue: '2026-01-05', dueGuess: true }], [pay({ id: '9', name: 'W', amount: 40, status: '대기', contractId: 'a' })], R, '2026-02', '2026-01-15').map((x) => [x.kind, x.state, x.date]), [['out', 'guess', '2026-02-27']])
// 서명 전 계약(코드 없음)은 unsigned로 정산일에, 입금 끝난 계약의 대기 지급은 이번 달 말일 docs
const us = calendarMonth([{ ...contracts[0], id: 'u', code: '', unsigned: true, preDate: null, postDue: '2026-01-20' }, { ...contracts[0], id: 'd', postDate: '2026-01-12' }], [pay({ id: '7', name: 'D', amount: 20, status: '대기', contractId: 'd' })], R, '2026-01', '2026-01-15')
assert.deepEqual(us.map((x) => [x.kind, x.state, x.date]), [['in', 'done', '2026-01-10'], ['in', 'done', '2026-01-12'], ['in', 'unsigned', '2026-01-20'], ['out', 'docs', '2026-01-30']])
// 들어옴은 합계(부가세 포함) 우선, 엔화 합계는 환율
const ct = calendarMonth([{ ...contracts[0], totalKrw: 1100 }, { ...contracts[1], totalJpy: 100, postDue: '2026-01-25' }], [], R, '2026-01', '2026-01-15')
assert.deepEqual(ct.map((x) => [x.date, x.krw]), [['2026-01-10', 550], ['2026-01-25', 1000]])
// 실지급액: 원화 사업소득 3.3%만 공제(원 단위 반올림), 세금계산서와 외화는 그대로
assert.equal(netPayoutKrw(pay({ amount: 1000000, deduction: '사업소득 3.3%' }), R), 967000)
assert.equal(netPayoutKrw(pay({ amount: 123456, deduction: '사업소득 3.3%' }), R), 123456 - 4074)
assert.equal(netPayoutKrw(pay({ amount: 1100000, deduction: '세금계산서' }), R), 1100000)
assert.equal(netPayoutKrw(pay({ amount: 400000, deduction: '세금계산서', vat: '별도' }), R), 440000) // 플라이트 7/31 은행 출금 440,000원
assert.equal(netPayoutKrw(pay({ amount: 1100000, deduction: '세금계산서', vat: '포함' }), R), 1100000)
// 원가·정산은 공급가: VAT 포함 세금계산서는 1.1로 나눔, 별도는 지급액 그대로(지엠엘에스 #345 1,782,000 → 1,620,000)
assert.equal(payoutKrw(pay({ amount: 1782000, deduction: '세금계산서', vat: '포함' }), R), 1620000)
assert.equal(payoutKrw(pay({ amount: 400000, deduction: '세금계산서', vat: '별도' }), R), 400000)
assert.equal(netPayoutKrw(pay({ currency: 'JPY', amount: 100, deduction: '해외 송금', krwBilled: 950 }), R), 950)
const fl = calendarMonth([], [pay({ id: 'f', name: 'F', amount: 10, status: '모인 접수', reqDate: '2026-01-05' })], R, '2026-01', '2026-01-15')
assert.deepEqual(fl.map((x) => [x.state, x.date]), [['flight', '2026-01-30']]) // 요청일 1/5도 1월 회차 송금일
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
assert.equal(sheetContracts([H, ['2604-V-와이톤-001', '와이톤', 'Q', '진행 완료', '', '₩1,200,000', '', '', '', '', '2026. 5. 20']], []).contracts.length, 0) // 같은 계약으로 대조된 코드는 더하지 않음
// 서명 전 봇 계약(코드 없음)과 법인명이 같은 시트 행은 코드 유무와 무관하게 더하지 않음
const shU = sheetContracts([H,
  ['2610-S-주식회사 와이톤-001', '주식회사 와이톤', 'Maxim', '진행 중', '', '₩3,290,000', '', '', '', '', ''],
  ['', '(주)와이톤', 'Maxim', '진행 중', '', '₩1,000', '', '', '', '', ''],
  ['', '네오', 'N', '진행 중', '', '₩5,600,000', '', '', '', '', ''],
], [{ ...base, id: 'u', code: '', unsigned: true, corp: '주식회사 와이톤', supplyKrw: 4173400 }, { ...base, id: 'e', code: '', unsigned: true, corp: '' }])
assert.deepEqual([shU.contracts.map((c) => c.corp), shU.codeless], [['네오'], 1])
assert.equal(sh.codeless, 2)
assert.deepEqual(sh.contracts.map((c) => [c.id, c.code, c.supplyUsd ?? c.supplyKrw, c.method, c.postDate, c.source]), [
  ['sheet:2604-S-K-001', '2604-S-K-001', 1000, '잔금 100%', '2026-05-07', 'sheet'],
  ['sheet:2604-S-D-002', '2604-S-D-002', 1234000, '선금 100%', null, 'sheet'], // 중복 후보도 집계에 포함
  ['sheet-row:6', '시트 6', 300, '잔금 100%', '2026-06-01', 'sheet'], // 코드 없는 행
  ['sheet-row:7', 'TBD-V-레디영약국-001', 200, '선금 100%', null, 'sheet'], // 형식 다른 코드, status 빈칸
])
// DB 계약 입금일은 시트 정산일로 채우지 않음(입금일은 은행 확정 줄로만, Leo 261029)
assert.deepEqual([dbM.preDate, dbM.postDate, dbN.preDate, dbN.postDate], [null, null, '2026-09-01', null])
// 공급가(원, 엔) 둘 다 빈 DB 계약만 시트 계약 금액으로 채움. DB 공급가 있는 계약(dbM 100원)은 그대로, 시트에도 금액 없으면 계속 비어 공급가 없는 계약
assert.deepEqual([dbS.supplyJpy, dbS.supplyFrom, dbZ.supplyKrw, dbZ.supplyJpy, dbZ.supplyFrom, dbM.supplyKrw, dbM.supplyFrom, sh.supplyFrom], [100000, 'sheet', null, null, undefined, 100, undefined, ['2606-S-S-001']])
assert.equal(buildModel(sh.contracts.slice(0, 1), [], R, { year: 2026, month: 5 }).summary.revenue, 1000 * 1000) // 달러 × 환율
// 시트 계약은 지급 연결 전이라 마진, 마진율, 담당자 마진율에서 빠짐(매출, 담당자 공급가에는 듦)
const ms = buildModel([...contracts, { ...sh.contracts[0], contractDate: '2026-01-02' }], payouts, R, { year: 2026, month: null })
assert.deepEqual([ms.summary.margin, ms.summary.marginRate], [m.summary.margin, m.summary.marginRate])
// 오늘 뒤 입금일은 받을 돈(그 날이 예정일), 매출 아님
const futC = [{ ...base, id: 'f', code: '2610-S-F-001', method: '잔금 100%', supplyKrw: 700, postDate: '2026-10-30', contractDate: '2026-10-01' }]
const fut = buildModel(futC, [], R, { year: 2026, month: null }, '2026-10-12')
assert.deepEqual([fut.summary.revenue, fut.summary.receivable, fut.receivables.open[0].due], [0, 700, '2026-10-30'])
assert.equal(buildModel(futC, [], R, { year: 2026, month: null }, '2026-10-31').summary.revenue, 700) // 그 날이 지나면 매출
// 「매출 제외」 계약은 매출, 받을 돈에서 빠짐
assert.equal(buildModel([...futC, { ...futC[0], id: 'x', code: '2610-S-X-001', excluded: true }], [], R, { year: 2026, month: null }, '2026-10-12').summary.receivable, 700)
console.log('model check ok')

// 외화 공급가: 입금된 몫은 입금일 환율(일요일 3/8은 앞선 금요일 3/6), 입금 전 몫은 오늘 환율
const RD = { ...R, daily: { JPY: { '2026-03-06': 9 } } }
const jc = { ...base, id: 'j', code: '2603-S-J-001', method: '잔금 100%', supplyKrw: null, supplyJpy: 100, postDate: '2026-03-08', contractDate: '2026-03-01' }
assert.equal(buildModel([jc], [], RD, { year: 2026, month: null }, '2026-10-28').summary.revenue, 900)
assert.equal(buildModel([{ ...jc, postDate: null }], [], RD, { year: 2026, month: null }, '2026-10-28').summary.receivable, 1000)

if (process.argv.includes('--live')) {
  // source.ts는 Next 방식대로 './sheet'를 확장자 없이 부름: node에서 풀리도록 상대 경로에 .ts를 붙여 다시 찾음
  const { registerHooks } = await import('node:module')
  registerHooks({ resolve: (spec, ctx, next) => {
    try { return next(spec, ctx) } catch (e) { if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(`${spec}.ts`, ctx); throw e }
  } })
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

// 안건 표 입금 예정일, 초과 기간: 받지 않은 회차의 가장 이른 정산일과 오늘까지 지난 날수
{
  const cs = [
    { ...base, id: 'd1', code: '2609-S-D-001', method: '선금+잔금', supplyKrw: 100, preText: '50', postText: '50', preDate: '2026-09-01', postDue: '2026-10-08', contractDate: '2026-09-01' },
    { ...base, id: 'd2', code: '2609-S-D-002', method: '잔금 100%', supplyKrw: 100, postDate: '2026-09-20', postDue: '2026-09-10', contractDate: '2026-09-01' },
    { ...base, id: 'd3', code: '2609-S-D-003', method: '잔금 100%', supplyKrw: 100, contractDate: '2026-09-01' },
  ]
  const rs = Object.fromEntries(buildModel(cs, [], R, { year: 2026, month: null }, '2026-10-18').contracts.map((x) => [x.c.id, x]))
  assert.deepEqual([rs.d1.open, rs.d1.due, rs.d1.overdue], [true, '2026-10-08', 10])
  assert.deepEqual([rs.d2.open, rs.d2.due, rs.d2.overdue], [false, null, null])
  assert.deepEqual([rs.d3.open, rs.d3.due, rs.d3.overdue], [true, null, null])
}

// 공급가 0원 계약은 수금 완료로 봄: 받을 돈, 입금 예정일, 초과 기간, 입금일 없음 점검에서 빠짐
{
  const cs = [{ ...base, id: 'z', code: '2604-V-Z-001', method: '잔금 100%', supplyKrw: 0, postDue: '2026-05-31', contractDate: '2026-04-01' }]
  const mz = buildModel(cs, [], R, { year: 2026, month: null }, '2026-10-18')
  assert.deepEqual([mz.contracts[0].open, mz.contracts[0].due, mz.contracts[0].overdue], [false, null, null])
  assert.equal(mz.receivables.open.length, 0)
  assert.equal(mz.gaps.noDeposit, 0)
  assert.equal(calendarMonth(cs, [], R, '2026-05', '2026-10-18').length, 0)
}

// 같은 수취인(계좌)은 이름이 달라도 한 크리에이터, 이름은 가장 최근 지급의 이름(Leo 261102 UEDA FUKA = OKANO FUKA)
{
  const ps = [pay({ id: 'u1', pid: 366, name: 'UEDA FUKA', payeeId: 'acc', amount: 10, sentDate: '2026-03-31' }), pay({ id: 'o1', pid: 1155, name: 'OKANO FUKA', payeeId: 'acc', amount: 20, sentDate: '2026-04-22' }), pay({ id: 'n1', pid: 9, name: 'OKANO FUKA', amount: 5, sentDate: '2026-04-01' })]
  const mp = buildModel(contracts, ps, R, { year: 2026, month: null })
  const r = mp.creators.find((c) => c.key === 'acc')
  assert.deepEqual([r.name, r.aliases, r.paid, r.paidCount], ['OKANO FUKA', ['UEDA FUKA'], 30, 2])
  assert.equal(mp.creators.length, 2) // 수취인 없는 같은 이름 행은 이름 키로 따로
}

// 받을 돈, 줄 돈은 부가세 포함 현금, 입금 전 회차는 은행 원장 일부 입금을 뺌(Leo 261105). 매출, 마진, 정산은 공급가 그대로
{
  const L = (page, part, kind, amount, extra = {}) => ({ db: 'contract', page, part, kind, amount, ...extra })
  const T = '2026-11-05'
  const ri = { ...base, id: 'ri', code: '2609-O-리리더스-001', method: '잔금 100%', supplyKrw: 1000000, totalKrw: 1100000, postDue: '2026-10-02', contractDate: '2026-09-01' }
  const ga = { ...base, id: 'ga', code: '2608-V-가이아랩스-001', method: '잔금 100%', supplyKrw: 18000000, totalKrw: 19800000, postDue: '2026-09-30', contractDate: '2026-08-01' }
  const pl = { ...base, id: 'pl', code: '2610-S-PL-001', method: '잔금 100%', supplyKrw: 500000, totalKrw: 550000, postDue: '2026-11-30', contractDate: '2026-10-01' }
  const sp = { ...base, id: 'sp', code: '2610-S-SP-001', method: '선금+잔금', supplyKrw: 2000000, totalKrw: 2200000, preText: '1,000,000', postText: '1,000,000', postDue: '2026-12-31', contractDate: '2026-10-01' }
  const links = [
    L('ri', '잔금', '공급가', 1000000), L('ga', '잔금', '공급가', 18000000),
    L('sp', '선금', '공급가', 1000000), L('sp', '잔금', '부가세', 50000, { ambiguous: true }), { db: 'contract', page: 'sp', part: '잔금' }, L('sp', '잔금', '전액', 1100000),
  ]
  const mv = buildModel([ri, ga, pl, sp], [], R, { year: 2026, month: null }, T, 'cash', links)
  assert.deepEqual(mv.receivables.open.map((o) => [o.c.id, o.krw]), [['ga', 1800000], ['ri', 100000], ['pl', 550000], ['sp', 1100000], ['sp', 100000]]) // 예정일 없는 sp 선금이 뒤. 일반 회차는 합계 × 몫 − 일부 입금, 선금+잔금은 회차별로만
  assert.equal(mv.summary.receivable, 1800000 + 100000 + 550000 + 1200000)
  assert.equal(mv.gaps.bankAmbiguous, 1) // 사람 판정 필요는 빼지 않고 셈만
  // 매출, 마진은 원장과 무관(공급가)
  const m0 = buildModel([ri, ga, pl, sp], [], R, { year: 2026, month: null }, T, 'cash')
  assert.deepEqual([mv.summary.revenue, mv.summary.margin, mv.monthly], [m0.summary.revenue, m0.summary.margin, m0.monthly])
  assert.equal(m0.summary.receivable, 1100000 + 19800000 + 550000 + 2200000) // 원장 없으면 합계 전액
  // 다 낸 회차(일부 입금 합이 남은 금액 이상)는 받을 돈에서 빠짐
  assert.equal(buildModel([ri], [], R, { year: 2026, month: null }, T, 'cash', [L('ri', '잔금', '공급가', 1000000), L('ri', '잔금', '부가세', 100000)]).receivables.open.length, 0)
  // 수출바우처: 기관 회차는 공급가 × 몫, 고객사 부가세는 따로(부가세 칸 − 부가세 입금, 사람 판정 필요 제외), 예정일은 가장 이른 입금 전 회차
  const vo = { ...base, id: 'vo', code: '2608-O-이안에프엔씨-001', voucher: 'KOTRA', method: '선금+잔금', supplyKrw: 50000000, totalKrw: 55000000, vatKrw: 5000000, preText: '27,500,000원', postText: '27,500,000원', preDate: '2026-10-06', postDue: '2026-11-30', contractDate: '2026-08-01' }
  const vg = { ...base, id: 'vg', code: '2608-O-가나-001', voucher: '중진공', method: '잔금 100%', supplyKrw: 19650000, totalKrw: 21615000, postDue: '2026-12-31', contractDate: '2026-08-01' }
  const vl = [L('vo', '잔금', '부가세', 2500000), L('vo', '선금', '부가세', 1000000, { ambiguous: true })]
  const mvo = buildModel([vo, vg], [], R, { year: 2026, month: null }, T, 'cash', vl)
  assert.deepEqual(mvo.receivables.open.map((o) => [o.c.id, o.due, o.krw, o.label ?? '']), [
    ['vo', '2026-11-30', 25000000, ''], ['vo', '2026-11-30', 2500000, '부가세(고객사)'],
    ['vg', '2026-12-31', 19650000, ''], ['vg', '2026-12-31', 1965000, '부가세(고객사)'], // 부가세 칸이 비면 원화 공급가 10%
  ])
  assert.equal(mvo.gaps.bankAmbiguous, 1)
  assert.equal(mvo.summary.revenue, 25000000) // 매출은 공급가 그대로(이안 선금)
  assert.deepEqual(buildModel([vg], [], R, { year: 2026, month: null }, T, 'cash', [L('vg', '잔금', '부가세', 1965000)]).receivables.open.map((o) => o.krw), [19650000]) // 다 낸 부가세는 줄 없음
  // 고객사 부가세는 입금됐거나 정산일이 지난 회차 몫만 지금(예정일: 지난 입금 전 회차 정산일, 없으면 마지막 입금일), 나머지는 다음 회차 정산일
  const vat = (cs, ls = []) => buildModel(cs, [], R, { year: 2026, month: null }, T, 'cash', ls).receivables.open.filter((o) => o.label).map((o) => [o.c.id, o.due, o.krw])
  assert.deepEqual(vat([vo]), [['vo', '2026-10-06', 2500000], ['vo', '2026-11-30', 2500000]]) // 원장 입금 없음: 선금 몫은 선금 입금일로 지남
  assert.deepEqual(vat([vo], [L('vo', '선금', '부가세', 3000000)]), [['vo', '2026-11-30', 2000000]]) // 지금 몫을 넘는 입금은 나머지 몫에서
  assert.deepEqual(vat([{ ...vg, postDue: '2026-10-31' }]), [['vg', '2026-10-31', 1965000]]) // 정산일 지난 입금 전 회차
  assert.deepEqual(vat([{ ...vg, postDate: '2026-09-15' }]), [['vg', '2026-09-15', 1965000]]) // 기관 회차 다 받음: 마지막 입금일로 지남
  assert.deepEqual(vat([{ ...vg, contractDate: '2024-12-20' }]), []) // 원장 시작(2025-01-02) 전 계약은 줄 없음
  const mo = buildModel([vg], [], R, { year: 2026, month: null }, T, 'cash', [L('vg', '잔금', '부가세', 2000000)])
  assert.deepEqual([mo.receivables.open.filter((o) => o.label).length, mo.gaps.bankOverpaidVat], [0, 1]) // 부가세 더 들어옴
  assert.equal(mvo.gaps.bankOverpaidVat, 0)
  // 자금 캘린더: 들어올 돈은 같은 남은 금액, 바우처는 기관 공급가와 고객사 부가세 줄
  assert.deepEqual(calendarMonth([vo, vg], [], R, '2026-11', T, vl).map((x) => [x.state, x.date, x.krw, x.sub]), [['due', '2026-11-30', 25000000, ''], ['due', '2026-11-30', 2500000, '부가세(고객사)']])
  assert.deepEqual(calendarMonth([vo], [], R, '2026-10', T, vl).map((x) => [x.state, x.krw]), [['done', 25000000]]) // 기관 입금 회차는 공급가
  assert.deepEqual(calendarMonth([ri], [], R, '2026-10', T, links).map((x) => [x.state, x.krw]), [['late', 100000]])
  // 줄 돈(부가세 포함): 세금계산서 VAT 포함은 지급액, 별도는 + 10%, 3.3%는 공제 전, 보류도 같음. 마진, 정산은 공급가(payoutKrw)
  assert.deepEqual([
    grossPayoutKrw(pay({ amount: 1100000, deduction: '세금계산서', vat: '포함' }), R),
    grossPayoutKrw(pay({ amount: 400000, deduction: '세금계산서', vat: '별도' }), R),
    grossPayoutKrw(pay({ amount: 1000000, deduction: '사업소득 3.3%' }), R),
    grossPayoutKrw(pay({ currency: 'JPY', amount: 100, deduction: '해외 송금', krwBilled: 950 }), R),
  ], [1100000, 440000, 1000000, 950])
  const pc = { ...base, id: 'pc', code: '2610-S-PC-001', method: '잔금 100%', supplyKrw: 3000000, postDate: '2026-10-10', contractDate: '2026-10-01' }
  const mp = buildModel([pc], [
    pay({ id: 'v1', name: 'A', amount: 1100000, deduction: '세금계산서', vat: '포함', status: '대기', contractId: 'pc' }),
    pay({ id: 'v2', name: 'B', amount: 400000, deduction: '세금계산서', vat: '별도', status: '송금 가능', contractId: 'pc' }),
    pay({ id: 'v3', name: 'C', amount: 1000000, deduction: '사업소득 3.3%', status: '보류', contractId: 'pc' }),
    pay({ id: 'v4', name: 'D', amount: 200000, deduction: '세금계산서', vat: '별도', status: '보류', contractId: 'pc' }),
  ], R, { year: 2026, month: null }, T)
  assert.deepEqual([mp.summary.payable, mp.summary.held], [1100000 + 440000, 1000000 + 220000])
  assert.deepEqual(mp.payables.map((b) => [b.label, b.krw]), [['대기', 1100000], ['송금 진행 중', 440000], ['보류', 1220000]])
  assert.equal(mp.contracts[0].margin, 3000000 - (1000000 + 400000 + 1000000 + 200000)) // 원가는 공급가
  assert.equal(mp.summary.revenue, 3000000)
}
console.log('vat check ok')
// 종결(중복, 지급 아님)은 미지급금, 보류, 원가 어디에도 들지 않음(인혁 261106)
const mz = buildModel(contracts, [...payouts, pay({ id: 'c1', name: 'X', amount: 999, contractId: 'a', status: '종결' })], R, { year: 2026, month: null })
assert.deepEqual([mz.summary.payable, mz.summary.held, mz.summary.margin], [m.summary.payable, m.summary.held, m.summary.margin])
assert.ok(!mz.payables.some((b) => b.label === '기타 상태' && b.count))
