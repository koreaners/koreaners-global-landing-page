'use client'

import type { ComponentProps } from 'react'

// 기간, 기준 드롭다운은 고르는 즉시 이동(보기 버튼 없이).
export function AutoForm(props: ComponentProps<'form'>) {
  return <form {...props} onChange={(e) => e.currentTarget.requestSubmit()} />
}
