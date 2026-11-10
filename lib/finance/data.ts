import { unstable_cache } from 'next/cache'
import { loadFinance } from './source'

const TTL = 300

// 노션 두 DB 전체를 정리한 가벼운 배열만 캐시한다(원본 페이지 JSON은 캐시 한도를 넘음). 캐시는 5분 지난 값도 먼저 돌려주고 뒤에서 갱신하므로, 받은 값이 5분보다 낡았으면 노션을 직접 다시 읽는다. 화면의 새로고침 버튼이 태그로 비운다.
const cached = unstable_cache(() => loadFinance(process.env), ['admin-finance-v8'], { revalidate: TTL, tags: ['admin-finance'] })

export async function getFinance() {
  const d = await cached()
  return Date.now() - Date.parse(d.fetchedAt) > TTL * 1000 ? loadFinance(process.env) : d
}
