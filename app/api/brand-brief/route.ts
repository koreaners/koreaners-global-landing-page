import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { checkRateLimit, getClientIp, addRateLimitHeaders } from "@/lib/rate-limit";
import { createStaticClient } from "@/lib/supabase/static";
import { sendSlackBrandBrief } from "@/lib/slack";
import { BRIEF_FIELDS, BRIEF_STEPS, type BriefAnswers } from "@/lib/brand-brief";

// 브랜드 사전 정보 시트 (/brand-brief) 제출 → Supabase brand_briefs + Notion 열람용 사본 + Slack 알림.
// anon 키 + 공개 insert 정책 (inquiries 와 동일). preview·production 모두 같은 env 로 동작.
// (NOTION_TOKEN 은 production 전용이라 preview 에서는 Notion 사본만 생략된다)

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

// Notion 「브랜드 사전 인터뷰」 DB 에 열람용 사본을 만든다. 원본은 Supabase — 실패해도 제출은 성공.
// 요약 항목은 속성으로, 전체 답변은 본문에 섹션별로. 「리드」 관계 칸은 비워 둔다(수동 연결).
// 성공 시 page id, 생략·실패 시 null.
async function saveToNotion(answers: BriefAnswers): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_BRAND_BRIEF_DB_ID;
  if (!token || !databaseId) {
    console.error("[BrandBrief API] NOTION_TOKEN 또는 NOTION_BRAND_BRIEF_DB_ID 미설정 — Notion 사본 생략");
    return null;
  }
  const text = (k: string) => {
    const v = answers[k];
    return Array.isArray(v) ? v.join(", ") : (v ?? "");
  };
  // rich_text 항목당 2000자 상한
  const rich = (s: string) => (s.match(/[\s\S]{1,2000}/g) ?? []).map((content) => ({ text: { content } }));
  // select 옵션 이름에는 쉼표를 쓸 수 없다 (예: "500만원~1,000만원")
  const option = (s: string) => ({ name: s.replace(/,/g, "").slice(0, 100) });
  const list = (k: string) => (Array.isArray(answers[k]) ? (answers[k] as string[]) : []);

  const properties: Record<string, unknown> = {
    브랜드명: { title: rich(text("brand_name").slice(0, 200)) },
    담당자: { rich_text: rich(text("contact_name")) },
    "직함/부서": { rich_text: rich(text("contact_title")) },
    이메일: { email: text("email") },
    의사결정자: { rich_text: rich(text("decision_maker")) },
    "희망 일정": { rich_text: rich(text("desired_schedule")) },
  };
  if (list("target_countries").length) properties["타겟 국가"] = { multi_select: list("target_countries").map(option) };
  if (text("budget_range")) properties["예산"] = { select: option(text("budget_range")) };
  if (text("campaign_goal")) properties["목표"] = { select: option(text("campaign_goal")) };

  const children: Record<string, unknown>[] = [];
  for (const group of BRIEF_STEPS.flatMap((s) => s.groups)) {
    const answered = group.fields.filter((f) => text(f.key));
    if (!answered.length) continue;
    if (group.title) children.push({ heading_3: { rich_text: rich(group.title) } });
    for (const f of answered) {
      children.push({
        paragraph: { rich_text: [{ text: { content: `${f.label}\n` }, annotations: { bold: true } }, ...rich(text(f.key))] },
      });
    }
  }

  try {
    const page = await new Client({ auth: token }).pages.create({
      parent: { database_id: databaseId },
      properties,
      children,
    } as Parameters<Client["pages"]["create"]>[0]);
    return page.id;
  } catch (error) {
    console.error("[BrandBrief API] Notion 사본 생성 실패:", error instanceof Error ? error.message : error);
    return null;
  }
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

  // 저장이 끝난 뒤 Notion 사본 → 알림(카드에 Notion 링크). 둘 다 실패해도 응답은 성공 (로그만 남김)
  const notionPageId = await saveToNotion(result.answers);
  await sendSlackBrandBrief(result.answers, BRIEF_FIELDS, notionPageId);

  return addRateLimitHeaders(NextResponse.json({ success: true }), rate);
}
