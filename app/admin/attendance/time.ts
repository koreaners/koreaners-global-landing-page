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
