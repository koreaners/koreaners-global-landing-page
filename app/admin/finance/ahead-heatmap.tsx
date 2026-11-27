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
  const [split, setSplit] = useState('')
  // 여러 명이 나눠 맡으면 1인당 필요 인원(주간 잡도 정담당 n분의 1로 셈)
  const k = Math.max(1, Math.floor(Number(split)) || 1)
  const n = Number(need) > 0 ? Math.ceil(Number(need) / k) : 0
  // cols[0] = 지금, cols[i] = dates[i-1]. 시작일 이전(또는 같은) 마지막 칸
  const at = start ? dates.filter((d) => d <= start).length : 0
  const first = (r: HeatRow) => (n > 0 ? r.free.findIndex((f, i) => i >= at && f >= n) : -1)
  const rank = (rs: HeatRow[]) => [...rs].sort((a, b) => b.free[at] - a.free[at])
  const td = 'py-1 pl-3 text-right tabular-nums'
  const head = ['담당', `${cols[at]} 여유`, ...(n > 0 ? [`${n}명 받을 수 있는 날`] : [])]
  const span = head.length + cols.length + 2
  const sub = (t: string) => (
    <tr><td colSpan={span} className="border-t border-neutral-800 pt-2 text-xs text-neutral-500">{t}</td></tr>
  )
  // 한 표: 순위 줄 + 주별 칸(시작 주 열 강조, 그 앞 주는 흐리게)
  const line = (muted: boolean) => (r: HeatRow) => {
    const f = r.free[at]
    const ok = n > 0 && f >= n
    const k = first(r)
    return (
      <tr key={r.name} className={n > 0 && !ok ? 'opacity-40' : muted ? 'opacity-80' : ''}>
        <td className="sticky left-0 z-10 max-w-32 truncate bg-neutral-900 py-1 pr-3 text-neutral-200">{ok ? '✓ ' : ''}{r.name}</td>
        <td className={`${td} font-medium ${ink(f, cap)}`}>{f}명</td>
        {n > 0 && <td className={`${td} whitespace-nowrap text-neutral-300`}>{ok ? '바로' : k > 0 ? `${cols[k]}부터` : '12주 안엔 없음'}</td>}
        {r.free.map((x, i) => (
          <td key={i} className={`px-0.5 py-0.5 ${start && i < at ? 'opacity-40' : ''}`}>
            <span title={r.est[i] >= 0.5 ? `추정 종료로 풀린 ${Math.round(r.est[i])}명 포함` : undefined}
              className={`block rounded py-1 text-center text-xs tabular-nums ${tone(x, cap)} ${start && i === at ? 'ring-1 ring-neutral-200' : ''} ${r.est[i] >= 0.5 ? 'underline decoration-dotted underline-offset-2' : ''}`}>{x}</span>
          </td>
        ))}
        <td className={`${td} ${r.stale === '-' ? 'text-neutral-600' : 'text-neutral-300'}`}>{r.stale}</td>
        <td className={`${td} ${r.soon === '-' ? 'text-neutral-600' : 'text-neutral-300'}`}>{r.soon}</td>
      </tr>
    )
  }
  const okCount = n > 0 ? [...ops, ...rest].filter((r) => r.free[at] >= n).length : 0
  const total = ops.reduce((s, r) => s + Math.max(0, r.free[at]), 0)
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
        <label className="flex items-center gap-2">
          <input type="number" min={1} inputMode="numeric" value={split} placeholder="1" onChange={(e) => setSplit(e.target.value)}
            className="w-14 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-right text-neutral-100 tabular-nums" />
          명이서 나눠 맡기
        </label>
        <span className="text-xs text-neutral-500">
          {n > 0
            ? `${cols[at]} 기준${k > 1 ? ` 1인당 ${n}명,` : ''} ${okCount}명 가능${okCount < k ? `(${k}명 필요, 부족)` : ''}`
            : '시작일을 비우면 지금 기준'}
          {` · 운영팀 여유 합계 ${total}명`}
        </span>
        {(start || need || split) && (
          <button type="button" onClick={() => { setStart(''); setNeed(''); setSplit('') }} className="text-xs text-neutral-400 underline hover:text-neutral-200">지우기</button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="whitespace-nowrap text-xs text-neutral-500">
              {head.map((h, i) => <th key={h} className={`pb-1.5 font-normal ${i ? 'pl-3 text-right' : 'sticky left-0 z-10 bg-neutral-900 pr-3 text-left'}`}>{h}</th>)}
              {cols.map((c, i) => <th key={c} className={`w-12 min-w-12 pb-1.5 text-center font-normal ${start && i === at ? 'text-neutral-100' : ''}`}>{c}</th>)}
              <th className="pb-1.5 pl-3 text-right font-normal">정리 필요</th>
              <th className="pb-1.5 pl-3 text-right font-normal">곧 시작</th>
            </tr>
          </thead>
          <tbody>
            {rank(ops).map(line(false))}
            {rest.length > 0 && sub('운영팀 밖 담당, 미배정, 인계 미지정')}
            {rank(rest).map(line(true))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
