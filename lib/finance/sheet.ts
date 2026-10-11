// 운영 대시보드(MKT Ops Master) 시트 행 중 Contract DB에 아직 없는 계약을 Contract 로 (1회 소급 전 임시).
// model.ts 와 같은 규칙: 순수 함수만, 런타임 import 없음(model.check.mjs 가 타입만 지워 읽음).
import type { Contract } from './model'

const DROP = ['보류', '검토 중', '리스트업', '섭외 중', '진행 전', '드랍', '취소']
const CODE = /^\d{4}-[A-Z]+-/

const money = (s: string | undefined): number | null => {
  const n = parseFloat((s ?? '').replace(/[₩¥$,\s﻿]/g, ''))
  return n > 0 ? n : null
}

const date = (s: string | undefined): string | null => {
  const m = (s ?? '').match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
}

/** 법인명 비교용: 괄호 안, 법인 형태어, 공백과 문장부호를 지우고 소문자로 */
export const normCorp = (s: string) =>
  s
    .replace(/\([^)]*\)|（[^）]*）/g, '')
    .replace(/농업회사법인|유한책임회사|유한회사|주식회사|㈜/g, '')
    .replace(/[\s\p{P}\p{S}]/gu, '')
    .toLowerCase()

export type SheetResult = {
  contracts: Contract[]
  codeless: number // contracts 가운데 코드가 없거나 형식이 다른 행
  dups: string[] // 코드만 다른 중복 후보(확인 요청 중, 집계에 포함)
  paidFrom: string[] // 입금일을 시트 정산일로 채운 Contract DB 계약 코드
  supplyFrom: string[] // 공급가(원, 엔)가 둘 다 비어 시트 계약 금액으로 채운 Contract DB 계약 코드
}

// 매출은 입금된 회차를 입금된 달에(Leo 10/5). db 계약 가운데 입금일이 둘 다 없는 것은 같은 코드 시트 행의 정산일로 채운다(db 항목을 바로 고침)
export function sheetContracts(values: string[][], db: Contract[]): SheetResult {
  const [header = [], ...rows] = values
  const col = (name: string) => header.indexOf(name)
  const at = (row: string[], name: string) => {
    const i = col(name)
    return i < 0 ? '' : (row[i] ?? '').trim()
  }

  const byCode = new Map<string, string[]>() // 같은 코드는 마지막 행
  for (const row of rows) {
    const code = (row[0] ?? '').trim()
    if (code) byCode.set(code, row)
  }
  const dbCodes = new Set(db.map((c) => c.code).filter(Boolean))
  // 코드가 시트 어디에도 없는 DB 행: 같은 계약이 코드만 다르게 들어간 후보
  const orphans = db.filter((c) => c.code && !byCode.has(c.code))

  const paidFrom: string[] = []
  const supplyFrom: string[] = []
  for (const c of db) {
    const s = c.code && c.supplyKrw == null && c.supplyJpy == null ? byCode.get(c.code) : undefined
    if (s) {
      c.supplyKrw = money(at(s, '계약 금액 / 원 (부가세X)'))
      c.supplyJpy = money(at(s, '계약 금액 / 엔 (부가세X)'))
      c.supplyUsd ??= money(at(s, '계약 금액 / USD (부가세X)'))
      if (c.supplyKrw != null || c.supplyJpy != null || c.supplyUsd != null) {
        c.supplyFrom = 'sheet'
        supplyFrom.push(c.code)
      }
    }
    const row = c.code && !c.preDate && !c.postDate ? byCode.get(c.code) : undefined
    if (!row) continue
    c.preDate = date(at(row, '선금 정산일'))
    c.postDate = date(at(row, '잔금 정산일'))
    if (c.preDate || c.postDate) {
      c.paidFrom = 'sheet'
      paidFrom.push(c.code)
    }
  }

  const contracts: Contract[] = []
  const dups: string[] = []
  let codeless = 0
  const add = (id: string, code: string, row: string[]) => {
    const status = at(row, '운영-status')
    if (DROP.some((d) => status.includes(d))) return null
    const krw = money(at(row, '계약 금액 / 원 (부가세X)'))
    const jpy = money(at(row, '계약 금액 / 엔 (부가세X)'))
    const usd = money(at(row, '계약 금액 / USD (부가세X)'))
    if (krw == null && jpy == null && usd == null) return null
    const corp = at(row, '법인명')
    const preDate = date(at(row, '선금 정산일'))
    const postDate = date(at(row, '잔금 정산일'))
    const c: Contract = {
      id,
      code,
      corp,
      brand: at(row, '브랜드명'),
      owner: at(row, '담당자-정'),
      isExpense: false,
      supplyKrw: krw,
      supplyJpy: jpy,
      supplyUsd: usd,
      // 시트의 선금, 잔금 정산일은 실제 입금일로 쓴다(옛 원장과 같은 규칙)
      preDate,
      postDate,
      preDue: null,
      postDue: null,
      method: preDate && postDate ? '선금+잔금' : postDate ? '잔금 100%' : preDate ? '선금 100%' : null,
      preText: '',
      postText: '',
      contractDate: date(at(row, '계약일자')),
      startDate: null,
      link: null,
      source: 'sheet',
    }
    contracts.push(c)
    return c
  }
  for (const [code, row] of byCode) {
    if (!CODE.test(code) || dbCodes.has(code)) continue
    const c = add(`sheet:${code}`, code, row)
    const n = c && normCorp(c.corp)
    if (c && orphans.some((o) => normCorp(o.corp) === n && ((c.supplyKrw != null && o.supplyKrw === c.supplyKrw) || (c.supplyJpy != null && o.supplyJpy === c.supplyJpy)))) dups.push(code)
  }
  // 코드가 비었거나 형식이 다른 행(TBD-…, R123 등)도 행마다 계약 하나. 행 번호는 머리글이 1행
  rows.forEach((row, i) => {
    const text = (row[0] ?? '').trim()
    if (CODE.test(text) || dbCodes.has(text)) return
    if (add(`sheet-row:${i + 2}`, text || `시트 ${i + 2}`, row)) codeless++
  })
  return { contracts, codeless, dups, paidFrom, supplyFrom }
}
