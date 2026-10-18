'use server'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// 관리자 대시보드 새로고침: 5분 캐시를 비워 노션과 운영 시트를 바로 다시 읽는다. proxy와 별도로 여기서도 admin, exec만 허용.
export async function refreshFinance() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!['admin', 'exec'].includes(user?.app_metadata?.role)) throw new Error('권한 없음')
  updateTag('admin-finance')
}
