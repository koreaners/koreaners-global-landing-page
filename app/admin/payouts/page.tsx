import Link from 'next/link'
import { getFinance } from '@/lib/finance/data'
import { getRates } from '@/lib/finance/fx'
import { addMonth, bundleDay, netPayoutKrw, payday, payoutDue, payoutKrw, type Contract, type Payout, type Rates } from '@/lib/finance/model'
import { refreshFinance } from '../finance/actions'
import { RefreshButton } from '../finance/refresh-button'
import { hit, Money, Panel, SearchBox, sortRows, Table, td, tdl, Tile, won, won2 } from '../finance/ui'

// 정산 마스터: 노션 지급내역 DB 전체 행을 회차, 크리에이터, 행 단위로 (관리자 전용, proxy가 exec를 막음)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// v: 화면(todo 할 일, cycles 회차별, creators 크리에이터별, rows 지급 행), sel: 크리에이터 한 명, st: 상태(OPEN이면 송금 완료 뺀 전부), cy: 회차(none은 미정), nc: none이면 수입 계약 연결 없는 행
type Search = { v?: string; sel?: string; f?: string; s?: string; st?: string; cur?: string; bl?: string; t?: string; cy?: string; nc?: string }
const OPEN = '송금 완료 제외'

const DONE = '송금 완료'
const IN_FLIGHT = ['송금 가능', '모인 접수', '원화 이체 대기']
const STATUSES = ['대기', '송금 가능', '모인 접수', '원화 이체 대기', '송금 완료', '보류']

const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`

/** 행이 속한 회차(달)와 표에 쓸 날짜. 송금 완료: 송금일(없으면 요청일)의 달, 송금 가능, 모인 접수, 원화 이체 대기: payoutDue(자금 캘린더와 같은 규칙),
 * 대기, 보류: 미정(null) */
function slot(p: Payout, today: string): { month: string | null; date: string | null } {
  if (p.status === DONE) return { month: (p.sentDate ?? p.reqDate)?.slice(0, 7) ?? null, date: p.sentDate }
  const date = IN_FLIGHT.includes(p.status) ? payoutDue(p, new Map(), today) : null
  return { month: date?.slice(0, 7) ?? null, date }
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
// 막힌 사유별 푸는 법(settlement-creator-ledger rules.py evaluate와 같은 판정)
const FIX: Record<string, string> = {
  '수금 미완료': '고객사 입금이 끝나지 않은 계약입니다. Contract DB 입금일이 채워지면 풀립니다',
  '수입 계약 없음': '지급 행에 수입 계약이 연결되지 않았습니다. 노션 지급 행 「수입 계약」을 잇거나 송금 확인일을 넣습니다',
  '계좌 없음': '크리에이터 계좌 정보가 없습니다. 계좌를 받아 등록합니다',
  '문서 확인 필요': '서명, 인보이스 확인이 남았거나 원화 행에 공제 유형이 비었습니다',
  '계약 초과': '같은 계약의 지급 합이 공급가를 넘습니다. 금액을 확인하고 송금 확인일을 넣습니다',
  '통화 불일치': '이체 주소록 계좌 나라와 지급 통화가 다릅니다(예: 일본 계좌인데 KRW). 통화나 계좌를 바로잡습니다',
}
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
  const view = sp.sel ? 'creator' : (sp.v ?? 'todo')
  const q = (over: Partial<Search>) => {
    const s = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) s.set(k, v)
    return `/admin/payouts?${s}`
  }
  // 화면을 옮길 때는 화면 안 필터, 정렬, 검색을 버림(다른 화면의 조건이 숨어서 남지 않게)
  const go = (over: Partial<Search>) => q({ v: undefined, sel: undefined, f: undefined, s: undefined, st: undefined, cur: undefined, bl: undefined, t: undefined, cy: undefined, nc: undefined, ...over })

  // 1. 위 칸
  const planned = all.filter((p) => IN_FLIGHT.includes(p.status))
  const plan = total(planned, rates)
  const ready = planned.filter((p) => p.status === '송금 가능')
  const open = all.filter((p) => p.status === '대기' || p.status === '보류')
  const openSum = total(open, rates)
  const year = today.slice(0, 4)
  const doneYear = total(all.filter((p) => p.status === DONE && (p.sentDate ?? p.reqDate)?.startsWith(year)), rates)
  const notDone = all.filter((p) => p.status !== DONE)
  const reasons = count(notDone.flatMap((p) => p.blocked))

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

  // 4. 지급 행: 고른 크리에이터, 상태, 통화, 막힌 사유, 회차, 계약 연결, 글 검색
  const base = sp.sel ? all.filter((p) => p.name === sp.sel) : all
  const rows = base
    .filter((p) => (!sp.st || (sp.st === OPEN ? p.status !== DONE : p.status === sp.st)) && (!sp.cur || (p.currency ?? '미상') === sp.cur) && (!sp.bl || p.blocked.includes(sp.bl)))
    .filter((p) => !sp.cy || (slots.get(p.id)!.month ?? 'none') === sp.cy)
    .filter((p) => sp.nc !== 'none' || (!p.contractId && !p.notContract))
    .filter((p) => {
      const c = p.contractId ? byId.get(p.contractId) : undefined
      return hit(sp.t, p.name, p.pid?.toString(), c?.brand, c?.code, p.blocked.join(' '))
    })
    .sort((a, b) => (b.pid ?? 0) - (a.pid ?? 0))
  const rowSum = total(rows, rates)
  const curs = [...new Set(all.map((p) => p.currency ?? '미상'))].sort()
  const allReasons = count(all.flatMap((p) => p.blocked)).map(([k]) => k)
  const sel = 'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200'
  const filtered = !!(sp.st || sp.cur || sp.bl || sp.t || sp.cy || sp.nc)

  // 할 일: 이번 회차에 나갈 행(송금일 순), 다음 회차로 넘어간 행
  const due = (p: Payout) => slots.get(p.id)!.date ?? ''
  const thisCycle = planned.filter((p) => slots.get(p.id)!.month === cycle).sort((a, b) => due(a).localeCompare(due(b)) || (b.pid ?? 0) - (a.pid ?? 0))
  const later = planned.filter((p) => (slots.get(p.id)!.month ?? '') > cycle).sort((a, b) => due(a).localeCompare(due(b)))
  const late = planned.filter((p) => (slots.get(p.id)!.month ?? '9999') < cycle)

  const RowsTable = ({ xs, tall }: { xs: Payout[]; tall?: boolean }) => (
    <Table head={['지급 ID', '영문이름', '안건', '상태', '막힌 사유', '지급액', '공제', '실지급액(원화)', '송금 예정일, 송금일', '송금 요청일']} left={3} tall={tall}>
      {xs.map((p) => {
        const c = p.contractId ? byId.get(p.contractId) : undefined
        const d = slots.get(p.id)!.date
        return (
          <tr key={p.id}>
            <td className={tdl}><a href={notionUrl(p.id)} target="_blank" className="text-sky-300 hover:underline" title="노션 행 열기">{p.pid ?? '열기'}</a></td>
            <td className={tdl}><Link href={go({ sel: p.name })} className="block max-w-[10rem] truncate hover:underline" title={`${p.name} 지급 이력`}>{p.name}</Link></td>
            <td className={tdl}><span className="block max-w-[9rem] truncate" title={c?.code}>{c ? c.brand || c.code || '-' : <span className="text-neutral-500">{p.notContract ? '계약 아님' : '연결 없음'}</span>}</span></td>
            <td className={td}>{p.status}</td>
            <td className={`px-2 py-2 text-right text-xs${p.blocked.length && p.status !== DONE ? ' text-amber-300' : ''}`}>{p.blocked.join(', ') || '-'}</td>
            <td className={td}>{p.amount == null ? '-' : `${p.amount.toLocaleString('ko-KR')} ${p.currency ?? '미상'}`}</td>
            <td className="px-2 py-2 text-right text-xs">{p.deduction ? `${p.deduction}${p.deduction === '세금계산서' && p.vat ? ` (VAT ${p.vat})` : ''}` : '-'}</td>
            <td className={td}>{won(netPayoutKrw(p, rates))}</td>
            <td className={td}>{d ?? (p.status === DONE ? '-' : '미정')}</td>
            <td className={td}>{p.reqDate ?? '-'}</td>
          </tr>
        )
      })}
    </Table>
  )
  const legend = (
    <details className="text-xs text-neutral-500">
      <summary className="cursor-pointer select-none text-neutral-400 hover:text-neutral-200">칸 읽는 법</summary>
      <p className="mt-1">
        송금 예정일: 송금 가능은 이번 달 묶음 생성일(송금일 3평일 전) 전이면 이번 달 송금일, 그 뒤면 다음 달 송금일. 모인 접수, 원화 이체 대기는 송금 요청일 달의 송금일(마지막 평일, 공휴일은 안 봄). 대기, 보류는 미정. 지급액은 원천징수 전 금액과 통화, 실지급액은 원화 사업소득 3.3% 공제 뒤, 세금계산서 VAT 별도면 부가세를 더한 금액이고 외화는 원화 환산입니다. 지급 ID는 노션 행을, 이름은 그 크리에이터 이력을 엽니다. 상태와 막힌 사유는 노션에서 고치면 5분 안에(새로고침이면 바로) 반영됩니다.
      </p>
    </details>
  )
  const TABS: [string, string, string][] = [
    ['todo', '할 일', `보낼 것 ${thisCycle.length}건, 막힌 ${notDone.filter((p) => p.blocked.length).length}건`],
    ['cycles', '회차별', `${months.length}개 회차`],
    ['creators', '크리에이터별', `${creators.length}명`],
    ['rows', '지급 행 전체', `${all.length}행`],
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">정산 마스터</h1>
          <div className="text-xs text-neutral-500">크리에이터 송금을 회차마다 챙기는 화면입니다. 노션 지급내역 DB 전체 {all.length}행, 오늘 {today}</div>
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
        <Tile label="송금 진행 중 (모든 회차)" value={won2(plan.krw)} full={won(plan.krw)} note={`${plan.n}건(송금 가능 ${ready.length}건 포함), ${curText(plan)}`} />
        <Tile label="미정 (대기, 보류)" value={won2(openSum.krw)} full={won(openSum.krw)} note={`${openSum.n}건(보류 ${open.filter((p) => p.status === '보류').length}건), ${curText(openSum)}`} />
        <Tile label={`${year}년 송금 완료 누적`} value={won2(doneYear.krw)} full={won(doneYear.krw)} note={`${doneYear.n}건, ${curText(doneYear)}`} />
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs text-neutral-400">막힌 사유 (송금 완료 제외, 누르면 그 행)</p>
          {reasons.length ? reasons.slice(0, 5).map(([k, n]) => (
            <Link key={k} href={go({ v: 'rows', bl: k, st: OPEN })} className="flex justify-between gap-2 text-sm text-neutral-200 hover:text-neutral-50">
              <span className="truncate" title={k}>{k}</span>
              <span className="tabular-nums text-neutral-400">{n}건</span>
            </Link>
          )) : <p className="text-sm text-neutral-500">없음</p>}
        </div>
      </div>

      {view === 'creator' ? (
        <CreatorPanel name={sp.sel!} xs={base} back={go({ v: 'creators' })} rates={rates} />
      ) : (
        <nav className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
          {TABS.map(([k, label, note]) => (
            <Link key={k} href={go({ v: k === 'todo' ? undefined : k })} className={`rounded-lg px-3 py-1.5 text-sm ${view === k ? 'bg-neutral-800 text-neutral-50' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}`}>
              {label} <span className="text-xs text-neutral-500">{note}</span>
            </Link>
          ))}
        </nav>
      )}

      {view === 'todo' && (
        <>
          <Panel title={`막힌 것: 사유별 (${notDone.filter((p) => p.blocked.length).length}건)`} sub="송금 완료가 아닌 행 중 정산 봇이 막힌 사유를 적은 행입니다. 한 행에 사유가 여럿이면 각 사유에 셉니다. 「행 보기」로 그 행들을 엽니다">
            <Table head={['막힌 사유', '건수', '원화 환산', '푸는 법', '']} left={1}>
              {reasons.map(([k, n]) => (
                <tr key={k}>
                  <td className={`${tdl} whitespace-nowrap`}>{k}</td>
                  <td className={td}>{n}</td>
                  <Money n={total(notDone.filter((p) => p.blocked.includes(k)), rates).krw} />
                  <td className="px-3 py-2 text-left text-xs text-neutral-400">{FIX[k] ?? '-'}</td>
                  <td className={td}><Link href={go({ v: 'rows', bl: k, st: OPEN })} className="text-sky-300 hover:underline">행 보기 →</Link></td>
                </tr>
              ))}
            </Table>
          </Panel>
          <Panel title={`이번 회차 보낼 것: ${md(payday(cycle))} 송금 (${thisCycle.length}건, ${won2(total(thisCycle, rates).krw)})`} sub="송금 가능, 모인 접수, 원화 이체 대기 중 이번 회차 송금일에 나가는 행입니다. 송금 예정일 순">
            {thisCycle.length ? <RowsTable xs={thisCycle} /> : <p className="text-sm text-neutral-500">이번 회차에 나갈 행이 없습니다.</p>}
          </Panel>
          {late.length > 0 && (
            <Panel title={`송금일이 지났는데 진행 중 (${late.length}건)`} sub="지난 회차 송금일에 나갔어야 하는데 아직 송금 완료가 아닌 행입니다. 모인, 은행에서 실제로 나갔는지 확인하고 노션 상태를 고칩니다">
              <RowsTable xs={late} />
            </Panel>
          )}
          {later.length > 0 && (
            <Panel title={`다음 회차 이후 (${later.length}건, ${won2(total(later, rates).krw)})`} sub="이미 송금 진행 중이지만 송금일이 다음 회차 이후인 행입니다(묶음 생성일 뒤에 송금 가능이 된 행 등)">
              <RowsTable xs={later} />
            </Panel>
          )}
          {legend}
        </>
      )}

      {view === 'cycles' && (
        <Panel title="회차별" sub="송금 완료는 송금일(없으면 송금 요청일)의 달, 진행 중은 회차 송금일의 달. 금액은 지급액(원천징수 전), 원화 환산은 모인 청구액 또는 환율. 건수에는 송금 완료가 들어가 할 일 탭 「보낼 것」(진행 중만)보다 많습니다. 회차를 누르면 그 회차 지급 행">
          <Table head={['회차 (정기 송금일)', '건수', '통화별 합계', '원화 환산', '상태']}>
            {[...months, null].map((m) => {
              const xs = byMonth(m)
              const t = total(xs, rates)
              return (
                <tr key={m ?? 'none'} className={m === cycle ? 'bg-sky-950/40' : ''}>
                  <td className={tdl}>
                    <Link href={go({ v: 'rows', cy: m ?? 'none' })} className="text-sky-300 hover:underline">{m ? `${m} (${payday(m).slice(5)})` : '미정 (대기, 보류, 날짜 없음)'}</Link>
                    {m === cycle && <span className="ml-2 rounded bg-sky-900/60 px-1.5 text-xs text-sky-200">이번 회차</span>}
                  </td>
                  <td className={td}>{t.n}</td>
                  <td className={td}>{curText(t)}</td>
                  <Money n={t.krw} />
                  <td className={td}>{statusText(xs) || '-'}</td>
                </tr>
              )
            })}
          </Table>
        </Panel>
      )}

      {view === 'creators' && (
        <Panel title="크리에이터별" sub="금액은 원화 환산. 이름을 누르면 그 크리에이터의 지급 이력이 열립니다" action={<SearchBox q={q} f={sp.f} n={cRows.length} total={creators.length} placeholder="크리에이터 이름" />}>
          <Table head={['이름', '건수', '송금 완료', '진행 중', '미정', '다음 송금일', '마지막 송금일']} tall
            sort={{ keys: ['name', 'n', 'done', 'plan', 'open', 'next', 'last'], cur: s, href: (k) => q({ s: k }) }}>
            {cRows.map((x) => (
              <tr key={x.name}>
                <td className={tdl}>
                  <Link href={go({ sel: x.name })} className="block max-w-[14rem] truncate whitespace-nowrap text-sky-300 hover:underline" title={x.name}>{x.name}</Link>
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
      )}

      {(view === 'rows' || view === 'creator') && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-100">{sp.sel ? `${sp.sel} 지급 행` : '지급 행'}</h2>
            {/* key: 링크로 필터가 바뀌어도 드롭다운이 이전 값을 붙들지 않게 다시 그림 */}
            <form key={[sp.st, sp.cur, sp.bl, sp.t, sp.cy, sp.nc].join('|')} action="/admin/payouts" className="flex flex-wrap items-center gap-2 text-sm">
              {(['v', 'sel'] as const).map((k) => sp[k] && <input key={k} type="hidden" name={k} value={sp[k]} />)}
              {!sp.sel && !sp.v && <input type="hidden" name="v" value="rows" />}
              <select name="st" defaultValue={sp.st ?? ''} className={sel}>
                <option value="">상태 전체</option>
                <option value={OPEN}>{OPEN}</option>
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
              <select name="cy" defaultValue={sp.cy ?? ''} className={sel}>
                <option value="">회차 전체</option>
                {months.map((m) => <option key={m} value={m}>{m}{m === cycle ? ' (이번)' : ''}</option>)}
                <option value="none">미정</option>
              </select>
              <select name="nc" defaultValue={sp.nc ?? ''} className={sel}>
                <option value="">계약 연결 전체</option>
                <option value="none">수입 계약 연결 없음</option>
              </select>
              <input name="t" defaultValue={sp.t} autoComplete="off" placeholder="이름, 지급 ID, 안건, 사유" className={`${sel} w-48 placeholder:text-neutral-600`} />
              <button className="rounded-md bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700">적용</button>
              {filtered && <Link href={q({ st: undefined, cur: undefined, bl: undefined, t: undefined, cy: undefined, nc: undefined })} className="text-xs text-neutral-400 hover:text-neutral-200">필터 지우기</Link>}
            </form>
          </div>
          <p className="text-xs text-neutral-500">{rows.length}건 / {base.length}건, {curText(rowSum)}, 원화 환산 {won(rowSum.krw)}</p>
          {legend}
          <RowsTable xs={rows} tall={!sp.sel} />
        </section>
      )}
    </div>
  )
}

/** 크리에이터 한 명: 목록 아래가 아니라 화면 맨 위에 열림(재무 크리에이터 탭과 같은 방식). 아래 지급 행 표가 그 사람 행만 */
function CreatorPanel({ name, xs, back, rates }: { name: string; xs: Payout[]; back: string; rates: Rates }) {
  const done = total(xs.filter((p) => p.status === DONE), rates)
  const flight = total(xs.filter((p) => IN_FLIGHT.includes(p.status)), rates)
  const held = total(xs.filter((p) => p.status === '대기' || p.status === '보류'), rates)
  const blocked = count(xs.filter((p) => p.status !== DONE).flatMap((p) => p.blocked))
  return (
    <div className="space-y-3 rounded-xl border border-sky-900 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={back} className="text-sm text-sky-300 hover:underline">← 크리에이터 목록</Link>
        <Link href={`/admin/finance?tab=creators&y=all&sel=${encodeURIComponent(name)}`} className="text-sm text-neutral-400 hover:text-neutral-200">재무에서 매출, 마진 보기 →</Link>
      </div>
      <h2 className="text-base font-semibold text-neutral-50">{name}</h2>
      <p className="text-sm text-neutral-300">
        송금 완료 {won2(done.krw)}({done.n}건), 진행 중 {won2(flight.krw)}({flight.n}건), 미정 {won2(held.krw)}({held.n}건)
        {blocked.length > 0 && <span className="text-amber-300">, 막힌 사유 {blocked.map(([k, n]) => `${k} ${n}`).join(', ')}</span>}
      </p>
    </div>
  )
}
