#!/usr/bin/env node

/**
 * Standalone project sync: Google Sheets → Supabase
 * launchd에서 직접 실행 (Vercel 타임아웃 우회)
 *
 * Usage: node scripts/sync-projects.mjs
 * Env: .env.local 에서 자동 로드
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import dns from 'dns/promises'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env.local') })

const headerMapRaw = readFileSync(resolve(__dirname, '..', 'lib', 'sheets', 'header-map.json'), 'utf8')
const headerMap = JSON.parse(headerMapRaw)

// ─── Config ───────────────────────────────────────────────────

const REQUIRED_ENV = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SHEETS_PROJECT_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[sync-projects] Missing env var: ${key}`)
    process.exit(1)
  }
}

const credentials = JSON.parse(
  readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'utf8'),
)
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const FALLBACK_JPY_TO_KRW = 9.0
const RETRY_MAX = 3
const RETRY_DELAY_MS = 2000

// ─── Sheet row parsers ──────────────────────────────────────

function parseMoney(raw) {
  if (!raw) return 0
  const cleaned = raw.replace(/[₩¥\\,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(raw) {
  if (!raw || !raw.trim()) return null
  const m = raw.match(/(\d{4})[.\s/]+(\d{1,2})[.\s/]+(\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function parseEntryDate(raw) {
  if (!raw || !raw.trim()) return null
  const dateStr = raw.split(' ')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  return parseDate(dateStr)
}

function parseAssignees(raw) {
  if (!raw || !raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ─── Dynamic parser (header-based) ────────────────────────
function buildIndexMap(headerRow) {
  const map = new Map()
  for (let i = 0; i < headerRow.length; i++) {
    const header = (headerRow[i] ?? '').trim()
    if (!header) continue
    const def = headerMap[header]
    if (def) {
      map.set(def.field, { index: i, type: def.type })
    }
  }
  for (const requiredHeader of ['코드', '브랜드명']) {
    const def = headerMap[requiredHeader]
    if (def && !map.has(def.field)) {
      throw new Error(`필수 컬럼 "${requiredHeader}" (→ ${def.field})이 시트 헤더에 없습니다`)
    }
  }
  return map
}

function parseRowDynamic(row, indexMap, rowNumber) {
  const get = (field) => {
    const entry = indexMap.get(field)
    if (!entry) return ''
    return (row[entry.index] ?? '').trim()
  }
  const getTyped = (field) => {
    const entry = indexMap.get(field)
    if (!entry) return null
    const raw = (row[entry.index] ?? '').trim()
    if (!raw) return entry.type === 'money' ? 0 : entry.type === 'assignees' ? [] : null
    switch (entry.type) {
      case 'text': return raw
      case 'money': return parseMoney(raw)
      case 'date': return parseDate(raw)
      case 'entry_date': return parseEntryDate(raw)
      case 'assignees': return parseAssignees(raw)
      default: return raw
    }
  }
  const companyName = get('company_name')
  const brandName = get('brand_name')
  if (!companyName && !brandName) return null
  const record = {}
  for (const [field] of indexMap) {
    record[field] = getTyped(field)
  }
  record.row_code = `R${rowNumber}`
  record.name = brandName || companyName
  return record
}

// ─── Slack DM notification (Oliver bot) ─────────────────────

async function notifySlack(scriptName, status, detail = '') {
  const fs = await import('fs')
  const path = await import('path')
  const os = await import('os')
  let token = process.env.SLACK_BOT_TOKEN || ''
  let userId = process.env.SLACK_MY_USER_ID || ''
  if (!token || !userId) {
    try {
      const shared = fs.readFileSync(
        path.join(os.homedir(), '.config/shared-env/.env.shared'),
        'utf8',
      )
      for (const line of shared.split('\n')) {
        if (line.startsWith('SLACK_BOT_TOKEN='))
          token = line.split('=')[1].trim()
        if (line.startsWith('SLACK_MY_USER_ID='))
          userId = line.split('=')[1].trim()
      }
    } catch {}
  }
  if (!token || !userId) return
  const emoji = status === 'success' ? '✅' : '❌'
  const msg = `${emoji} *${scriptName}* — ${status}${detail ? `\n\`\`\`${detail.slice(0, 500)}\`\`\`` : ''}`
  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Leo 알림은 #assistant-bot, 실패만 Leo 태그(261102)
      body: JSON.stringify(userId === 'U0A7ZHM3WAH'
        ? { channel: 'C0C31NFB4H1', text: status === 'success' ? msg : `<@U0A7ZHM3WAH> ${msg}` }
        : { channel: userId, text: msg }),
    })
  } catch {}
}

// ─── Network readiness ──────────────────────────────────────

async function waitForNetwork() {
  const deadline = new Date()
  deadline.setHours(23, 50, 0, 0)
  let attempt = 0
  const start = Date.now()
  while (Date.now() < deadline.getTime()) {
    try {
      await dns.lookup('dns.google')
      if (attempt > 0) {
        const elapsed = Math.floor((Date.now() - start) / 60000)
        console.log(`[NET] 네트워크 연결 확인 (${attempt}회 재시도, ${elapsed}분 대기)`)
      }
      return
    } catch {
      attempt++
      const delay = attempt <= 5 ? Math.min(30, Math.pow(2, attempt)) * 1000 : 600000
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  console.error('[FATAL] 당일 자정까지 네트워크 미연결 — 종료')
  process.exit(1)
}

// ─── Retry wrapper ───────────────────────────────────────────

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt === RETRY_MAX) {
        throw new Error(`${label} failed after ${RETRY_MAX} attempts: ${msg}`)
      }
      console.warn(
        `[sync-projects] ${label} attempt ${attempt} failed: ${msg}. Retrying in ${RETRY_DELAY_MS}ms...`,
      )
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Exchange rate ───────────────────────────────────────────

async function getJpyToKrwRate() {
  const today = new Date().toISOString().slice(0, 10)

  // 1. Supabase 당일 캐시
  try {
    const { data: cached } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency_pair', 'JPY/KRW')
      .eq('rate_date', today)
      .maybeSingle()
    if (cached?.rate != null) return cached.rate
  } catch {}

  // 2. ECOS API
  const apiKey = process.env.BOK_ECOS_API_KEY
  if (apiKey) {
    try {
      const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/731Y001/D/${today}/${today}/JPY/0000003`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const rows = json?.StatisticSearch?.row
        if (Array.isArray(rows) && rows.length > 0) {
          const raw = parseFloat(rows[0].DATA_VALUE)
          if (!isNaN(raw)) {
            const rate = raw / 100
            // 캐시 저장
            await supabase.from('exchange_rates').upsert(
              {
                currency_pair: 'JPY/KRW',
                rate,
                rate_date: today,
                source: 'ecos',
                fetched_at: new Date().toISOString(),
              },
              { onConflict: 'currency_pair,rate_date' },
            )
            return rate
          }
        }
      }
    } catch {}
  }

  // 3. 최근 캐시
  try {
    const { data: recent } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency_pair', 'JPY/KRW')
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (recent?.rate != null) return recent.rate
  } catch {}

  return FALLBACK_JPY_TO_KRW
}

const FALLBACK_USD_TO_KRW = 1350.0

async function getUsdToKrwRate() {
  const today = new Date().toISOString().slice(0, 10)

  try {
    const { data: cached } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency_pair', 'USD/KRW')
      .eq('rate_date', today)
      .maybeSingle()
    if (cached?.rate != null) return cached.rate
  } catch {}

  const apiKey = process.env.BOK_ECOS_API_KEY
  if (apiKey) {
    try {
      const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/731Y001/D/${today}/${today}/USD/0000003`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const rows = json?.StatisticSearch?.row
        if (Array.isArray(rows) && rows.length > 0) {
          const raw = parseFloat(rows[0].DATA_VALUE)
          if (!isNaN(raw)) {
            await supabase.from('exchange_rates').upsert(
              {
                currency_pair: 'USD/KRW',
                rate: raw,
                rate_date: today,
                source: 'ecos',
                fetched_at: new Date().toISOString(),
              },
              { onConflict: 'currency_pair,rate_date' },
            )
            return raw
          }
        }
      }
    } catch {}
  }

  try {
    const { data: recent } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency_pair', 'USD/KRW')
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (recent?.rate != null) return recent.rate
  } catch {}

  return FALLBACK_USD_TO_KRW
}

// ─── Fetch Google Sheets data ────────────────────────────────

// "Dashboard" 포함 탭 중 이름 내 최대 숫자(연도) 큰 것 우선 — "26년 Dashboard" > "25년 Dashboard".
// 연도 prefix rename 에 견디게 함 (2026-06-29: 탭이 "26년 Dashboard" 로 rename 되며
// 하드코딩된 'Dashboard!A:AJ' 읽기가 깨져 6/19 이후 동기화 중단된 사고 수정).
async function resolveDashboardTab() {
  const { data } = await withRetry(
    () =>
      sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_PROJECT_ID,
        fields: 'sheets.properties.title',
      }),
    'Google Sheets get tab titles',
  )
  const titles = (data.sheets ?? []).map((s) => s.properties.title)
  const matches = titles.filter((t) => /dashboard/i.test(t))
  if (matches.length === 0) {
    throw new Error('No "Dashboard" tab found. Tabs: ' + titles.join(', '))
  }
  matches.sort((a, b) => {
    const na = Math.max(...(a.match(/\d+/g) || ['0']).map(Number))
    const nb = Math.max(...(b.match(/\d+/g) || ['0']).map(Number))
    return nb - na
  })
  return matches[0]
}

async function fetchSheetData() {
  const tab = await resolveDashboardTab()
  const { data } = await withRetry(
    () =>
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_PROJECT_ID,
        range: `'${tab}'!A:AJ`,
        valueRenderOption: 'FORMATTED_VALUE',
      }),
    'Google Sheets fetch',
  )
  const values = data.values ?? []
  if (values.length < 2) return { headerRow: [], dataRows: [] }
  return { headerRow: values[0], dataRows: values.slice(1) }
}

// ─── Batch upsert to Supabase ────────────────────────────────

async function batchUpsert(records) {
  const BATCH_SIZE = 50
  let upserted = 0
  const errors = []

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await withRetry(
        () =>
          supabase
            .from('projects')
            .upsert(batch, { onConflict: 'row_code' }),
        `Supabase upsert batch ${Math.floor(i / BATCH_SIZE) + 1}`,
      )
      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        upserted += batch.length
      }
    } catch (err) {
      errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return { upserted, errors }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  await waitForNetwork()
  const startTime = Date.now()
  console.log(`[sync-projects] Starting project sync at ${new Date().toISOString()}`)

  // 1. 환율 (JPY + USD)
  const [jpyRate, usdRate] = await Promise.all([getJpyToKrwRate(), getUsdToKrwRate()])
  console.log(`[sync-projects] Rates: JPY→KRW ${jpyRate}, USD→KRW ${usdRate}`)

  // 2. Google Sheets 데이터 조회 (Dashboard 탭)
  const { headerRow, dataRows } = await fetchSheetData()
  if (dataRows.length === 0) {
    console.log('[sync-projects] No data rows found')
    process.exit(0)
  }

  // 3. 헤더 기반 인덱스 맵 빌드
  const indexMap = buildIndexMap(headerRow)
  console.log(`[sync-projects] Found ${dataRows.length} rows, ${indexMap.size} mapped columns`)

  // 4. 레코드 변환 (행 번호 기반 row_code, 빈 행 스킵)
  const records = []
  const parseErrors = []

  for (let i = 0; i < dataRows.length; i++) {
    try {
      const parsed = parseRowDynamic(dataRows[i], indexMap, i + 2)
      if (parsed) records.push(parsed)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[sync-projects] Parse error at row ${i + 2}: ${message}`)
      parseErrors.push(`Row ${i + 2}: ${message}`)
    }
  }

  console.log(`[sync-projects] Parsed ${records.length} records (${parseErrors.length} parse errors)`)

  // 5. Full replace: 전체 삭제 → 새 데이터 삽입
  const insertErrors = []

  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .neq('row_code', '__never_match__')

  if (deleteError) {
    insertErrors.push(`Delete all: ${deleteError.message}`)
  }

  // 6. 배치 insert (50건 단위)
  let inserted = 0
  const BATCH_SIZE = 50
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await withRetry(
        () => supabase.from('projects').insert(batch),
        `Supabase insert batch ${Math.floor(i / BATCH_SIZE) + 1}`,
      )
      if (error) {
        insertErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        inserted += batch.length
      }
    } catch (err) {
      insertErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const allErrors = [...parseErrors, ...insertErrors]

  console.log(
    `[sync-projects] Sync complete in ${elapsed}s. Inserted: ${inserted}, Errors: ${allErrors.length}`,
  )

  if (allErrors.length > 0) {
    console.error('[sync-projects] Errors:', allErrors.join('; '))
    await notifySlack('프로젝트 동기화', 'fail', allErrors.join('; '))
    process.exit(1)
  }

  console.log(`[sync-projects] ${inserted}건 동기화 완료 (${elapsed}s)`)
  process.exit(0)
}

main().catch(async (err) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[sync-projects] Fatal:', msg)
  await notifySlack('프로젝트 동기화', 'fail', msg)
  process.exit(1)
})
