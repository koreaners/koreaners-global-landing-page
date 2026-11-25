import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { REPORTS_BUCKET, TREND_KEY, parseReportKey, type FunnelTrend, type WeeklyReport } from '@/lib/reports'
import { TrendChart, type TrendPoint } from './charts'
import { COLOR } from './colors'
import { at, Info, won2 } from './ui'
import { Dot, Goal, SignalLegend, SignalTable, goal, plain, split, type Row } from './signal-table'

// 재무 탭 「지표 모니터링」(구 퍼널 추이, 탭 키 funnel 유지): brain-weekly 가 주간 리포트 신호등과 같은 계산으로 올린 월별 값(설계: 볼트 work/261028-정리-퍼널신호등-지표)
const C1 = COLOR.in
const C2 = COLOR.out
const C3 = COLOR.due // 셋째 계열은 무채색(C1, C2 와 색상으로 겹치지 않게)
const rate = (a: number, k: number) => (k ? (100 * a) / k : null)

// 신호등: 최신 경영진 보고서 신호등 줄(funnel.rows)을 그대로 씀. 색 판정을 여기서 다시 하지 않아 보고서와 어긋나지 않는다

// 카드 머리의 신호등 값. 한 줄이면 제목과 같은 지표라 이름을 빼고 크게, 여러 줄이면 2칸 격자. 높이를 맞춰 아래 차트 시작선이 카드끼리 같게
function Stats({ rows, title }: { rows: Row[]; title: string }) {
  if (!rows.length) return <div className="min-h-[3.75rem]" /> // 신호등 줄이 없는 카드도 같은 높이를 비워 차트 시작선을 맞춤
  const one = rows.length === 1 && rows[0].label === title
  return (
    <div className={`grid min-h-[3.75rem] content-start gap-x-4 gap-y-3 ${one ? '' : 'grid-cols-2'}`}>
      {rows.map((r) => {
        const [big, sub] = split(r.value)
        const [t, tail] = goal(r.target)
        return (
          <div key={r.label} className="min-w-0">
            {!one && (
              <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Dot light={r.light} hollow={plain(r)} />
                <span className="truncate">{r.label.replace(/^(신규 리드|견적 발송률|수주율): /, '')}</span>
              </p>
            )}
            <p className={`flex items-baseline gap-1.5 font-semibold tabular-nums text-neutral-50 ${one ? 'text-2xl' : 'mt-0.5 text-lg'}`}>
              {one && <Dot light={r.light} hollow={plain(r)} className="self-center" />}
              {big}
              {t && <Goal t={t} className="text-sm" />}
            </p>
            {(sub || tail) && <p className="text-xs text-neutral-500">{[sub, tail].filter(Boolean).join(', ')}</p>}
            {r.note && <p className="text-xs text-neutral-500">{r.note}</p>}
          </div>
        )
      })}
    </div>
  )
}

// 카드 하나. href 가 있으면 카드 전체가 그 상세 화면 링크(상세 화면이 있는 지표만), info 는 제목 옆 ⓘ 설명, rows 는 신호등(카드 안 점으로만, 테두리는 다른 카드와 같은 헤어라인. 261116 감사).
// note 는 차트 아래(설명 길이가 달라도 차트 시작선이 같게). 카드에 overflow-hidden 을 두지 않는다(ⓘ 말풍선이 잘림). className 은 격자 칸(넓은 카드)용
function Panel({ title, note, info, href, rows = [], className = '', children }: { title: string; note: string; info?: string; href?: string; rows?: Row[]; className?: string; children: React.ReactNode }) {
  const card = (
    <section className={`flex h-full flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5${href ? ' transition-colors group-hover/card:bg-neutral-800/40' : ` ${className}`}`}>
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
        {title}
        {info && <Info text={info} />}
        {href && <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap text-xs font-normal text-neutral-500 group-hover/card:text-neutral-200">자세히 <ArrowRight aria-hidden className="h-4 w-4 shrink-0" /></span>}
      </h2>
      <Stats rows={rows} title={title} />
      {children}
      <p className="mt-auto border-t border-neutral-800 pt-3 text-xs leading-relaxed text-neutral-500">{note}</p>
    </section>
  )
  return href ? <Link href={href} className={`group/card block h-full ${className}`}>{card}</Link> : card
}

// 하이라키 팀별 관리지표(노션 「코리너스 하이라키 지표 트리」 표와 같은 팀, 같은 순서). [번호, 보고서 줄 이름]. 값과 색은 보고서 줄 그대로
const TEAMS: [string, [string, string][]][] = [
  ['영업팀', [['', '신규 리드: 아웃바운드 영업'], ['', '신규 리드: 크리에이터 경유'], ['', '견적 발송률: 아웃바운드 영업'], ['', '견적 발송률: 크리에이터 경유'], ['', '견적 발송률: 홈페이지 문의'], ['', '수주율: 아웃바운드 영업'], ['', '수주율: 크리에이터 경유'], ['', '수주율: 홈페이지 문의'], ['', '단계 체류'], ['', '수주 질'], ['', '300만 원 미만 계약 비중'], ['', '공헌이익률']]],
  ['운영팀', [['', '3개월 내 재계약률'], ['', '재계약 금액'], ['', '상태별 기한 준수율'], ['', '업로드 일정 준수율'], ['', '적체 안건'], ['', '운영 사유로 막힌 지급'], ['', '절차 예외: 계약 연결'], ['', '절차 예외: 계약서 링크'], ['', '사후 크리에이터 계약'], ['', '원가 초과 안건'], ['', '인당 처리 안건(운영)']]],
  ['전략실', [['', '신규 리드: 홈페이지 문의'], ['', '인당 매출'], ['', '인당 처리 안건'], ['', '인건비 ÷ 공헌이익'], ['', '기타 고정비'], ['', '기한 내 회수율'], ['', '송금 처리율']]],
]

function TeamLights({ rows }: { rows: Row[] }) {
  const by = new Map(rows.map((r) => [r.label, r]))
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-800 px-5 py-3.5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
          팀별 관리지표
          <Info text="노션 「코리너스 하이라키 지표 트리」의 팀별 관리지표. 목표 근거는 각 지표 ⓘ와 경영진 보고서 해설. 회색 점은 원천 칸이 아직 없거나 읽지 못해 값이 없는 지표(목표는 잠정), 빈 점은 값은 있지만 표본이 작은 코호트(20곳 미만) 등으로 색을 매기지 않은 참고 값" />
        </h2>
        <SignalLegend className="sm:ml-auto" />
      </div>
      <div className="px-5 pb-4">
        <SignalTable groups={TEAMS.map(([team, items]) => [team, items.map(([code, label]) => ({ code, label, row: by.get(label) }))])} missing="다음 주간 리포트부터" />
      </div>
    </section>
  )
}

// 하이라키 지도: 노션 「코리너스 하이라키 지표 트리」 구조도와 같은 배치(팀별 관리지표 → 구성요소 → 영업이익)에 라이브 값과 색을 얹음
// (설계: 볼트 work/261116-설계-어드민-하이라키-지도). 금액 칸은 추이 파일 tree(정본 마지막 달), 나머지는 최신 보고서 신호등 줄. 값과 색은 brain-weekly 그대로.
// 가로는 상자 폭 비율(%), 세로는 px. 선은 같은 좌표의 SVG(가로만 늘어남). +, ×, − 는 값끼리 계산이 맞고, 건당 매출(정본 현금 기준) × 공헌이익률만 안 맞음
// 팀 상자: [슬롯, 팀, [[줄 이름, 보고서 줄 이름들]]]. 한 슬롯에 상자 여럿이면 위에서부터 쌓음(노션 구조도와 같은 자리). 경로별 지표는 한 줄에 아웃바운드, 크리에이터, 홈페이지 순(홈페이지 신규 리드는 전략실 몫)
const CH = ['아웃바운드 영업', '크리에이터 경유', '홈페이지 문의']
const TEAM_BOX: [number, string, [string, string[]][]][] = [
  [0, '영업팀', [['신규 리드', CH.map((c) => `신규 리드: ${c}`)], ['견적 발송률', CH.map((c) => `견적 발송률: ${c}`)], ['수주율', CH.map((c) => `수주율: ${c}`)], ['단계 체류', ['단계 체류']]]],
  [1, '운영팀', [['3개월 내 재계약률', ['3개월 내 재계약률']], ['재계약 금액', ['재계약 금액']], ['상태별 기한 준수율', ['상태별 기한 준수율']], ['업로드 일정 준수율', ['업로드 일정 준수율']], ['적체 안건', ['적체 안건']], ['운영 사유로 막힌 지급', ['운영 사유로 막힌 지급']], ['절차 예외 (계약, 계약서)', ['절차 예외: 계약 연결', '절차 예외: 계약서 링크']], ['사후 크리에이터 계약', ['사후 크리에이터 계약']]]],
  [2, '영업팀', [['수주 질', ['수주 질']], ['300만 원 미만 계약 비중', ['300만 원 미만 계약 비중']]]],
  [3, '영업팀', [['공헌이익률', ['공헌이익률(계약 단위)']]]],  // 정본 「공헌이익률」(현금)이 같은 이름 보고서 줄을 덮어써서 계약 단위 줄을 직접
  [3, '운영팀', [['원가 초과 안건', ['원가 초과 안건']]]],
  [4, '전략실', [['인당 매출', ['인당 매출']], ['인당 처리 안건', ['인당 처리 안건']]]],
  [4, '운영팀', [['인당 처리 안건(운영)', ['인당 처리 안건(운영)']]]],
  [5, '전략실', [['인건비 ÷ 공헌이익', ['인건비 ÷ 공헌이익']]]],
  [6, '전략실', [['고정비 대항목별 추이는 아래 차트', []]]],
]
// 팀 상자 색: 노션 구조도와 같게 영업 파랑, 운영 주황, 전략실(S&O) 초록. [상자, 팀 이름]
const TONE: Record<string, [string, string]> = {
  영업팀: ['border-sky-800', 'text-sky-300'], 운영팀: ['border-amber-800 bg-amber-950/30', 'text-amber-300'], 전략실: ['border-emerald-800 bg-emerald-950/30', 'text-emerald-300'],
}
const BOX_H = (n: number) => 44 + 25 * n // 팀 상자 높이: 머리 + 줄 수
const SLOT = [0, 1, 2, 3, 4, 5, 6].map((i) => Math.max(124, TEAM_BOX.filter(([s]) => s === i).reduce((a, [, , l]) => a + BOX_H(l.length) + 12, 0))) // 줄이 늘면 슬롯이 자람
const TOP = 30
const SY = SLOT.map((_, i) => TOP + SLOT.slice(0, i).reduce((a, b) => a + b, 0))
const CY = SLOT.map((h, i) => SY[i] + h / 2)
const MAP_H = SY[6] + SLOT[6] + 6
const COL = [{ x: 0, w: 27 }, { x: 30, w: 15 }, { x: 48, w: 15 }, { x: 66, w: 15 }, { x: 84, w: 16 }]
const mid = (a: number, b: number) => (a + b) / 2
const Y2 = { deals: mid(CY[0], CY[1]), per: mid(CY[2], CY[3]), labor: mid(CY[4], CY[5]), other: CY[6] }
const Y3 = { cm: mid(Y2.deals, Y2.per), fixed: mid(Y2.labor, Y2.other) }
const Y4 = mid(Y3.cm, Y3.fixed)
type MapBox = { label: string; col: number; cy: number; book?: boolean; basis?: string }
const BOXES: MapBox[] = [
  { label: '신규 고객 첫 계약', col: 1, cy: CY[0], basis: '계약 기준' },
  { label: '재계약', col: 1, cy: CY[1], basis: '계약 기준' },
  { label: '건당 매출', col: 1, cy: CY[2], book: true, basis: '입금 기준' },
  { label: '공헌이익률', col: 1, cy: CY[3], book: true },
  { label: '인원', col: 1, cy: CY[4], book: true },
  { label: '인당 인건비', col: 1, cy: CY[5], book: true },
  { label: '안건 수', col: 2, cy: Y2.deals, basis: '계약 기준' },
  { label: '안건당 공헌이익', col: 2, cy: Y2.per, book: true, basis: '입금 기준' },
  { label: '인건비', col: 2, cy: Y2.labor, book: true },
  { label: '기타 고정비', col: 2, cy: Y2.other, book: true },
  { label: '공헌이익', col: 3, cy: Y3.cm, book: true },
  { label: '고정비', col: 3, cy: Y3.fixed, book: true },
  { label: '영업이익', col: 4, cy: Y4, book: true },
]
// [부모 열, 부모 높이, 자식 높이 둘, 기호]
const JOIN: [number, number, number, number, string][] = [
  [2, Y2.deals, CY[0], CY[1], '+'], [2, Y2.per, CY[2], CY[3], '×'], [2, Y2.labor, CY[4], CY[5], '×'],
  [3, Y3.cm, Y2.deals, Y2.per, '×'], [3, Y3.fixed, Y2.labor, Y2.other, '+'], [4, Y4, Y3.cm, Y3.fixed, '−'],
]
const none = (r?: Row) => !r || r.value === '원천 칸 신설 전' || r.value === '미상'
// 계약 단위 줄이 있으면 그 값을 큰 숫자로 쓰는 칸(공헌이익 − 고정비 = 영업이익이 지도에서 맞게)
const CB_BOX = ['공헌이익률', '안건당 공헌이익', '공헌이익', '영업이익', '안건 수', '신규 고객 첫 계약', '재계약'] // 안건 세 칸도 입금 기준(인혁 261125): 안건 수 × 안건당 공헌이익 = 공헌이익

type Act = NonNullable<FunnelTrend['actions']>[string][number]

// cmp: 비교 한 줄(지난달을 보면 다음 달 값, 이번 달이면 전달 값). acts: 그 달 이 칸의 액션(노션 「하이라키 액션」)
function MapCard({ b, r, cur, cmp, acts = [], foot, tag: tagAs }: { b: MapBox; r?: Row; cur: string; cmp?: string; acts?: Act[]; foot?: React.ReactNode; tag?: string }) {
  const h = foot ? (b.label === '영업이익' ? 190 : b.label === '공헌이익' ? 176 : 156) : 112
  const book = /^(\d+)월, 월간파이낸스 정본/.exec(r?.note ?? '')?.[1]
  const tag = tagAs ?? [b.book ? `${book ?? '-'}월 정본` : `${cur}월 누적`, b.basis].filter(Boolean).join(', ')
  const tip = [r?.define && `정의: ${r.define}`, r?.imply && `함의: ${r.imply}`, r?.note && `기준: ${r.note}`].filter(Boolean).join('\n')
  const right = b.col >= 3 ? 'right' : 'left'
  const [t, tail] = goal(r?.target)
  return (
    <div style={{ left: `${COL[b.col].x}%`, width: `${COL[b.col].w}%`, top: b.cy - h / 2, height: h }}
      className={`absolute flex flex-col justify-center rounded-lg border bg-neutral-900 px-3 ${r?.light === 'red' ? 'border-red-500/70' : 'border-neutral-700'}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
        <Dot light={r?.light} hollow={plain(r)} />
        <span className="truncate">{b.label}</span>
        {tip && <Info text={tip} align={right} />}
        {acts.length > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded bg-sky-950 px-1.5 text-sky-200">
            액션 {acts.length}
            <Info align={right} up text={acts.map((a) => `[${a.team || '팀 미정'}${a.who ? `, ${a.who}` : ''}] ${a.title}${a.text ? `\n  ${a.text}` : ''}`).join('\n')} />
          </span>
        )}
      </p>
      {/* 「실제 / 목표」 한 줄. 목표의 괄호 부분(월 전체 목표, 잠정)은 아래 줄 */}
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-neutral-50">
        {none(r) ? <span className="text-sm font-normal text-neutral-500">값 없음</span> : split(r!.value)[0]}
        {t && <Goal t={t} className="ml-1.5 text-sm" />}
      </p>
      <p className="truncate text-xs text-neutral-500">{t ? tail || ' ' : '목표 없음(참고 값)'}</p>
      <p className="truncate text-xs text-neutral-300">{cmp || ' '}</p>
      <p className="flex items-center gap-1.5 text-xs text-neutral-600">
        <span className="truncate">{tag}</span>
      </p>
      {foot}
    </div>
  )
}

// 한 달 지도에 쓰는 값: 그 달 보고서 신호등 줄과 그 달 정본 금액 칸
export type MapMonth = { month: string; rows: Row[]; tree: Row[] }

function HierarchyMap({ sel, next, months, missing, actions }: { sel: MapMonth; next?: MapMonth; months: string[]; missing?: string; actions: Act[] }) {
  const by = new Map([...sel.rows, ...sel.tree].map((r) => [r.label, r]))
  // 정본 칸의 다음 달 값은 그 달 정본(tree)에서만. 보고서 줄의 정본 값은 그보다 앞선 달이라 섞지 않음
  const nx = next && new Map(next.rows.map((r) => [r.label, r]))
  const nxBook = next && new Map(next.tree.map((r) => [r.label, r]))
  const mo = (m: string) => `${+m.slice(5)}월`
  // 지난달을 보면 다음 달 값(액션 뒤 어떻게 변했나), 이번 달이면 전달 값. 다음 달 금액 칸은 그 달 정본이 생겨야 나옴
  const cmp = (b: MapBox) => {
    const r = by.get(b.label)
    if (nx) {
      const n = (b.book ? nxBook! : nx).get(b.label)
      return n && !none(n) ? `→ ${mo(next!.month)} ${split(n.value)[0]}${b.book ? '' : ' (누적)'}` : `→ ${mo(next!.month)} 아직 없음`
    }
    return r?.mtd ? (b.book ? `전달 ${r.mtd}` : `지난달 같은 기간 ${r.mtd}`) : ''
  }
  const ratio = by.get('고정비 ÷ 공헌이익')
  // 계약 단위(현금 기준의 송금 시차를 뺀 값): 같은 달 입금 계약에 붙은 지급 전부를 원가로
  const [cbOp, cbFr] = [by.get('영업이익(계약 단위)'), by.get('고정비 ÷ 공헌이익(계약 단위)')]
  // 공헌이익 쪽 금액 칸은 전부 계약 단위가 큰 숫자(인혁 261123: 현금 공헌이익 − 고정비가 영업이익과 안 맞아 노이즈), 통장 기준은 영업이익 칸 참고 한 줄
  const real = (b: MapBox) => {
    const k = `${b.label}(계약 단위)`
    return CB_BOX.includes(b.label) && by.get(k) && !none(by.get(k)) ? { ...b, label: k, book: true } : b // 계약 단위 줄은 추이 파일 tree 라 다음 달 값도 tree 에서
  }
  const red = BOXES.filter((b) => by.get(real(b).label)?.light === 'red').map((b) => b.label)
  // 계약 단위 값이 얼마나 익었나(그 달 입금 계약 중 지급이 붙은 계약 수), 손익분기 안건 수(안건 수 목표 「월 59」)
  const link = /입금 계약 (\d+)건 중 지급 연결 (\d+)건/.exec(cbOp?.note ?? '')
  const be = /월 ([\d.]+)/.exec(by.get('안건 수')?.target ?? '')?.[1]
  const cbTip = (r: Row) => [r.define && `정의: ${r.define}`, r.note && `기준: ${r.note}`, r.mtd && `전달: ${r.mtd}`].filter(Boolean).join('\n')
  const cur = String(+sel.month.slice(5))
  const right = (c: number) => COL[c].x + COL[c].w
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-800 px-5 py-3.5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
          하이라키 지도
          <Info text={'노션 「코리너스 하이라키 지표 트리」 구조도에 지금 값을 얹은 것. 오른쪽 영업이익에서 빨간 칸을 따라 왼쪽 팀 지표로 가면 원인이 나옵니다.\n목적\n1. 구성요소 관리: 영업이익에 기여하는 세부 구성요소를 파악하고 측정, 관리, 개선\n2. 팀 목표: 팀 구성원마다 자기 관리지표가 명확하고, 관리지표 달성이 구성요소 개선을 거쳐 영업이익 최대화로 이어짐\n3. 개인 성과: 구성원 각자의 성과를 정량으로 측정, 평가하고 구체적으로 피드백해 개선\n안건 칸과 공헌이익률, 안건당 공헌이익, 공헌이익, 영업이익은 계약 단위(그 달 입금 계약에 붙은 크리에이터 지급을 송금 전이어도 원가로), 나머지 금액 칸은 월간파이낸스 정본의 마지막 달. 건당 매출만 정본 현금 기준이라 건당 매출 × 공헌이익률은 안건당 공헌이익과 맞지 않고, 나머지 +, ×, − 는 값끼리 계산이 맞습니다. 전달 값과 3개월 평균은 칸의 ⓘ'} />
        </h2>
        <p className="text-sm text-neutral-300">{red.length ? <>빨간 칸 <span className="text-neutral-50">{red.join(', ')}</span></> : '빨간 칸 없음'}</p>
        <SignalLegend className="sm:ml-auto" />
      </div>
      {/* 월 선택: 재무 탭 공통 y, m 쿼리. 그 달 마감(마지막 주간 보고서) 지도와 다음 달 값, 그 달 액션 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-800 px-5 py-2.5 text-xs">
        {months.map((m) => (
          <Link key={m} href={`/admin/finance?tab=funnel&y=${m.slice(0, 4)}&m=${+m.slice(5)}`}
            className={`rounded-md px-2.5 py-1 ${m === sel.month ? 'bg-neutral-800 font-semibold text-neutral-50' : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'}`}>{mo(m)}</Link>
        ))}
        {missing && <span className="ml-2 text-neutral-500">{mo(missing)} 자료가 아직 없어 {mo(sel.month)}을 보여 줍니다</span>}
        <a href="https://app.notion.com/p/41b01ca3e480814bb72cfb48dd29748e" target="_blank" rel="noreferrer" className="ml-auto text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline">액션 기록하기(노션)</a>
      </div>
      {/* 칸 위치가 % 라 좁은 화면에서는 칸이 찌그러짐. lg 아래는 데스크톱 폭 그대로 두고 가로 스크롤 */}
      <div className="px-5 py-4 max-lg:overflow-x-auto">
        <div className="relative max-lg:w-[1200px]" style={{ height: MAP_H }}>
          {([[0, '팀별 관리지표'], [1, '구성요소'], [4, '결과']] as const).map(([c, t]) => (
            <p key={t} className="absolute top-0 text-xs font-medium text-neutral-500" style={{ left: `${COL[c].x}%` }}>{t}</p>
          ))}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${MAP_H}`} preserveAspectRatio="none" aria-hidden>
            <g fill="none" stroke="var(--color-neutral-500)" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
              {JOIN.map(([pc, py, a, b], i) => {
                const x0 = right(pc - 1), xm = mid(x0, COL[pc].x)
                return <path key={i} vectorEffect="non-scaling-stroke" d={`M${x0} ${a}H${xm}M${x0} ${b}H${xm}M${xm} ${a}V${b}M${xm} ${py}H${COL[pc].x}`} />
              })}
              {CY.map((y, i) => <path key={i} vectorEffect="non-scaling-stroke" strokeDasharray="4 3" d={`M${right(0)} ${y}H${COL[i < 6 ? 1 : 2].x}`} />)}
            </g>
          </svg>
          {JOIN.map(([pc, py, , , op], i) => (
            <span key={i} style={{ left: `${mid(right(pc - 1), COL[pc].x)}%`, top: py }} className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-500 bg-neutral-900 text-xs text-neutral-200">{op}</span>
          ))}
          {TEAM_BOX.map(([slot, team, lines], k) => {
            const mates = TEAM_BOX.filter(([s]) => s === slot), above = TEAM_BOX.slice(0, k).filter(([s]) => s === slot)
            const top = SY[slot] + 6 + above.reduce((a, [, , l]) => a + BOX_H(l.length) + 12, 0)
            return (
            <div key={`${slot}${team}`} style={{ left: 0, width: `${COL[0].w}%`, top, height: mates.length > 1 ? BOX_H(lines.length) : SLOT[slot] - 12 }} className={`absolute rounded-lg border px-3 py-2 ${TONE[team][0]}`}>
              <p className={`border-b border-neutral-700 pb-1 text-xs font-semibold ${TONE[team][1]}`}>{team}{slot === 0 && <span className="ml-1.5 font-normal text-neutral-500">아웃바운드, 크리에이터, 홈페이지 순</span>}</p>
              <div className="divide-y divide-neutral-800">
              {lines.map(([name, labels]) => (
                <p key={name} className="flex items-center justify-between gap-2 py-[3px] text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-neutral-300"><span className="h-1 w-1 shrink-0 rounded-full bg-neutral-500" /><span className="truncate">{name}</span></span>
                  <span className="flex shrink-0 items-center gap-2.5 tabular-nums">
                    {labels.map((l) => {
                      const x = by.get(l)
                      return <span key={l} className="inline-flex items-center gap-1 text-neutral-200"><Dot light={x?.light} hollow={plain(x)} />{none(x) ? <span className="text-neutral-600">-</span> : split(x!.value)[0]}</span>
                    })}
                  </span>
                </p>
              ))}
              </div>
            </div>
            )
          })}
          {BOXES.map((b) => (
            <MapCard key={b.label} b={b} r={by.get(real(b).label)} cur={cur} cmp={cmp(real(b))} acts={actions.filter((a) => a.box === b.label)}
              tag={real(b) !== b ? `${/^(\d+)월/.exec(by.get(real(b).label)!.note)?.[1] ?? '-'}월 ${b.label === '영업이익' ? '실제 손익' : '계약 단위'}` : undefined}
              foot={b.label === '영업이익' && cbOp ? (
                <div className="mt-1 border-t border-neutral-800 pt-1 text-xs text-neutral-500">
                  {cbFr && !none(cbFr) && <p className="flex items-center gap-1.5"><Dot light={cbFr.light} /><span className="text-neutral-200">{cbFr.value}</span>고정비 ÷ 공헌이익<Info align="right" up text={cbTip(cbFr)} /></p>}
                  {by.get('영업이익') && !none(by.get('영업이익')) && (
                    <p className="mt-1 flex items-center gap-1 border-t border-neutral-800 pt-1">참고: 통장 기준 <span className="text-neutral-200">{split(by.get('영업이익')!.value)[0]}</span>
                      <Info align="right" up text={'크리에이터비를 아직 안 보내서 커 보이는 값(월간파이낸스 정본, 현금 기준). 송금이 입금보다 몇 달 늦게 나가서, 입금이 몰린 달은 좋아 보이고 송금이 몰린 달은 나빠 보입니다.'} />
                    </p>
                  )}
                </div>
              ) : b.label === '공헌이익' && real(b) !== b && !none(by.get('공헌이익')) ? (
                <div className="mt-1 border-t border-neutral-800 pt-1 text-xs text-neutral-500">
                  {link && <p className="flex items-center gap-1">지급 연결 <span className="text-neutral-200">{link[2]}/{link[1]}건</span>
                    <Info align="right" up text={'그 달 입금 계약 가운데 크리에이터 지급이 붙은 계약 수.\n읽는 법: 덜 붙었을수록 아직 안 잡힌 원가가 남아 계약 단위 값이 실제보다 좋게 나옵니다. 지급이 붙은 공급가가 90% 아래인 달은 지도 색을 끕니다.'} />
                  </p>}
                  <p className="flex items-center gap-1">참고: 통장 기준 <span className="text-neutral-200">{split(by.get('공헌이익')!.value)[0]}</span>
                    <Info align="right" up text={'통장 기준: 그 달 입금 − 그 달 실제로 보낸 크리에이터비(월간파이낸스 정본, 현금 기준).\n읽는 법: 위 계약 단위 값보다 크면 그 달 입금 계약에 붙은 크리에이터비가 아직 덜 나간 것이라, 대체로 그 차이만큼 앞으로 나갈 돈입니다. 손익 판단은 위 계약 단위 값으로.'} />
                  </p>
                </div>
              ) : b.label === '안건 수' && be ? (
                <div className="mt-1 border-t border-neutral-800 pt-1 text-xs text-neutral-500">
                  <p className="flex items-center gap-1">손익분기 <span className="text-neutral-200">월 {be}건</span>
                    <Info align="left" up text={'한 달에 이만큼 계약해야 흑자가 되는 건수(목표와 같음).\n계산: 고정비 ÷ 공헌이익이 100%가 되는 안건 수, 계약 단위.'} />
                  </p>
                </div>
              ) : b.label === '영업이익' && ratio ? (
                <div className="mt-1 border-t border-neutral-800 pt-1 text-xs text-neutral-500">
                  <p>기준: 고정비 ÷ 공헌이익</p>
                  <p className="flex items-center gap-1.5"><Dot light={ratio.light} /><span className="text-neutral-200">{ratio.value}</span><Goal t={ratio.target} /></p>
                </div>
              ) : undefined} />
          ))}
        </div>
      </div>
    </section>
  )
}

const CB_TIMING = '공헌이익은 계약 단위: 그 달에 입금된 계약마다 붙은 크리에이터 지급을 송금 시점과 관계없이 모두 원가로 잡음(보류 제외, 아마네님 통과 매출 제외). 최근 달은 지급이 덜 붙어 실제보다 좋게 나올 수 있음. 주황 선은 그 달까지 3개월을 합쳐 낸 값'

export async function FunnelTrendTab({ y, m }: { y?: string; m?: string } = {}) {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(REPORTS_BUCKET).download(TREND_KEY)
  let t: FunnelTrend | null = null
  try {
    const j = data ? JSON.parse(await data.text()) : null
    if (j?.version === 1) t = j
  } catch {}
  if (!t) return <p className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">지표 모니터링 파일이 아직 없습니다. 주간 잡(brain-weekly)이 한 번 돌면 생깁니다.</p>
  // 신호등은 가장 최근 주간 보고서에서. 못 읽으면 신호등 없이 차트만
  const { data: files } = await supabase.storage.from(REPORTS_BUCKET).list('', { sortBy: { column: 'name', order: 'desc' } })
  const latest = (files ?? []).map((f) => f.name).filter((n) => parseReportKey(n)).sort().at(-1)
  const load = async (key?: string) => {
    if (!key) return []
    try {
      const { data: r } = await supabase.storage.from(REPORTS_BUCKET).download(key)
      return r ? ((JSON.parse(await r.text()) as WeeklyReport).funnel?.rows ?? []) : []
    } catch {
      return []
    }
  }
  const rows = await load(latest)
  // 지도 달: 그 달에 시작한 마지막 주간 보고서(퍼널은 그 주 월요일의 달) + 그 달 정본 금액. 이번 달은 정본이 아직 없어 최신(tree)
  const keys = (files ?? []).map((f) => f.name).filter((n) => parseReportKey(n)).sort()
  const lastOf = (mm: string) => keys.filter((k) => parseReportKey(k)!.start.slice(0, 7) === mm).at(-1)
  const cur = latest ? parseReportKey(latest)!.start.slice(0, 7) : t.today.slice(0, 7)
  const months = [...new Set([...Object.keys(t.tree_months ?? {}), ...keys.map((k) => parseReportKey(k)!.start.slice(0, 7)), cur])].filter((x) => x <= cur).sort()
  const want = y && m ? `${y}-${m.padStart(2, '0')}` : cur
  const selM = months.includes(want) ? want : cur
  const mapOf = async (mm: string): Promise<MapMonth> => ({
    month: mm,
    rows: mm === cur ? rows : await load(lastOf(mm)),
    tree: t.tree_months?.[mm] ?? (mm === cur ? t.tree ?? [] : []),
  })
  const nextM = months[months.indexOf(selM) + 1]
  const map = t.tree ? { sel: await mapOf(selM), next: nextM ? { ...(await mapOf(nextM)), tree: t.tree_months?.[nextM] ?? [] } : undefined /* 비교 줄의 정본 값은 그 달 정본이 생겨야(이번 달 지도의 최신 tree 는 앞 달 값) */, months, missing: want !== selM ? want : undefined, actions: t.actions?.[selM] ?? [] } : null
  return <FunnelTrendView t={t} rows={rows} map={map} period={latest ? parseReportKey(latest)!.title.replace('주간 경영 리포트 ', '') : null} />
}

export function FunnelTrendView({ t, rows = [], period = null, map = null }: { t: FunnelTrend; rows?: Row[]; period?: string | null; map?: React.ComponentProps<typeof HierarchyMap> | null }) {
  const pick = (...labels: string[]) => labels.flatMap((l) => rows.filter((r) => r.label === l))
  const cur = t.today.slice(0, 7)
  const upto = `${+t.today.slice(5, 7)}/${+t.today.slice(8)}`
  // 축은 짧게, 이번 달이 진행 중이라는 표시는 툴팁 머리에
  const label = (i: number) => `${+t.months[i].slice(5)}월`
  const closed = new Date(Date.UTC(+t.today.slice(0, 4), +t.today.slice(5, 7), 0)).getUTCDate() === +t.today.slice(8) // 기간 끝이 말일(마감 회차)
  const full = (i: number) => (t.months[i] === cur && !closed ? `${label(i)} (${upto}까지)` : label(i))
  const pts = (f: (i: number) => Omit<TrendPoint, 'label'>) => t.months.map((_, i) => ({ label: label(i), title: full(i), ...f(i) }))
  const d = t.deals
  const leads = t.leads ? Object.entries(t.leads) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-neutral-50">
          지표 모니터링
          <Info text={`경영진 보고서 주간 잡이 신호등과 같은 계산으로 만든 월별 값입니다. 건전성 4개의 고정비, 인건비, 인원은 월간파이낸스 정본(손으로 매달 갱신)에서 읽어 정본이 없는 달은 비움. 공헌이익은 계약 단위${period ? '. 신호등은 최신 경영진 보고서 값: 안건, 입금, 송금은 이번 달 누적이고 건수 목표는 경과일 비례, 건전성은 정본의 마지막 달' : ''}`} />
        </h1>
        {/* 갱신 정보는 다른 탭처럼 흐린 평문 한 줄(261116 감사: 테두리 알약 3개) */}
        <p className="flex flex-wrap gap-x-3 text-xs text-neutral-500 sm:ml-auto">
          {period && <span>신호등: {period} 보고서</span>}
          <span>{at(t.generated_at)} 계산{closed ? '' : `, 이번 달은 ${t.today}까지`}</span>
          <span>매주 월 07:00 갱신</span>
        </p>
      </div>

      {map && <HierarchyMap {...map} />}

      {/* 공헌이익률은 옛 보고서에 줄이 없어(261117 전 이름 변동비율) 정본 칸 값으로. 보고서 줄이 있으면 그쪽이 이김 */}
      <TeamLights rows={[...(t.tree ?? []), ...rows]} />

      {/* 주 차트(안건 수)는 한 줄 전체, 나머지는 격자. lg 2열에서 마지막 카드가 홀로 남으면(첫 카드 빼고 홀수 장) 두 칸을 채움(261116 감사) */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 lg:max-xl:[&>:last-child:nth-child(even)]:col-span-2">
        <Panel className="col-span-full" title="안건 수" href="/admin/finance?tab=contracts" rows={pick('안건 수')} note={`계약 기준일(계약일자, 없으면 시작일, 없으면 첫 입금일)의 달. 목표 ${d.goal}건은 신규 ${+(d.goal - d.repeat_goal).toFixed(1)}건과 재계약 ${d.repeat_goal}건(4~9월 평균 유지 가정)`}>
          <TrendChart
            unit="건"
            goal={d.goal}
            series={[
              { key: 'new', name: '신규 고객 첫 계약', color: C1, kind: 'bar', stack: 'd' },
              { key: 'repeat', name: '재계약', color: C2, kind: 'bar', stack: 'd' },
            ]}
            data={pts((i) => ({ new: d.new[i], repeat: d.repeat[i], title: `${full(i)} 합계 ${d.new[i] + d.repeat[i]}건` }))}
          />
        </Panel>

        {d.repeat_amt && (
          <Panel title="재계약 금액" rows={pick('재계약 금액', '재계약 금액 배수')} note={`재계약(전에 계약한 법인의 추가 계약)의 공급가 합. 목표 ${won2(d.repeat_amt_goal ?? 0)}은 4~9월 평균 유지 가정. 배수는 같은 법인 바로 앞 계약 대비`}>
            <TrendChart
              unit="원"
              goal={d.repeat_amt_goal}
              series={[{ key: 'a', name: '재계약 금액', color: C2, kind: 'bar' }]}
              data={pts((i) => ({ a: d.repeat_amt![i], title: `${full(i)} 재계약 ${d.repeat[i]}건${d.repeat_x?.[i] != null ? `, 직전 계약 대비 ${d.repeat_x[i]}배` : ''}` }))}
            />
          </Panel>
        )}

        <Panel title="입금, 송금" href="/admin/finance?tab=calendar" rows={pick('기한 내 회수율', '송금 처리율')} note="기한 내 회수율: 입금 예정일이 그 달인 회차의 공급가 중 예정일까지 들어온 금액. 송금 처리율: 그 달 말일 기준, 고객 전액 입금 뒤 30일 지난 지급(그 앞 90일) 중 송금 완료">
          <TrendChart
            unit="%"
            goal={100}
            series={[
              { key: 'on', name: '기한 내 회수율', color: C1, kind: 'line' },
              { key: 're', name: '송금 처리율', color: C2, kind: 'line' },
            ]}
            data={pts((i) => ({
              on: rate(t.ontime.a[i], t.ontime.k[i]), on_t: `${won2(t.ontime.a[i])} / ${won2(t.ontime.k[i])}`,
              re: rate(t.remit.a[i], t.remit.k[i]), re_t: `${t.remit.a[i]}/${t.remit.k[i]}건`,
            }))}
          />
        </Panel>

        {leads ? (
          <>
            <Panel title="신규 리드" rows={pick('신규 리드: 아웃바운드 영업', '신규 리드: 크리에이터 경유', '신규 리드: 홈페이지 문의')} note="홈페이지 문의: 사이트 문의가 들어온 회사 수. 아웃바운드 영업, 크리에이터 경유: Lead Status 최초 컨택일이 그 달인 고객사 수(코리너스가 먼저 메일을 보냈으면 아웃바운드 영업, 브랜드가 먼저 보냈으면 크리에이터 경유). 첫 컨택 전 계약이 있던 기존 고객과 리드 자격 제외(무상 제공, 일괄 초대 등)는 뺌. 8월 전은 메일 수집 범위가 좁아 적게 나옴">
              <TrendChart
                unit="곳"
                series={leads.map(([ch], j) => ({ key: `l${j}`, name: ch, color: [C1, C2, C3][j % 3], kind: 'bar' as const }))}
                data={pts((i) => Object.fromEntries(leads.map(([, v], j) => [`l${j}`, (v.new ?? v.n)[i]])))}
              />
            </Panel>
            <Panel title="수주율 (컨택월 코호트)" rows={pick('수주율: 아웃바운드 영업', '수주율: 크리에이터 경유', '수주율: 홈페이지 문의')} note="그 달에 처음 컨택한 고객사(기존 고객과 리드 자격 제외는 뺌) 중 지금까지 확정, 정산 단계이거나 계약이 연결된 곳. 말일이 60일 안 지난 달은 덜 익어 비우고, 오래된 달일수록 시간이 더 지나 높게 나옴">
              <TrendChart
                unit="%"
                series={leads.map(([ch], j) => ({ key: `w${j}`, name: ch, color: [C1, C2, C3][j % 3], kind: 'line' as const }))}
                data={pts((i) => Object.fromEntries(leads.flatMap(([, v], j) => [
                  [`w${j}`, v.ripe[i] ? rate(v.won[i], v.n[i]) : null],
                  [`w${j}_t`, `${v.won[i]}/${v.n[i]}곳`],
                ])))}
              />
            </Panel>
          </>
        ) : (
          <p className="col-span-full text-sm text-neutral-500">Lead Status 읽기 실패로 영업 추이가 없습니다.</p>
        )}
        {t.health ? (
          t.health.map((h) => (
            <Panel key={h.label} title={h.label} rows={pick(h.label)} note={`${h.low ? '낮을수록 좋음' : '높을수록 좋음'}. ${h.label === '인당 매출' ? '월간파이낸스 정본' : h.label === '안건당 공헌이익' ? '계약 단위, 그 달 입금 계약' : '공헌이익은 계약 단위, 고정비와 인건비는 정본'}`} info={h.adj ? CB_TIMING : undefined}>
              <TrendChart
                unit={h.unit}
                goal={h.unit === '%' ? h.goal * 100 : h.goal}
                series={[{ key: 'v', name: h.adj ? '그 달' : h.label, color: C1, kind: 'line' }, ...(h.adj ? [{ key: 'a', name: '3개월 합', color: C2, kind: 'line' as const }] : [])]}
                data={pts((i) => {
                  const f = (x: number | null | undefined) => (x == null ? null : h.unit === '%' ? x * 100 : x)
                  return { v: f(h.v[i]), a: f(h.adj?.[i]) }
                })}
              />
            </Panel>
          ))
        ) : (
          <p className="col-span-full text-sm text-neutral-500">월간파이낸스 정본 읽기 실패로 건전성 추이가 없습니다.</p>
        )}
        {t.fixed_items && (
          <Panel title="기타 고정비 (대항목별)" rows={pick('기타 고정비')} note="인건비를 뺀 고정비 대항목. 월간파이낸스 정본 「비용구성추이」 탭 소계라, 신호등 값(정본 고정비 − 인건비)과 합계가 조금 다를 수 있음">
            <TrendChart
              unit="원"
              series={Object.keys(t.fixed_items).map((k, j) => ({ key: `f${j}`, name: k, color: [C1, C2, C3][j % 3], kind: 'bar' as const, stack: 'f' }))}
              data={pts((i) => Object.fromEntries(Object.values(t.fixed_items!).map((v, j) => [`f${j}`, v[i]])))}
            />
          </Panel>
        )}
      </div>
    </div>
  )
}
