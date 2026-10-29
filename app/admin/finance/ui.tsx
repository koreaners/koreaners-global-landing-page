import Link from 'next/link'
import type { Currency, Payout } from '@/lib/finance/model'

// 재무 대시보드(/admin/finance)와 정산 마스터(/admin/payouts)가 함께 쓰는 표, 칸, 금액 글

export const won = (n: number | null | undefined) => (n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`)
export const won2 = (n: number) => (Math.abs(n) >= 1e8 ? `${(n / 1e8).toFixed(2)}억원` : Math.abs(n) >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원` : won(n))
export const orig = (p: Payout) => (p.amount == null ? '-' : `${p.amount.toLocaleString('ko-KR')} ${p.currency ?? '통화 미상'}`)

export const CUR_NAME: Record<Currency, string> = { KRW: '원화', JPY: '엔화', USD: '달러', CNY: '위안' }
export const CURS = Object.keys(CUR_NAME) as Currency[]

export const td = 'whitespace-nowrap px-2 py-2 text-right tabular-nums'
export const tdl = 'px-2 py-2 text-left'

export function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-50">{value}</p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  )
}

export type Sort = { keys: (string | null)[]; cur: string; href: (s: string) => string }

/** 표. sort를 주면 머리글을 눌러 정렬(같은 칸을 다시 누르면 반대로), tall이면 화면 높이 안에서 스크롤하고 머리글 고정 */
export function Table({ head, left = 1, sort, tall, children }: { head: string[]; left?: number; sort?: Sort; tall?: boolean; children: React.ReactNode }) {
  return (
    <div className={`overflow-auto rounded-xl border border-neutral-800 ${tall ? 'max-h-[75vh]' : ''}`}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-neutral-900 text-xs text-neutral-500">
          <tr>
            {head.map((h, i) => {
              const k = sort?.keys[i]
              const on = k != null && sort!.cur.replace('-', '') === k
              const desc = on && sort!.cur.startsWith('-')
              return (
                <th key={h} className={`break-keep px-2 py-2 font-medium ${i < left ? 'text-left' : 'text-right'}`}>
                  {k == null ? h : (
                    <Link href={sort!.href(on && desc ? k : `-${k}`)} className={on ? 'text-neutral-100' : 'hover:text-neutral-200'}>
                      {h}{on ? (desc ? ' ↓' : ' ↑') : ''}
                    </Link>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 text-neutral-200">{children}</tbody>
      </table>
    </div>
  )
}

/** 정렬 키(앞에 -면 내림차순)로 행 정렬. 빈 값은 항상 끝 */
export function sortRows<T>(rows: T[], s: string, get: Record<string, (x: T) => string | number | null | undefined>) {
  const f = get[s.replace('-', '')]
  if (!f) return rows
  const dir = s.startsWith('-') ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = f(a)
    const y = f(b)
    if (x == null || x === '') return y == null || y === '' ? 0 : 1
    if (y == null || y === '') return -1
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * dir
  })
}

/** 표 위 검색창: 같은 주소 쿼리를 유지한 채 f만 바꿈(폼 주소는 q가 만드는 경로) */
export function SearchBox({ q, f, n, total, placeholder, anchor }: { q: (o: { f?: string; sel?: string; d?: string }) => string; f?: string; n: number; total: number; placeholder: string; anchor?: string }) {
  const [path, query] = q({ f: undefined, sel: undefined, d: undefined }).split('?')
  const base = new URLSearchParams(query)
  return (
    <form action={`${path}${anchor ? `#${anchor}` : ''}`} className="flex w-full items-center gap-2 text-sm sm:w-auto">
      {[...base.entries()].filter(([k]) => k !== 'f').map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="f" defaultValue={f} autoComplete="off" placeholder={placeholder} className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 placeholder:text-neutral-600 sm:w-64 sm:flex-none" />
      <button className="shrink-0 rounded-md bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700">찾기</button>
      {f && <Link href={q({ f: undefined, sel: undefined })} className="text-xs text-neutral-400 hover:text-neutral-200">지우기</Link>}
      <span className="shrink-0 text-xs text-neutral-500">{f ? `${n}건 / 전체 ${total}건` : `${total}건`}</span>
    </form>
  )
}

export const hit = (f: string | undefined, ...xs: (string | null | undefined)[]) => !f || xs.some((x) => x?.toLowerCase().includes(f.trim().toLowerCase()))

/** 표 금액 칸: 만원, 억원으로 줄이고 원 단위는 마우스를 올리면 */
export function Money({ n }: { n: number | null | undefined }) {
  return <td className={td} title={won(n)}>{n == null ? '-' : won2(n)}</td>
}

export function Tile({ label, value, full, delta, note, spark, side, hint }: { label: string; value: string; full: string; delta?: React.ReactNode; note: string; spark?: React.ReactNode; side?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex h-6 items-start justify-between gap-2">
        <p className="whitespace-nowrap text-xs text-neutral-400">
          {label}
          {hint && <span className="ml-1 cursor-help" title={hint} aria-label={hint}>ⓘ</span>}
        </p>
        {spark}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-neutral-50" title={full}>
        {value}
        {side && <span className="ml-2 text-base font-medium text-neutral-300">{side}</span>}
      </p>
      <p className="mt-auto text-xs text-neutral-500">
        {delta}
        {delta ? ' ' : ''}
        {note}
      </p>
    </div>
  )
}

export function Panel({ id, title, sub, action, children }: { id?: string; title: string; sub: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
          <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
