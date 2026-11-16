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
  return <th className={`${th} ${className}`}>{a}{b && <span className="block text-[11px] font-normal text-neutral-600">{b}</span>}</th>
}

// 묶음마다 머리 줄, 줄마다 지표 | 값 | 목표 | 달성률 | (주차별, 비교) | 기준. 좁은 화면은 목표와 기준을 지표, 값 아래로 내림.
// 감싸는 overflow 상자를 두지 않음(ⓘ 말풍선이 잘림). 그래서 넓은 칸은 화면 폭에 따라 숨김
export function SignalTable({ groups, weeks, mtd, missing = '값 없음' }: { groups: [string, Item[]][]; weeks?: { label: string; span: string }[]; mtd?: string; missing?: string }) {
  const rows = groups.flatMap(([, xs]) => xs.map((x) => x.row))
  const hasMtd = !!mtd && rows.some((r) => r?.mtd)
  // 주차가 4주 이상인 달은 칸이 많아 기준 칸이 좁아짐: 아주 넓은 화면 전까진 기준을 지표 이름 아래로
  const wide = (weeks?.length ?? 0) + (hasMtd ? 1 : 0) >= 4
  const [noteCol, noteIn] = wide ? ['2xl:table-cell', '2xl:hidden'] : ['md:table-cell', 'md:hidden']
  return (
    <table className="w-full text-[13px]">
      <thead className="text-xs text-neutral-500">
        <tr className="border-b border-neutral-800">
          <th className="py-2 pr-3 text-left font-medium">지표</th>
          <th className={th}>값</th>
          <th className={`${th} hidden sm:table-cell`}>목표</th>
          <th className={`${th} hidden sm:table-cell`}>달성률</th>
          {weeks?.map((w) => <Head key={w.label} s={`${w.label}(${w.span})`} className="hidden lg:table-cell" />)}
          {hasMtd && <Head s={mtd!} className="hidden lg:table-cell" />}
          <th className={`hidden w-full py-2 pl-3 text-left font-medium ${noteCol}`}>기준</th>
        </tr>
      </thead>
      {groups.map(([g, items]) => (
        <tbody key={g}>
          <tr>
            <td colSpan={99} className="border-b border-neutral-800 pb-1.5 pt-5 text-xs font-semibold text-neutral-300">{g}</td>
          </tr>
          {items.map(({ label, code, row: r }) => {
            const [big, sub] = r && !off(r) ? split(r.value) : ['', '']
            const tip = [r?.define && `정의: ${r.define}`, r?.imply && `함의: ${r.imply}`].filter(Boolean).join('\n')
            return (
              <tr key={label} className="border-b border-neutral-800/60 align-top">
                <td className={`py-2 pr-3 ${wide ? '' : 'md:whitespace-nowrap'}`}>
                  <span className="flex items-start gap-2">
                    <Dot light={r?.light} hollow={plain(r)} className="mt-1.5" />
                    <span className="min-w-0">
                      <span className={off(r) ? 'text-neutral-500' : 'text-neutral-200'}>
                        {code && <span className="mr-1 font-mono text-[11px] text-neutral-500">{code}</span>}
                        {label}
                        {tip && <span className="ml-1 inline-flex align-[-2px]"><Info text={tip} /></span>}
                      </span>
                      {r?.note && <span className={`block text-[11px] leading-snug text-neutral-500 ${noteIn}`}>{r.note}</span>}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {off(r) ? (
                    <span className="text-xs text-neutral-500">{r ? r.value : missing}</span>
                  ) : (
                    <>
                      <span className="text-[15px] font-semibold text-neutral-50">{big}</span>
                      {sub && <span className="ml-1.5 text-xs text-neutral-500">{sub}</span>}
                    </>
                  )}
                  {r?.target && <span className="block text-[11px] text-neutral-500 sm:hidden">목표 {r.target}</span>}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-400 sm:table-cell">{r?.target}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
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
                  <td key={w.label} className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-300 lg:table-cell">{r?.weeks?.[i]}</td>
                ))}
                {hasMtd && <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-400 lg:table-cell">{r?.mtd}</td>}
                <td className={`hidden py-2 pl-3 text-xs leading-relaxed text-neutral-500 ${noteCol}`}>{r?.note}</td>
              </tr>
            )
          })}
        </tbody>
      ))}
    </table>
  )
}
