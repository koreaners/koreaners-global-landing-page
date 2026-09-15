// components/common/logo-wall.tsx
// 대표 브랜드 로고 월 (마퀴 캐러셀). 로고 자산: public/logos/, Leo 큐레이션 2026-07-06.
// href 있는 브랜드는 포트폴리오 상세로 링크 (published 포트폴리오 보유 브랜드).
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";

type Logo = { slug: string; ext: string; name: string; href?: string; scale?: number };

// 2행 분할 (상단 좌→우, 하단 우→좌)
const ROW1: Logo[] = [
  { slug: "medipeel", ext: "png", name: "MEDI-PEEL" },
  { slug: "medicube", ext: "png", name: "medicube" },
  { slug: "dalba", ext: "png", name: "d'Alba" },
  { slug: "jungsaemmool", ext: "png", name: "JUNGSAEMMOOL" },
  { slug: "drg", ext: "png", name: "Dr.G" },
  { slug: "biodance", ext: "svg", name: "Biodance" },
  { slug: "gamjabat", ext: "png", name: "감자밭", href: "/portfolio/f6bfe351-7330-4bf8-b7e5-faf0eace6ac4" },
  { slug: "newmix", ext: "svg", name: "newmix", href: "/portfolio/66f5513e-5b0c-4ac3-9020-44671af86ddd" },
  { slug: "ripoday", ext: "jpg", name: "RE4DAY", scale: 2 },
  { slug: "nutrione", ext: "svg", name: "Nutrione" },
];

const ROW2: Logo[] = [
  { slug: "gangnamunni", ext: "svg", name: "강남언니" },
  { slug: "seye", ext: "svg", name: "세예의원" },
  { slug: "abijou", ext: "png", name: "Abijou" },
  { slug: "onlif", ext: "png", name: "Onlif", href: "/portfolio/d1aab841-138e-4001-9f4b-cda67726a649", scale: 0.75 },
  { slug: "bnc", ext: "png", name: "BNC KOREA", href: "/portfolio/ea6e14bc-86d6-46f3-b7ca-70653018aeee" },
  { slug: "scrubdaddy", ext: "svg", name: "Scrub Daddy" },
  { slug: "matinkim", ext: "jpg", name: "Matin Kim", href: "/portfolio/39faf105-a8a9-41fd-bd02-b5b182c38b8a" },
  { slug: "treemingbird", ext: "png", name: "TREEMINGBIRD", href: "/portfolio/8fe0720f-8108-4db5-856e-3af4632d5b1a" },
  { slug: "viewmap", ext: "jpg", name: "VIEWMAP", href: "/portfolio/716a9fbf-f9cf-4e43-a12f-72f966327e98" },
  { slug: "ojos", ext: "png", name: "OJOS" },
];

function LogoImg({ logo }: { logo: Logo }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/logos/${logo.slug}.${logo.ext}`}
      alt={`${logo.name} 로고`}
      loading="lazy"
      style={logo.scale ? { transform: `scale(${logo.scale})` } : undefined}
      className="max-h-10 sm:max-h-12 max-w-full w-auto object-contain"
    />
  );
}

function LogoCard({ logo }: { logo: Logo }) {
  const base =
    "flex-shrink-0 w-40 sm:w-48 h-20 sm:h-24 bg-white rounded-xl border border-[var(--kn-dark)]/8 flex items-center justify-center px-6";
  if (logo.href) {
    return (
      <Link
        href={logo.href}
        aria-label={`${logo.name} 캠페인 사례 보기`}
        className={`${base} transition-all duration-300 hover:border-[#FF4500]/50 hover:shadow-md hover:-translate-y-0.5`}
      >
        <LogoImg logo={logo} />
      </Link>
    );
  }
  return (
    <div className={base}>
      <LogoImg logo={logo} />
    </div>
  );
}

function MarqueeRow({ logos, direction }: { logos: Logo[]; direction: "left" | "right" }) {
  const dup = [...logos, ...logos];
  const anim = direction === "left" ? "marquee-left" : "marquee-right";
  return (
    <div className="overflow-hidden py-2">
      {/* 속도 40% 증가 (40s → 28.6s) */}
      <div className="flex gap-4 w-max" style={{ animation: `${anim} 28.6s linear infinite` }}>
        {dup.map((logo, i) => (
          <LogoCard key={`${logo.slug}-${i}`} logo={logo} />
        ))}
      </div>
    </div>
  );
}

export function LogoWall() {
  const { locale } = useLocale();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  return (
    <section className="bg-[var(--kn-light)] px-0 py-16 overflow-hidden">
      <h2 className="font-display font-bold text-2xl md:text-3xl text-[var(--kn-dark)] mb-10 text-center px-6">
        {t("logoWallTitle")}
      </h2>
      <div className="space-y-2">
        <MarqueeRow logos={ROW1} direction="left" />
        <MarqueeRow logos={ROW2} direction="right" />
      </div>
      <div className="mt-10 text-center px-6">
        <Button
          asChild
          variant="outline"
          size="lg"
          className="border-[var(--kn-dark)]/20 text-[var(--kn-dark)] hover:border-[#FF4500] hover:text-[#FF4500] hover:bg-transparent"
        >
          <Link href="/portfolio">{t("logoWallMore")}</Link>
        </Button>
      </div>
    </section>
  );
}
