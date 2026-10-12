'use client'

import { useFormStatus } from 'react-dom'

// 새로고침은 노션 전체를 다시 읽어 몇 초 걸리므로 누르는 동안 표시를 바꾼다.
export function RefreshButton() {
  const { pending } = useFormStatus()
  return (
    <button disabled={pending} className="text-neutral-300 underline hover:text-neutral-100 disabled:no-underline disabled:text-neutral-500">
      {pending ? '불러오는 중…' : '새로고침'}
    </button>
  )
}
