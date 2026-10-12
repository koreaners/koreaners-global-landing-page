'use client'

import { RefreshCw } from 'lucide-react'
import { useFormStatus } from 'react-dom'

// 새로고침은 노션 전체를 다시 읽어 몇 초 걸리므로 누르는 동안 아이콘을 돌리고 막는다.
export function RefreshButton() {
  const { pending } = useFormStatus()
  return (
    <button
      disabled={pending}
      title="5분 캐시를 비우고 노션, 운영 시트를 다시 읽습니다"
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-800 disabled:cursor-wait disabled:text-neutral-400"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
      {pending ? '불러오는 중' : '새로고침'}
    </button>
  )
}
