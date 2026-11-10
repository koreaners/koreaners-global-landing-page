import { cache } from 'react'
import { createClient } from './server'

/** 로그인한 계정의 어드민 역할(서버 전용 app_metadata.role). 한 요청에서 레이아웃과 페이지가 같이 불러도 조회는 한 번 */
export const adminRole = cache(async (): Promise<string | undefined> => {
  const { data } = await (await createClient()).auth.getUser()
  return data.user?.app_metadata?.role
})
