import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'
import { LANGS, LOCALE, T, pick, type Lang } from './strings'

// 크리에이터 정산 화면(볼트 261028-설계-크리에이터-정산포털). 표 creator_payouts는 settlement 밤 갱신이 쓰고,
// 행 수준 보안이 role `creator` 계정 본인 이메일 행만 돌려준다. 광고주 입금 여부, 막힌 사유, 계약 금액은 표에 없다
export const metadata: Metadata = { title: 'Payouts | KOREANERS', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Row = {
  payout_id: number; lang: Lang; case_name: string; content_url: string | null; currency: string
  amount: number; deduction: number; net: number; display_status: '송금 완료' | '송금 예정' | '미정'
  due_on: string | null; paid_on: string | null; receipt_mailed_on: string | null
}

const money = (lang: Lang, cur: string, n: number) =>
  cur ? new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: cur }).format(n) : String(n)
const date = (lang: Lang, d: string) => new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(d))
// 통화가 섞인 크리에이터(원화와 엔화를 함께 받는 경우)는 통화별 합을 나란히
const sums = (lang: Lang, rows: Row[]) => {
  const by = new Map<string, number>()
  rows.forEach((r) => by.set(r.currency, (by.get(r.currency) ?? 0) + Number(r.net)))
  return [...by].map(([c, n]) => money(lang, c, n)).join(' + ')
}
const rank = { '송금 예정': 0, '미정': 1, '송금 완료': 2 }

export default async function SettlementPage({ searchParams }: { searchParams: Promise<{ lang?: string; expired?: string }> }) {
  const q = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const creator = user?.app_metadata?.role === 'creator'
  const rows: Row[] = creator ? ((await supabase.from('creator_payouts').select('*')).data ?? []) : []
  const lang = pick(q.lang) ?? pick(rows[0]?.lang) ?? pick(user?.user_metadata?.lang) ?? 'ja'
  const t = T[lang]

  const switcher = (
    <nav className="flex gap-3 text-sm">
      {LANGS.map((l) => (
        <Link key={l} href={`/settlement?lang=${l}`} className={l === lang ? 'font-semibold underline' : 'text-muted-foreground'}>
          {{ ja: '日本語', en: 'English', ko: '한국어' }[l]}
        </Link>
      ))}
    </nav>
  )

  if (!creator) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">{t.title}</h1>{switcher}</div>
        {q.expired && <p className="text-sm text-destructive">{t.expired}</p>}
        <LoginForm lang={lang} />
      </main>
    )
  }

  rows.sort((a, b) => rank[a.display_status] - rank[b.display_status]
    || (a.display_status === '송금 완료' ? (b.paid_on ?? '').localeCompare(a.paid_on ?? '') : (a.due_on ?? '').localeCompare(b.due_on ?? '')))
  const nextDay = rows.find((r) => r.display_status === '송금 예정')?.due_on
  const next = rows.filter((r) => r.display_status === '송금 예정' && r.due_on === nextDay)
  const year = new Date().getFullYear()
  const paid = rows.filter((r) => r.display_status === '송금 완료' && r.paid_on?.startsWith(String(year)))

  return (
    <main className="mx-auto max-w-2xl px-4 py-24 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <div className="flex items-center gap-4">
          {switcher}
          <form action="/settlement/logout" method="post"><button className="text-sm text-muted-foreground underline">{t.logout}</button></form>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t.next}</p>
          {nextDay ? (
            <>
              <p className="mt-1 text-lg font-semibold">{date(lang, nextDay)}</p>
              <p className="text-sm">{sums(lang, next)} ({t.items(next.length)})</p>
            </>
          ) : <p className="mt-1 text-lg font-semibold">{t.none}</p>}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t.year(year)}</p>
          <p className="mt-1 text-lg font-semibold">{paid.length ? sums(lang, paid) : '-'}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{t.list}</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}
        {rows.map((r) => {
          const day = r.display_status === '송금 완료' ? r.paid_on : r.due_on
          return (
            <details key={r.payout_id} className="rounded-lg border">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-3 text-sm">
                <span className="font-medium">{r.case_name || t.noCase}</span>
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <span>{money(lang, r.currency, Number(r.net))}</span>
                  <span className="text-muted-foreground">{day ? `${t.status[r.display_status]} ${date(lang, day)}` : t.status[r.display_status]}</span>
                </span>
              </summary>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t p-3 text-sm">
                {r.content_url && (<><dt className="text-muted-foreground">{t.content}</dt>
                  <dd><a href={r.content_url} target="_blank" rel="noopener noreferrer" className="underline break-all">{r.content_url}</a></dd></>)}
                <dt className="text-muted-foreground">{t.amount}</dt><dd>{money(lang, r.currency, Number(r.amount))}</dd>
                {Number(r.deduction) !== 0 && (<><dt className="text-muted-foreground">{Number(r.deduction) > 0 ? t.deduction : t.vat}</dt>
                  <dd>{Number(r.deduction) > 0 ? '-' : '+'}{money(lang, r.currency, Math.abs(Number(r.deduction)))}</dd></>)}
                <dt className="text-muted-foreground">{t.net}</dt><dd className="font-medium">{money(lang, r.currency, Number(r.net))}</dd>
                {r.receipt_mailed_on && (<><dt className="text-muted-foreground">{t.receipt}</dt><dd>{date(lang, r.receipt_mailed_on)}</dd></>)}
              </dl>
            </details>
          )
        })}
      </section>
    </main>
  )
}
