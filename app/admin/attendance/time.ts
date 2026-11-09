// 근태 표의 시간 계산(화면과 time.check.mjs가 함께 씀). 점검: node app/admin/attendance/time.check.mjs

export type Att = {
  slack_id: string
  member_email: string | null
  workday: string
  first_at: string
  last_at: string
  taps: number
  source: string | null
  fix_first_at: string | null
  fix_last_at: string | null
  fix_by: string | null
  fix_note: string | null
}

const KST = 9 * 3_600_000
const WD = ['일', '월', '화', '수', '목', '금', '토']

/** KST 시각 HH:MM */
export const hm = (iso: string) => new Date(Date.parse(iso) + KST).toISOString().slice(11, 16)
/** KST 날짜 YYYY-MM-DD */
export const kstDate = (iso: string) => new Date(Date.parse(iso) + KST).toISOString().slice(0, 10)
/** '2026-11-05' -> '11/05(목)' */
export const dayLabel = (d: string) => `${d.slice(5, 7)}/${d.slice(8, 10)}(${WD[new Date(`${d}T12:00:00Z`).getUTCDay()]})`
/** 근무일 기준 이번 달(하루 경계는 KST 05:00, 봇과 같음) */
export const thisMonth = (now = Date.now()) => new Date(now + KST - 5 * 3_600_000).toISOString().slice(0, 7)
export const addMonth = (ym: string, n: number) => {
  const d = new Date(`${ym}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 7)
}

// 미출근 판정 기준. 출퇴근 봇(krns-lambdas/lightsaber-slack)의 값을 옮겨 적은 사본입니다.
// ponytail: 봇 코드 사본이라 봇에서 바뀌면 여기도 손으로 맞춥니다. 자주 바뀌면 봇이 Supabase 표에 쓰고 둘 다 읽게 합니다
/** hr.py HOLIDAYS */
export const HOLIDAYS = new Set(
  `2026-01-01 2026-02-16 2026-02-17 2026-02-18 2026-03-02 2026-05-01 2026-05-05 2026-05-25 2026-06-03 2026-07-17 2026-08-17
2026-09-24 2026-09-25 2026-09-28 2026-10-05 2026-10-09 2026-12-25
2027-01-01 2027-02-08 2027-02-09 2027-03-01 2027-05-03 2027-05-05 2027-05-13 2027-07-19 2027-08-16 2027-09-14 2027-09-15
2027-09-16 2027-10-04 2027-10-11 2027-12-27`.split(/\s+/),
)
/** nfc.py SKIP: 출퇴근 기록 대상이 아닌 슬랙 계정 */
export const SKIP = new Set(['U0B0V3089LY', 'U09MDN55T0A', 'U09JPJAR74H', 'U09N5EQKJ82', 'U0BML0DQ6LS', 'U09HV7MGS4F', 'U09HV7N1UDV', 'U09HV7MD3AT'])
/** nfc.py ATT_FROM 기본값: NFC 기록이 출퇴근 정본이 된 날 */
export const ATT_FROM = '2026-11-09'

/** 노션 구성원(결재 조직도) 재직자 */
export type Member = { slack: string; name: string; email: string; joined: string | null }
/** hr_leave_uses(예약, 사용) */
export type Leave = { member_email: string; type_code: string; start_date: string; end_date: string }
export type Absent = { slack_id: string; workday: string }

/** 근무일 기준 오늘 YYYY-MM-DD(하루 경계 KST 05:00) */
export const today = (now = Date.now()) => new Date(now + KST - 5 * 3_600_000).toISOString().slice(0, 10)

/** 출근 기록이 아예 없는 날. m 달의 ATT_FROM 이후 평일(공휴일 제외) 중 진행 중인 근무일 전까지,
 * 재직자(SKIP 제외)가 입사일 이후인데 기록도 휴가도 없는 날. 시간 연차는 출근하는 날이라 휴가로 치지 않음. 최근 날짜 먼저 */
export function absent(members: Member[], rows: Att[], leaves: Leave[], m: string, now = Date.now()): Absent[] {
  const have = new Set(rows.map((r) => `${r.slack_id} ${r.workday}`))
  const off = leaves.filter((l) => l.type_code !== 'annual_hour')
  const end = today(now)
  const out: Absent[] = []
  for (let d = new Date(`${m}-01T00:00:00Z`); d.toISOString().startsWith(m); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    if (day < ATT_FROM || day >= end || d.getUTCDay() % 6 === 0 || HOLIDAYS.has(day)) continue
    for (const p of members) {
      if (SKIP.has(p.slack) || (p.joined && day < p.joined) || have.has(`${p.slack} ${day}`)) continue
      const email = p.email.toLowerCase()
      if (off.some((l) => l.member_email.toLowerCase() === email && l.start_date <= day && day <= l.end_date)) continue
      out.push({ slack_id: p.slack, workday: day })
    }
  }
  return out.reverse()
}

/** 머문 분에서 휴게를 뺀 근로시간 글. lightsaber-slack nfc.py worked()와 같은 규칙:
 * 5시간 이상 1시간, 4시간 30분 이상 30분, 그 미만은 빼지 않음 */
export function worked(stay: number) {
  const rest = stay >= 300 ? 60 : stay >= 270 ? 30 : 0
  const h = Math.floor((stay - rest) / 60)
  const m = (stay - rest) % 60
  return h && m ? `${h}시간 ${m}분` : h ? `${h}시간` : `${m}분`
}

/** 한 줄의 화면 값: 정정값이 있으면 정정값, 출근과 퇴근이 1시간 안이면 퇴근 누락 */
export function view(r: Att) {
  const first = r.fix_first_at ?? r.first_at
  const last = r.fix_last_at ?? r.last_at
  const stay = Math.floor((Date.parse(last) - Date.parse(first)) / 60_000)
  const missing = stay < 60
  return { first, last, missing, worked: missing ? null : worked(stay), fixed: !!r.fix_by }
}
