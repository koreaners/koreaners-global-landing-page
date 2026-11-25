'use client'
// sort를 넘기지 않은 표(Table)의 화면 안 정렬(인혁 261125: 「테이블은 다 sort가 있어야」). 서버가 그린 <tr>을 칸 값으로 다시 늘어놓음.
// 칸 값은 td의 data-sort(Money 등이 실제 숫자를 심음)가 있으면 그 값, 없으면 글자: 날짜는 글자 그대로, 「1,234만원」 「12.5%」 「3일」은 숫자, 「-」와 빈칸은 맨 끝
import { Children, createContext, isValidElement, useContext, useState, type ReactNode } from 'react'

type S = { i: number; desc: boolean } | null
const Ctx = createContext<[S, (s: S) => void]>([null, () => {}])

export function AutoSort({ children }: { children: ReactNode }) {
  const st = useState<S>(null)
  return <Ctx.Provider value={st}>{children}</Ctx.Provider>
}

/** 머리글: 처음 누르면 큰 값부터, 같은 칸을 다시 누르면 반대로(서버 정렬 표와 같은 동작) */
export function SortHead({ i, children }: { i: number; children: ReactNode }) {
  const [s, set] = useContext(Ctx)
  const on = s?.i === i
  return (
    <button type="button" onClick={() => set({ i, desc: !(on && s!.desc) })} className={`cursor-pointer ${on ? 'text-neutral-100' : 'hover:text-neutral-200'}`}>
      {children}{on ? (s!.desc ? '\u00a0↓' : '\u00a0↑') : ''}
    </button>
  )
}

const kids = (n: ReactNode) => (isValidElement(n) ? Children.toArray((n.props as { children?: ReactNode }).children) : [])
const text = (n: ReactNode): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : isValidElement(n) ? kids(n).map(text).join('') : '')

export function cellValue(td: ReactNode): string | number | null {
  if (!isValidElement(td)) return null
  const d = (td.props as { 'data-sort'?: string | number | null })['data-sort']
  if (d != null) return d === '' ? null : d // data-sort=""는 값 없음(맨 끝)
  const t = text(td).trim()
  if (!t || t === '-') return null
  if (/^\d{4}-\d{2}/.test(t)) return t
  // 숫자로 읽는 것: 숫자 바로 뒤에 단위(만원, 원, %, 일, 건, 행)가 붙은 것, 숫자만 있는 것, 「1,234 JPY」처럼 통화 코드가 붙은 것.
  // 「2603-S-…」 계약 코드, 「2026 서울콘」 같은 이름은 글자로
  const m = /^([−-]?)([\d,]+(?:\.\d+)?)(?:(만)?(?:원|%|일|건|행|명|회)(?=$|\s|\(|,)|\s+[A-Z]{3}$|$)/.exec(t)
  if (!m) return t
  return (m[1] ? -1 : 1) * Number(m[2].replace(/,/g, '')) * (m[3] ? 1e4 : 1)
}

export function SortBody({ children }: { children: ReactNode }) {
  const [s] = useContext(Ctx)
  const rows = Children.toArray(children)
  if (!s) return <>{rows}</>
  const dir = s.desc ? -1 : 1
  const keyed = rows.map((r) => [r, cellValue(kids(r)[s.i])] as const)
  keyed.sort(([, x], [, y]) => {
    if (x == null) return y == null ? 0 : 1
    if (y == null) return -1
    // 숫자와 글자가 섞인 칸은 방향과 관계없이 숫자 먼저, 글자 안의 숫자는 크기 순(「1차, 5차, 13차」)
    if (typeof x !== typeof y) return typeof x === 'number' ? -1 : 1
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko', { numeric: true })) * dir
  })
  return <>{keyed.map(([r]) => r)}</>
}
