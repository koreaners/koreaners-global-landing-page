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
  // 10/26 회차부터. 그 전 보고서에는 없다
  voucher?: {
    value: string
    sub: string
    steps: { bar: Seg[]; legend: Legend[] }
    money: { bar: Seg[]; legend: Legend[] }
    rows: { name: string; tag: string; amount: string; pre: string; post: string; step: string; end: string; note: string; alert: boolean }[]
    lines: string[]
    done: string
  }
  // 10/26 이후 회차부터. 퍼널 신호등(색은 마감된 지난달 기준, light 가 null 이면 색 없는 참고 줄)
  funnel?: {
    month: string
    mtd: string
    // 10/28 이후 회차부터: 색 기준과 비교 숫자 설명 한 줄. 없으면 옛 문장(지난달 마감 색, 이번 달 진행)
    head?: string
    // 10/29 이후 회차부터: 그 달 주차(월요일마다, 첫 월요일 앞은 1주). 있으면 줄의 mtd 는 지난달 같은 기간 비교(펼친 칸)
    weeks?: { label: string; span: string }[]
    // define, imply 는 10/28 이후 회차부터(카드를 누르면 펼침). week 는 이번 주차 값, weeks 는 주차별 값(weeks 와 같은 순서)
    rows: { group: string; label: string; value: string; target: string; mtd: string; note: string; rate: number | null; light: 'green' | 'yellow' | 'red' | null; define?: string; imply?: string; week?: string; weeks?: string[] }[]
    lines: string[]
  }
}

// 키 weekly-report-YYMMDD-YYMMDD.json 에서 기간을 읽는다. 모양이 다른 키는 목록에 안 띄우고 열지도 않는다
const KEY = /^weekly-report-(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/

export function parseReportKey(name: string) {
  const m = KEY.exec(name)
  if (!m) return null
  const [, y1, m1, d1, y2, m2, d2] = m
  return { start: `20${y1}-${m1}-${d1}`, end: `20${y2}-${m2}-${d2}`, title: `주간 경영 리포트 ${+m1}/${+d1}~${+m2}/${+d2}` }
}

// brain-weekly 가 신호등과 같은 계산으로 올리는 월별 추이(재무 탭 「퍼널 추이」). 배열은 months 와 같은 순서
export const TREND_KEY = 'funnel-trend.json'
export type FunnelTrend = {
  version: 1
  generated_at: string
  today: string
  months: string[]
  deals: { goal: number; repeat_goal: number; new: number[]; repeat: number[] }
  ontime: { a: number[]; k: number[] }
  remit: { a: number[]; k: number[] }
  // 컨택월 코호트. ripe 가 false 인 달(말일이 60일 안 지남)은 수주율을 그리지 않는다
  leads: Record<string, { n: number[]; won: number[]; ripe: boolean[] }> | null
  // 월간파이낸스 정본의 달별 값. % 단위는 비율(1 = 100%)
  health: { label: string; unit: '%' | '원'; goal: number; low: boolean; v: (number | null)[] }[] | null
  // 10/29 이후: 리포트 주 끝에서 거슬러 월~일 13주. 송금은 그 주 일요일 시점 값, leads 는 Lead Status 읽기 실패면 null
  weeks?: {
    start: string[]
    end: string[]
    deals: { new: number[]; repeat: number[] }
    ontime: { a: number[]; k: number[] }
    remit: { a: number[]; k: number[] }
    leads: Record<string, number[]> | null
  }
}
