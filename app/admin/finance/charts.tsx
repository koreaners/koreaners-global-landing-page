'use client'

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const compact = (n: number) => {
  const a = Math.abs(n)
  const s = a >= 1e8 ? `${+(a / 1e8).toFixed(1)}억` : a >= 1e4 ? `${Math.round(a / 1e4).toLocaleString('ko-KR')}만` : `${Math.round(a)}`
  return n < 0 ? `−${s}` : s
}
// 1, 2, 5 × 10^k 간격으로 4칸 안팎(2.6억, 1.9억 같은 눈금 대신 1억, 2억, 3억). min이 음수면 0 아래로도
function niceTicks(max: number, min = 0) {
  const span = Math.max(max, -min)
  if (span <= 0) return [0]
  const raw = span / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((k) => k * mag).find((v) => v >= raw)!
  const lo = Math.floor(min / step)
  return Array.from({ length: Math.ceil(max / step) - lo + 1 }, (_, i) => (lo + i) * step)
}
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`

// 개요 탭 월별 유출입: 입금, 출금 막대와 순증감(입금 − 출금) 선. 한 축(원)
export type FlowPoint = { label: string; in: number; out: number; net: number }
export const NET_COLOR = '#e5e5e5'

export function CashflowChart({ data, inColor, outColor, names }: { data: FlowPoint[]; inColor: string; outColor: string; names: { in: string; out: string; net: string } }) {
  const ticks = niceTicks(Math.max(0, ...data.flatMap((d) => [d.in, d.out, d.net])), Math.min(0, ...data.map((d) => d.net)))
  const colors = { in: inColor, out: outColor, net: NET_COLOR }
  return (
    <div className="h-72 w-full text-xs">
      <ResponsiveContainer>
        <ComposedChart data={data} barGap={2} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#262626" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#404040' }} tick={{ fill: '#8a8a8a' }} />
          <YAxis tickLine={false} axisLine={false} width={60} tick={{ fill: '#8a8a8a' }} tickFormatter={compact} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} />
          <ReferenceLine y={0} stroke="#525252" />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="space-y-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2">
                  <p className="text-neutral-400">{label}</p>
                  {payload.map((p) => {
                    const k = p.dataKey as keyof typeof names
                    return (
                      <p key={k} className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-neutral-400">
                          <span className="h-0.5 w-3" style={{ background: colors[k] }} />
                          {names[k]}
                        </span>
                        <span className="font-medium tabular-nums text-neutral-50">{won(Number(p.value))}</span>
                      </p>
                    )
                  })}
                </div>
              ) : null
            }
          />
          <Bar dataKey="in" fill={inColor} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="out" fill={outColor} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          <Line dataKey="net" stroke={NET_COLOR} strokeWidth={2} dot={{ r: 3, fill: NET_COLOR, strokeWidth: 0 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
