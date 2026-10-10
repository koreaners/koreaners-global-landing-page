import { redirect } from 'next/navigation'

// 구 어드민 4메뉴(콘텐츠, 프로젝트, 세일즈, 통합 엔티티)는 브랜치 archive/admin-v1 에 보관.
// 첫 화면은 대시보드(admin 전용). exec 는 proxy 가 보고서로 보낸다.
export default function AdminLandingPage() {
  redirect('/admin/finance')
}
