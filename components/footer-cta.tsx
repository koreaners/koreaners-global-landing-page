"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { ConsentModal } from "@/components/consent-modal";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";
import { postWithCsrf } from "@/lib/api-client";
import { readStoredUtmData } from "@/lib/utm-tracking";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";

// 폼 필드 공통 스타일 — bg-surface-2 + accent focus ring (Task 3.1 프레젠테이션)
const FIELD_BASE =
  "w-full bg-surface-2 rounded-[var(--radius-sm)] text-white px-4 py-3 border transition-all duration-300 outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#FF4500]/30 focus:border-[#FF4500]";
const fieldClass = (hasError = false) =>
  `${FIELD_BASE} ${hasError ? "border-[#FF4500]" : "border-white/10"}`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 유입 경로 셀렉트 — 저장값은 항상 한국어 원문, 표시 라벨만 로케일별
const DISCOVERY_OPTIONS = [
  { value: "구글 검색", labelKey: "formDiscoveryGoogle" },
  { value: "네이버 검색", labelKey: "formDiscoveryNaver" },
  { value: "ChatGPT 등 AI 답변", labelKey: "formDiscoveryAi" },
  { value: "인스타그램·페이스북", labelKey: "formDiscoverySns" },
  { value: "지인·거래처 소개", labelKey: "formDiscoveryReferral" },
  { value: "수출바우처 메뉴판", labelKey: "formDiscoveryVoucher" },
  { value: "기타", labelKey: "formDiscoveryEtc" },
] as const;

export function FooterCTA({ headingLevel = "h2", instanceId = "consult-form", compact = false }: { headingLevel?: "h1" | "h2"; instanceId?: string; compact?: boolean } = {}) {
  const { locale } = useLocale();
  const t = (key: Parameters<typeof getTranslation>[1]) =>
    getTranslation(locale, key);
  const Heading = headingLevel;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    position: "",
    email: "",
    phone: "",
    message: "",
    discovery_source: "",
    privacyConsent: false,
    marketingConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  // 인라인 검증 + 제출 실패 상태 (프레젠테이션 전용 — 제출 로직/필수 여부 불변)
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState(false);

  const validateEmail = () => {
    const v = formData.email.trim();
    setEmailError(v && !EMAIL_RE.test(v) ? t("toastEmailInvalid") : null);
  };
  const validatePhone = () => {
    const digits = formData.phone.replace(/[^0-9]/g, "");
    setPhoneError(
      digits && (digits.length < 10 || digits.length > 11)
        ? t("toastPhoneInvalid")
        : null,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.privacyConsent) {
      toast({
        title: t("toastRequiredConsent"),
        description: t("toastRequiredConsentDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.name?.trim()) {
      toast({
        title: t("toastInputError"),
        description: t("toastNameRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.company?.trim()) {
      toast({
        title: t("toastInputError"),
        description: t("toastCompanyRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.position?.trim()) {
      toast({
        title: t("toastInputError"),
        description: t("toastPositionRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      toast({
        title: t("toastInputError"),
        description: t("toastEmailRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.email.includes("@")) {
      toast({
        title: t("toastInputError"),
        description: t("toastEmailInvalid"),
        variant: "destructive",
      });
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length === 0) {
      toast({
        title: t("toastInputError"),
        description: t("toastPhoneRequired"),
        variant: "destructive",
      });
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: t("toastInputError"),
        description: t("toastPhoneInvalid"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.message?.trim()) {
      toast({
        title: t("toastInputError"),
        description: t("toastMessageRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(false);

      // 브라우저 Pixel Lead 와 서버 CAPI Lead 를 dedup 하기 위한 공유 event_id.
      // 브라우저 fbq 의 eventID + /api/notion 으로 넘기는 payload 의 eventId 로 동일 값 전달.
      // randomUUID 는 비-secure-context/구형 인앱 웹뷰에 없을 수 있어 가드 (없으면 dedup 만 포기, 제출은 진행).
      const eventId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // DB에 저장할 데이터 준비
      // 필드명은 DB 스키마와 정확히 일치해야 합니다.
      const utm = readStoredUtmData();
      const insertData: Record<string, any> = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        position: formData.position.trim(),
        email: formData.email.trim(),
        phone: cleanPhone,
        message: formData.message.trim(),
        discovery_source: formData.discovery_source || null,
        privacy_agreement: formData.privacyConsent,
        marketing_agreement: formData.marketingConsent,
        utm_source: utm.utm_source ?? null,
        utm_medium: utm.utm_medium ?? null,
        utm_campaign: utm.utm_campaign ?? null,
        utm_content: utm.utm_content ?? null,
        utm_term: utm.utm_term ?? null,
        referrer: utm.referrer ?? null,
        landing_page: utm.landing_page ?? null,
        first_touch_at: utm.first_touch_at ?? null,
      };

      const { data, error } = await supabase
        .from("inquiries")
        .insert(insertData);

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[Footer CTA] Error code:",
            error.code,
            "message:",
            error.message,
          );
        }
        throw error;
      }

      // Meta Pixel Lead 이벤트 (eventID = 서버 CAPI 와 dedup 키)
      if (typeof window.fbq === "function") {
        window.fbq("track", "Lead", {}, { eventID: eventId });
      }

      // GA4 generate_lead
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { method: "contact_form" });
      }

      // 성공 Dialog 표시
      setSuccessDialogOpen(true);

      sonnerToast.success(t("toastSuccessTitle"), {
        description: t("toastSuccessDesc"),
        duration: 5000,
      });

      // Notion에 데이터 저장 (비동기, 실패해도 사용자 경험에 영향 없음)
      // CSRF 토큰 자동 포함. eventId 는 서버 CAPI Lead dedup 용으로만 전달
      // (Supabase insert 스키마에는 넣지 않음 — insertData 는 그대로 유지).
      try {
        await postWithCsrf("/api/notion", { ...insertData, eventId });
      } catch (notionError: any) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[Footer CTA] Notion 요청 예외:",
            notionError?.message ?? "",
          );
        }
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Footer CTA] Submit error:", error?.message ?? "");
      }

      setSubmitError(true);

      let errorMessage = t("toastErrorDefault");

      if (error) {
        if (error.message) {
          errorMessage = error.message;
        }

        // Supabase 에러의 경우 details와 hint 추가
        if (error.details) {
          errorMessage += `\n\n상세: ${error.details}`;
        }
        if (error.hint) {
          errorMessage += `\n\n힌트: ${error.hint}`;
        }
        if (error.code) {
          errorMessage += `\n\n에러 코드: ${error.code}`;
        }
      }

      toast({
        title: t("toastErrorTitle"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  return (
    <section className={compact ? "bg-background px-6 py-8" : "bg-background py-24 md:py-32 lg:py-40 px-6 lg:px-24"}>
      <div className="max-w-7xl mx-auto">
        <div className={compact ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-16 items-start"}>
          {/* Left: heading + description — 시트(compact) 컨텍스트에서는 생략해 첫 필드를 즉시 노출 */}
          {!compact && (
            <div>
              <Heading className="font-display font-bold text-6xl lg:text-8xl uppercase text-white leading-[0.85]">
                <span className="italic text-[#FF4500]">CONTACT</span><br />
                US
              </Heading>
              <p className="text-base text-white/60 mt-8 leading-relaxed">
                {t("footerCtaDesc1")} {t("footerCtaDesc2")} {t("footerCtaDesc3")}
              </p>
            </div>
          )}

          {/* Right: form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Name, Company, Position */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor={`${instanceId}-name`}
                  className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                >
                  {t("formName")} <span className="text-white/60">*</span>
                </label>
                <input
                  type="text"
                  id={`${instanceId}-name`}
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={fieldClass()}
                  placeholder={t("formPlaceholderName")}
                />
              </div>

              <div>
                <label
                  htmlFor={`${instanceId}-company`}
                  className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                >
                  {t("formCompany")} <span className="text-white/60">*</span>
                </label>
                <input
                  type="text"
                  id={`${instanceId}-company`}
                  name="company"
                  required
                  autoComplete="organization"
                  value={formData.company}
                  onChange={handleChange}
                  className={fieldClass()}
                  placeholder={t("formPlaceholderCompany")}
                />
              </div>

              <div>
                <label
                  htmlFor={`${instanceId}-position`}
                  className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                >
                  {t("formPosition")} <span className="text-white/60">*</span>
                </label>
                <input
                  type="text"
                  id={`${instanceId}-position`}
                  name="position"
                  required
                  autoComplete="organization-title"
                  value={formData.position}
                  onChange={handleChange}
                  className={fieldClass()}
                  placeholder={t("formPlaceholderPosition")}
                />
              </div>
            </div>

            {/* Row 2: Email, Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`${instanceId}-email`}
                  className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                >
                  {t("formEmail")} <span className="text-white/60">*</span>
                </label>
                <input
                  type="email"
                  id={`${instanceId}-email`}
                  name="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => {
                    handleChange(e);
                    if (emailError) setEmailError(null);
                  }}
                  onBlur={validateEmail}
                  aria-invalid={!!emailError}
                  className={fieldClass(!!emailError)}
                  placeholder="example@domain.com"
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-[#FF4500]">{emailError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`${instanceId}-phone`}
                  className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                >
                  {t("formPhone")} <span className="text-white/60">*</span>
                </label>
                <input
                  type="tel"
                  id={`${instanceId}-phone`}
                  name="phone"
                  required
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, phone: value });
                    if (phoneError) setPhoneError(null);
                  }}
                  onBlur={validatePhone}
                  aria-invalid={!!phoneError}
                  className={fieldClass(!!phoneError)}
                  placeholder={t("formPlaceholderPhone")}
                />
                {phoneError ? (
                  <p className="mt-1.5 text-xs text-[#FF4500]">{phoneError}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-white/30">
                    {t("formPhoneHint")}
                  </p>
                )}
              </div>
            </div>

            {/* 유입 경로 (선택) */}
            <div>
              <label
                htmlFor={`${instanceId}-discovery_source`}
                className="block text-xs uppercase tracking-wider text-white/60 mb-2"
              >
                {t("formDiscoveryLabel")}
              </label>
              <select
                id={`${instanceId}-discovery_source`}
                name="discovery_source"
                value={formData.discovery_source}
                onChange={handleChange}
                className={fieldClass()}
              >
                <option value="">{t("formDiscoveryPlaceholder")}</option>
                {DISCOVERY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Message */}
            <div>
              <label
                htmlFor={`${instanceId}-message`}
                className="block text-xs uppercase tracking-wider text-white/60 mb-2"
              >
                {t("formMessage")} <span className="text-white/60">*</span>
              </label>
              <textarea
                id={`${instanceId}-message`}
                name="message"
                required
                rows={4}
                value={formData.message}
                onChange={handleChange}
                className={`${fieldClass()} resize-none`}
                placeholder={t("formPlaceholderMessage")}
              />
            </div>

            {/* Row 4: Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`${instanceId}-privacyConsent`}
                  name="privacyConsent"
                  checked={formData.privacyConsent}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-[var(--radius-sm)] border-2 border-white/30 bg-transparent checked:bg-white checked:border-white focus:ring-2 focus:ring-white transition-all cursor-pointer shrink-0"
                />
                <label
                  htmlFor={`${instanceId}-privacyConsent`}
                  className="flex-1 cursor-pointer group"
                >
                  <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setPrivacyModalOpen(true);
                      }}
                      className="text-white/80 underline hover:no-underline focus:outline-none"
                    >
                      {t("formPrivacyLabel")}
                    </button>{" "}
                    <span className="text-white/60">*</span>
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`${instanceId}-marketingConsent`}
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-[var(--radius-sm)] border-2 border-white/30 bg-transparent checked:bg-white checked:border-white focus:ring-2 focus:ring-white transition-all cursor-pointer shrink-0"
                />
                <label
                  htmlFor={`${instanceId}-marketingConsent`}
                  className="flex-1 cursor-pointer group"
                >
                  <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setMarketingModalOpen(true);
                      }}
                      className="text-white/80 underline hover:no-underline focus:outline-none"
                    >
                      {t("formMarketingLabel")}
                    </button>
                  </span>
                </label>
              </div>
            </div>

            {/* Consent Modals */}
            <ConsentModal
              open={privacyModalOpen}
              onOpenChange={setPrivacyModalOpen}
              type="privacy"
            />
            <ConsentModal
              open={marketingModalOpen}
              onOpenChange={setMarketingModalOpen}
              type="marketing"
            />

            {/* Success Dialog */}
            <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
              <DialogContent className="sm:max-w-md bg-card backdrop-blur-md border border-border rounded-[var(--radius)] shadow-xl [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:text-white/80">
                <DialogHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-white/10 rounded-[var(--radius)]">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {t("dialogSuccessTitle")}
                  </DialogTitle>
                  <DialogDescription className="pt-4 text-base leading-relaxed text-white/60">
                    {t("dialogSuccessDesc")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                  <Button
                    onClick={() => {
                      setSuccessDialogOpen(false);
                      setFormData({
                        name: "",
                        company: "",
                        position: "",
                        email: "",
                        phone: "",
                        message: "",
                        discovery_source: "",
                        privacyConsent: false,
                        marketingConsent: false,
                      });
                    }}
                    className="w-full sm:w-auto px-8 font-bold rounded-[var(--radius-sm)] gradient-warm text-white hover:opacity-90"
                  >
                    {t("dialogConfirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Row 5: Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full gradient-warm text-white py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="flex items-center justify-center gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? t("formSubmitting") : t("formSubmit")}
              </span>
            </button>
            {submitError && (
              <p className="text-center text-xs text-[#FF4500]">
                {t("toastErrorDefault")}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
