import { unstable_cache } from 'next/cache'
import { loadFinance } from './source'

// 노션 두 DB 전체를 정리한 가벼운 배열만 5분 캐시한다(원본 페이지 JSON은 캐시 한도를 넘음).
export const getFinance = unstable_cache(() => loadFinance(process.env), ['admin-finance-v3'], { revalidate: 300 })
