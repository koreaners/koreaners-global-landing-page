// 노션 Contract DB, 지급내역 DB 전체 조회와 정리. next 에 기대지 않아 점검 스크립트도 그대로 쓴다.
import { Client } from '@notionhq/client'
import { google } from 'googleapis'
import type { BankLink, Contract, Currency, Payout } from './model'
import { sheetContracts } from './sheet'
import { createAdminClient } from '../supabase/admin'

type Prop = { type: string; [k: string]: unknown }
type Page = { id: string; properties: Record<string, Prop> }

const CURRENCIES = ['KRW', 'JPY', 'USD', 'CNY']

/** 노션 속성 하나를 글, 숫자, 날짜, id 목록 같은 평범한 값으로 */
function val(page: Page, name: string): unknown {
  const p = page.properties[name]
  if (!p) return null
  const v = p[p.type] as any
  switch (p.type) {
    case 'title':
    case 'rich_text':
      return (v as { plain_text: string }[]).map((t) => t.plain_text).join('').trim()
    case 'select':
      return v?.name ?? null
    case 'multi_select':
      return (v as { name: string }[]).map((o) => o.name)
    case 'date':
      return v?.start ?? null
    case 'relation':
      return (v as { id: string }[]).map((o) => o.id)
    case 'formula':
      return v?.[v.type] ?? null
    case 'unique_id':
      return v?.number ?? null
    default:
      return v ?? null
  }
}

const str = (page: Page, name: string) => (val(page, name) as string | null) ?? ''
const num = (page: Page, name: string) => (val(page, name) as number | null) ?? null
const day = (page: Page, name: string) => {
  const d = val(page, name) as string | null
  return d ? d.slice(0, 10) : null
}
const first = (page: Page, name: string) => ((val(page, name) as string[] | null) ?? [])[0] ?? null

async function queryAll(notion: Client, dataSourceId: string): Promise<Page[]> {
  const out: Page[] = []
  let cursor: string | undefined
  do {
    const res = await notion.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor, page_size: 100 })
    out.push(...(res.results as unknown as Page[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return out
}

export function toContract(page: Page): Contract {
  // 봇 광고주 계약은 서명 전 제목이 「(서명 전) 법인명」이고 서명완료 때 코드가 들어온다(정산 람다 refresh.UNSIGNED)
  const title = str(page, '유니크코드')
  const code = title.startsWith('(서명 전) ') ? '' : title
  const kind = val(page, '구분')
  return {
    id: page.id,
    code,
    brand: str(page, '브랜드명'),
    corp: str(page, '법인명'),
    owner: str(page, '담당자(정)'),
    // 구분 수식(제목이 P- 로 시작하면 지출)이 비어 오면 코드로 판정
    isExpense: typeof kind === 'string' && kind ? kind.includes('지출') : code.startsWith('P-'),
    excluded: val(page, '매출 제외') === true,
    method: (val(page, '정산 방식') as string | null) ?? null,
    supplyKrw: num(page, '공급가(원)'),
    supplyJpy: num(page, '공급가(엔)'),
    currency: CURRENCIES.includes(str(page, '통화')) ? (str(page, '통화') as Currency) : null,
    totalKrw: num(page, '합계(원)'),
    totalJpy: num(page, '합계(엔)'),
    vatKrw: num(page, '부가세(원)'),
    expectedCost: num(page, '예상 원가(원)'),
    voucher: (val(page, '수출바우처') as string | null) ?? null,
    preText: str(page, '선금 금액'),
    postText: str(page, '잔금 금액'),
    preDate: day(page, '선금 입금일'),
    postDate: day(page, '잔금 입금일'),
    preDue: day(page, '선금 정산일'),
    postDue: day(page, '잔금 정산일'),
    contractDate: day(page, '계약일자'),
    startDate: day(page, '시작일'),
    link: (val(page, '계약서 링크') as string | null) ?? null,
    unsigned: title.startsWith('(서명 전) '),
    dueGuess: str(page, '비고').includes('정산일 임의'),
    twikr: str(page, '비고').includes('공급자 트위커'),
  }
}

export function toPayout(page: Page): Payout {
  const cur = val(page, '통화') as string | null
  return {
    id: page.id,
    pid: num(page, '지급 ID'),
    name: str(page, '제목') || '(이름 없음)',
    status: str(page, '상태') || '대기',
    currency: cur && CURRENCIES.includes(cur) ? (cur as Currency) : null,
    amount: num(page, '지급액'),
    krwBilled: num(page, '원화 청구액'),
    sentDate: day(page, '송금일'),
    reqDate: day(page, '송금 요청일'),
    contractId: first(page, '수입 계약'),
    blocked: (val(page, '막힌 사유') as string[] | null) ?? [],
    notContract: val(page, '계약 아님') === true,
    vat: (val(page, 'VAT') as string | null) ?? null,
    deduction: (val(page, '공제 유형') as string | null) ?? null,
    creatorIds: (val(page, '크리에이터') as string[] | null) ?? [],
    payeeId: first(page, '수취인'),
    price: num(page, '매출 단가'),
    note: str(page, '비고'),
    dueOn: day(page, '송금 예정일'),
    dueManual: str(page, '비고').includes('송금 예정일 임의'),
  }
}

export type FinanceData = {
  contracts: Contract[]
  payouts: Payout[]
  ig: Record<string, string> // 크리에이터 리스트 페이지 id → 인스타 URL
  igError: string | null
  fetchedAt: string
  sheet: { tab: string; added: number; codeless: number; dups: string[]; supplyFrom: string[] } | null
  sheetError: string | null
  bankLinks: BankLink[] // 은행 원장 입금 줄의 계약 연결(일부 입금 차감, 바우처 고객사 부가세)
  bankError: string | null
}

/** 운영 대시보드(MKT Ops Master)에서 숫자가 가장 큰 Dashboard 탭 전체 값 */
async function readDashboard(env: Record<string, string | undefined>): Promise<{ tab: string; values: string[][] }> {
  const id = env.GOOGLE_SHEETS_PROJECT_ID
  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
  let auth
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) auth = new google.auth.GoogleAuth({ credentials: JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes })
  else if (env.GOOGLE_ACCESS_TOKEN) {
    // 로컬 미리보기 전용: gcloud auth print-access-token 으로 받은 토큰
    auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: env.GOOGLE_ACCESS_TOKEN })
  }
  if (!id || !auth) throw new Error('환경변수 없음: GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SHEETS_PROJECT_ID')
  const sheets = google.sheets({ version: 'v4', auth })
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'sheets.properties.title' })
  const num = (t: string) => Number(t.match(/\d+/)?.[0] ?? -1)
  const tab = (meta.data.sheets ?? [])
    .map((x) => x.properties?.title ?? '')
    .filter((t) => /dashboard/i.test(t))
    .sort((a, b) => num(b) - num(a))[0]
  if (!tab) throw new Error('Dashboard 탭 없음')
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `'${tab}'!A:AZ`, valueRenderOption: 'FORMATTED_VALUE' })
  return { tab, values: (res.data.values ?? []) as string[][] }
}

/** 은행 원장(Supabase bank_transactions, RLS로 service_role만 읽음) 입금 줄 가운데 계약 연결이 있는 줄의 links를 펼침.
 * 일부 입금(kind 공급가, 부가세)과 사람 판정 필요(ambiguous)만 model이 쓰고, 나머지 확정 줄은 노션 입금일로 이미 반영됨 */
async function readBankLinks(): Promise<BankLink[]> {
  const sb = createAdminClient()
  const out: BankLink[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('bank_transactions').select('id, links').eq('direction', '입금').contains('links', JSON.stringify([{ db: 'contract' }])).order('id').range(from, from + 999)
    if (error) throw new Error(`은행 원장 조회 실패: ${error.message}`)
    for (const row of data ?? []) for (const l of (row.links ?? []) as BankLink[]) if (l?.db === 'contract' && l.page) out.push(l)
    if ((data ?? []).length < 1000) return out
  }
}

export async function loadFinance(env: Record<string, string | undefined>): Promise<FinanceData> {
  const token = env.NOTION_FINANCE_TOKEN ?? env.NOTION_TOKEN
  const contractDs = env.NOTION_CONTRACT_DS_ID
  const payoutDs = env.NOTION_PAYOUT_DS_ID
  if (!token || !contractDs || !payoutDs) {
    throw new Error('환경변수 없음: NOTION_TOKEN(또는 NOTION_FINANCE_TOKEN), NOTION_CONTRACT_DS_ID, NOTION_PAYOUT_DS_ID')
  }
  const notion = new Client({ auth: token })
  let igError: string | null = null
  const [c, p, cr] = await Promise.all([
    queryAll(notion, contractDs).catch((e) => {
      throw new Error(`Contract DB 조회 실패: ${e?.status ?? ''} ${e?.code ?? e?.message ?? e}`)
    }),
    queryAll(notion, payoutDs).catch((e) => {
      throw new Error(`지급내역 DB 조회 실패: ${e?.status ?? ''} ${e?.code ?? e?.message ?? e}`)
    }),
    // 인스타 핸들만 쓰므로 못 읽어도 나머지는 계속
    queryAll(notion, env.NOTION_CREATOR_DS_ID ?? '2f601ca3-e480-80c0-82a3-000b7f67640d').catch((e) => {
      igError = `크리에이터 리스트 조회 실패: ${e?.status ?? ''} ${e?.code ?? e?.message ?? e}`
      return [] as Page[]
    }),
  ])
  const ig: Record<string, string> = {}
  for (const x of cr) {
    const u = val(x, '인스타') as string | null
    if (u) ig[x.id] = u
  }
  const contracts = c.map(toContract)
  // Contract DB에 아직 없는 운영 대시보드 계약을 더함(코드 받기와 코드 대조 전 임시). 시트를 못 읽어도 노션만으로 계속
  let sheet: FinanceData['sheet'] = null
  let sheetError: string | null = null
  try {
    const { tab, values } = await readDashboard(env)
    const r = sheetContracts(values, contracts)
    contracts.push(...r.contracts)
    sheet = { tab, added: r.contracts.length, codeless: r.codeless, dups: r.dups, supplyFrom: r.supplyFrom }
  } catch (e) {
    sheetError = e instanceof Error ? e.message : String(e)
  }
  // 원장을 못 읽어도 노션만으로 계속(일부 입금 차감 없이 회차 전액을 받을 돈으로)
  let bankLinks: BankLink[] = []
  let bankError: string | null = null
  try {
    bankLinks = await readBankLinks()
  } catch (e) {
    bankError = e instanceof Error ? e.message : String(e)
  }
  return { contracts, payouts: p.map(toPayout), ig, igError, fetchedAt: new Date().toISOString(), sheet, sheetError, bankLinks, bankError }
}
