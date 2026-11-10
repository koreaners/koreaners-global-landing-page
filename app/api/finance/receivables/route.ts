import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getFinance } from '@/lib/finance/data'
import { getRates } from '@/lib/finance/fx'
import { buildModel } from '@/lib/finance/model'

export const maxDuration = 60

// 받을 돈(어드민 재무 「받을 돈」과 같은 계산: 부가세 포함, 일부 입금 뺀 남은 금액). 정산 람다 #99 미수 알림이 읽음.
// 토큰: RECEIVABLES_API_TOKEN(Vercel 운영 환경변수, 정산 람다 시크릿 koreaners-inquiry/env 같은 값)
function authorized(req: NextRequest): boolean {
  const want = process.env.RECEIVABLES_API_TOKEN
  const [scheme, token] = (req.headers.get('authorization') ?? '').split(' ')
  if (!want || scheme !== 'Bearer' || !token || token.length !== want.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(want))
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const [data, rates] = await Promise.all([getFinance(), getRates()])
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10) // KST
  const m = buildModel(data.contracts, data.payouts, rates, { year: null, month: null }, today, 'cash', data.bankLinks)
  const rows = m.receivables.open.map((o) => ({
    id: o.c.id, code: o.c.code, brand: o.c.brand, corp: o.c.corp, owner: o.c.owner, method: o.c.method,
    label: o.label ?? null, voucher: o.c.voucher ?? null, due: o.due, krw: Math.round(o.krw), guess: !!o.c.dueGuess,
  }))
  return NextResponse.json({ today, fetchedAt: data.fetchedAt, bankError: data.bankError, rows })
}
