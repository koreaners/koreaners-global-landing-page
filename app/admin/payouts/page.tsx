import Link from 'next/link'
import { getFinance } from '@/lib/finance/data'
import { getRates } from '@/lib/finance/fx'
import { monthEnd, netPayoutKrw, payoutKrw, weekdayBack, weekdaysBefore, type Contract, type Payout, type Rates } from '@/lib/finance/model'
import { refreshFinance } from '../finance/actions'
import { RefreshButton } from '../finance/refresh-button'
import { hit, Money, Panel, SearchBox, sortRows, Table, td, tdl, Tile, won, won2 } from '../finance/ui'

// 정산 마스터: 노션 지급내역 DB 전체 행을 회차, 크리에이터, 행 단위로 (관리자 전용, proxy가 exec를 막음)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Search = { sel?: string; f?: string; s?: string; st?: string; cur?: string; bl?: string; t?: string }

const DONE = '송금 완료'
const IN_FLIGHT = ['송금 가능', '모인 접수', '원화 이체 대기']
const STATUSES = ['대기', '송금 가능', '모인 접수', '원화 이체 대기', '송금 완료', '보류']

// 정기 회차(정산 handler.py): 송금일은 그 달 마지막 평일, 묶음은 송금일 3평일 전에 만듦. 공휴일은 안 봄
const payday = (ym: string) => weekdayBack(monthEnd(`${ym}-01`))
const bundleDay = (ym: string) => weekdaysBefore(payday(ym), 3)
const addMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}
const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`

/** 행이 속한 회차(달)와 표에 쓸 날짜. 송금 완료: 송금일(없으면 요청일)의 달, 송금 가능: 이번 달 묶음 생성일 전이면 이번 달 아니면 다음 달,
 * 모인 접수, 원화 이체 대기: 송금 요청일 달의 송금일, 대기, 보류: 미정(null) */
function slot(p: Payout, today: string): { month: string | null; date: string | null } {
  if (p.status === DONE) return { month: (p.sentDate ?? p.reqDate)?.slice(0, 7) ?? null, date: p.sentDate }
  if (p.status === '송금 가능') {
    const ym = today.slice(0, 7)
    const month = today < bundleDay(ym) ? ym : addMonth(ym, 1)
    return { month, date: payday(month) }
  }
  if (p.status === '모인 접수' || p.status === '원화 이체 대기') {
    const month = p.reqDate?.slice(0, 7) ?? null
    return { month, date: month ? payday(month) : null }
  }
  return { month: null, date: null }
}

type Sum = { n: number; krw: number; by: Record<string, number> }
function total(xs: Payout[], r: Rates): Sum {
  const o: Sum = { n: 0, krw: 0, by: {} }
  for (const p of xs) {
    o.n++
    o.krw += payoutKrw(p, r) ?? 0
    if (p.amount != null) o.by[p.currency ?? '통화 미상'] = (o.by[p.currency ?? '통화 미상'] ?? 0) + p.amount
  }
  return o
}
const curText = (s: Sum) => Object.entries(s.by).map(([k, v]) => `${k} ${Math.round(v).toLocaleString('ko-KR')}`).join(', ') || '-'
const count = (xs: string[]) => {
  const m = new Map<string, number>()
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
const statusText = (xs: Payout[]) => STATUSES.map((s) => [s, xs.filter((p) => p.status === s).length] as const).filter(([, n]) => n).map(([s, n]) => `${s} ${n}`).join(', ')
const notionUrl = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  let data: Awaited<ReturnType<typeof getFinance>>
  let rates: Rates
  try {
    ;[data, rates] = await Promise.all([getFinance(), getRates()])
  } catch (e) {
    return (
      <div className="space-y-2 rounded-xl border border-red-900 bg-red-950/40 p-6">
        <h1 className="text-base font-semibold text-red-300">노션 데이터를 불러오지 못했습니다</h1>
        <p className="text-sm text-red-200/80">{e instanceof Error ? e.message : String(e)}</p>
        <p className="text-xs text-neutral-500">노션 연결(통합)이 Contract DB, 지급내역 DB에 초대되어 있는지, 환경변수가 있는지 확인하십시오.</p>
      </div>
    )
  }

  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10) // KST
  const thisYm = today.slice(0, 7)
  const cycle = today <= payday(thisYm) ? thisYm : addMonth(thisYm, 1) // 이번 회차: 송금일이 오늘이거나 아직 오지 않은 가장 가까운 달
  const rolled = today >= bundleDay(thisYm) // 이번 달 묶음을 만든 뒤라 송금 가능은 다음 달 회차로
  const all = data.payouts
  const byId = new Map<string, Contract>(data.contracts.map((c) => [c.id, c]))
  const slots = new Map(all.map((p) => [p.id, slot(p, today)]))
  const q = (over: Partial<Search>) => {
    const s = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) s.set(k, v)
    return `/admin/payouts?${s}`
  }

  // 1. 위 칸
  const planned = all.filter((p) => IN_FLIGHT.includes(p.status))
  const plan = total(planned, rates)
  const ready = planned.filter((p) => p.status === '송금 가능')
  const open = all.filter((p) => p.status === '대기' || p.status === '보류')
  const openSum = total(open, rates)
  const year = today.slice(0, 4)
  const doneYear = total(all.filter((p) => p.status === DONE && (p.sentDate ?? p.reqDate)?.startsWith(year)), rates)
  const reasons = count(all.filter((p) => p.status !== DONE).flatMap((p) => p.blocked))

  // 2. 회차별: 송금 완료가 있는 지난 달 전부와 이번 회차, 다음 두 회차. 날짜를 정할 수 없는 행은 미정 줄
  const months = [...new Set([...all.map((p) => slots.get(p.id)!.month).filter((m): m is string => !!m), cycle, addMonth(cycle, 1), addMonth(cycle, 2)])].sort().reverse()
  const byMonth = (m: string | null) => all.filter((p) => slots.get(p.id)!.month === m)

  // 3. 크리에이터별
  const names = new Map<string, Payout[]>()
  for (const p of all) names.set(p.name, [...(names.get(p.name) ?? []), p])
  const creators = [...names.entries()].map(([name, xs]) => {
    const dates = (f: (p: Payout) => string | null | undefined) => xs.map(f).filter((d): d is string => !!d).sort()
    return {
      name,
      n: xs.length,
      done: total(xs.filter((p) => p.status === DONE), rates).krw,
      plan: total(xs.filter((p) => IN_FLIGHT.includes(p.status)), rates).krw,
      open: total(xs.filter((p) => p.status === '대기' || p.status === '보류'), rates).krw,
      next: dates((p) => (IN_FLIGHT.includes(p.status) ? slots.get(p.id)!.date : null))[0] ?? null,
      last: dates((p) => (p.status === DONE ? (p.sentDate ?? p.reqDate) : null)).at(-1) ?? null,
    }
  })
  const s = sp.s ?? 'next'
  const cRows = sortRows(creators.filter((x) => hit(sp.f, x.name)), s, {
    name: (x) => x.name, n: (x) => x.n, done: (x) => x.done, plan: (x) => x.plan, open: (x) => x.open, next: (x) => x.next, last: (x) => x.last,
  })

  // 4. 지급 행: 고른 크리에이터, 상태, 통화, 막힌 사유, 글 검색
  const base = sp.sel ? all.filter((p) => p.name === sp.sel) : all
  const rows = base
    .filter((p) => (!sp.st || p.status === sp.st) && (!sp.cur || (p.currency ?? '미상') === sp.cur) && (!sp.bl || p.blocked.includes(sp.bl)))
    .filter((p) => {
      const c = p.contractId ? byId.get(p.contractId) : undefined
      return hit(sp.t, p.name, p.pid?.toString(), c?.brand, c?.code, p.blocked.join(' '))
    })
    .sort((a, b) => (b.pid ?? 0) - (a.pid ?? 0))
  const rowSum = total(rows, rates)
  const curs = [...new Set(all.map((p) => p.currency ?? '미상'))].sort()
  const allReasons = count(all.flatMap((p) => p.blocked)).map(([k]) => k)
  const sel = 'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">정산 마스터</h1>
          <div className="text-xs text-neutral-500">노션 지급내역 DB 전체 {all.length}행, 오늘 {today}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500" title="5분마다 자동으로도 다시 읽습니다">
            {new Date(data.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} 갱신
          </span>
          <form action={refreshFinance}>
            <RefreshButton />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label="이번 회차 송금일" value={md(payday(cycle))} full={payday(cycle)} note={`묶음 생성일 ${md(bundleDay(cycle))}${rolled && cycle === thisYm ? `, 묶음 생성 뒤라 송금 가능은 다음 회차 ${md(payday(addMonth(thisYm, 1)))}` : ''}`} />
        <Tile label="이번 회차 예정" value={won2(plan.krw)} full={won(plan.krw)} note={`${plan.n}건(송금 가능 ${ready.length}건 포함), ${curText(plan)}`} />
        <Tile label="미정 (대기, 보류)" value={won2(openSum.krw)} full={won(openSum.krw)} note={`${openSum.n}건(보류 ${open.filter((p) => p.status === '보류').length}건), ${curText(openSum)}`} />
        <Tile label={`${year}년 송금 완료 누적`} value={won2(doneYear.krw)} full={won(doneYear.krw)} note={`${doneYear.n}건, ${curText(doneYear)}`} />
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs text-neutral-400">막힌 사유 (송금 완료 제외)</p>
          {reasons.length ? reasons.slice(0, 5).map(([k, n]) => (
            <Link key={k} href={`${q({ bl: k, sel: undefined })}#rows`} className="flex justify-between gap-2 text-sm text-neutral-200 hover:text-neutral-50">
              <span className="truncate" title={k}>{k}</span>
              <span className="tabular-nums text-neutral-400">{n}건</span>
            </Link>
          )) : <p className="text-sm text-neutral-500">없음</p>}
        </div>
      </div>

      <Panel title="회차별" sub="송금 완료는 송금일(없으면 송금 요청일)의 달, 진행 중은 회차 송금일의 달. 금액은 지급액(원천징수 전), 원화 환산은 모인 청구액 또는 환율">
        <Table head={['회차 (정기 송금일)', '건수', '통화별 합계', '원화 환산', '상태']}>
          {[...months, null].map((m) => {
            const xs = byMonth(m)
            const t = total(xs, rates)
            return (
              <tr key={m ?? 'none'} className={m === cycle ? 'bg-sky-950/40' : ''}>
                <td className={tdl}>{m ? `${m} (${payday(m).slice(5)})${m === cycle ? ' 이번 회차' : ''}` : '미정 (대기, 보류, 날짜 없음)'}</td>
                <td className={td}>{t.n}</td>
                <td className={td}>{curText(t)}</td>
                <Money n={t.krw} />
                <td className={td}>{statusText(xs) || '-'}</td>
              </tr>
            )
          })}
        </Table>
      </Panel>

      <Panel title="크리에이터별" sub="금액은 원화 환산, 이름을 누르면 아래 지급 행이 그 크리에이터로 바뀝니다" action={<SearchBox q={q} f={sp.f} n={cRows.length} total={creators.length} placeholder="크리에이터 이름" />}>
        <Table head={['이름', '건수', '송금 완료', '예정', '미정', '다음 송금일', '마지막 송금일']} tall
          sort={{ keys: ['name', 'n', 'done', 'plan', 'open', 'next', 'last'], cur: s, href: (k) => q({ s: k }) }}>
          {cRows.map((x) => (
            <tr key={x.name} className={x.name === sp.sel ? 'bg-sky-950/40' : ''}>
              <td className={tdl}>
                <Link href={`${q({ sel: x.name === sp.sel ? undefined : x.name })}#rows`} className="block max-w-[14rem] truncate whitespace-nowrap text-sky-300 hover:underline" title={x.name}>{x.name}</Link>
              </td>
              <td className={td}>{x.n}</td>
              <Money n={x.done} />
              <Money n={x.plan} />
              <Money n={x.open} />
              <td className={td}>{x.next ?? '-'}</td>
              <td className={td}>{x.last ?? '-'}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      <section id="rows" className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-100">
            {sp.sel ? `${sp.sel} 지급 행` : '지급 행 전체'}
            {sp.sel && <Link href={`${q({ sel: undefined })}#rows`} className="ml-2 text-xs font-normal text-neutral-400 hover:text-neutral-200">전체 보기</Link>}
          </h2>
          <form action="/admin/payouts#rows" className="flex flex-wrap items-center gap-2 text-sm">
            {(['sel', 'f', 's'] as const).map((k) => sp[k] && <input key={k} type="hidden" name={k} value={sp[k]} />)}
            <select name="st" defaultValue={sp.st ?? ''} className={sel}>
              <option value="">상태 전체</option>
              {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select name="cur" defaultValue={sp.cur ?? ''} className={sel}>
              <option value="">통화 전체</option>
              {curs.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select name="bl" defaultValue={sp.bl ?? ''} className={sel}>
              <option value="">막힌 사유 전체</option>
              {allReasons.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input name="t" defaultValue={sp.t} placeholder="이름, 지급 ID, 안건, 사유" className={`${sel} w-48 placeholder:text-neutral-600`} />
            <button className="rounded-md bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700">적용</button>
            {(sp.st || sp.cur || sp.bl || sp.t) && <Link href={`${q({ st: undefined, cur: undefined, bl: undefined, t: undefined })}#rows`} className="text-xs text-neutral-400 hover:text-neutral-200">지우기</Link>}
          </form>
        </div>
        <p className="text-xs text-neutral-500">{rows.length}건 / {base.length}건, {curText(rowSum)}, 원화 환산 {won(rowSum.krw)}</p>
        <Table head={['지급 ID', '영문이름', '안건', '통화', '지급액', '공제', '실지급액(원화)', '상태', '막힌 사유', '송금 예정일, 송금일', '송금 요청일']} left={3} tall>
          {rows.map((p) => {
            const c = p.contractId ? byId.get(p.contractId) : undefined
            const d = slots.get(p.id)!.date
            return (
              <tr key={p.id}>
                <td className={tdl}><a href={notionUrl(p.id)} target="_blank" className="text-sky-300 hover:underline">{p.pid ?? '열기'}</a></td>
                <td className={tdl}><span className="block max-w-[12rem] truncate" title={p.name}>{p.name}</span></td>
                <td className={tdl}><span className="block max-w-[10rem] truncate" title={c?.code}>{c ? c.brand || c.code || '-' : '-'}</span></td>
                <td className={td}>{p.currency ?? '미상'}</td>
                <td className={td}>{p.amount == null ? '-' : p.amount.toLocaleString('ko-KR')}</td>
                <td className={td}>{p.deduction ? `${p.deduction}${p.deduction === '세금계산서' && p.vat ? ` (VAT ${p.vat})` : ''}` : '-'}</td>
                <td className={td}>{won(netPayoutKrw(p, rates))}</td>
                <td className={td}>{p.status}</td>
                <td className={td}>{p.blocked.join(', ') || '-'}</td>
                <td className={td}>{d ?? (p.status === DONE ? '-' : '미정')}</td>
                <td className={td}>{p.reqDate ?? '-'}</td>
              </tr>
            )
          })}
        </Table>
        <p className="text-xs text-neutral-500">
          송금 예정일: 송금 가능은 이번 달 묶음 생성일(송금일 3평일 전) 전이면 이번 달 송금일, 그 뒤면 다음 달 송금일. 모인 접수, 원화 이체 대기는 송금 요청일 달의 송금일(마지막 평일, 공휴일은 안 봄). 대기, 보류는 미정. 실지급액은 원화 사업소득 3.3% 공제 뒤, 세금계산서 VAT 별도면 부가세를 더한 금액이고 외화는 원화 환산입니다. 지급 ID를 누르면 노션 행이 열립니다.
        </p>
      </section>
    </div>
  )
}
