import { gunzipSync, gzipSync } from 'node:zlib'
import { unstable_cache } from 'next/cache'
import { loadFinance, type FinanceData } from './source'

const TTL = 300

// 노션 두 DB 전체를 정리한 가벼운 배열만 캐시한다(원본 페이지 JSON은 캐시 한도를 넘음). 캐시는 5분 지난 값도 먼저 돌려주고 뒤에서 갱신하므로, 받은 값이 5분보다 낡았으면 노션을 직접 다시 읽는다. 화면의 새로고침 버튼이 태그로 비운다.
// 정리한 배열도 캐시 한도(2MB)를 넘으면 저장이 조용히 실패해 매 요청이 노션 전체를 다시 읽으므로 gzip 문자열로 넣는다.
const cached = unstable_cache(async () => gzipSync(JSON.stringify(await loadFinance(process.env))).toString('base64'), ['admin-finance-v9'], { revalidate: TTL, tags: ['admin-finance'] })

export async function getFinance(): Promise<FinanceData> {
  const d: FinanceData = JSON.parse(gunzipSync(Buffer.from(await cached(), 'base64')).toString())
  return Date.now() - Date.parse(d.fetchedAt) > TTL * 1000 ? loadFinance(process.env) : d
}
