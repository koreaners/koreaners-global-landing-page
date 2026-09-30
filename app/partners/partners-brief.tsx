"use client";

import { useRef, useState } from "react";
import Navigation from "@/components/navigation";
import { ShaderBackdrop } from "@/components/ui/shader-backdrop";
import { BRIEF_STEPS, type BriefField, type BriefGroup } from "@/lib/brand-brief";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

// footer-cta.tsx (문의 폼) 와 같은 필드·라벨·체크박스·버튼 스타일 (내보내지 않는 상수라 복사)
const FIELD =
  "w-full bg-surface-2 rounded-[var(--radius-sm)] text-white px-4 py-3 border border-white/10 transition-all duration-300 outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#FF4500]/30 focus:border-[#FF4500]";
const LABEL = "block text-xs uppercase tracking-wider text-white/60 mb-2";
const HINT = "mt-1.5 text-xs text-white/30";
const CHECKBOX =
  "w-5 h-5 rounded-[var(--radius-sm)] border-2 border-white/30 bg-transparent checked:bg-white checked:border-white focus:ring-2 focus:ring-white transition-all cursor-pointer shrink-0";
// 선택지는 입력칸과 같은 면·테두리, 선택 시 포커스 색
const OPTION =
  "inline-flex items-center bg-surface-2 rounded-[var(--radius-sm)] border border-white/10 px-4 py-3 text-sm text-white/60 cursor-pointer select-none transition-all duration-300 hover:text-white/80 has-[:checked]:border-[#FF4500] has-[:checked]:text-white has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-[#FF4500]/30";
const OTHER = "__other";

// help 의 「예) …」 부분은 placeholder 로, 앞부분만 입력칸 아래 힌트로 보여준다
const splitHelp = (help?: string) => {
  const [desc, ex] = (help ?? "").split(/\s*예\)\s*/);
  return { desc: desc.trim(), placeholder: ex ? `예) ${ex.trim()}` : undefined };
};
const isHalf = (f: BriefField) => (f.type === "short" || f.type === "email") && splitHelp(f.help).desc.length <= 28;

function Field({ f, wide }: { f: BriefField; wide: boolean }) {
  const id = `pb-${f.key}`;
  const { desc, placeholder } = splitHelp(f.help);
  const label = (
    <>
      {f.label} {f.required && <span className="text-white/60">*</span>}
    </>
  );
  const span = wide ? "md:col-span-2" : "";

  if (f.type === "radio" || f.type === "checkbox") {
    return (
      <fieldset className={`group/choice ${span}`}>
        <legend className={LABEL}>{label}</legend>
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => (
            <label key={o} className={OPTION}>
              <input type={f.type} name={f.key} value={o} className="sr-only" />
              {o}
            </label>
          ))}
          <label className={OPTION}>
            <input type={f.type} name={f.key} value={OTHER} data-other className="sr-only" />
            기타
          </label>
        </div>
        <input
          name={`${f.key}${OTHER}`}
          type="text"
          placeholder="직접 입력"
          aria-label={`${f.label} 기타`}
          className={`${FIELD} mt-2 hidden group-has-[[data-other]:checked]/choice:block`}
        />
        {desc && <p className={HINT}>{desc}</p>}
      </fieldset>
    );
  }

  return (
    <div className={span}>
      <label htmlFor={id} className={LABEL}>{label}</label>
      {f.type === "long" ? (
        <textarea id={id} name={f.key} required={f.required} rows={4} placeholder={placeholder} className={`${FIELD} resize-none`} />
      ) : (
        <input id={id} name={f.key} type={f.type === "email" ? "email" : "text"} required={f.required} placeholder={placeholder} className={FIELD} />
      )}
      {desc && <p className={HINT}>{desc}</p>}
    </div>
  );
}

function Fields({ g }: { g: BriefGroup }) {
  // 짧은 입력칸은 2열. 짝이 없는 마지막 칸은 한 줄을 다 쓴다
  let run = 0;
  const wide = g.fields.map((f, i) => {
    if (!isHalf(f)) {
      run = 0;
      return true;
    }
    run += 1;
    const next = g.fields[i + 1];
    return run % 2 === 1 && (!next || !isHalf(next));
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
      {g.fields.map((f, i) => (
        <Field key={f.key} f={f} wide={wide[i]} />
      ))}
    </div>
  );
}

function Group({ g, collapsible }: { g: BriefGroup; collapsible?: boolean }) {
  if (collapsible) {
    return (
      <details className="group/acc bg-surface-2 rounded-[var(--radius-sm)] border border-white/10 open:bg-transparent transition-colors duration-300">
        <summary className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer list-none text-white [&::-webkit-details-marker]:hidden">
          {g.title}
          <span className="flex items-center gap-3 text-xs text-white/30">
            {g.fields.length}문항
            <ChevronDown className="h-4 w-4 text-white/60 transition-transform duration-300 group-open/acc:rotate-180" />
          </span>
        </summary>
        <div className="px-4 pb-6 pt-3">
          {g.help && <p className="text-xs text-white/30 mb-5">{g.help}</p>}
          <Fields g={g} />
        </div>
      </details>
    );
  }
  return (
    <div>
      {g.title && <p className="text-sm font-bold text-[#FF4500] mb-5">{g.title}</p>}
      <Fields g={g} />
    </div>
  );
}

export default function PartnersBrief() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const formTop = useRef<HTMLDivElement>(null);
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
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      formTop.current?.scrollIntoView({ block: "start" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* 히어로: 다른 서브페이지와 같은 구성 */}
      <section className="relative bg-[var(--kn-dark)] hero-glow px-6 pt-32 md:pt-36 pb-14 text-center">
        {/* 아래가 같은 어두운 배경 섹션이라 글로우가 경계에서 잘려 보인다 → 하단으로 페이드 */}
        <ShaderBackdrop
          variant="hero-sub"
          seed={11}
          className="absolute! [mask-image:linear-gradient(to_bottom,black_35%,transparent_100%)]"
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FF4500] bg-white/10 mb-6">
            Brand Brief
          </p>
          <h1 className="heading-kr font-display font-bold uppercase text-4xl md:text-5xl leading-[1.05] text-[var(--foreground)] mb-6">
            브랜드에 꼭 맞는 제안을 위한
            <br />
            <span className="gradient-warm-text">사전 정보 시트</span>
          </h1>
          <p className="text-lg text-[#A8A29E]">
            미팅 전에 브랜드와 캠페인 정보를 알려주시면, 그에 맞춘 제안서를 준비해 뵙겠습니다.
          </p>
        </div>
      </section>

      {/* 폼: 문의 폼(footer-cta)과 같은 2단 구성 — 왼쪽 제목, 오른쪽 입력 */}
      <section ref={formTop} className="bg-background py-24 md:py-32 px-6 lg:px-24 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-16 items-start">
            <div className="lg:sticky lg:top-28">
              <h2 className="font-display font-bold text-6xl lg:text-8xl uppercase text-white leading-[0.85]">
                <span className="italic text-[#FF4500]">BRAND</span>
                <br />
                BRIEF
              </h2>
              <p className="text-base text-white/60 mt-8 leading-relaxed">
                답변해주신 내용은 제안서 작성과 캠페인 기획에만 활용됩니다. 필수는 7문항이고, 나머지는 아는 범위에서 편하게 적어주세요. 약 5분 걸립니다.
              </p>
              {!done && (
                <ol className="mt-10 space-y-3">
                  {BRIEF_STEPS.map((s, i) => (
                    <li key={s.title} aria-current={i === step ? "step" : undefined}>
                      <button
                        type="button"
                        disabled={i >= step}
                        onClick={() => go(i)}
                        className={`flex items-baseline gap-4 text-left transition-colors duration-300 ${
                          i === step ? "text-white" : i < step ? "text-white/60 hover:text-white cursor-pointer" : "text-white/30"
                        }`}
                      >
                        <span className={`text-sm font-bold ${i <= step ? "text-[#FF4500]" : ""}`}>0{i + 1}</span>
                        <span className="text-base">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {done ? (
              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center bg-white/10 rounded-[var(--radius)]">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">제출이 완료됐습니다</p>
                <p className="pt-4 text-base leading-relaxed text-white/60">
                  보내주신 내용은 코리너스 팀이 검토한 뒤, 미팅 때 브랜드에 맞춘 제안으로 준비해 뵙겠습니다.
                  <br />
                  링크로 전달하지 못한 파일은 sales@koreaners.com 으로 보내주세요. (메일 제목에 브랜드명)
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {BRIEF_STEPS.map((s, i) => (
                  <div
                    key={s.title}
                    ref={(el) => {
                      stepRefs.current[i] = el;
                    }}
                    className={i === step ? "" : "hidden"}
                  >
                    <p className="text-base text-white/60 mb-8">{s.desc}</p>
                    <div className={s.collapsible ? "space-y-3" : "space-y-10"}>
                      {s.groups.map((g) => (
                        <Group key={g.title} g={g} collapsible={s.collapsible} />
                      ))}
                    </div>

                    {i === last && (
                      <div className="flex items-center gap-3 mt-6">
                        <input id="pb-privacy" name="privacy" type="checkbox" required className={CHECKBOX} />
                        <label htmlFor="pb-privacy" className="flex-1 min-h-[44px] flex items-center cursor-pointer text-sm text-white/60">
                          제안서 작성과 캠페인 기획을 위한 담당자 정보(성함·직함·이메일) 수집과 이용에 동의합니다.
                          <span className="ml-1">*</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-3">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => go(step - 1)}
                      className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-white/60 border border-white/10 rounded-[var(--radius-sm)] hover:text-white hover:border-white/30 transition-all duration-300 cursor-pointer"
                    >
                      이전
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 gradient-warm text-white py-4 text-sm font-bold uppercase tracking-wider rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {step < last ? `다음 (${step + 1} / ${BRIEF_STEPS.length})` : "제출하기"}
                    </span>
                  </button>
                </div>
                {submitError && <p className="text-center text-xs text-[#FF4500]">{submitError}</p>}
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
