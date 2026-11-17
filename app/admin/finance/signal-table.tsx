import { Info } from './ui'
import type { WeeklyReport } from '@/lib/reports'

// 신호등 표: 경영진 보고서 「퍼널 신호등」과 지표 모니터링 「팀별 관리지표」가 같이 씀. 값과 색은 보고서 줄(funnel.rows) 그대로, 색 판정을 여기서 다시 하지 않음
export type Row = NonNullable<WeeklyReport['funnel']>['rows'][number]
export type Item = { label: string; code?: string; row?: Row }

export const DOT = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' } as const
// 색 기준은 brain-weekly light(): 달성률 100% 이상 초록, 80~99% 노랑, 80% 미만 빨강(설계 문서 「신호등 규칙」)
const LEGEND = [['green', '100% 이상'], ['yellow', '80~99%'], ['red', '80% 미만']] as const
const PENDING = '원천 칸 신설 전'
const off = (r?: Row) => !r || r.value === PENDING || r.value === '미상'

// 값은 있는데 색이 없는 줄(표본 20곳 미만 코호트, 분모 없음 등 brain-weekly lit=False): 빈 점. 값 자체가 없는 줄(원천 칸 신설 전, 미상)은 회색 점(261113 감사 #33)
export const plain = (r?: Row) => !off(r) && !r!.light

export function Dot({ light, hollow = false, className = '' }: { light?: Row['light']; hollow?: boolean; className?: string }) {
  return <i className={`block h-2 w-2 shrink-0 rounded-full ${light ? DOT[light] : hollow ? 'border border-neutral-400' : 'bg-neutral-600'} ${className}`} />
}

// 「3/20곳 (15%)」는 15% 를 크게, 3/20곳 을 작게. 모양이 다르면 그대로
export const split = (v: string) => {
  const m = /^(.+?) \((.+)\)$/.exec(v)
  return m ? [m[2], m[1]] : [v, '']
}

// 「10월 같은 기간(10/1~10/15)」 → 머리글 이름과 기간 둘로
const head = (s: string) => {
  const m = /^(.+?)\s*\((.+)\)$/.exec(s)
  return m ? [m[1], m[2]] : [s, '']
}

export function SignalLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 ${className}`}>
      <span>목표 달성률</span>
      {LEGEND.map(([c, t]) => (
        <span key={c} className="inline-flex items-center gap-1.5"><Dot light={c} />{t}</span>
      ))}
      <span className="inline-flex items-center gap-1.5"><Dot hollow />색 없음(참고 값)</span>
      <span className="inline-flex items-center gap-1.5"><Dot />값 없음</span>
    </div>
  )
}

const th = 'whitespace-nowrap px-3 py-2 text-right font-medium'
const Head = ({ s, className }: { s: string; className: string }) => {
  const [a, b] = head(s)
  return <th className={`${th} ${className}`}>{a}{b && <span className="block text-xs font-normal text-neutral-600">{b}</span>}</th>
}

// 칸을 보일지는 화면 폭이 아니라 표가 놓인 상자 폭으로 정함(@container: 어드민 사이드바, 카드 안쪽 여백과 상관없이 맞음). Tailwind 클래스는 정적 문자열이라 경우별로 적어 둠
// 상자 폭 672px(@2xl)부터 목표, 달성률 칸. 주차 칸은 주차와 비교 칸이 3개 이하면 1024px(@5xl), 4개 이상이면 1152px(@6xl)부터.
// 기준 칸은 주차 칸이 없으면 896px(@4xl), 3개 이하면 1280px(@7xl)부터, 4개 이상이면 늘 지표 이름 아래(5주차 달은 칸이 모자람)
const LAYOUT = {
  0: { wk: '', col: '@4xl:table-cell', in: '@4xl:hidden', lab: 'w-full @4xl:w-auto', nw: '@4xl:whitespace-nowrap' },
  3: { wk: '@5xl:table-cell', col: '@7xl:table-cell', in: '@7xl:hidden', lab: 'w-full @7xl:w-auto', nw: '@7xl:whitespace-nowrap' },
  6: { wk: '@6xl:table-cell', col: '', in: '', lab: 'w-full', nw: '' },
} as const

// 묶음마다 머리 줄, 줄마다 지표 | 값 | 목표 | 달성률 | (주차별, 비교) | 기준. 좁으면 목표, 달성률, 기준을 지표와 값 아래로 내림.
// 주차별과 비교 칸은 좁은 상자에선 빠짐(값은 넓은 화면이나 보고서 원문에서). 감싸는 overflow 상자를 두지 않음(ⓘ 말풍선이 잘림)
export function SignalTable({ groups, weeks, mtd, missing = '값 없음' }: { groups: [string, Item[]][]; weeks?: { label: string; span: string }[]; mtd?: string; missing?: string }) {
  const rows = groups.flatMap(([, xs]) => xs.map((x) => x.row))
  const hasMtd = !!mtd && rows.some((r) => r?.mtd)
  const n = (weeks?.length ?? 0) + (hasMtd ? 1 : 0)
  const L = LAYOUT[n === 0 ? 0 : n <= 3 ? 3 : 6]
  const mid = 'hidden @2xl:table-cell'
  return (
    <div className="@container">
      <table className="w-full text-[13px]">
        <thead className="text-xs text-neutral-500">
          <tr className="border-b border-neutral-800">
            <th className={`py-2 pr-3 text-left font-medium ${L.lab}`}>지표</th>
            <th className={th}>값</th>
            <th className={`${th} ${mid}`}>목표</th>
            <th className={`${th} ${mid}`}>달성률</th>
            {weeks?.map((w) => <Head key={w.label} s={`${w.label}(${w.span})`} className={`hidden ${L.wk}`} />)}
            {hasMtd && <Head s={mtd!} className={`hidden ${L.wk}`} />}
            <th className={`hidden w-full py-2 pl-3 text-left font-medium ${L.col}`}>기준</th>
          </tr>
        </thead>
        {groups.map(([g, items], gi) => (
          <tbody key={g}>
            {/* 팀(묶음) 머리: 띠와 색별 개수로 팀 사이를 확실히 가름. 표 칸에는 둥근 모서리가 안 먹어서 안쪽 div 에 줌 */}
            <tr>
              <td colSpan={99} className={gi ? 'pt-7' : 'pt-3'}>
                <div className="flex items-center gap-3 rounded-md bg-neutral-800/70 px-3 py-2">
                  <span className="text-sm font-semibold text-neutral-100">{g}</span>
                  <span className="text-xs text-neutral-500">{items.length}개</span>
                  <span className="ml-auto flex items-center gap-3 text-xs tabular-nums text-neutral-400">
                    {(['red', 'yellow', 'green'] as const).map((c) => {
                      const k = items.filter((x) => x.row?.light === c).length
                      return k ? <span key={c} className="inline-flex items-center gap-1.5"><Dot light={c} />{k}</span> : null
                    })}
                  </span>
                </div>
              </td>
            </tr>
            {items.map(({ label, code, row: r }) => {
              const [big, sub] = r && !off(r) ? split(r.value) : ['', '']
              const tip = [r?.define && `정의: ${r.define}`, r?.imply && `함의: ${r.imply}`].filter(Boolean).join('\n')
              const small = [r?.target && `목표 ${r.target}`, r?.rate != null && `달성 ${r.rate}%`].filter(Boolean).join(', ')
              return (
                <tr key={label} className="border-b border-neutral-800/60 align-top">
                  <td className={`py-2 pr-3 ${L.nw}`}>
                    <span className="flex items-start gap-2">
                      <Dot light={r?.light} hollow={plain(r)} className="mt-1.5" />
                      <span className="min-w-0">
                        <span className={off(r) ? 'text-neutral-500' : 'text-neutral-200'}>
                          {code && <span className="mr-1 font-mono text-xs text-neutral-500">{code}</span>}
                          {label}
                          {tip && <span className="ml-1 inline-flex align-[-2px]"><Info text={tip} /></span>}
                        </span>
                        {r?.note && <span className={`block text-xs leading-snug text-neutral-500 ${L.in}`}>{r.note}</span>}
                      </span>
                    </span>
                  </td>
                  {/* 좁은 상자(@md 아래)에선 값 칸도 줄바꿈: 안 그러면 「목표, 달성」 줄 폭만큼 지표 이름 칸이 찌그러짐 */}
                  <td className="px-3 py-2 text-right tabular-nums @md:whitespace-nowrap">
                    {off(r) ? (
                      <span className="text-xs text-neutral-500">{r ? r.value : missing}</span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-neutral-50">{big}</span>
                        {sub && <span className="ml-1.5 text-xs text-neutral-500">{sub}</span>}
                      </>
                    )}
                    {small && <span className="block text-xs text-neutral-500 @2xl:hidden">{small}</span>}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-400 ${mid}`}>{r?.target}</td>
                  <td className={`px-3 py-2 ${mid}`}>
                    {r?.rate != null && (
                      <span className="flex items-center justify-end gap-2 tabular-nums">
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-800">
                          <i className={`block h-full rounded-full ${r.light ? DOT[r.light] : 'bg-neutral-500'}`} style={{ width: `${Math.min(r.rate, 100)}%` }} />
                        </span>
                        <span className="w-11 text-right text-neutral-200">{r.rate}%</span>
                      </span>
                    )}
                  </td>
                  {weeks?.map((w, i) => (
                    <td key={w.label} className={`hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-300 ${L.wk}`}>{r?.weeks?.[i]}</td>
                  ))}
                  {hasMtd && <td className={`hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-400 ${L.wk}`}>{r?.mtd}</td>}
                  <td className={`hidden py-2 pl-3 text-xs leading-relaxed text-neutral-500 ${L.col}`}>{r?.note}</td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}
