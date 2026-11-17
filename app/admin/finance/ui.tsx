import Link from 'next/link'
import { Info as InfoIcon } from 'lucide-react'
import { CleanForm } from './auto-form'
import { FitBox } from './fit-box'
import type { Currency, Payout } from '@/lib/finance/model'

// 재무 대시보드(/admin/finance)와 정산 마스터(/admin/payouts)가 함께 쓰는 표, 칸, 금액 글

export const won = (n: number | null | undefined) => (n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`)
// 1만 원 이상은 늘 만원 단위(1억이 넘어도 「10,300만원」). 한 칸 안에 억원과 만원이 섞여 크기 비교가 어렵던 문제(261116 감사)
export const won2 = (n: number) => (Math.abs(n) >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원` : won(n))
// 표 링크: 강조색 대신 밝은 중립색, 마우스를 올리면 밑줄(261116 감사: 행마다 하늘색 링크가 깔려 강조가 묻힘). 강조색은 선택된 행, 날에만
export const LINK = 'text-neutral-100 underline-offset-2 hover:underline'
// 날짜, 시각 표기 한 벌(261116 감사: 한 줄에 「2026-11-09」와 「2026. 11. 16. 오전 7:01」이 섞임). 날짜는 2026-11-16, 시각은 2026-11-16 07:01, 모두 KST
export const at = (t: string | number | Date) => new Date(new Date(t).getTime() + 9 * 3_600_000).toISOString().slice(0, 16).replace('T', ' ')
export const orig = (p: Payout) => (p.amount == null ? '-' : `${p.amount.toLocaleString('ko-KR')} ${p.currency ?? '통화 미상'}`)

export const CUR_NAME: Record<Currency, string> = { KRW: '원화', JPY: '엔화', USD: '달러', CNY: '위안' }
export const CURS = Object.keys(CUR_NAME) as Currency[]

export const td = 'whitespace-nowrap px-1.5 2xl:px-2 py-2 text-right tabular-nums'
export const tdl = 'px-1.5 2xl:px-2 py-2 text-left'

export function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-50">{value}</p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  )
}

/** 설명 툴팁: 원 안 i 아이콘에 마우스를 올리거나(키보드, 모바일은 눌러서 포커스) 설명을 띄움. align은 말풍선이 붙는 쪽(오른쪽 정렬 칸은 right) */
export function Info({ text, align = 'left', up }: { text: string; align?: 'left' | 'right'; up?: boolean }) {
  return (
    <span tabIndex={0} aria-label={text} className="group relative inline-flex shrink-0 cursor-help align-middle text-neutral-500 outline-none hover:text-neutral-200 focus:text-neutral-200">
      <InfoIcon className="h-3.5 w-3.5" aria-hidden />
      <span aria-hidden className={`pointer-events-none invisible absolute z-30 w-64 ${up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} whitespace-pre-line break-keep rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-left text-xs font-normal leading-relaxed text-neutral-200 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 ${align === 'right' ? 'right-0' : 'left-0'}`}>
        {text}
      </span>
    </span>
  )
}

export type Sort = { keys: (string | null)[]; cur: string; href: (s: string) => string }

/** 표. cols를 주면 칸 폭 고정(table-fixed, 위아래로 쌓인 같은 구성의 표끼리 칸 위치를 맞춤), sort를 주면 머리글을 눌러 정렬(같은 칸을 다시 누르면 반대로), tall이면 화면 높이 안에서 스크롤하고 머리글 고정(높이는 표가 화면 아래로 넘치지 않게 화면 높이에서 머리 부분을 뺀 값), tips는 머리글 옆 ⓘ 설명(칸 이름은 정렬, 설명은 아이콘으로 나눔), foot은 표 아래 합계 줄, groups는 머리글 위 칸 묶음 이름과 칸 수 */
export function Table({ head, left = 1, sort, tall, tips, foot, groups, cols, children }: { head: string[]; left?: number; cols?: string[]; sort?: Sort; tall?: boolean; tips?: (string | undefined)[]; foot?: React.ReactNode; groups?: [string, number][]; children: React.ReactNode }) {
  const Box = tall ? FitBox : 'div'
  return (
    <Box className={`tbl overflow-auto rounded-xl border border-neutral-800 bg-neutral-900 ${tall ? 'sm:max-h-[calc(100dvh-16rem)]' : ''}`}>
      {/* 좁은 화면에선 칸 수 × 6rem 아래로 줄이지 않고 가로 스크롤(칸이 찌그러져 숫자, 날짜가 여러 줄로 꺾이던 것) */}
      <table style={{ '--tmin': `${head.length * 6}rem` } as React.CSSProperties} className={`w-full max-sm:min-w-(--tmin) ${cols ? 'table-fixed' : ''} text-[13px] 2xl:text-sm [&_tbody_td:first-child]:sticky [&_tbody_td:first-child]:left-0 [&_tbody_td:first-child]:bg-neutral-900 [&_thead_th:first-child]:sticky [&_thead_th:first-child]:left-0 [&_thead_th:first-child]:z-20 [&_thead_th:first-child]:bg-neutral-900`}>
        {cols && <colgroup>{cols.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>}
        <thead className="sticky top-0 z-10 bg-neutral-900 text-[12px] text-neutral-500 max-sm:[&_th]:whitespace-nowrap">
          {groups && (
            <tr>
              {groups.map(([g, n], i) => (
                // 테두리 대신 inset 그림자: border-collapse 표의 고정 머리글은 크롬이 테두리를 안 칠해 그 1px 틈으로 스크롤된 행이 비침
                <th key={i} colSpan={n} style={{ boxShadow: [g && 'inset 0 -1px 0 var(--color-neutral-700)', i && 'inset 1px 0 0 var(--color-neutral-800)'].filter(Boolean).join(', ') || undefined }} className="px-1.5 2xl:px-2 pt-2 pb-1 font-semibold text-neutral-300">{g}</th>
              ))}
            </tr>
          )}
          <tr>
            {head.map((h, i) => {
              const k = sort?.keys[i]
              const on = k != null && sort!.cur.replace('-', '') === k
              const desc = on && sort!.cur.startsWith('-')
              return (
                <th key={h} className={`break-keep px-1.5 2xl:px-2 py-2 font-medium ${i < left ? 'text-left' : 'text-right'}`}>
                  <span className="inline-flex items-center gap-1">
                    {k == null ? h : (
                      <Link href={sort!.href(on && desc ? k : `-${k}`)} className={on ? 'text-neutral-100' : 'hover:text-neutral-200'}>
                        {h}{on ? (desc ? ' ↓' : ' ↑') : ''}
                      </Link>
                    )}
                    {tips?.[i] && <Info text={tips[i]!} align={i < left ? 'left' : 'right'} />}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 text-neutral-200">{children}</tbody>
        {foot && <tfoot className="border-t border-neutral-700 font-medium text-neutral-100">{foot}</tfoot>}
      </table>
    </Box>
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
    <CleanForm action={`${path}${anchor ? `#${anchor}` : ''}`} className="flex w-full items-center gap-2 text-sm sm:w-auto">
      {[...base.entries()].filter(([k]) => k !== 'f').map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="f" defaultValue={f} autoComplete="off" placeholder={placeholder} className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 placeholder:text-neutral-600 sm:w-64 sm:flex-none" />
      <button className="shrink-0 rounded-md bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700">찾기</button>
      {f && <Link href={q({ f: undefined, sel: undefined })} className="text-xs text-neutral-400 hover:text-neutral-200">지우기</Link>}
      <span className="shrink-0 text-xs text-neutral-500">{f ? `${n}건 / 전체 ${total}건` : `${total}건`}</span>
    </CleanForm>
  )
}

export const hit = (f: string | undefined, ...xs: (string | null | undefined)[]) => !f || xs.some((x) => x?.toLowerCase().includes(f.trim().toLowerCase()))

/** 표 금액 칸: 만원, 억원으로 줄이고 원 단위는 마우스를 올리면 */
export function Money({ n }: { n: number | null | undefined }) {
  return <td className={td} title={won(n)}>{n == null ? '-' : won2(n)}</td>
}

export function Tile({ label, value, full, delta, note, side, hint }: { label: string; value: string; full: string; delta?: React.ReactNode; note: string; side?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex h-6 items-start justify-between gap-2">
        <p className="whitespace-nowrap text-xs text-neutral-400">
          {label}
          {hint && <span className="ml-1"><Info text={hint} align="right" /></span>}
        </p>
      </div>
      {/* 줄바꿈 flex + gap: 「마진율」이 다음 줄로 넘어가도 금액과 같은 왼쪽 줄에서 시작(261117) */}
      <p className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold text-neutral-50" title={full}>
        {value}
        {/* 「마진율 31.9%」가 갈라져 숫자만 다음 줄로 떨어지지 않게 한 덩어리로(261116) */}
        {side && <span className="whitespace-nowrap text-base font-medium text-neutral-300">{side}</span>}
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
    // 패널 안 표는 반경 4px(261116 감사: 같은 반경 12px 테두리가 겹쳐 이중 상자로 보임)
    <section id={id} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5 [&_.tbl]:rounded-[4px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
          <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>
        </div>
        {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
      </div>
      {children}
    </section>
  )
}
