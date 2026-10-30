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
// count: 크리에이터 월별 안건 수. 있으면 오른쪽 보조축(건)에 선으로(Leo 261028 「안건수도 라인으로」)
export type FlowPoint = { label: string; in: number; out: number; net: number | null; count?: number }
export const NET_COLOR = '#e5e5e5'

export function CashflowChart({ data, inColor, outColor, names }: { data: FlowPoint[]; inColor: string; outColor: string; names: { in: string; out: string; net: string; count?: string } }) {
  const ticks = niceTicks(Math.max(0, ...data.flatMap((d) => [d.in, d.out, d.net ?? 0])), Math.min(0, ...data.map((d) => d.net ?? 0)))
  const colors = { in: inColor, out: outColor, net: NET_COLOR, count: NET_COLOR }
  const hasCount = data.some((d) => d.count != null)
  return (
    <div className="h-72 w-full text-xs">
      <ResponsiveContainer>
        <ComposedChart data={data} barGap={2} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#262626" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#404040' }} tick={{ fill: '#8a8a8a' }} />
          <YAxis tickLine={false} axisLine={false} width={60} tick={{ fill: '#8a8a8a' }} tickFormatter={compact} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} />
          {hasCount && <YAxis yAxisId="n" orientation="right" tickLine={false} axisLine={false} width={36} allowDecimals={false} tick={{ fill: '#8a8a8a' }} tickFormatter={(n) => `${n}건`} />}
          <ReferenceLine y={0} stroke="#525252" />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="space-y-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2">
                  <p className="text-neutral-400">{label}</p>
                  {payload.filter((p) => p.value != null).map((p) => {
                    const k = p.dataKey as keyof typeof names
                    return (
                      <p key={k} className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-neutral-400">
                          <span className="h-0.5 w-3" style={{ background: colors[k] }} />
                          {names[k]}
                        </span>
                        <span className="font-medium tabular-nums text-neutral-50">{k === 'count' ? `${p.value}건` : won(Number(p.value))}</span>
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
          {hasCount && <Line yAxisId="n" dataKey="count" stroke={NET_COLOR} strokeWidth={2} dot={{ r: 3, fill: NET_COLOR, strokeWidth: 0 }} isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// 지표 모니터링: 한 축 차트. 막대는 stack 이 같으면 쌓고, 목표는 점선. 툴팁은 점에 `${key}_t` 글자가 있으면 그것을, title 이 있으면 머리에
export type TrendSeries = { key: string; name: string; color: string; kind: 'bar' | 'line'; stack?: string }
export type TrendPoint = { label: string; title?: string } & Record<string, string | number | null | undefined>

// unit: 서버 화면에서 넘기므로 함수 대신 단위 글자. % 는 이미 100을 곱한 값
/** dense: 라벨이 많은 주별 차트, x축 라벨이 겹치면 사이 라벨을 건너뜀(월별은 전부 표시) */
export function TrendChart({ data, series, unit, goal, dense }: { data: TrendPoint[]; series: TrendSeries[]; unit: '건' | '곳' | '%' | '원'; goal?: number; dense?: boolean }) {
  const fmt = (n: number) => (unit === '원' ? compact(n) : `${+n.toFixed(1)}${unit}`)
  const max = Math.max(goal ?? 0, ...data.map((d) => {
    const by: Record<string, number> = {}
    for (const s of series) by[s.stack ?? s.key] = (by[s.stack ?? s.key] ?? 0) + (Number(d[s.key]) || 0)
    return Math.max(0, ...Object.values(by))
  }))
  const ticks = niceTicks(max)
  const lastOf = (s: TrendSeries) => !s.stack || series.filter((x) => x.stack === s.stack).at(-1) === s
  return (
    <div className="space-y-3">
      {(series.length > 1 || goal != null) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
          {series.length > 1 && series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <i className={`block ${s.kind === 'bar' ? 'h-2.5 w-2.5 rounded-sm' : 'h-0.5 w-3'}`} style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
          {/* 목표 값은 선 위 글자 대신 범례에(선 위에 두면 데이터 점과 겹침, QA 261029) */}
          {goal != null && (
            <span className="inline-flex items-center gap-1.5">
              <i className="block w-3 border-t border-dashed border-[#737373]" />
              목표 {fmt(goal)}
            </span>
          )}
        </div>
      )}
      <div className="h-56 w-full text-xs">
        <ResponsiveContainer>
          <ComposedChart data={data} barGap={2} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#262626" />
            <XAxis dataKey="label" interval={dense ? 'preserveStartEnd' : 0} minTickGap={4} tickLine={false} axisLine={{ stroke: '#404040' }} tick={{ fill: '#8a8a8a' }} />
            <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: '#8a8a8a' }} tickFormatter={fmt} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
            {goal != null && (
              <ReferenceLine y={goal} stroke="#737373" strokeDasharray="4 4" />
            )}
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="space-y-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2">
                    <p className="text-neutral-400">{(payload[0].payload as TrendPoint).title ?? label}</p>
                    {series.map((s) => {
                      const d = payload[0].payload as TrendPoint
                      const v = d[s.key]
                      if (v == null) return null
                      return (
                        <p key={s.key} className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-1.5 text-neutral-400">
                            <span className="h-0.5 w-3" style={{ background: s.color }} />
                            {s.name}
                          </span>
                          <span className="font-medium tabular-nums text-neutral-50">{d[`${s.key}_t`] ?? fmt(Number(v))}</span>
                        </p>
                      )
                    })}
                  </div>
                ) : null
              }
            />
            {series.map((s) =>
              s.kind === 'bar' ? (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId={s.stack} fill={s.color} radius={lastOf(s) ? [4, 4, 0, 0] : 0} maxBarSize={18} isAnimationActive={false} />
              ) : (
                <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 4, fill: s.color, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
