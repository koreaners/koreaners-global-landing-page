// 어드민 역할별 접근 판정(proxy.ts가 씀). 점검: node lib/admin-gate.check.mjs
// 역할은 서버 전용 app_metadata.role. admin 전체, exec 보고서와 재무(근태 편집자는 근태도), receivables 재무 「미수」 탭만.
// receivables의 탭 고정은 app/admin/finance/page.tsx가 역할로 함(주소의 tab 값은 여기서 믿지 않음).

/** 역할별 첫 화면. 여기 없는 역할(미설정 포함)은 어드민에 못 들어옴 */
export const HOME: Record<string, string> = {
  admin: '/admin',
  exec: '/admin/finance',
  receivables: '/admin/finance?tab=receivables',
}

/** 로그인한 계정이 pathname에 들어갈 수 있으면 null, 아니면 보낼 주소. 모르는 역할은 로그인 화면(거부) */
export function gate(role: string | undefined, pathname: string, attendanceEditor = false): string | null {
  if (role === 'admin') return null
  if (role === 'exec') {
    const ok = pathname.startsWith('/admin/reports') || pathname.startsWith('/admin/finance') || (attendanceEditor && pathname.startsWith('/admin/attendance'))
    return ok ? null : HOME.exec
  }
  if (role === 'receivables') return pathname === '/admin/finance' ? null : HOME.receivables
  return '/admin/login?denied=1'
}
