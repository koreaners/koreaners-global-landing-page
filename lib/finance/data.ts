import { unstable_cache } from 'next/cache'
import { loadFinance } from './source'

// 노션 두 DB 전체를 정리한 가벼운 배열만 5분 캐시한다(원본 페이지 JSON은 캐시 한도를 넘음). 화면의 새로고침 버튼이 태그로 비운다.
export const getFinance = unstable_cache(() => loadFinance(process.env), ['admin-finance-v7'], { revalidate: 300, tags: ['admin-finance'] })
