// components/contact-landing.tsx
"use client";

import { useEffect } from "react";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { FooterCTA } from "@/components/footer-cta";
import { ChannelTalk } from "@/components/common/channel-talk";
import { LogoWall } from "@/components/common/logo-wall";
import { ShaderBackdrop } from "@/components/ui/shader-backdrop";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";

// 수치 SoT: meta-ads-automation/config/verified_numbers.json > ad_safe_claims
// 이 배열 밖의 수치를 추가하려면 verified_numbers 검증 절차를 먼저 거칠 것
// 라벨/단위는 final-cta.tsx 와 동일 트리오 — 키를 공유한다
const STATS = [
  { num: "220", suffix: (l: string) => (l === "ja" ? "名+" : "명+"), labelKey: "finalCtaStat2" as const },
  { num: "185", suffix: (l: string) => (l === "ja" ? "+" : "개+"), labelKey: "finalCtaStat3" as const },
  { num: "10", suffix: (l: string) => (l === "ja" ? "社" : "곳"), labelKey: "finalCtaStat4" as const },
];

const PROCESS = [
  { step: "01", titleKey: "contactProcess1Title" as const, descKey: "contactProcess1Desc" as const },
  { step: "02", titleKey: "contactProcess2Title" as const, descKey: "contactProcess2Desc" as const },
  { step: "03", titleKey: "contactProcess3Title" as const, descKey: "contactProcess3Desc" as const },
];

function scrollToForm() {
  document.getElementById("consult-form")?.scrollIntoView({ behavior: "smooth" });
}

export default function ContactLanding() {
  const { locale } = useLocale();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  useEffect(() => {
    if (typeof window.fbq === "function") {
      window.fbq("track", "ViewContent", { content_name: "contact_landing" });
    }
  }, []);

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* 히어로 */}
      <section className="relative bg-[var(--kn-dark)] hero-glow px-6 pt-32 md:pt-36 pb-14 text-center">
        {/* 서브 히어로 셰이더 (다른 서브페이지와 동일 애니메이션 + absolute! 로 .hero-glow > * 붕괴 방지) */}
        <ShaderBackdrop variant="hero-sub" seed={9} className="absolute!" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FF4500] bg-white/10 mb-6">
            {t("voucherOfficialAgency")}
          </p>
          <h1 className="heading-kr font-display font-bold uppercase text-4xl md:text-5xl leading-[0.95] text-[var(--foreground)] mb-6">
            {t("contactHero1")}
            <br />
            <span className="gradient-warm-text">{t("contactHero2")}</span>
          </h1>
          <p className="text-lg text-[#A8A29E] mb-8">
            {t("contactHeroDesc")}
          </p>
          <Button
            size="lg"
            onClick={scrollToForm}
            className="gradient-warm text-white uppercase tracking-wider hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20"
          >
            {t("contactHeroCta")}
          </Button>
        </div>
      </section>

      {/* 성과 스탯 */}
      <section className="bg-[var(--kn-light)] px-6 py-12 border-y border-[var(--kn-dark)]/10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.labelKey}>
              <p className="font-display font-bold text-4xl text-[var(--kn-dark)]">{s.num}{s.suffix(locale)}</p>
              <p className="text-sm text-[#78716C] mt-2">{t(s.labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 그룹별 대표 브랜드 로고 월 */}
      <LogoWall />

      {/* 프로세스 */}
      <section className="bg-[var(--kn-card-light)] px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROCESS.map((p) => (
            <div key={p.step}>
              <p className="text-sm font-bold text-[#FF4500]">{p.step}</p>
              <h3 className="font-display font-bold text-xl text-[var(--kn-dark)] mt-2 mb-3">{t(p.titleKey)}</h3>
              <p className="text-sm text-[#78716C]">{t(p.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 문의 폼: 기존 파이프라인 재사용 (Supabase + Notion + Slack + Pixel Lead) */}
      <div id="consult-form" className="scroll-mt-8">
        <FooterCTA />
      </div>

      <ChannelTalk />
    </main>
  );
}
