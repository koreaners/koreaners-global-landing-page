"use client";

import { useState } from "react";
import Navigation from "@/components/navigation";
import { ChannelTalk } from "@/components/common/channel-talk";
import { ShaderBackdrop } from "@/components/ui/shader-backdrop";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";
import { supabase } from "@/lib/supabase/client";
import { postWithCsrf } from "@/lib/api-client";
import { readStoredUtmData } from "@/lib/utm-tracking";
import { Loader2 } from "lucide-react";

// footer-cta.tsx FIELD_BASE 와 동일 (내보내지 않는 상수라 복사)
const FIELD =
  "w-full bg-surface-2 rounded-[var(--radius-sm)] text-white px-4 py-3 border border-white/10 transition-all duration-300 outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#FF4500]/30 focus:border-[#FF4500]";
const LABEL = "block text-xs uppercase tracking-wider text-white/60 mb-2";
const CHECKBOX =
  "w-5 h-5 rounded-[var(--radius-sm)] border-2 border-white/30 bg-transparent checked:bg-white checked:border-white focus:ring-2 focus:ring-white transition-all cursor-pointer shrink-0";
const DOMAINS = ["뷰티", "클리닉", "F&B", "패션", "기타"];

export default function DiagnosisLanding() {
  const { locale } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  // 기존 문의 파이프라인(Supabase inquiries → /api/notion → Notion·Slack·CAPI Lead)을 그대로 태운다.
  // 추가 필드는 message 앞 고정 블록으로 싣는다 — DB 스키마·라우트 무수정.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const title = v("title");
    const marketing = f.get("marketingConsent") === "on";
    const eventId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const utm = readStoredUtmData();
    const insertData = {
      name: title || "미기재",
      company: v("brand"),
      position: title || null,
      email: v("email"),
      message: [
        "[일본 인지도 진단]",
        `브랜드명: ${v("brand")}`,
        `홈페이지: ${v("url")}`,
        `업종: ${v("domain")}`,
        `직함: ${title || "미기재"}`,
        `마케팅 수신 동의: ${marketing ? "예" : "아니오"}`,
      ].join("\n"),
      privacy_agreement: true,
      marketing_agreement: marketing,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_content: utm.utm_content ?? null,
      utm_term: utm.utm_term ?? null,
      referrer: utm.referrer ?? null,
      landing_page: utm.landing_page ?? null,
      first_touch_at: utm.first_touch_at ?? null,
    };

    try {
      setSubmitting(true);
      setSubmitError(false);
      const { error } = await supabase.from("inquiries").insert(insertData);
      if (error) throw error;
      if (typeof window.fbq === "function") {
        window.fbq("track", "Lead", {}, { eventID: eventId });
      }
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { method: "diagnosis_form" });
      }
      setDone(true);
      // Notion·Slack·CAPI (footer-cta 와 동일: 실패해도 사용자 경험에 영향 없음)
      await postWithCsrf("/api/notion", { ...insertData, eventId }).catch(() => {});
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Navigation />

      <section className="relative bg-[var(--kn-dark)] hero-glow px-6 pt-32 md:pt-36 pb-14 text-center">
        <ShaderBackdrop variant="hero-sub" seed={9} className="absolute!" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="heading-kr font-display font-bold uppercase text-4xl md:text-5xl leading-[0.95] text-[var(--foreground)] mb-6">
            일본 인지도 무료 진단
          </h1>
          <p className="text-lg text-[#A8A29E] mb-4">
            브랜드명과 홈페이지만 남기시면, 일본에서 얼마나 검색되고 언급되는지 다섯 항목으로 확인해 2영업일 안에 메일로 보내드립니다.
          </p>
          <p className="text-sm text-[#78716C]">
            일본어 검색량 / 일본 SNS 언급 / 일본 이커머스 입점 / 일본어 페이지와 계정 / 일본인 리뷰
          </p>
        </div>
      </section>

      <section id="consult-form" className="bg-background py-24 md:py-32 px-6 lg:px-24 scroll-mt-8">
        <div className="max-w-2xl mx-auto">
          {done ? (
            <p className="text-center text-lg text-white">
              접수됐습니다. 2영업일 안에 진단 결과를 메일로 보내드립니다.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dx-brand" className={LABEL}>
                    브랜드명 <span className="text-white/60">*</span>
                  </label>
                  <input id="dx-brand" name="brand" type="text" required autoComplete="organization" className={FIELD} />
                </div>
                <div>
                  <label htmlFor="dx-url" className={LABEL}>
                    홈페이지 주소 <span className="text-white/60">*</span>
                  </label>
                  <input id="dx-url" name="url" type="url" required placeholder="https://" className={FIELD} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dx-domain" className={LABEL}>
                    업종 <span className="text-white/60">*</span>
                  </label>
                  <select id="dx-domain" name="domain" required defaultValue="" className={FIELD}>
                    <option value="" disabled>선택</option>
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dx-email" className={LABEL}>
                    이메일 <span className="text-white/60">*</span>
                  </label>
                  <input id="dx-email" name="email" type="email" required autoComplete="email" placeholder="example@domain.com" className={FIELD} />
                </div>
              </div>

              <div>
                <label htmlFor="dx-title" className={LABEL}>직함</label>
                <input id="dx-title" name="title" type="text" autoComplete="organization-title" placeholder="대표, 마케팅 팀장 등" className={FIELD} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input id="dx-privacyConsent" name="privacyConsent" type="checkbox" required className={CHECKBOX} />
                  <label htmlFor="dx-privacyConsent" className="flex-1 min-h-[44px] flex items-center cursor-pointer text-sm text-white/60">
                    진단 결과 발송을 위한 이메일 수집과 이용에 동의합니다. <span className="ml-1">*</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input id="dx-marketingConsent" name="marketingConsent" type="checkbox" className={CHECKBOX} />
                  <label htmlFor="dx-marketingConsent" className="flex-1 min-h-[44px] flex items-center cursor-pointer text-sm text-white/60">
                    코리너스의 일본 마케팅 정보 메일 수신에 동의합니다. (선택)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full gradient-warm text-white py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  무료 진단 받기
                </span>
              </button>
              {submitError && (
                <p className="text-center text-xs text-[#FF4500]">
                  {getTranslation(locale, "toastErrorDefault")}
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      <ChannelTalk />
    </main>
  );
}
