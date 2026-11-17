'use client'

import { SectionTag } from '@/components/ui/section-tag'

const CLIENTS_ROW1 = [
  'BBIA', 'FOODOLOGY', 'INGA', 'Matin Kim', 'medicube', 'MEDI-PEEL', 'MENTHOLOGY',
  '미쟝센', 'moev', 'OVMENT', 'TREEMINGBIRD', 'WHIPPED', '강남언니', '녹십자웰빙',
  '뉴트리원', '더멜라닌', '모아씨앤씨', '세예의원', '아비쥬클리닉', '오운의원',
  '오퓰리크', '와우바이오텍', '플랜에스클리닉',
]

const CLIENTS_ROW2 = [
  'BNC KOREA', 'JUVENTA HEALTHCARE', 'KATE의원', 'Onlif', '더북컴퍼니', '미디어앤아트',
  '바비톡', '바이트랩', '스크럽대디', '인에디트', '코모래비', '트웨니스', 'Hakit',
  'The SMC Group', '감자밭', '구미곱창', '논두렁오리주물럭', '맘스피자', '판동면옥',
  'Bocado Butter', 'newmix', '가나스윔', 'narka',
]

const CLIENTS_ROW3 = [
  'NUMBERING', '네이처리퍼블릭', '뉴베러', '리포데이', 'MAJOURNEE', '블랑디바',
  '샵한현재', '싱글즈', '아일로', '엔트로피', 'OJOS', '와이낫', '원데이즈유',
  '정샘물뷰티', '코스노리', 'TNMORPH', "AGE20'S", 'ArteSinsa', 'Biodance',
  'BIOHEAL BOH', "d'Alba", 'Dr. Althea', 'Dr. G',
]

function MarqueeRow({ clients, direction, duration }: { clients: string[]; direction: 'left' | 'right'; duration: string }) {
  const duplicated = [...clients, ...clients]
  const animName = direction === 'left' ? 'marquee-left' : 'marquee-right'

  return (
    <div className="marquee-fade overflow-hidden py-2" role="marquee" aria-label={`Client brands: ${clients.join(', ')}`}>
      <div
        className="flex gap-3 w-max"
        style={{ animation: `${animName} ${duration} linear infinite` }}
      >
        {duplicated.map((name, i) => (
          <div
            key={`${name}-${i}`}
            className="flex-shrink-0 bg-surface-1 border border-[var(--border)] px-6 py-3 rounded-full cursor-default select-none"
          >
            <span className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ClientShowcase() {
  return (
    <section className="bg-[var(--kn-dark)] py-16 md:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-24 mb-8">
        <SectionTag variant="dark">
          TRUSTED BY 185+ BRANDS
        </SectionTag>
      </div>

      <div className="space-y-1">
        <MarqueeRow clients={CLIENTS_ROW1} direction="left" duration="50s" />
        <MarqueeRow clients={CLIENTS_ROW2} direction="right" duration="50s" />
        <MarqueeRow clients={CLIENTS_ROW3} direction="left" duration="50s" />
      </div>
    </section>
  )
}
