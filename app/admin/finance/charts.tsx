'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// 개요 탭 월별 막대. 한 축(원), 올해는 계열색, 전년 같은 달은 회색
export type MonthPoint = { label: string; cur: number; prev: number }

export const PREV_COLOR = '#525252'
const compact = (n: number) => (n >= 1e8 ? `${+(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : `${Math.round(n)}`)
// 0부터 1, 2, 5 × 10^k 간격으로 4칸 안팎(2.6억, 1.9억 같은 눈금 대신 1억, 2억, 3억)
function niceTicks(max: number) {
  if (max <= 0) return [0]
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((k) => k * mag).find((v) => v >= raw)!
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`

export function MonthlyChart({ data, color, curLabel, prevLabel }: { data: MonthPoint[]; color: string; curLabel: string; prevLabel: string }) {
  const ticks = niceTicks(Math.max(0, ...data.flatMap((d) => [d.cur, d.prev])))
  return (
    <div className="h-60 w-full text-xs">
      <ResponsiveContainer>
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#262626" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#404040' }} tick={{ fill: '#8a8a8a' }} />
          <YAxis tickLine={false} axisLine={false} width={60} tick={{ fill: '#8a8a8a' }} tickFormatter={compact} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="space-y-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2">
                  <p className="text-neutral-400">{label}</p>
                  {[...payload].reverse().map((p) => (
                    <p key={String(p.dataKey)} className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <span className="h-0.5 w-3" style={{ background: p.dataKey === 'cur' ? color : PREV_COLOR }} />
                        {p.dataKey === 'cur' ? curLabel : prevLabel}
                      </span>
                      <span className="font-medium tabular-nums text-neutral-50">{won(Number(p.value))}</span>
                    </p>
                  ))}
                </div>
              ) : null
            }
          />
          <Bar dataKey="prev" fill={PREV_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="cur" fill={color} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
