'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { T, type Lang } from './strings'

// 등록된 이메일(정산 표에 행이 있는 크리에이터 계정)만 링크를 받는다. 없는 주소도 같은 문구로 끝낸다(가입 여부를 알려 주지 않음)
export default function LoginForm({ lang }: { lang: Lang }) {
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    // 링크는 메일 양식이 `{{ .RedirectTo }}&token_hash=…`로 만든다(Starlight와 같은 양식, 본문만 app으로 나뉨)
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/settlement/verify?lang=${lang}` },
    })
    setBusy(false)
    setSent(true)
  }

  if (sent) return <p className="text-sm text-muted-foreground">{t.sent}</p>
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.login}</p>
      <label className="block text-sm font-medium" htmlFor="email">{t.email}</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border px-3 py-2 bg-background" />
      <button type="submit" disabled={busy} className="w-full rounded-md bg-foreground text-background py-2 text-sm font-medium disabled:opacity-50">
        {t.send}
      </button>
    </form>
  )
}
