import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { getFinance } from '@/lib/finance/data'
import { getRates } from '@/lib/finance/fx'
import { buildModel } from '@/lib/finance/model'

export const maxDuration = 60

// 받을 돈(어드민 재무 「받을 돈」과 같은 계산: 부가세 포함, 일부 입금 뺀 남은 금액). 정산 람다 #99 미수 알림이 읽음.
// 토큰: 양쪽에 이미 있는 SUPABASE_SERVICE_ROLE_KEY에서 파생(sha256("receivables:" + key)), 원래 키는 보내지 않음
function authorized(req: NextRequest): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const [scheme, token] = (req.headers.get('authorization') ?? '').split(' ')
  if (!key || scheme !== 'Bearer' || !token) return false
  const want = Buffer.from(createHash('sha256').update(`receivables:${key}`).digest('hex'))
  const got = Buffer.from(token)
  return got.length === want.length && timingSafeEqual(got, want)
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
