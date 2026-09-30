"use client";

import { useState } from "react";
import Navigation from "@/components/navigation";
import { ShaderBackdrop } from "@/components/ui/shader-backdrop";
import { BRIEF_SECTIONS, type BriefField } from "@/lib/brand-brief";
import { Loader2 } from "lucide-react";

// diagnosis-landing.tsx 와 동일한 필드 스타일 (내보내지 않는 상수라 복사)
const FIELD =
  "w-full bg-surface-2 rounded-[var(--radius-sm)] text-white px-4 py-3 border border-white/10 transition-all duration-300 outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#FF4500]/30 focus:border-[#FF4500]";
const LABEL = "block text-sm text-white mb-1";
const HELP = "text-xs text-white/50 mb-2";
const CHECKBOX =
  "w-5 h-5 rounded-[var(--radius-sm)] border-2 border-white/30 bg-transparent checked:bg-white checked:border-white focus:ring-2 focus:ring-white transition-all cursor-pointer shrink-0";
const OTHER = "__other";

function Field({ f }: { f: BriefField }) {
  const id = `pb-${f.key}`;
  const label = (
    <>
      {f.label} {f.required && <span className="text-[#FF4500]">*</span>}
    </>
  );

  if (f.type === "radio" || f.type === "checkbox") {
    return (
      <fieldset>
        <legend className={LABEL}>{label}</legend>
        {f.help && <p className={HELP}>{f.help}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {[...(f.options ?? []), OTHER].map((o) => (
            <label key={o} className="flex items-center gap-2 min-h-[44px] cursor-pointer text-sm text-white/80">
              <input type={f.type} name={f.key} value={o} className={CHECKBOX} />
              {o === OTHER ? "기타" : o}
            </label>
          ))}
        </div>
        <input name={`${f.key}${OTHER}`} type="text" placeholder="기타 선택 시 직접 입력" aria-label={`${f.label} 기타`} className={`${FIELD} mt-2`} />
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      {f.help && <p className={HELP}>{f.help}</p>}
      {f.type === "long" ? (
        <textarea id={id} name={f.key} required={f.required} rows={3} className={FIELD} />
      ) : (
        <input id={id} name={f.key} type={f.type === "email" ? "email" : "text"} required={f.required} className={FIELD} />
      )}
    </div>
  );
}

export default function PartnersBrief() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { privacy_agreement: fd.get("privacy") === "on" };
    for (const s of BRIEF_SECTIONS) {
      for (const f of s.fields) {
        if (f.type === "radio" || f.type === "checkbox") {
          const other = String(fd.get(`${f.key}${OTHER}`) ?? "").trim();
          const picked = fd.getAll(f.key).map(String).map((v) => (v === OTHER ? other : v)).filter(Boolean);
          body[f.key] = f.type === "radio" ? (picked[0] ?? "") : picked;
        } else {
          body[f.key] = String(fd.get(f.key) ?? "");
        }
      }
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      const res = await fetch("/api/brand-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Navigation />

      <section className="relative bg-[var(--kn-dark)] hero-glow px-6 pt-32 md:pt-36 pb-14 text-center">
        <ShaderBackdrop variant="hero-sub" seed={11} className="absolute!" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="heading-kr font-display font-bold text-4xl md:text-5xl leading-[1.05] text-[var(--foreground)] mb-6">
            파트너십 사전 정보 시트
          </h1>
          <p className="text-lg text-[#A8A29E] mb-4">
            원활한 미팅 진행을 위해 사전 정보를 요청드립니다. 답변해주신 내용은 제안서 작성과 캠페인 기획에만 활용되며, 약 5~10분 정도 소요됩니다.
          </p>
          <p className="text-sm text-[#78716C]">
            * 표시 항목만 필수이며, 나머지는 아는 범위에서 편하게 작성해주세요.
          </p>
        </div>
      </section>

      <section className="bg-background py-20 md:py-28 px-6 lg:px-24">
        <div className="max-w-2xl mx-auto">
          {done ? (
            <div className="text-center text-white space-y-4">
              <p className="text-lg">소중한 시간 내어 작성해주셔서 감사합니다.</p>
              <p className="text-white/70">
                보내주신 내용은 코리너스 팀이 검토한 뒤, 미팅 때 브랜드에 맞춘 제안으로 준비해 뵙겠습니다.
              </p>
              <p className="text-sm text-white/50">
                링크로 전달하지 못한 파일은 sales@koreaners.com 으로 보내주세요. (메일 제목에 브랜드명)
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-14">
              {BRIEF_SECTIONS.map((s, i) => (
                <div key={s.title} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {i + 1}. {s.title}
                    </h2>
                    {s.help && <p className="text-sm text-white/50 mt-1">{s.help}</p>}
                  </div>
                  {s.fields.map((f) => (
                    <Field key={f.key} f={f} />
                  ))}
                </div>
              ))}

              <div className="flex items-center gap-3">
                <input id="pb-privacy" name="privacy" type="checkbox" required className={CHECKBOX} />
                <label htmlFor="pb-privacy" className="flex-1 min-h-[44px] flex items-center cursor-pointer text-sm text-white/60">
                  제안서 작성과 캠페인 기획을 위한 담당자 정보(성함·직함·이메일) 수집과 이용에 동의합니다. <span className="ml-1">*</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full gradient-warm text-white py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  제출하기
                </span>
              </button>
              {submitError && <p className="text-center text-sm text-[#FF4500]">{submitError}</p>}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
