// 노션 Contract DB, 지급내역 DB 전체 조회와 정리. next 에 기대지 않아 점검 스크립트도 그대로 쓴다.
import { Client } from '@notionhq/client'
import { google } from 'googleapis'
import type { Contract, Currency, Payout } from './model'
import { sheetContracts } from './sheet'

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
  const code = str(page, '유니크코드')
  const kind = val(page, '구분')
  return {
    id: page.id,
    code,
    brand: str(page, '브랜드명'),
    corp: str(page, '법인명'),
    owner: str(page, '담당자(정)'),
    // 구분 수식(제목이 P- 로 시작하면 지출)이 비어 오면 코드로 판정
    isExpense: typeof kind === 'string' && kind ? kind.includes('지출') : code.startsWith('P-'),
    method: (val(page, '정산 방식') as string | null) ?? null,
    supplyKrw: num(page, '공급가(원)'),
    supplyJpy: num(page, '공급가(엔)'),
    totalKrw: num(page, '합계(원)'),
    totalJpy: num(page, '합계(엔)'),
    preText: str(page, '선금 금액'),
    postText: str(page, '잔금 금액'),
    preDate: day(page, '선금 입금일'),
    postDate: day(page, '잔금 입금일'),
    preDue: day(page, '선금 정산일'),
    postDue: day(page, '잔금 정산일'),
    contractDate: day(page, '계약일자'),
    startDate: day(page, '시작일'),
    link: (val(page, '계약서 링크') as string | null) ?? null,
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
    deduction: (val(page, '공제 유형') as string | null) ?? null,
  }
}

export type FinanceData = {
  contracts: Contract[]
  payouts: Payout[]
  fetchedAt: string
  sheet: { tab: string; added: number; skippedDup: string[] } | null
  sheetError: string | null
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

export async function loadFinance(env: Record<string, string | undefined>): Promise<FinanceData> {
  const token = env.NOTION_FINANCE_TOKEN ?? env.NOTION_TOKEN
  const contractDs = env.NOTION_CONTRACT_DS_ID
  const payoutDs = env.NOTION_PAYOUT_DS_ID
  if (!token || !contractDs || !payoutDs) {
    throw new Error('환경변수 없음: NOTION_TOKEN(또는 NOTION_FINANCE_TOKEN), NOTION_CONTRACT_DS_ID, NOTION_PAYOUT_DS_ID')
  }
  const notion = new Client({ auth: token })
  const [c, p] = await Promise.all([
    queryAll(notion, contractDs).catch((e) => {
      throw new Error(`Contract DB 조회 실패: ${e?.status ?? ''} ${e?.code ?? e?.message ?? e}`)
    }),
    queryAll(notion, payoutDs).catch((e) => {
      throw new Error(`지급내역 DB 조회 실패: ${e?.status ?? ''} ${e?.code ?? e?.message ?? e}`)
    }),
  ])
  const contracts = c.map(toContract)
  // Contract DB에 아직 없는 운영 대시보드 계약을 더함(1회 소급 전 임시). 시트를 못 읽어도 노션만으로 계속
  let sheet: FinanceData['sheet'] = null
  let sheetError: string | null = null
  try {
    const { tab, values } = await readDashboard(env)
    const r = sheetContracts(values, contracts)
    contracts.push(...r.contracts)
    sheet = { tab, added: r.contracts.length, skippedDup: r.skippedDup }
  } catch (e) {
    sheetError = e instanceof Error ? e.message : String(e)
  }
  return { contracts, payouts: p.map(toPayout), fetchedAt: new Date().toISOString(), sheet, sheetError }
}
