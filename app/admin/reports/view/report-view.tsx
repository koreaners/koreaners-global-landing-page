import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ColorKey, Legend, Ref, Seg, WeeklyReport } from '@/lib/reports'

// 보고서 의미 색 -> 어드민 다크 화면 색
const COLOR: Record<ColorKey, string> = {
  c1: '#3b82f6', c2: '#f97316', c3: '#525252', c4: '#a78bfa', ok: '#22c55e', bad: '#ef4444', hum: '#f59e0b',
}
const fill = (c?: ColorKey, o?: number) => (c ? { background: COLOR[c], opacity: o } : undefined)

// 링크는 같은 사이트 경로나 http(s)만. 데이터는 잡이 만들지만 화면에 그대로 꽂으므로 여기서 거른다
const safe = (h?: string | null) => (h && ((h.startsWith('/') && !h.startsWith('//')) || /^https?:\/\//.test(h)) ? h : undefined)

function Go({ href, className, children }: { href?: string | null; className: string; children: React.ReactNode }) {
  const h = safe(href)
  if (!h) return <div className={className}>{children}</div>
  return (
    <Link href={h} className={`group relative ${className} hover:border-neutral-600`}>
      <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-neutral-600 group-hover:text-neutral-300" />
      {children}
    </Link>
  )
}

function Bar({ segs }: { segs: Seg[] }) {
  const tot = segs.reduce((a, s) => a + s.v, 0) || 1
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-neutral-800">
      {segs.map((s, i) => (
        <i key={i} className="block h-full" style={{ width: `${(s.v / tot) * 100}%`, ...fill(s.c, s.o) }} />
      ))}
    </div>
  )
}

function Legends({ items }: { items: Legend[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
      {items.map((x) => (
        <span key={x.t} className="inline-flex items-center gap-1.5">
          <i className="block h-2 w-2 rounded-sm" style={fill(x.c, x.o)} />
          {x.t}
        </span>
      ))}
    </div>
  )
}

function Lines({ items }: { items: string[] }) {
  return items.length ? (
    <ul className="list-disc space-y-1 pl-4 text-sm text-neutral-300">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  ) : null
}

function Refs({ refs }: { refs: Ref[] }) {
  return refs.map((r, i) => {
    const h = safe(r.href)
    return (
      <span key={i}>
        {i > 0 && ', '}
        {h ? <a href={h} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{r.text}</a> : r.text}
      </span>
    )
  })
}

const card = 'rounded-xl border border-neutral-800 bg-neutral-900 p-4'
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="text-sm font-semibold text-neutral-200">{children}</h2>

export function ReportView({ r, back }: { r: WeeklyReport; back: React.ReactNode }) {
  const smax = Math.max(1, ...r.sales.bars.map((b) => b.v))
  const fmax = Math.max(1, ...r.funds.bars.map((b) => b.v))
  const pmax = Math.max(1, ...r.people.bars.map((b) => b.v))

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {back}
        <h1 className="text-xl font-semibold text-neutral-50">{r.title}</h1>
        <p className="text-xs text-neutral-500">
          {r.period.start} ~ {r.period.end} · 만든 시각 {new Date(r.generated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {r.tiles.map((t) => (
          <Go key={t.label} href={t.href} className={`flex flex-col gap-3 rounded-xl border p-4 ${t.alert ? 'border-red-900 bg-red-950/40' : 'border-neutral-800 bg-neutral-900'}`}>
            <span className="text-xs text-neutral-400">{t.label}</span>
            <div className={`min-h-[3.25rem] text-lg font-semibold leading-snug tabular-nums ${t.alert ? 'text-red-300' : 'text-neutral-50'}`}>
              {t.value.map((v) => <div key={v}>{v}</div>)}
              {t.sub && <span className="text-xs font-normal text-neutral-500">{t.sub}</span>}
            </div>
            <div className="mt-auto space-y-1">{t.bars.map((b, i) => <Bar key={i} segs={b} />)}</div>
            <Legends items={t.legend} />
          </Go>
        ))}
      </div>

      <section className="space-y-3">
        <H2>이번 주 결정할 것</H2>
        <div className="grid gap-3 md:grid-cols-3">
          {r.decisions.map((d) => (
            <Go key={d.title} href={d.href} className="flex flex-col gap-3 rounded-xl border border-neutral-800 border-t-4 border-t-red-500 bg-neutral-900 p-4">
              <div className="space-y-1 pr-5">
                <h3 className="text-sm font-semibold text-neutral-50">{d.title}</h3>
                <p className="text-lg font-bold text-red-400">
                  {d.amount} <span className="text-xs font-medium text-neutral-500">{d.note}</span>
                </p>
              </div>
              <Lines items={d.bullets} />
              {d.ask.length > 0 && (
                <div className="mt-auto rounded-lg bg-neutral-800/70 px-3 py-2">
                  <p className="text-xs font-semibold text-neutral-400">정할 것</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm font-medium text-neutral-100">
                    {d.ask.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              )}
            </Go>
          ))}
        </div>
        {r.more.length > 0 && (
          <div className={`${card} space-y-2`}>
            <p className="text-xs font-semibold text-neutral-400">그 밖에 결정 대기</p>
            <Lines items={r.more} />
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className={`${card} space-y-4`}>
          <div className="space-y-1">
            <H2>영업: 협의 중인 큰 건</H2>
            <p className="text-xs text-neutral-500">예산 규모(원)</p>
          </div>
          <div className="grid h-44 grid-cols-[6rem_1fr_4rem] content-center items-center gap-x-2 gap-y-4 text-xs">
            {r.sales.bars.length === 0 && <span className="col-span-3 text-neutral-500">근거에 예산이 적힌 건 없음</span>}
            {r.sales.bars.map((b) => (
              <div key={b.label} className="contents">
                <span className="truncate text-neutral-300">{b.label}</span>
                <span className="h-3 rounded-sm bg-neutral-800">
                  <i className="block h-full rounded-sm" style={{ width: `${(b.v / smax) * 100}%`, ...fill('c1') }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-neutral-100">{b.text}</span>
              </div>
            ))}
          </div>
          <Lines items={r.sales.lines} />
        </section>

        <section className={`${card} space-y-4`}>
          <div className="space-y-1">
            <H2><Link href="/admin/finance#receivables" className="hover:underline">자금: 매출채권 회수 일정 →</Link></H2>
            <p className="text-xs text-neutral-500">입금 예정 금액(원), 노션 계약 기준</p>
          </div>
          <div className="flex h-44 items-end gap-3 border-b border-neutral-700 px-1">
            {r.funds.bars.map((b) => (
              <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1 text-xs">
                <span className="font-semibold tabular-nums text-neutral-100">{b.text}</span>
                <span className="w-3/4 rounded-t-sm" style={{ height: `${(b.v / fmax) * 80}%`, ...fill(b.late ? 'bad' : 'c1') }} />
              </div>
            ))}
          </div>
          <div className="-mt-2 flex gap-3 px-1 text-center text-[11px] text-neutral-500">
            {r.funds.bars.map((b) => (
              <div key={b.label} className="flex-1">{b.label}<br />{b.count}건</div>
            ))}
          </div>
          <Lines items={r.funds.lines} />
        </section>

        <section className={`${card} space-y-4`}>
          <div className="space-y-1">
            <H2>사람: 월 인건비성 지급</H2>
            <p className="text-xs text-neutral-500">{r.people.caption}</p>
          </div>
          <div className="flex h-44 flex-col gap-2">
            <Legends items={r.people.legend} />
            <div className="flex flex-1 items-end gap-3 border-b border-neutral-700 px-1">
              {r.people.bars.map((b) => {
                const tot = b.parts.reduce((a, s) => a + s.v, 0) || 1
                return (
                  <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1 text-xs">
                    <span className="font-semibold tabular-nums text-neutral-100">{b.text}</span>
                    <span className="flex w-3/4 flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: `${(b.v / pmax) * 80}%` }}>
                      {b.parts.map((s, i) => <i key={i} className="block" style={{ height: `${(s.v / tot) * 100}%`, ...fill(s.c) }} />)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="-mt-2 flex gap-3 px-1 text-center text-[11px] text-neutral-500">
            {r.people.bars.map((b) => <div key={b.label} className="flex-1">{b.label}</div>)}
          </div>
          <Lines items={r.people.lines} />
        </section>
      </div>

      <details className={`${card} text-xs text-neutral-400`}>
        <summary className="cursor-pointer text-sm font-semibold text-neutral-200">근거 보기</summary>
        <ul className="mt-3 list-disc space-y-1 pl-4">
          {r.evidence.map((e, i) => (
            <li key={i}>
              {e.text}
              {e.refs?.length ? <>: <Refs refs={e.refs} /></> : null}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
