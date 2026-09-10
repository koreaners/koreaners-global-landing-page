// Figma Sites 임시 페이지 프록시 (2026-09-10). 하위 경로는 next.config.mjs rewrites(/tripbridge/:path*)가 처리.
// 여기서는 루트 HTML만 받아 탭 제목을 교체한다. Figma 쪽 기본 제목이 'Figma Make App'이라서.
const ORIGIN = 'https://match-monkey-04591201.figma.site/'

export const dynamic = 'force-dynamic'

export async function GET() {
  const html = await (await fetch(ORIGIN, { cache: 'no-store' })).text()
  return new Response(html.replace(/<title>[^<]*<\/title>/, '<title>TripBridge | Koreaners</title>'), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
