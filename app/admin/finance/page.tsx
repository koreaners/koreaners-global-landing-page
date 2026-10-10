import Link from 'next/link'
import { getFinance } from '@/lib/finance/data'
import { getRates } from '@/lib/finance/fx'
import { buildModel, payoutKrw, type Model, type Payout, type Rates } from '@/lib/finance/model'

// 관리자 대시보드: 노션 Contract DB, 지급내역 DB 기준 매출, 정산, 마진 (설계: 볼트 work/261010-설계-관리자대시보드)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TABS = [
  ['summary', '요약'],
  ['contracts', '안건'],
  ['creators', '크리에이터'],
  ['owners', '담당자'],
  ['basis', '기준'],
] as const
type Tab = (typeof TABS)[number][0]

const won = (n: number | null | undefined) => (n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`)
const pct = (r: number | null | undefined) => (r == null ? '-' : `${(r * 100).toFixed(1)}%`)
const orig = (p: Payout) => (p.amount == null ? '-' : `${p.amount.toLocaleString('ko-KR')} ${p.currency ?? '통화 미상'}`)

type Search = { tab?: string; y?: string; m?: string; sel?: string }

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? 'summary') as Tab
  const thisYear = new Date().getFullYear()
  const year = sp.y === 'all' ? null : Number(sp.y) || thisYear
  const month = year != null && Number(sp.m) >= 1 && Number(sp.m) <= 12 ? Number(sp.m) : null

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

  const model = buildModel(data.contracts, data.payouts, rates, { year, month })
  const years = [...new Set(data.contracts.map((c) => c.contractDate?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse()
  const q = (over: Partial<Search>) => {
    const s = new URLSearchParams()
    const merged = { tab, y: year == null ? 'all' : String(year), m: month ? String(month) : undefined, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) s.set(k, v)
    return `/admin/finance?${s}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">대시보드</h1>
          <p className="text-xs text-neutral-500">
            노션 Contract DB, 지급내역 DB 기준, 조회 {new Date(data.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (5분 캐시)
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm" action="/admin/finance">
          <input type="hidden" name="tab" value={tab} />
          <select name="y" defaultValue={year == null ? 'all' : String(year)} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
            <option value="all">전체 기간</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select name="m" defaultValue={month ? String(month) : ''} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200">
            <option value="">연간</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}월</option>
            ))}
          </select>
          <button className="rounded-md bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700">보기</button>
        </form>
      </div>

      <nav className="flex gap-1 border-b border-neutral-800">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={q({ tab: k, sel: undefined })}
            className={`px-3 py-2 text-sm ${k === tab ? 'border-b-2 border-sky-400 text-neutral-50' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'summary' && <Summary model={model} />}
      {tab === 'contracts' && <Contracts model={model} rates={rates} sel={sp.sel} q={q} />}
      {tab === 'creators' && <Creators model={model} rates={rates} sel={sp.sel} q={q} />}
      {tab === 'owners' && <Owners model={model} />}
      {tab === 'basis' && <Basis model={model} rates={rates} />}
    </div>
  )
}

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-50">{value}</p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-xs text-neutral-500">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3 py-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 text-neutral-200">{children}</tbody>
      </table>
    </div>
  )
}

const td = 'whitespace-nowrap px-3 py-2 text-right tabular-nums'
const tdl = 'px-3 py-2 text-left'

function Summary({ model }: { model: Model }) {
  const s = model.summary
  const max = Math.max(1, ...model.monthly.map((r) => Math.max(r.revenue, r.settled)))
  let accRev = 0
  let accSet = 0
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="매출(입금 기준)" value={won(s.revenue)} note="공급가, 입금된 달" />
        <Card label="받을 돈(현재)" value={won(s.receivable)} note="입금일 없는 몫" />
        <Card label="정산(송금 기준)" value={won(s.settled)} note="송금 완료, 송금한 달" />
        <Card label="줄 돈(현재)" value={won(s.payable)} note={`보류 ${won(s.held)} 포함`} />
        <Card label="마진(계약 단위)" value={won(s.margin)} note={`마진율 ${pct(s.marginRate)}`} />
      </div>
      <Table head={['월', '매출(입금)', '정산(송금)', '매출 누적', '정산 누적', '']}>
        {model.monthly.map((r) => {
          accRev += r.revenue
          accSet += r.settled
          return (
            <tr key={r.month}>
              <td className={tdl}>{r.month}</td>
              <td className={td}>{won(r.revenue)}</td>
              <td className={td}>{won(r.settled)}</td>
              <td className={td}>{won(accRev)}</td>
              <td className={td}>{won(accSet)}</td>
              <td className="w-48 px-3 py-2">
                <div className="h-1.5 rounded bg-sky-500" style={{ width: `${(r.revenue / max) * 100}%` }} />
                <div className="mt-1 h-1.5 rounded bg-amber-500" style={{ width: `${(r.settled / max) * 100}%` }} />
              </td>
            </tr>
          )
        })}
      </Table>
      <p className="text-xs text-neutral-500">막대: 파랑 매출, 주황 정산. 받을 돈과 줄 돈은 기간과 관계없는 현재 잔액입니다.</p>
    </div>
  )
}

function PayoutTable({ payouts, rates }: { payouts: Payout[]; rates: Rates }) {
  return (
    <Table head={['지급 ID', '이름', '상태', '지급액', '원화', '송금일', '막힌 사유']}>
      {payouts.map((p) => (
        <tr key={p.id}>
          <td className={tdl}>{p.pid ?? '-'}</td>
          <td className={`${td} text-left`}>{p.name}</td>
          <td className={td}>{p.status}</td>
          <td className={td}>{orig(p)}</td>
          <td className={td}>{won(payoutKrw(p, rates))}{p.krwBilled != null ? ' (청구액)' : ''}</td>
          <td className={td}>{p.sentDate ?? '-'}</td>
          <td className={td}>{p.blocked.join(', ') || '-'}</td>
        </tr>
      ))}
    </Table>
  )
}

function Contracts({ model, rates, sel, q }: { model: Model; rates: Rates; sel?: string; q: (o: Partial<Search>) => string }) {
  const picked = model.contracts.find((x) => x.c.id === sel)
  return (
    <div className="space-y-4">
      {picked && (
        <div className="space-y-3 rounded-xl border border-sky-900 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-200">
            {picked.c.code}, 공급가 {won(picked.supply)}, 변동비 {won(picked.cost)}, 마진 {won(picked.margin)} ({pct(picked.rate)})
          </p>
          {picked.payouts.length ? <PayoutTable payouts={picked.payouts} rates={rates} /> : <p className="text-xs text-neutral-500">이 계약에 연결된 지급 행이 없습니다.</p>}
        </div>
      )}
      <Table head={['코드', '브랜드', '담당자', '계약일', '공급가', '입금', '변동비(지급)', '마진', '마진율', '계약서']}>
        {model.contracts.map((x) => (
          <tr key={x.c.id} className={x.c.id === sel ? 'bg-sky-950/40' : ''}>
            <td className={tdl}>
              <Link href={q({ sel: x.c.id })} className="text-sky-300 hover:underline">{x.c.code}</Link>
            </td>
            <td className={`${td} text-left`}>{x.c.brand || x.c.corp}</td>
            <td className={td}>{x.c.owner || '미지정'}</td>
            <td className={td}>{x.day ?? '-'}</td>
            <td className={td}>{won(x.supply)}{x.c.supplyKrw == null && x.c.supplyJpy != null ? ' (엔화)' : ''}</td>
            <td className={td}>{x.supply == null ? '-' : `${won(x.received)}${x.estimated ? ' (어림)' : ''}`}</td>
            <td className={td}>{won(x.cost)}</td>
            <td className={td}>{won(x.margin)}</td>
            <td className={td}>{pct(x.rate)}</td>
            <td className={td}>{x.c.link ? <a href={x.c.link} target="_blank" className="text-sky-300 hover:underline">열기</a> : '-'}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">변동비는 이 계약에 연결된 지급 합계(상태 무관)입니다. 코드를 누르면 지급 행이 위에 열립니다.</p>
    </div>
  )
}

function Creators({ model, rates, sel, q }: { model: Model; rates: Rates; sel?: string; q: (o: Partial<Search>) => string }) {
  const picked = model.creators.find((x) => x.name === sel)
  return (
    <div className="space-y-4">
      {picked && (
        <div className="space-y-3 rounded-xl border border-sky-900 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-200">
            {picked.name}, 매출 몫 {won(picked.revenue)}, 정산 {won(picked.paid)}
          </p>
          {picked.shares.length > 0 && (
            <Table head={['계약', '브랜드', '이 크리에이터 지급', '매출 몫']}>
              {picked.shares.map((s) => (
                <tr key={s.c.id}>
                  <td className={tdl}>{s.c.code}</td>
                  <td className={td}>{s.c.brand || s.c.corp}</td>
                  <td className={td}>{won(s.paid)}</td>
                  <td className={td}>{won(s.share)}</td>
                </tr>
              ))}
            </Table>
          )}
          <PayoutTable payouts={picked.payouts} rates={rates} />
        </div>
      )}
      <Table head={['이름', '통화', '매출 몫', '매출 건수', '정산 합계', '정산 건수', '마진율', '송금 완료', '진행 중', '미지급, 보류']}>
        {model.creators.map((x) => (
          <tr key={x.name} className={x.name === sel ? 'bg-sky-950/40' : ''}>
            <td className={tdl}>
              <Link href={q({ sel: x.name })} className="text-sky-300 hover:underline">{x.name}</Link>
            </td>
            <td className={td}>{x.currencies.join(', ') || '-'}</td>
            <td className={td}>{won(x.revenue)}</td>
            <td className={td}>{x.revenueCount}</td>
            <td className={td}>{won(x.paid)}</td>
            <td className={td}>{x.paidCount}</td>
            <td className={td}>{x.revenue ? pct((x.revenue - x.linkedPaid) / x.revenue) : '-'}</td>
            <td className={td}>{won(x.done)}</td>
            <td className={td}>{won(x.inFlight)}</td>
            <td className={td}>{won(x.held)}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">
        매출 몫은 계약 공급가를 그 계약의 실제 지급 비율로 나눈 값입니다. 수입 계약에 연결되지 않은 지급은 정산에만 들어가고 매출 몫은 없습니다. 마진율은 매출 몫이 있는 지급끼리만 짝짓습니다.
      </p>
    </div>
  )
}

function Owners({ model }: { model: Model }) {
  return (
    <div className="space-y-2">
      <Table head={['담당자', '계약 수', '공급가', '입금액', '변동비', '마진', '마진율']}>
        {model.owners.map((o) => (
          <tr key={o.owner}>
            <td className={tdl}>{o.owner}</td>
            <td className={td}>{o.count}</td>
            <td className={td}>{won(o.supply)}</td>
            <td className={td}>{won(o.received)}</td>
            <td className={td}>{won(o.cost)}</td>
            <td className={td}>{won(o.margin)}</td>
            <td className={td}>{pct(o.rate)}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-neutral-500">Contract DB 「담당자(정)」 기준입니다. 세일즈 담당자 칸은 아직 없습니다. 공급가가 없는 계약은 빠집니다.</p>
    </div>
  )
}

function Basis({ model, rates }: { model: Model; rates: Rates }) {
  const g = model.gaps
  const rows: [string, string][] = [
    ['입금일이 하나도 없는 수입 계약', `${g.noDeposit}건`],
    ['공급가가 없는 수입 계약(합계에서 빠짐)', `${g.noSupply}건`],
    ['날짜(계약일자, 시작일, 입금일)가 없는 수입 계약', `${g.noDay}건`],
    ['선금, 잔금 금액을 읽지 못해 반반으로 나눈 계약', `${g.estimatedSplit}건`],
    ['수입 계약에 연결되지 않은 지급(매출 몫, 마진에서 빠짐)', `${g.unlinked.count}행, ${won(g.unlinked.krw)}`],
    ['송금일 없는 송금 완료(월별 정산에서 빠짐)', `${g.doneNoDate.count}행, ${won(g.doneNoDate.krw)}`],
    ['원화 청구액 없는 외화 송금 완료(환율로 환산)', `${g.fxNoBilled}행`],
    ['통화나 지급액이 없어 환산하지 못한 지급', `${g.noRate}행`],
  ]
  return (
    <div className="space-y-6 text-sm text-neutral-300">
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">집계 기준</h2>
        <ul className="list-disc space-y-1 pl-5 text-neutral-400">
          <li>매출: 수입 계약 공급가(부가세 제외)를 입금된 달에 셉니다. 선금+잔금 계약은 금액 비율로 나눕니다. P- 지출 계약은 빠집니다.</li>
          <li>정산: 지급내역 「송금 완료」 행의 지급액(원천징수 전)을 송금일의 달에 셉니다.</li>
          <li>받을 돈, 줄 돈: 기간과 관계없는 현재 잔액입니다. 줄 돈은 송금 완료가 아닌 모든 지급(보류 포함)입니다.</li>
          <li>마진: 계약 단위로 짝짓습니다. 공급가에서 그 계약에 연결된 지급 합계를 뺍니다. 기간은 계약일자(없으면 시작일, 첫 입금일)로 고릅니다.</li>
          <li>
            원화 환산: 외화 지급은 모인 원화 청구액이 있으면 그 값, 없으면 환율. 지금 환율 1엔 {rates.JPY.toFixed(4)}원, 1달러 {rates.USD.toFixed(1)}원, 1위안 {rates.CNY.toFixed(2)}원 ({rates.source}, {rates.at}).
          </li>
          <li>Contract DB에 없는 계약(26년 Dashboard에만 있는 계약 128건, 세금계산서로만 확인한 매출 등, 261005 기준)은 나오지 않습니다. 크리에이터별 연간매출정산 HTML(261002)과 합계가 다른 주된 이유입니다.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-100">빈칸 점검</h2>
        <Table head={['항목', '현재']}>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className={tdl}>{k}</td>
              <td className={td}>{v}</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  )
}
