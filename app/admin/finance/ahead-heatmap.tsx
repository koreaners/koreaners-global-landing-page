'use client'
// 리소스 예측(인혁 261127): 시작일과 필요 인원을 넣으면 받을 수 있는 사람 순위, 주별 칸은 접어서.
// 칸 값은 상한 − 그 주에도 진행 중일 크리에이터 수. 새 안건은 칸에 안 들어가 여유는 시간이 갈수록 늘기만 하므로
// 기간 중 최저 여유는 늘 시작일 값(종료일 입력 불필요). 시작일이 칸 사이면 앞 칸(보수적)
import { useState } from 'react'

export type HeatRow = { name: string; free: number[]; est: number[]; stale: string; soon: string }

const tone = (f: number, cap: number) => (f <= 0 ? 'bg-red-500/45 text-red-50' : f < cap * 0.2 ? 'bg-amber-400/35 text-amber-50' : 'bg-emerald-500/15 text-neutral-100')
const ink = (f: number, cap: number) => (f <= 0 ? 'text-red-400' : f < cap * 0.2 ? 'text-amber-300' : 'text-neutral-100')

export function AheadHeatmap({ cap, cols, dates, ops, rest }: { cap: number; cols: string[]; dates: string[]; ops: HeatRow[]; rest: HeatRow[] }) {
  const [start, setStart] = useState('')
  const [need, setNeed] = useState('')
  const n = Number(need) || 0
  // cols[0] = 지금, cols[i] = dates[i-1]. 시작일 이전(또는 같은) 마지막 칸
  const at = start ? dates.filter((d) => d <= start).length : 0
  const first = (r: HeatRow) => (n > 0 ? r.free.findIndex((f, i) => i >= at && f >= n) : -1)
  const rank = (rs: HeatRow[]) => [...rs].sort((a, b) => b.free[at] - a.free[at])
  const td = 'py-1.5 pl-3 text-right tabular-nums'
  const sub = (t: string, span: number) => (
    <tr><td colSpan={span} className="border-t border-neutral-800 pt-2 text-xs text-neutral-500">{t}</td></tr>
  )
  const line = (muted: boolean) => (r: HeatRow) => {
    const f = r.free[at]
    const ok = n > 0 && f >= n
    const k = first(r)
    return (
      <tr key={r.name} className={n > 0 && !ok ? 'opacity-40' : muted ? 'opacity-80' : ''}>
        <td className="max-w-40 truncate py-1.5 pr-3 text-neutral-200">{n > 0 && ok ? '✓ ' : ''}{r.name}</td>
        <td className={`${td} font-medium ${ink(f, cap)}`}>{f}명</td>
        {n > 0 && <td className={`${td} text-neutral-300`}>{ok ? '바로' : k > 0 ? `${cols[k]}부터` : '12주 안엔 없음'}</td>}
        <td className={`${td} ${r.stale === '-' ? 'text-neutral-600' : 'text-neutral-300'}`}>{r.stale}</td>
        <td className={`${td} ${r.soon === '-' ? 'text-neutral-600' : 'text-neutral-300'}`}>{r.soon}</td>
      </tr>
    )
  }
  const head = ['담당', `${cols[at]} 여유`, ...(n > 0 ? [`${n}명 받을 수 있는 날`] : []), '정리 필요', '곧 시작']
  const okCount = n > 0 ? [...ops, ...rest].filter((r) => r.free[at] >= n).length : 0
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-400">
        <label className="flex items-center gap-2">
          시작일
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 [color-scheme:dark]" />
        </label>
        <label className="flex items-center gap-2">
          필요 인원
          <input type="number" min={0} inputMode="numeric" value={need} onChange={(e) => setNeed(e.target.value)}
            className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-right text-neutral-100 tabular-nums" />
          명
        </label>
        <span className="text-xs text-neutral-500">
          {n > 0 ? `${cols[at]} 기준 ${okCount}명 가능` : '시작일을 비우면 지금 기준'}
        </span>
        {(start || need) && (
          <button type="button" onClick={() => { setStart(''); setNeed('') }} className="text-xs text-neutral-400 underline hover:text-neutral-200">지우기</button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="whitespace-nowrap text-xs text-neutral-500">
            {head.map((h, i) => <th key={h} className={`pb-1.5 font-normal ${i ? 'pl-3 text-right' : 'pr-3 text-left'}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rank(ops).map(line(false))}
          {rest.length > 0 && sub('운영팀 밖 담당, 미배정, 인계 미지정', head.length)}
          {rank(rest).map(line(true))}
        </tbody>
      </table>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-200">주별 여유 보기</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[48rem] table-fixed text-sm">
            <thead>
              <tr className="whitespace-nowrap text-xs text-neutral-500">
                <th className="sticky left-0 z-10 w-32 bg-neutral-900 pb-1.5 pr-3 text-left font-normal">담당</th>
                {cols.map((c, i) => <th key={c} className={`w-12 pb-1.5 text-center font-normal ${i === at && start ? 'text-neutral-100' : ''}`}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...ops, ...rest].map((r) => (
                <tr key={r.name}>
                  <td className="sticky left-0 z-10 max-w-32 truncate bg-neutral-900 pr-3 text-neutral-200">{r.name}</td>
                  {r.free.map((f, i) => (
                    <td key={i} className="px-0.5 py-0.5">
                      <span title={r.est[i] >= 0.5 ? `추정 종료로 풀린 ${Math.round(r.est[i])}명 포함` : undefined}
                        className={`block rounded py-1 text-center text-xs tabular-nums ${tone(f, cap)} ${r.est[i] >= 0.5 ? 'underline decoration-dotted underline-offset-2' : ''}`}>{f}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
