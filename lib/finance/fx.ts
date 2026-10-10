import type { Rates } from './model'

// ponytail: 시장 중간환율(open.er-api, 하루 캐시). 은행 매매기준율과 소수점 차이가 있다.
// 외화 송금은 모인 원화 청구액이 있으면 그 값을 쓰므로 환율은 청구액이 없는 행과 엔화 공급가에만 쓰인다.
const FALLBACK: Rates = { JPY: 8.5599, USD: 1349.9, CNY: 201.19, at: '2026-10-02', source: '고정값(261002 하나은행 매매기준율)' }

export async function getRates(): Promise<Rates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW', { next: { revalidate: 86400 } })
    const j = await res.json()
    const k = j?.rates
    if (!res.ok || !k?.JPY || !k?.USD || !k?.CNY) return FALLBACK
    return {
      JPY: 1 / k.JPY,
      USD: 1 / k.USD,
      CNY: 1 / k.CNY,
      at: String(j.time_last_update_utc ?? '').slice(5, 16),
      source: 'open.er-api.com 시장 환율',
    }
  } catch {
    return FALLBACK
  }
}
