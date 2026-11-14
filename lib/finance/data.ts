import { gunzipSync, gzipSync } from 'node:zlib'
import { unstable_cache } from 'next/cache'
import { loadFinance, type FinanceData } from './source'

const TTL = 300

// 노션 두 DB 전체를 정리한 가벼운 배열만 캐시한다(원본 페이지 JSON은 캐시 한도를 넘음). 캐시는 5분 지난 값도 먼저 돌려주고 뒤에서 갱신한다. 낡은 값이면 직접 다시 읽던 규칙(66e083c)은 노션 전체 읽기를 기다리느라 화면이 느려 뺐다(인혁 261114 「바로 띄우고 뒤에서 갱신」). 화면에 갱신 시각이 나오고, 새로고침 버튼이 태그로 비운다.
// 정리한 배열도 캐시 한도(2MB)를 넘으면 저장이 조용히 실패해 매 요청이 노션 전체를 다시 읽으므로 gzip 문자열로 넣는다.
// 동시에 들어온 요청(배포 직후, 캐시가 낡은 뒤, 뒤 갱신과 직접 읽기)이 노션 읽기 하나를 같이 기다린다. 노션 토큰을 정산 람다와 같이 써서 동시 조회가 요청 제한(429)을 부름(261113)
// ponytail: 한 인스턴스 안에서만 묶임. 인스턴스가 여럿 뜨면 각자 한 번씩 읽음, 그래도 넘치면 공유 잠금(KV 등)
let inflight: Promise<FinanceData> | null = null
const load = () => (inflight ??= loadFinance(process.env).finally(() => { inflight = null }))

const cached = unstable_cache(async () => gzipSync(JSON.stringify(await load())).toString('base64'), ['admin-finance-v10'], { revalidate: TTL, tags: ['admin-finance'] })

export async function getFinance(): Promise<FinanceData> {
  return JSON.parse(gunzipSync(Buffer.from(await cached(), 'base64')).toString())
}
