"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsentModal } from "@/components/consent-modal";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";

type Key = Parameters<typeof getTranslation>[1];

const INPUT_CLASS =
  "w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-[16px] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all";
const LABEL_CLASS = "block text-sm font-bold text-white mb-2";
const CHOICE_CLASS =
  "flex min-h-[44px] items-center gap-2 px-4 py-3 bg-surface-2 border border-[var(--border)] text-sm text-white cursor-pointer hover:border-[#FF4500]/60 transition-colors";
const BOX_CLASS = "w-5 h-5 accent-[#FF4500] cursor-pointer shrink-0";

const RESIDENCE: [string, Key][] = [
  ["japan", "tbFormResidenceJapan"],
  ["korea", "tbFormResidenceKorea"],
  ["other", "tbFormResidenceOther"],
];
const VISIT: [string, Key][] = [
  ["2026-09", "tbFormVisitSep"],
  ["2026-10", "tbFormVisitOct"],
  ["2026-11+", "tbFormVisitNovPlus"],
  ["resident", "tbFormVisitResident"],
];
const FOLLOWERS: [string, Key][] = [
  ["lt3k", "tbFormFollowersLt3k"],
  ["3k-10k", "tbFormFollowers3k10k"],
  ["gt10k", "tbFormFollowersGt10k"],
];
const CATEGORIES: [string, Key][] = [
  ["gourmet", "tbFormCatGourmet"],
  ["cafe", "tbFormCatCafe"],
  ["beauty_clinic", "tbFormCatBeautyClinic"],
  ["accessory_shopping", "tbFormCatAccessoryShopping"],
];

/** URL 이든 @핸들이든 `https://instagram.com/<handle>` 로 맞춘다. */
function normaliseInstagram(raw: string) {
  const v = raw.trim();
  const isUrl = /^https?:\/\//i.test(v);
  const handle = (
    isUrl
      ? v.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() || ""
      : v.replace(/^@/, "")
  ).trim();
  return { url: isUrl ? v : `https://instagram.com/${handle}`, handle };
}

export function TripbridgeCreatorForm() {
  const { locale } = useLocale();
  const t = (key: Key) => getTranslation(locale, key);
  const { toast } = useToast();

  const [form, setForm] = useState({
    instagram_url: "",
    residence: "",
    visit_period: "",
    email: "",
    follower_range: "",
    name: "",
    message: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [utm, setUtm] = useState({
    utm_source: "",
    utm_campaign: "",
    utm_content: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [invalid, setInvalid] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setUtm({
      utm_source: q.get("utm_source") || "",
      utm_campaign: q.get("utm_campaign") || "",
      utm_content: q.get("utm_content") || "",
    });
  }, []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const fail = (descKey: Key, field?: string, selector?: string) => {
    toast({
      title: t("creatorToastSubmitFail"),
      description: t(descKey),
      variant: "destructive",
    });
    if (field && selector) {
      setInvalid(field);
      const el = document.querySelector<HTMLElement>(selector);
      el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvalid("");

    if (!form.instagram_url.trim())
      return fail("creatorToastInstagramRequired", "instagram_url", "#tb-instagram");
    if (!form.residence)
      return fail("tbFormResidence", "residence", 'input[name="residence"]');
    if (!form.visit_period)
      return fail("tbFormVisitPeriod", "visit_period", 'input[name="visit_period"]');
    if (!form.email.trim())
      return fail("creatorToastEmailRequired", "email", "#tb-email");
    if (!consent) return fail("tbFormPrivacy", "consent", "#tb-consent");

    const { url: instagram_url, handle } = normaliseInstagram(form.instagram_url);
    const payload = {
      name: form.name.trim() || handle,
      email: form.email.trim(),
      phone: null,
      instagram_url,
      message: form.message.trim() || null,
      residence: form.residence,
      visit_period: form.visit_period,
      follower_range: form.follower_range || null,
      categories: categories.length ? categories : null,
      utm_source: utm.utm_source || null,
      utm_campaign: utm.utm_campaign || null,
      utm_content: utm.utm_content || null,
      track_type: "tripbridge",
      locale,
    };

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("creator_applications")
        .insert([payload]);
      if (error) throw error;

      if (typeof window.fbq === "function")
        window.fbq("track", "Lead", { content_name: "tripbridge_creator_form" });
      if (typeof window.gtag === "function")
        window.gtag("event", "generate_lead", {
          content_name: "tripbridge_creator_form",
        });

      // Notion·Slack·CAPI 는 비동기 (실패해도 유저 경험 영향 없음)
      fetch("/api/creator-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("[Tripbridge] Notion 저장 실패 (무시):", err);
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting tripbridge application:", err);
      fail("creatorToastSubmitFailDesc");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-surface-1 border border-[var(--border)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-[#FF4500]/10 border border-[#FF4500]/20">
          <CheckCircle2 className="h-10 w-10 text-[#FF4500]" />
        </div>
        <p className="text-base leading-relaxed text-[#A8A29E]">
          {t("tbFormSuccess")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="tb-instagram" className={LABEL_CLASS}>
          {t("tbFormInstagram")} <span className="text-[#FF4500]">*</span>
        </label>
        <input
          type="text"
          id="tb-instagram"
          inputMode="url"
          autoComplete="off"
          value={form.instagram_url}
          onChange={(e) => set("instagram_url", e.target.value)}
          className={INPUT_CLASS}
          placeholder="@id"
          aria-invalid={invalid === "instagram_url" || undefined}
        />
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>
          {t("tbFormResidence")} <span className="text-[#FF4500]">*</span>
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {RESIDENCE.map(([value, key], i) => (
            <label key={value} className={CHOICE_CLASS}>
              <input
                type="radio"
                name="residence"
                value={value}
                checked={form.residence === value}
                onChange={() => set("residence", value)}
                className={BOX_CLASS}
                aria-invalid={(invalid === "residence" && i === 0) || undefined}
              />
              {t(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL_CLASS}>
          {t("tbFormVisitPeriod")} <span className="text-[#FF4500]">*</span>
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {VISIT.map(([value, key], i) => (
            <label key={value} className={CHOICE_CLASS}>
              <input
                type="radio"
                name="visit_period"
                value={value}
                checked={form.visit_period === value}
                onChange={() => set("visit_period", value)}
                className={BOX_CLASS}
                aria-invalid={
                  (invalid === "visit_period" && i === 0) || undefined
                }
              />
              {t(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="tb-email" className={LABEL_CLASS}>
          {t("tbFormEmail")} <span className="text-[#FF4500]">*</span>
        </label>
        <input
          type="email"
          id="tb-email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className={INPUT_CLASS}
          placeholder="example@email.com"
          aria-invalid={invalid === "email" || undefined}
        />
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>{t("tbFormFollowers")}</legend>
        <div className="grid grid-cols-1 gap-2">
          {FOLLOWERS.map(([value, key]) => (
            <label key={value} className={CHOICE_CLASS}>
              <input
                type="radio"
                name="follower_range"
                value={value}
                checked={form.follower_range === value}
                onChange={() => set("follower_range", value)}
                className={BOX_CLASS}
              />
              {t(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL_CLASS}>{t("tbFormCategories")}</legend>
        <div className="grid grid-cols-1 gap-2">
          {CATEGORIES.map(([value, key]) => (
            <label key={value} className={CHOICE_CLASS}>
              <input
                type="checkbox"
                name="categories"
                value={value}
                checked={categories.includes(value)}
                onChange={(e) =>
                  setCategories((prev) =>
                    e.target.checked
                      ? [...prev, value]
                      : prev.filter((c) => c !== value),
                  )
                }
                className={BOX_CLASS}
              />
              {t(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="tb-name" className={LABEL_CLASS}>
          {t("tbFormName")}
        </label>
        <input
          type="text"
          id="tb-name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="tb-message" className={LABEL_CLASS}>
          {t("tbFormMessage")}
        </label>
        <textarea
          id="tb-message"
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="tb-consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className={BOX_CLASS}
          aria-invalid={invalid === "consent" || undefined}
        />
        <label htmlFor="tb-consent" className="flex-1 min-h-[44px] flex items-center cursor-pointer">
          <span className="text-sm text-[#A8A29E]">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setPrivacyModalOpen(true);
              }}
              className="text-white underline hover:no-underline focus:outline-none"
            >
              {t("tbFormPrivacy")}
            </button>{" "}
            <span className="text-[#FF4500]">*</span>
          </span>
        </label>
      </div>

      <ConsentModal
        open={privacyModalOpen}
        onOpenChange={setPrivacyModalOpen}
        type="privacy"
      />

      <Button
        type="submit"
        disabled={submitting}
        className="w-full min-h-[44px] gradient-warm text-white rounded-[var(--radius-sm)] py-4 text-base font-bold hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? t("formSubmitting") : t("tbFormSubmit")}
      </Button>
    </form>
  );
}
