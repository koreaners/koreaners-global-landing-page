"use client";

import { useRef, useState } from "react";
import Navigation from "@/components/navigation";
import { ShaderBackdrop } from "@/components/ui/shader-backdrop";
import { BRIEF_STEPS, type BriefField, type BriefGroup } from "@/lib/brand-brief";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2 } from "lucide-react";

const FIELD =
  "w-full bg-[var(--kn-dark)] rounded-[var(--radius-sm)] text-white text-[15px] px-4 py-3 border border-white/10 transition-colors duration-200 outline-none placeholder:text-white/25 hover:border-white/20 focus:ring-1 focus:ring-[#FF4500]/30 focus:border-[#FF4500]";
const LABEL = "block text-sm font-medium text-white/90";
const HELP = "text-xs leading-relaxed text-white/45 mt-1";
const CHIP =
  "inline-flex items-center min-h-[40px] rounded-full border border-white/15 px-4 text-sm text-white/70 cursor-pointer select-none transition-colors duration-200 hover:border-white/35 has-[:checked]:border-[#FF4500] has-[:checked]:bg-[#FF4500]/12 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FF4500]/40";
const OTHER = "__other";

// help 의 「예) …」 부분은 placeholder 로, 앞부분만 설명으로 보여준다
const splitHelp = (help?: string) => {
  const [desc, ex] = (help ?? "").split(/\s*예\)\s*/);
  return { desc: desc.trim(), placeholder: ex ? `예) ${ex.trim()}` : undefined };
};
const isWide = (f: BriefField) => f.type === "long" || f.type === "radio" || f.type === "checkbox" || splitHelp(f.help).desc.length > 28;

function Field({ f }: { f: BriefField }) {
  const id = `pb-${f.key}`;
  const { desc, placeholder } = splitHelp(f.help);
  const label = (
    <>
      {f.label}
      {f.required && <span className="ml-1 text-[#FF4500]">*</span>}
    </>
  );
  const wide = isWide(f) ? "md:col-span-2" : "";

  if (f.type === "radio" || f.type === "checkbox") {
    return (
      <fieldset className={`group/choice ${wide}`}>
        <legend className={LABEL}>{label}</legend>
        {desc && <p className={HELP}>{desc}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {(f.options ?? []).map((o) => (
            <label key={o} className={CHIP}>
              <input type={f.type} name={f.key} value={o} className="sr-only" />
              {o}
            </label>
          ))}
          <label className={CHIP}>
            <input type={f.type} name={f.key} value={OTHER} data-other className="sr-only" />
            기타
          </label>
        </div>
        <input
          name={`${f.key}${OTHER}`}
          type="text"
          placeholder="직접 입력"
          aria-label={`${f.label} 기타`}
          className={`${FIELD} mt-3 hidden group-has-[[data-other]:checked]/choice:block`}
        />
      </fieldset>
    );
  }

  return (
    <div className={wide}>
      <label htmlFor={id} className={LABEL}>{label}</label>
      {desc && <p className={HELP}>{desc}</p>}
      {f.type === "long" ? (
        <textarea id={id} name={f.key} required={f.required} rows={3} placeholder={placeholder} className={`${FIELD} mt-2 resize-y`} />
      ) : (
        <input id={id} name={f.key} type={f.type === "email" ? "email" : "text"} required={f.required} placeholder={placeholder} className={`${FIELD} mt-2`} />
      )}
    </div>
  );
}

function Group({ g, collapsible }: { g: BriefGroup; collapsible?: boolean }) {
  const body = (
    <>
      {g.help && <p className="text-xs text-white/45 mb-5">{g.help}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
        {g.fields.map((f) => (
          <Field key={f.key} f={f} />
        ))}
      </div>
    </>
  );

  if (collapsible) {
    return (
      <details className="group/acc rounded-[var(--radius)] border border-white/10 bg-white/[0.02] open:bg-white/[0.04] transition-colors">
        <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="text-[15px] font-medium text-white">{g.title}</span>
          <span className="flex items-center gap-3 text-xs text-white/40">
            {g.fields.length}문항
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open/acc:rotate-180" />
          </span>
        </summary>
        <div className="px-5 pb-6 pt-1">{body}</div>
      </details>
    );
  }

  return (
    <div>
      {g.title && <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF4500] mb-5">{g.title}</h3>}
      {body}
    </div>
  );
}

export default function PartnersBrief() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const last = BRIEF_STEPS.length - 1;

  // 숨겨진 단계는 브라우저 기본 검증이 포커스를 못 잡으므로 단계별로 직접 검사한다
  const validStep = (i: number) => {
    const els = stepRefs.current[i]?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea") ?? [];
    for (const el of els) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  };

  const go = (i: number) => {
    setStep(i);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validStep(step)) return;
    if (step < last) return go(step + 1); // 입력칸에서 Enter = 다음 단계

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { privacy_agreement: fd.get("privacy") === "on" };
    for (const f of BRIEF_STEPS.flatMap((s) => s.groups.flatMap((g) => g.fields))) {
      if (f.type === "radio" || f.type === "checkbox") {
        const other = String(fd.get(`${f.key}${OTHER}`) ?? "").trim();
        const picked = fd.getAll(f.key).map(String).map((v) => (v === OTHER ? other : v)).filter(Boolean);
        body[f.key] = f.type === "radio" ? (picked[0] ?? "") : picked;
      } else {
        body[f.key] = String(fd.get(f.key) ?? "");
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
      cardRef.current?.scrollIntoView({ block: "start" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Navigation />

      <section className="relative bg-[var(--kn-dark)] hero-glow px-6 pt-32 md:pt-36 pb-16 text-center">
        {/* 아래가 같은 어두운 배경 섹션이라 글로우가 경계에서 잘려 보인다 → 하단으로 페이드 */}
        <ShaderBackdrop
          variant="hero-sub"
          seed={11}
          className="absolute! [mask-image:linear-gradient(to_bottom,black_35%,transparent_100%)]"
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FF4500] bg-white/10 mb-6">
            Partnership Brief
          </p>
          <h1 className="heading-kr font-display font-bold text-4xl md:text-5xl leading-[1.1] text-[var(--foreground)] mb-6">
            브랜드에 꼭 맞는 제안을 위한
            <br />
            <span className="gradient-warm-text">사전 정보 시트</span>
          </h1>
          <p className="text-base md:text-lg text-[#A8A29E]">
            답변해주신 내용은 제안서 작성과 캠페인 기획에만 활용됩니다.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-white/70">
            {["약 5분", "필수 7문항", "나머지는 아는 범위에서"].map((t) => (
              <li key={t} className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-background px-4 md:px-6 py-14 md:py-20">
        <div
          ref={cardRef}
          className="max-w-3xl mx-auto scroll-mt-24 rounded-[var(--radius-lg)] border border-white/10 bg-surface-1 shadow-2xl shadow-black/30"
        >
          {done ? (
            <div className="px-6 py-16 md:py-20 text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full gradient-warm">
                <Check className="h-7 w-7 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">제출이 완료됐습니다</h2>
              <p className="text-white/70">
                보내주신 내용은 코리너스 팀이 검토한 뒤,
                <br className="hidden md:block" /> 미팅 때 브랜드에 맞춘 제안으로 준비해 뵙겠습니다.
              </p>
              <p className="mt-6 text-sm text-white/45">
                링크로 전달하지 못한 파일은 sales@koreaners.com 으로 보내주세요. (메일 제목에 브랜드명)
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* 단계 표시 */}
              <ol className="grid grid-cols-3 border-b border-white/10">
                {BRIEF_STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    aria-current={i === step ? "step" : undefined}
                    className={`relative px-4 md:px-6 py-4 md:py-5 ${i > 0 ? "border-l border-white/10" : ""}`}
                  >
                    <p className={`text-xs font-bold tracking-widest ${i <= step ? "text-[#FF4500]" : "text-white/30"}`}>
                      {i < step ? <Check className="inline h-3.5 w-3.5 -mt-0.5" /> : `0${i + 1}`}
                    </p>
                    <p className={`mt-1 text-sm md:text-[15px] font-medium ${i === step ? "text-white" : "text-white/40"}`}>{s.title}</p>
                    <span className={`absolute inset-x-0 bottom-[-1px] h-0.5 ${i <= step ? "gradient-warm" : "bg-transparent"}`} />
                  </li>
                ))}
              </ol>

              {BRIEF_STEPS.map((s, i) => (
                <div
                  key={s.title}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  className={i === step ? "px-5 md:px-10 pt-8 md:pt-10" : "hidden"}
                >
                  <p className="text-sm text-white/55 mb-8">{s.desc}</p>
                  <div className={s.collapsible ? "space-y-3" : "space-y-10"}>
                    {s.groups.map((g) => (
                      <Group key={g.title} g={g} collapsible={s.collapsible} />
                    ))}
                  </div>

                  {i === last && (
                    <label className="mt-8 flex items-start gap-3 cursor-pointer text-sm text-white/60">
                      <input
                        name="privacy"
                        type="checkbox"
                        required
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-white/30 accent-[#FF4500]"
                      />
                      <span>
                        제안서 작성과 캠페인 기획을 위한 담당자 정보(성함·직함·이메일) 수집과 이용에 동의합니다.
                        <span className="ml-1 text-[#FF4500]">*</span>
                      </span>
                    </label>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 px-5 md:px-10 py-8 md:py-10">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => go(step - 1)}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-white/15 px-5 py-3.5 text-sm text-white/70 hover:border-white/35 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> 이전
                  </button>
                ) : (
                  <span className="text-xs text-white/35">
                    <span className="text-[#FF4500]">*</span> 표시는 필수 항목입니다
                  </span>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 min-w-[140px] gradient-warm text-white px-7 py-3.5 text-sm font-bold tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step < last ? (
                    <>
                      다음 <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    "제출하기"
                  )}
                </button>
              </div>
              {submitError && <p className="px-5 md:px-10 pb-8 -mt-4 text-right text-sm text-[#FF4500]">{submitError}</p>}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
