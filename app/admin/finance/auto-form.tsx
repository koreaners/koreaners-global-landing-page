'use client'

import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

// GET 폼을 빈 값 없이 보냄(주소에 m=&cur= 같은 빈 칸이 남지 않게). action의 #앵커는 유지
export function CleanForm(props: ComponentProps<'form'>) {
  const router = useRouter()
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault()
        const p = new URLSearchParams()
        for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === 'string' && v) p.append(k, v)
        const [path, hash] = (e.currentTarget.getAttribute('action') || location.pathname).split('#')
        router.push(`${path}?${p}${hash ? `#${hash}` : ''}`)
      }}
    />
  )
}

// 기간, 기준 드롭다운은 고르는 즉시 이동(보기 버튼 없이).
export function AutoForm(props: ComponentProps<'form'>) {
  return <CleanForm {...props} onChange={(e) => e.currentTarget.requestSubmit()} />
}
