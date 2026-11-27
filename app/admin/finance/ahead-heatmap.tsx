'use client'
// 리소스 예측 히트맵(인혁 261127): 사람 × 주. 칸 값은 상한 − 그 주에도 진행 중일 크리에이터 수.
// 주 머리글을 끌어 안건 기간을 고르고 필요 인원을 넣으면, 그 기간 최저 여유가 큰 순으로 줄을 세우고 받을 수 있는 사람만 밝게
import { useEffect, useState, type PointerEvent } from 'react'

export type HeatRow = { name: string; free: number[]; est: number[]; stale: string; soon: string }

const tone = (f: number, cap: number) => (f <= 0 ? 'bg-red-500/45 text-red-50' : f < cap * 0.2 ? 'bg-amber-400/35 text-amber-50' : 'bg-emerald-500/15 text-neutral-100')

export function AheadHeatmap({ cap, cols, ops, rest }: { cap: number; cols: string[]; ops: HeatRow[]; rest: HeatRow[] }) {
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [anchor, setAnchor] = useState<number | null>(null)
  const [need, setNeed] = useState('')
  useEffect(() => {
    const up = () => setAnchor(null)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])
  // 터치는 누른 칸이 포인터를 잡아 pointerenter가 안 오므로 좌표로 칸을 찾음
  const colAt = (e: PointerEvent) => Number((document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-col]')?.getAttribute('data-col') ?? NaN)
  const down = (e: PointerEvent) => {
    const i = colAt(e)
    if (Number.isNaN(i)) return
    setAnchor(i)
    setSel([i, i])
  }
  const move = (e: PointerEvent) => {
    if (anchor == null) return
    const i = colAt(e)
    if (!Number.isNaN(i)) setSel([Math.min(anchor, i), Math.max(anchor, i)])
  }
  const n = Number(need) || 0
  const range = sel ?? (n ? ([0, 0] as [number, number]) : null)
  const low = (r: HeatRow) => (range ? Math.min(...r.free.slice(range[0], range[1] + 1)) : 0)
  const order = (rs: HeatRow[]) => (range ? [...rs].sort((a, b) => low(b) - low(a)) : rs)
  const inSel = (i: number) => !!range && i >= range[0] && i <= range[1]
  const cell = 'px-0.5 py-0.5'
  const line = (muted: boolean) => (r: HeatRow) => {
    const dim = n > 0 && low(r) < n
    return (
      <tr key={r.name} className={dim ? 'opacity-30' : muted ? 'opacity-80' : ''}>
        <td className="sticky left-0 z-10 max-w-32 truncate bg-neutral-900 pr-3 text-neutral-200">{r.name}</td>
        <td className={`${cell} pr-1 text-right tabular-nums font-medium ${range ? (low(r) <= 0 ? 'text-red-400' : low(r) < cap * 0.2 ? 'text-amber-300' : 'text-neutral-100') : 'text-neutral-700'}`}>{range ? `${low(r)}명` : '-'}</td>
        {r.free.map((f, i) => (
          <td key={i} className={cell}>
            <span title={r.est[i] >= 0.5 ? `추정 종료로 풀린 ${Math.round(r.est[i])}명 포함` : undefined}
              className={`block rounded py-1 text-center text-xs tabular-nums ${tone(f, cap)} ${inSel(i) ? 'ring-1 ring-neutral-200' : ''} ${r.est[i] >= 0.5 ? 'underline decoration-dotted underline-offset-2' : ''}`}>{f}</span>
          </td>
        ))}
        <td className={`pl-3 text-right tabular-nums ${r.stale === '-' ? 'text-neutral-600' : 'text-neutral-300'}`}>{r.stale}</td>
        <td className={`pl-3 text-right tabular-nums ${r.soon === '-' ? 'text-neutral-600' : 'text-neutral-300'}`}>{r.soon}</td>
      </tr>
    )
  }
  const sub = (t: string) => (
    <tr><td colSpan={cols.length + 4} className="border-t border-neutral-800 pt-2 text-xs text-neutral-500">{t}</td></tr>
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-neutral-400">
          필요 인원
          <input type="number" min={0} inputMode="numeric" value={need} onChange={(e) => setNeed(e.target.value)}
            className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-right text-neutral-100 tabular-nums" />
          명
        </label>
        <span className="text-xs text-neutral-500">
          {sel ? `기간 ${cols[sel[0]]} ~ ${cols[sel[1]]}` : '주 머리글을 끌어 안건 기간을 고르세요'}{n > 0 && !sel ? ' (기간을 안 고르면 지금 기준)' : ''}
        </span>
        {(sel || need) && (
          <button type="button" onClick={() => { setSel(null); setNeed('') }} className="text-xs text-neutral-400 underline hover:text-neutral-200">지우기</button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] table-fixed text-sm">
          <thead>
            <tr className="whitespace-nowrap text-xs text-neutral-500">
              <th className="sticky left-0 z-10 w-32 bg-neutral-900 pb-1.5 pr-3 text-left font-normal">담당</th>
              <th className="w-16 pb-1.5 pr-1 text-right font-normal">기간 최저</th>
              {cols.map((c, i) => (
                <th key={c} data-col={i} onPointerDown={down} onPointerMove={move}
                  className={`w-12 cursor-col-resize touch-none select-none rounded pb-1.5 pt-1 text-center font-normal ${inSel(i) ? 'bg-neutral-700 text-neutral-50' : 'hover:text-neutral-200'}`}>{c}</th>
              ))}
              <th className="w-28 pb-1.5 pl-3 text-right font-normal">정리 필요</th>
              <th className="w-24 pb-1.5 pl-3 text-right font-normal">곧 시작</th>
            </tr>
          </thead>
          <tbody>
            {order(ops).map(line(false))}
            {rest.length > 0 && sub('운영팀 밖 담당, 미배정, 인계 미지정')}
            {order(rest).map(line(true))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
