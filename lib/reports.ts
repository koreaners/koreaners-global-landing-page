// 경영진 보고서 비공개 버킷. 정책은 supabase/migrations 의 admin_reports 마이그레이션
export const REPORTS_BUCKET = 'admin-reports'

// brain-weekly(~/brain agenda/weekly.py payload)가 올리는 화면 데이터. 글자는 날것, 색은 의미 키
export type Seg = { v: number; c?: ColorKey; o?: number }
export type ColorKey = 'c1' | 'c2' | 'c3' | 'c4' | 'ok' | 'bad' | 'hum'
export type Legend = { t: string; c: ColorKey; o?: number }
export type Ref = { text: string; href?: string }

export type WeeklyReport = {
  version: 1
  title: string
  period: { start: string; end: string; today: string }
  generated_at: string
  tiles: { label: string; value: string[]; sub?: string; href?: string; alert?: boolean; bars: Seg[][]; legend: Legend[] }[]
  decisions: { title: string; amount: string; note: string; bullets: string[]; ask: string[]; href: string | null }[]
  more: string[]
  sales: { bars: { label: string; v: number; text: string }[]; lines: string[] }
  funds: { bars: { label: string; count: number; v: number; text: string; late: boolean }[]; lines: string[] }
  people: { caption: string; legend: Legend[]; bars: { label: string; text: string; v: number; parts: Seg[] }[]; lines: string[] }
  evidence: { text: string; refs?: Ref[] }[]
}

// 키 weekly-report-YYMMDD-YYMMDD.json 에서 기간을 읽는다. 모양이 다른 키는 목록에 안 띄우고 열지도 않는다
const KEY = /^weekly-report-(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/

export function parseReportKey(name: string) {
  const m = KEY.exec(name)
  if (!m) return null
  const [, y1, m1, d1, y2, m2, d2] = m
  return { start: `20${y1}-${m1}-${d1}`, end: `20${y2}-${m2}-${d2}`, title: `주간 경영 리포트 ${+m1}/${+d1}~${+m2}/${+d2}` }
}
