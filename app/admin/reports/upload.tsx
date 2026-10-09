'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { REPORTS_BUCKET } from '@/lib/reports'

// 같은 파일명으로 올리면 덮어쓴다. 쓰기 권한은 storage RLS(role admin)가 정한다.
export function UploadReport() {
  const router = useRouter()
  const [msg, setMsg] = useState('')

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.html')) {
      setMsg('HTML 파일만 올릴 수 있습니다.')
      return
    }
    setMsg('올리는 중...')
    const { error } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(file.name, file, { upsert: true, contentType: 'text/html' })
    setMsg(error ? `실패: ${error.message}` : `올렸습니다: ${file.name}`)
    e.target.value = ''
    if (!error) router.refresh()
  }

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-neutral-700 px-4 py-3 text-sm text-neutral-400 hover:border-neutral-500">
      <input type="file" accept=".html,text/html" className="hidden" onChange={onChange} />
      <span>HTML 보고서 올리기 (같은 이름이면 덮어씀)</span>
      {msg && <span className="text-neutral-300">{msg}</span>}
    </label>
  )
}
