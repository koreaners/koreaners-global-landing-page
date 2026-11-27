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

// brain-weekly 가 신호등과 같은 계산으로 올리는 월별 추이(재무 탭 「지표 모니터링」). 배열은 months 와 같은 순서
export const TREND_KEY = 'funnel-trend.json'
export type FunnelTrend = {
  version: 1
  generated_at: string
  today: string
  months: string[]
  // repeat_amt(재계약 공급가 합, 원), repeat_x(직전 계약 대비 배수)는 11/10 이후 파일부터
  // repeat_pace(재계약 진도: 진도 곳 수, 코호트 곳 수, 말일 뒤 경과일, 기준선 비율)는 11/25 이후 파일부터, 열린 코호트 달만 값
  deals: { goal: number; repeat_goal: number; new: number[]; repeat: number[]; repeat_amt?: number[]; repeat_amt_goal?: number; repeat_x?: (number | null)[]; repeat_pace?: { a: (number | null)[]; n: (number | null)[]; days: (number | null)[]; base: (number | null)[] } }
  ontime: { a: number[]; k: number[] } // 기한 내 회수율. 11/9 배포 뒤 회차부터 공급가 금액(원), 그 전은 회차 건수
  remit: { a: number[]; k: number[] }
  // 컨택월 코호트. ripe 가 false 인 달(말일이 60일 안 지남)은 수주율을 그리지 않는다
  leads: Record<string, { n: number[]; won: number[]; ripe: boolean[]; new?: number[] }> | null // new: 신규 리드 막대(홈페이지는 사이트 문의), n: 수주율 코호트
  // 월간파이낸스 정본의 달별 값. % 단위는 비율(1 = 100%)
  // adj 는 그 달까지 3개월 합으로 낸 보정값(현금 기준 시차를 평평하게). 인당 매출에는 없다
  health: { label: string; unit: '%' | '원'; goal: number; low: boolean; v: (number | null)[]; adj?: (number | null)[] }[] | null
  // 11/9 이후: 인건비를 뺀 고정비 대항목별 달별 금액(정본 「비용구성추이」 탭). 정본 읽기 실패면 null
  fixed_items?: Record<string, (number | null)[]> | null
  // 11/17 이후: 하이라키 지도 금액 칸(영업이익, 공헌이익, 고정비, 인건비, 공헌이익률, 건당 매출). 보고서 신호등 줄과 같은 모양, 정본 마지막 달 값
  tree?: NonNullable<WeeklyReport['funnel']>['rows'] | null
  // 11/17 이후: 달별 금액 칸(정본에 있는 달마다, 'YYYY-MM' → 줄)과 노션 「하이라키 액션」 달별 기록
  tree_months?: Record<string, NonNullable<WeeklyReport['funnel']>['rows']> | null
  actions?: Record<string, { box: string; team: string; title: string; text: string; who: string }[]> | null
  // 11/30 이후: 안건별 정담당(유니크코드 → 정본 이름, 운영보드 우선, 없으면 계약 담당자(정), 퇴사자 인계 반영, 미배정이면 키 없음)과 사람 단면(재무 「담당자」 탭 분기 한 장)
  deal_owner?: Record<string, string[]> | null
  people?: People | null
  // 10/29 이후: 리포트 주 끝에서 거슬러 월~일 13주. 송금은 그 주 일요일 시점 값, leads 는 Lead Status 읽기 실패면 null
  weeks?: {
    start: string[]
    end: string[]
    deals: { new: number[]; repeat: number[] }
    ontime: { a: number[]; k: number[] } // 위 ontime 과 같은 단위(11/9 배포 뒤 공급가 금액)
    remit: { a: number[]; k: number[] }
    leads: Record<string, number[]> | null
  }
}

// 사람 단면(추이 파일 people). 달은 지도 칸과 같은 입금 달, 건수는 정담당 n분의 1이라 소수. 「미배정」, 「인계 미지정」도 한 행씩
// deal_list 의 supply, contrib 는 계약 전체 값이고 사람 몫은 × share. rep_list(재계약, 계약 기준일 달) amt 도 계약 전체 값, rep_amt = Σ amt × share
export type PersonDeal = { code: string; corp: string; share: number; supply: number; contrib: number; rep: boolean; twikr: boolean }
export type PersonRep = { code: string; corp: string; share: number; amt: number }
export type PersonItem = { code: string; name: string; share?: number; month?: string; kind?: string }
export type People = {
  months: string[]
  rows: {
    name: string
    status: '재직' | '퇴사' | ''
    roles: string[]
    m: Record<string, { deals: number; supply: number; contrib: number; rep_n: number; rep_amt: number; twikr_est: number; deal_list: PersonDeal[]; rep_list?: PersonRep[] }>
    proc: { exc: PersonItem[]; late_creator: PersonItem[]; blocked: PersonItem[]; margin?: PersonItem[] } // margin: 구간별 최소 마진 미달(입금 달), 261127 전 파일엔 없음
    open: { backlog: PersonItem[]; open: PersonItem[] }
    // 리소스 게이지(261127 이후): 지금 진행 중 안건의 크리에이터 수 합(heads), 안건 수(deals), 그중 인원 미상(unknown). 모두 정담당 n분의 1
    load?: { heads: number; deals: number; unknown: number }
    // 리소스 예측(261127 이후): ahead_at 날짜마다 아직 진행 중일 크리에이터 수(at, 종료일 지남과 미상 포함), 추정 종료로 풀린 몫(est_freed),
    // 종료일 지남이나 미상이라 모든 칸을 차지하는 몫(stale)과 그 안건, 곧 시작(진행 전, 섭외 중) 건수와 아는 인원
    ahead?: { at: number[]; est_freed: number[]; stale: number; soon: number; soon_heads: number; stale_list: { code: string; name: string; share: number; heads: number; end: string; est: boolean }[] }
  }[]
  check?: Record<string, Record<string, [number, number]>> // 달마다 [사람 합, 지도 값], 주간 잡 점검용
  load_cap?: number // 한 명이 동시에 맡는 크리에이터 수 상한(50명)
  ahead_at?: string[] // 예측 칸 날짜(기준일 뒤 2, 4, 8, 12주)
  ahead_est_days?: number // 종료일 없는 안건 추정 기간(시작일 + N일)
}
