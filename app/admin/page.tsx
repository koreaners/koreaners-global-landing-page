import { redirect } from 'next/navigation'

// 구 어드민 4메뉴(콘텐츠, 프로젝트, 세일즈, 통합 엔티티)는 브랜치 archive/admin-v1 에 보관.
// 새 관리자 대시보드가 들어오기 전까지는 보고서 화면이 첫 화면이다.
export default function AdminLandingPage() {
  redirect('/admin/reports')
}
