// 근태 시간 계산 점검: node app/admin/attendance/time.check.mjs
import assert from 'node:assert/strict'
import { addMonth, dayLabel, hm, thisMonth, view, worked } from './time.ts'

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
console.log('attendance time ok')
