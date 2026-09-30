import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, addRateLimitHeaders } from "@/lib/rate-limit";
import { createStaticClient } from "@/lib/supabase/static";
import { sendSlackBrandBrief } from "@/lib/slack";
import { BRIEF_FIELDS, type BriefAnswers } from "@/lib/brand-brief";

// 브랜드 사전 정보 시트 (/partners) 제출 → Supabase brand_briefs + Slack 알림.
// anon 키 + 공개 insert 정책 (inquiries 와 동일). preview·production 모두 같은 env 로 동작.

const MAX = { short: 500, email: 254, long: 5000, option: 200 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function validate(raw: unknown): { answers: BriefAnswers } | { error: string } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: BriefAnswers = {};

  for (const f of BRIEF_FIELDS) {
    const v = body[f.key];
    if (f.type === "checkbox") {
      const list = (Array.isArray(v) ? v : []).map(str).filter(Boolean).slice(0, 10);
      if (list.length) answers[f.key] = list.map((s) => s.slice(0, MAX.option));
      continue;
    }
    const max = f.type === "radio" ? MAX.option : MAX[f.type];
    const s = str(v).slice(0, max);
    if (f.required && !s) return { error: `${f.label} 항목을 입력해주세요.` };
    if (f.type === "email" && s && !EMAIL_RE.test(s)) return { error: "올바른 이메일 주소를 입력해주세요." };
    if (s) answers[f.key] = s;
  }
  if (body.privacy_agreement !== true) return { error: "개인정보 수집·이용에 동의해주세요." };
  return { answers };
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(getClientIp(request), { windowMs: 60 * 1000, maxRequests: 5 });
  if (!rate.success) {
    return addRateLimitHeaders(
      NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 }),
      rate,
    );
  }

  const result = validate(await request.json().catch(() => null));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { error } = await createStaticClient()
    .from("brand_briefs")
    .insert({ ...result.answers, privacy_agreement: true });
  if (error) {
    console.error("[BrandBrief API] insert 실패:", error.code, error.message);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  // 저장이 끝난 뒤 알림. 실패해도 응답은 성공 (sendSlackWebhook 이 로그만 남김)
  await sendSlackBrandBrief(result.answers, BRIEF_FIELDS);

  return addRateLimitHeaders(NextResponse.json({ success: true }), rate);
}
