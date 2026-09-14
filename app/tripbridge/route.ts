// Figma Sites 임시 페이지 프록시 (2026-09-10). 하위 경로는 next.config.mjs rewrites(/tripbridge/:path*)가 처리.
// 여기서는 루트 HTML만 받아 탭 제목을 교체한다. Figma 쪽 기본 제목이 'Figma Make App'이라서.
const ORIGIN = 'https://match-monkey-04591201.figma.site/'
const PIXEL_ID = '1663046768013029'
const GA4_ID = 'G-2KQK7QNYNX'

// Figma Sites 번들이 CTA 앵커를 클라이언트에서 그리므로 위임 리스너로 잡는다 (2026-09-14).
const TRACKING = `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());gtag('config','${GA4_ID}');
document.addEventListener('click',function(e){
  var t=e.target,a=t&&t.closest&&t.closest('a[href*="docs.google.com/forms"]');
  if(!a)return;
  window.fbq&&window.fbq('track','Lead',{content_name:'tripbridge_form_cta'});
  window.gtag&&window.gtag('event','generate_lead',{event_category:'tripbridge'});
},true);
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1"/></noscript>`

export const dynamic = 'force-dynamic'

export async function GET() {
  const html = await (await fetch(ORIGIN, { cache: 'no-store' })).text()
  const out = html
    .replace(/<title>[^<]*<\/title>/, '<title>TripBridge | Koreaners</title>')
    .replaceAll(`${ORIGIN}assets/`, '/tripbridge/assets/') // CORS 헤더가 없어 같은 도메인 경유로 로드
    .replace('</head>', `${TRACKING}</head>`)
  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
