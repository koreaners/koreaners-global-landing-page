// 근태 시간 계산 점검: node app/admin/attendance/time.check.mjs
import assert from 'node:assert/strict'
import { absent, addMonth, dayLabel, hm, thisMonth, view, worked } from './time.ts'

assert.equal(worked(550), '8시간 10분') // 09:00~18:10, 휴게 1시간
assert.equal(worked(300), '4시간') // 5시간 머묾, 휴게 1시간
assert.equal(worked(299), '4시간 29분') // 휴게 30분
assert.equal(worked(270), '4시간') // 휴게 30분
assert.equal(worked(269), '4시간 29분') // 휴게 없음
assert.equal(worked(240), '4시간')
assert.equal(worked(20), '20분')
assert.equal(worked(0), '0분')

const row = (first_at, last_at, fix = {}) => ({ slack_id: 'U1', member_email: 'a@koreaners.com', workday: '2026-11-05', first_at, last_at, taps: 2, source: 'nfc', fix_first_at: null, fix_last_at: null, fix_by: null, fix_note: null, ...fix })
assert.deepEqual(view(row('2026-11-05T09:00:00+09:00', '2026-11-05T18:10:59+09:00')), { first: '2026-11-05T09:00:00+09:00', last: '2026-11-05T18:10:59+09:00', missing: false, worked: '8시간 10분', fixed: false })
assert.equal(view(row('2026-11-05T09:00:00+09:00', '2026-11-05T09:59:00+09:00')).missing, true) // 59분: 퇴근 누락
assert.equal(view(row('2026-11-05T09:00:00+09:00', '2026-11-05T10:00:00+09:00')).worked, '1시간') // 정확히 1시간은 누락 아님
const fixed = view(row('2026-11-05T09:00:00+09:00', '2026-11-05T09:00:00+09:00', { fix_last_at: '2026-11-05T18:00:00+09:00', fix_by: 'U9' }))
assert.equal(fixed.missing, false)
assert.equal(fixed.worked, '8시간')
assert.equal(fixed.fixed, true)

assert.equal(hm('2026-11-05T00:30:00Z'), '09:30')
assert.equal(hm('2026-11-05T15:00:00Z'), '00:00') // 24:00 아님
assert.equal(dayLabel('2026-11-05'), '11/05(목)')
assert.equal(thisMonth(Date.parse('2026-11-30T19:59:00Z')), '2026-11') // 12/1 04:59 KST는 아직 11월 근무일
assert.equal(thisMonth(Date.parse('2026-11-30T20:00:00Z')), '2026-12')
assert.equal(addMonth('2026-12', 1), '2027-01')
assert.equal(addMonth('2026-01', -1), '2025-12')
// 미출근: 11/09(월)~11/13(금) 근무, 11/14(토) 05:00 이후 시점. 11/06 은 ATT_FROM 전
const mem = (slack, extra = {}) => ({ slack, name: slack, email: `${slack}@koreaners.com`, joined: null, ...extra })
const members = [mem('A'), mem('B', { joined: '2026-11-12' }), mem('C', { email: 'C@Koreaners.com' }), mem('U0B0V3089LY')]
const att = [{ ...row('2026-11-09T09:00:00+09:00', '2026-11-09T18:00:00+09:00'), slack_id: 'A', workday: '2026-11-09' }]
const leaves = [
  { member_email: 'c@koreaners.com', type_code: 'annual', start_date: '2026-11-10', end_date: '2026-11-11' },
  { member_email: 'c@koreaners.com', type_code: 'annual_hour', start_date: '2026-11-12', end_date: '2026-11-12' },
]
const now = Date.parse('2026-11-13T20:30:00Z') // 11/14(토) 05:30 KST
const got = absent(members, att, leaves, '2026-11', now).map((x) => `${x.slack_id} ${x.workday.slice(8)}`)
assert.deepEqual(got.sort(), ['A 10', 'A 11', 'A 12', 'A 13', 'B 12', 'B 13', 'C 09', 'C 12', 'C 13'].sort())
// 진행 중인 근무일은 뺌: 11/13(금) 04:59 KST 는 아직 11/12 근무일이라 11/12 부터 제외
assert.ok(!absent(members, att, [], '2026-11', Date.parse('2026-11-12T19:59:00Z')).some((x) => x.workday >= '2026-11-12'))
assert.equal(absent(members, [], [], '2026-10', now).length, 0) // ATT_FROM 전 달
assert.equal(absent([mem('A')], [], [], '2026-12', Date.parse('2026-12-31T21:00:00Z')).some((x) => x.workday === '2026-12-25'), false) // 성탄절
assert.equal(absent([mem('A')], [], [], '2026-12', Date.parse('2026-12-31T21:00:00Z'))[0].workday, '2026-12-31')
console.log('attendance time ok')
