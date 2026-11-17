'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

const CLIENTS = [
  'BBIA', 'FOODOLOGY', 'INGA', 'Matin Kim', 'medicube', 'MEDI-PEEL', 'MENTHOLOGY',
  '미쟝센', 'moev', 'OVMENT', 'TREEMINGBIRD', 'WHIPPED', '강남언니', '녹십자웰빙',
  '뉴트리원', '더멜라닌', '모아씨앤씨', '세예의원', '아비쥬클리닉', '오운의원',
  '오퓰리크', '와우바이오텍', '플랜에스클리닉',
  'BNC KOREA', 'JUVENTA HEALTHCARE', 'KATE의원', 'Onlif', '더북컴퍼니', '미디어앤아트',
  '바비톡', '바이트랩', '스크럽대디', '인에디트', '코모래비', '트웨니스', 'Hakit',
  'The SMC Group', '감자밭', '구미곱창', '논두렁오리주물럭', '맘스피자', '판동면옥',
  'Bocado Butter', 'newmix', '가나스윔', 'narka',
  'NUMBERING', '네이처리퍼블릭', '뉴베러', '리포데이', 'MAJOURNEE', '블랑디바',
  '샵한현재', '싱글즈', '아일로', '엔트로피', 'OJOS', '와이낫', '원데이즈유',
  '정샘물뷰티', '코스노리', 'TNMORPH', "AGE20'S", 'ArteSinsa', 'Biodance',
  'BIOHEAL BOH', "d'Alba", 'Dr. Althea', 'Dr. G',
]

export function ClientShowcase() {
  const { locale } = useLocale()

  return (
    <section className="border-t border-white/[0.08] bg-[var(--kn-dark)] px-6 py-24 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-[15px] text-[#A8A29E]">{getTranslation(locale, 'clientsTitle')}</h2>
        <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2 sm:grid sm:grid-cols-4 sm:gap-x-8 sm:gap-y-3 lg:grid-cols-6">
          {CLIENTS.map((name) => (
            <li key={name} className="text-sm leading-6 text-[var(--kn-light)]/80 sm:truncate sm:text-[15px]">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
