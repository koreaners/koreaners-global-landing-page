// 근태 시간 계산 점검: node app/admin/attendance/time.check.mjs
import assert from 'node:assert/strict'
import { absent, editorOf, offDays, overlaps, ended, fixTimes, addMonth, dayLabel, hm, thisMonth, view, worked } from './time.ts'

assert.equal(worked(550), '8시간 10분') // 09:00~18:10, 휴게 1시간
assert.equal(worked(300), '4시간') // 5시간 머묾, 휴게 1시간
assert.equal(worked(299), '4시간 29분') // 휴게 30분
assert.equal(worked(270), '4시간') // 휴게 30분
assert.equal(worked(269), '4시간 29분') // 휴게 없음
assert.equal(worked(240), '4시간')
assert.equal(worked(20), '20분')
assert.equal(worked(0), '0분')

const row = (first_at, last_at, fix = {}) => ({ slack_id: 'U1', member_email: 'a@koreaners.com', workday: '2026-11-05', first_at, last_at, taps: 2, source: 'nfc', fix_first_at: null, fix_last_at: null, fix_by: null, fix_note: null, ...fix })
assert.deepEqual(view(row('2026-11-05T09:00:00+09:00', '2026-11-05T18:10:59+09:00')), { first: '2026-11-05T09:00:00+09:00', last: '2026-11-05T18:10:59+09:00', missing: false, noIn: false, open: false, worked: '8시간 10분', fixed: false })
// 퇴근 누락은 그날 자정이 지나야: 11/05 23:59 KST 는 근무 중, 11/06 00:00 KST 부터 누락
const solo = row('2026-11-05T09:00:00+09:00', '2026-11-05T09:00:00+09:00')
const at = (iso) => { const v = view(solo, Date.parse(iso)); return [v.missing, v.open] }
assert.deepEqual(at('2026-11-05T14:59:00Z'), [false, true])
assert.deepEqual(at('2026-11-05T15:00:00Z'), [true, false])
assert.equal(ended('2026-11-05', Date.parse('2026-11-05T14:59:59Z')), false)
assert.equal(ended('2026-11-05', Date.parse('2026-11-05T15:00:00Z')), true)
assert.equal(view(row('2026-11-05T09:00:00+09:00', '2026-11-05T09:59:00+09:00')).missing, true) // 59분: 퇴근 누락
assert.equal(view(row('2026-11-05T09:00:00+09:00', '2026-11-05T10:00:00+09:00')).worked, '1시간') // 정확히 1시간은 누락 아님
const fixed = view(row('2026-11-05T09:00:00+09:00', '2026-11-05T09:00:00+09:00', { fix_last_at: '2026-11-05T18:00:00+09:00', fix_by: 'U9' }))
assert.equal(fixed.missing, false)
assert.equal(fixed.worked, '8시간')
assert.equal(fixed.fixed, true)
// 16시 뒤 첫 탭: 출근 누락(바로), 마지막 탭이 퇴근. 15:59 는 출근. 정정하면 정정값(인혁 2026-11-16)
const late = view(row('2026-11-05T09:17:00.12345Z', '2026-11-05T09:34:00Z'), Date.parse('2026-11-05T10:00:00Z'))
assert.deepEqual([late.first, late.last, late.noIn, late.missing, late.open], [null, '2026-11-05T09:34:00Z', true, false, false])
assert.equal(view(row('2026-11-05T15:59:00+09:00', '2026-11-05T19:00:00+09:00')).noIn, false)
assert.equal(view(row('2026-11-06T00:30:00+09:00', '2026-11-06T00:30:00+09:00')).noIn, true) // 05:00 전 새벽도 같은 근무일
assert.equal(view(row('2026-11-05T20:12:00+09:00', '2026-11-05T20:12:00+09:00', { fix_first_at: '2026-11-05T09:00:00+09:00', fix_last_at: '2026-11-05T20:12:00+09:00', fix_by: 'U9' })).noIn, false)

assert.equal(hm('2026-11-05T00:30:00Z'), '09:30')
assert.equal(hm('2026-11-05T15:00:00Z'), '00:00') // 24:00 아님
assert.equal(dayLabel('2026-11-05'), '2026-11-05(목)')
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
// 휴가 칸: 시차는 시각(없으면 시간), 종일 휴가는 평일마다 종류 이름, 명단 밖 메일은 뺌(인혁 2026-11-18)
const offs = offDays(members, [
  { member_email: 'A@koreaners.com', type_code: 'annual_hour', start_date: '2026-11-16', end_date: '2026-11-16', days: 0.5, request_id: 7 },
  { member_email: 'b@koreaners.com', type_code: 'annual_hour', start_date: '2026-11-10', end_date: '2026-11-10', days: 0.25, request_id: null },
  { member_email: 'x@koreaners.com', type_code: 'annual_hour', start_date: '2026-11-10', end_date: '2026-11-10', days: 0.5 },
  { member_email: 'c@koreaners.com', type_code: 'comp_sub', start_date: '2026-11-13', end_date: '2026-11-16' },
], { 7: ['10:00', '15:00'] }, { comp_sub: '보상 휴가(대체)' }, '2026-11')
assert.deepEqual(Object.keys(offs).sort(), ['A 2026-11-16', 'B 2026-11-10', 'C 2026-11-13', 'C 2026-11-16']) // 주말 14, 15 빠짐
assert.deepEqual(offs['A 2026-11-16'], { label: '시차 10:00~15:00', minutes: 240, from: '10:00', to: '15:00', full: false })
assert.equal(offs['B 2026-11-10'].label, '시차 2시간')
assert.deepEqual(offs['C 2026-11-13'], { label: '보상 휴가(대체)', minutes: 480, from: null, to: null, full: true })
assert.equal(overlaps(offs['A 2026-11-16'], '14:00', '21:00'), true) // 건우 11/16: 14시 출근이 시차 안
assert.equal(overlaps(offs['A 2026-11-16'], '15:00', '20:00'), false)
assert.equal(overlaps({ ...offs['A 2026-11-16'], from: '16:00', to: '18:00' }, '09:00', '16:00'), false) // 보람
assert.equal(overlaps(offs['C 2026-11-13'], '09:00', '18:00'), true) // 종일 휴가에 출근
// 자정 전 날은 뺌: 11/12 23:59 KST 엔 11/12 제외, 11/13 00:00 KST 부터 포함
assert.ok(!absent(members, att, [], '2026-11', Date.parse('2026-11-12T14:59:00Z')).some((x) => x.workday >= '2026-11-12'))
assert.ok(absent(members, att, [], '2026-11', Date.parse('2026-11-12T15:00:00Z')).some((x) => x.workday === '2026-11-12'))
assert.equal(absent(members, [], [], '2026-10', now).length, 0) // ATT_FROM 전 달
assert.equal(absent([mem('A')], [], [], '2026-12', Date.parse('2026-12-31T21:00:00Z')).some((x) => x.workday === '2026-12-25'), false) // 성탄절
assert.equal(absent([mem('A')], [], [], '2026-12', Date.parse('2026-12-31T21:00:00Z'))[0].workday, '2026-12-31')
// 정정 시각: 05:00 전은 다음 날
assert.deepEqual(fixTimes('2026-11-09', '09:00', '18:30'), { first: '2026-11-09T09:00:00+09:00', last: '2026-11-09T18:30:00+09:00' })
assert.deepEqual(fixTimes('2026-11-30', '22:00', '01:30'), { first: '2026-11-30T22:00:00+09:00', last: '2026-12-01T01:30:00+09:00' })
assert.throws(() => fixTimes('2026-11-09', '18:00', '09:00'))
assert.throws(() => fixTimes('2026-11-09', '9:00', '18:00'))
assert.throws(() => fixTimes('2026-11-09', '09:00', '09:00'))

assert.equal(editorOf('Leo@Koreaners.com'), 'U0A7ZHM3WAH')
assert.equal(editorOf('john.park@koreaners.com'), 'U09JYMFS64Q')
assert.equal(editorOf('daniel@koreaners.com'), null)
assert.equal(editorOf('constructor'), null)
assert.equal(editorOf(null), null)
console.log('attendance time ok')
