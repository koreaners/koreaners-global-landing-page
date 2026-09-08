import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { verifyCsrfToken } from "@/lib/csrf";
import {
  checkRateLimit,
  getClientIp,
  addRateLimitHeaders,
} from "@/lib/rate-limit";
import { sendSlackInquiry } from "@/lib/slack";
import { sendCAPIEvent } from "@/lib/meta-capi";

// 허용 Origin (도메인 변경 시 여기 추가)
const ALLOWED_ORIGINS = [
  "https://koreaners.co",
  "https://www.koreaners.co",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const getCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (origin.startsWith("https://") && origin.endsWith(".vercel.app"));
  const allowOrigin = allowed
    ? origin
    : (ALLOWED_ORIGINS[0] ?? "https://koreaners.co");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Access-Control-Max-Age": "86400",
  } as const;
};

/**
 * utm_source + referrer 로 Notion 「유입채널」 select 값을 추론.
 * 순서 중요 — chatgpt 를 google 보다 먼저 봐야 referrer "chatgpt.com" 이 구글로 새지 않음.
 */
export function inferChannel(utmSource: unknown, referrer: unknown): string {
  const ref = typeof referrer === "string" ? referrer.trim() : "";
  const hay = `${typeof utmSource === "string" ? utmSource : ""} ${ref}`.toLowerCase();
  const hit = (...needles: string[]) => needles.some((n) => hay.includes(n));

  if (hit("chatgpt")) return "ChatGPT";
  if (hit("perplexity", "gemini", "claude")) return "기타 AI";
  if (hit("instagram")) return "인스타그램";
  if (hit("threads")) return "Threads";
  if (hit("facebook", "fb.com", "meta")) return "페이스북";
  if (hit("naver")) return "네이버";
  if (hit("google")) return "구글";
  if (hit("exportvoucher")) return "수출바우처";
  return ref ? "리퍼럴" : "다이렉트/미상";
}

// Notion 클라이언트 초기화
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

/**
 * Notion 데이터베이스에 문의 데이터를 저장하는 API 엔드포인트
 *
 * 환경 변수 설정 필요:
 * - NOTION_TOKEN: Notion Integration Token
 * - NOTION_DATABASE_ID: Notion Database ID
 *
 * Notion Database 속성 예시:
 * - Name (title): 이름
 * - Company (rich_text): 회사명
 * - Position (rich_text): 직급
 * - Email (email): 이메일
 * - Phone (rich_text): 전화번호 (텍스트 유형)
 * - Message (rich_text): 문의내용
 * - Privacy Agreement (checkbox): 개인정보 동의
 * - Marketing Agreement (checkbox): 마케팅 동의
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const withCors = (res: NextResponse) => {
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };

  // Rate Limiting 체크 (분당 5회 제한)
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, {
    windowMs: 60 * 1000, // 1분
    maxRequests: 5, // 분당 5회
  });

  if (!rateLimitResult.success) {
    const response = withCors(
      NextResponse.json(
        {
          error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        { status: 429 },
      ),
    );
    return addRateLimitHeaders(response, rateLimitResult);
  }

  // CSRF 토큰 검증 (프로덕션 환경에서만)
  if (process.env.NODE_ENV === "production") {
    const isValidCsrf = await verifyCsrfToken(request);
    if (!isValidCsrf) {
      const response = withCors(
        NextResponse.json(
          { error: "CSRF 검증 실패. 페이지를 새로고침 후 다시 시도해주세요." },
          { status: 403 },
        ),
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }
  }

  // properties 변수를 함수 스코프 상단에 선언하여 catch 블록에서도 접근 가능하도록 함
  let properties: Record<string, any> | null = null;

  const MAX_LEN = {
    name: 200,
    email: 254,
    phone: 30,
    message: 5000,
    company: 200,
    position: 100,
  } as const;
  const clamp = (s: string, max: number) => s.slice(0, max);

  try {
    if (!process.env.NOTION_TOKEN) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Notion API] NOTION_TOKEN이 설정되지 않았습니다.");
      }
      return withCors(
        NextResponse.json(
          { error: "Notion 토큰이 설정되지 않았습니다." },
          { status: 500 },
        ),
      );
    }

    if (!process.env.NOTION_DATABASE_ID) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Notion API] NOTION_DATABASE_ID가 설정되지 않았습니다.");
      }
      return withCors(
        NextResponse.json(
          { error: "Notion 데이터베이스 ID가 설정되지 않았습니다." },
          { status: 500 },
        ),
      );
    }

    const body = await request.json();
    const {
      name,
      company,
      position,
      email,
      phone,
      message,
      privacy_agreement,
      marketing_agreement,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
      landing_page,
      discovery_source,
      eventId,
    } = body;

    // 필수 필드 검증
    if (!name || typeof name !== "string" || !name.trim()) {
      return withCors(
        NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 }),
      );
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return withCors(
        NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 }),
      );
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return withCors(
        NextResponse.json(
          { error: "문의내용을 입력해주세요." },
          { status: 400 },
        ),
      );
    }

    const trim = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const has = (v: unknown) => trim(v).length > 0;

    // 길이 제한 적용 (DoS·과도한 payload 방지)
    const safeName = clamp(trim(name), MAX_LEN.name);
    const safeMessage = clamp(trim(message), MAX_LEN.message);
    const safeEmail = clamp(trim(email), MAX_LEN.email);
    const safeCompany = has(company)
      ? clamp(trim(company), MAX_LEN.company)
      : "";
    const safePosition = has(position)
      ? clamp(trim(position), MAX_LEN.position)
      : "";
    const safePhone = has(phone) ? clamp(trim(phone), MAX_LEN.phone) : "";

    properties = {
      Name: {
        title: [{ text: { content: safeName } }],
      },
      Message: {
        rich_text: [{ text: { content: safeMessage } }],
      },
      "Privacy Agreement": {
        checkbox: Boolean(privacy_agreement),
      },
      "Marketing Agreement": {
        checkbox: Boolean(marketing_agreement),
      },
    };

    if (has(safeEmail)) {
      (properties as Record<string, unknown>)["Email"] = { email: safeEmail };
    }
    if (has(safeCompany)) {
      (properties as Record<string, unknown>)["Company"] = {
        rich_text: [{ text: { content: safeCompany } }],
      };
    }
    if (has(safePosition)) {
      (properties as Record<string, unknown>)["Position"] = {
        rich_text: [{ text: { content: safePosition } }],
      };
    }
    if (has(safePhone)) {
      (properties as Record<string, unknown>)["Phone"] = {
        rich_text: [{ text: { content: safePhone } }],
      };
    }

    // UTM + referrer 추적 필드 (옵셔널, 값 있을 때만 저장)
    const UTM_MAX = 500;
    const setRichText = (key: string, raw: unknown) => {
      if (!has(raw)) return;
      const value = clamp(trim(raw), UTM_MAX);
      (properties as Record<string, unknown>)[key] = {
        rich_text: [{ text: { content: value } }],
      };
    };
    setRichText("utm_source", utm_source);
    setRichText("utm_medium", utm_medium);
    setRichText("utm_campaign", utm_campaign);
    setRichText("utm_content", utm_content);
    setRichText("utm_term", utm_term);
    setRichText("referrer", referrer);
    setRichText("landing_page", landing_page);

    if (has(discovery_source)) {
      (properties as Record<string, unknown>)["알게 된 경로"] = {
        select: { name: clamp(trim(discovery_source), 50) },
      };
    }
    (properties as Record<string, unknown>)["유입채널"] = {
      select: { name: inferChannel(utm_source, referrer) },
    };

    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[Notion API] 문의 저장 성공, pageId:", response.id);
    }

    // Slack 알림 (응답 전 완료 보장)
    await sendSlackInquiry({
      name: safeName,
      email: safeEmail,
      company: safeCompany || undefined,
      position: safePosition || undefined,
      phone: safePhone || undefined,
      message: safeMessage,
      notionPageId: response.id,
    });

    // Meta CAPI: Lead 이벤트 서버사이드 전송 (non-blocking)
    sendCAPIEvent({
      eventName: "Lead",
      email: safeEmail,
      phone: safePhone || undefined,
      sourceUrl: request.headers.get("referer") || "https://koreaners.co",
      clientIp: clientIp,
      userAgent: request.headers.get("user-agent") || undefined,
      fbc: request.cookies.get("_fbc")?.value,
      fbp: request.cookies.get("_fbp")?.value,
      eventId: typeof eventId === "string" ? eventId : undefined,
    }).catch(() => {});

    const successResponse = withCors(
      NextResponse.json(
        { success: true, pageId: response.id },
        { status: 200 },
      ),
    );
    return addRateLimitHeaders(successResponse, rateLimitResult);
  } catch (error: any) {
    // Notion API 에러 상세 로깅 (원인 파악용)
    const notionErrorBody = error?.body ?? null;
    const notionErrorResponse = error?.response ?? null;
    console.error("[Notion API] Notion API Error Response:", {
      code: error?.code,
      message: error?.message,
      body: notionErrorBody,
      response: notionErrorResponse,
      status: notionErrorResponse?.status,
    });

    const isProduction = process.env.NODE_ENV === "production";

    if (error.code === "object_not_found") {
      return withCors(
        NextResponse.json(
          {
            error: isProduction
              ? "요청하신 리소스를 찾을 수 없습니다."
              : "Notion 데이터베이스를 찾을 수 없습니다. 데이터베이스 ID를 확인해주세요.",
            ...(isProduction
              ? {}
              : { details: error.message, _debug: { body: error?.body } }),
          },
          { status: 404 },
        ),
      );
    }

    if (error.code === "unauthorized") {
      return withCors(
        NextResponse.json(
          {
            error: isProduction
              ? "인증에 실패했습니다."
              : "Notion 인증에 실패했습니다. 토큰을 확인해주세요.",
            ...(isProduction
              ? {}
              : { details: error.message, _debug: { body: error?.body } }),
          },
          { status: 401 },
        ),
      );
    }

    if (error.code === "validation_error") {
      const path = error?.body?.path ?? "unknown";
      const bodyMessage = error?.body?.message ?? error?.message ?? "";
      console.error(
        "[Notion API] validation_error:",
        path,
        bodyMessage,
        "body:",
        error?.body,
      );
      return withCors(
        NextResponse.json(
          {
            error: isProduction
              ? "입력 데이터 검증에 실패했습니다."
              : "Notion 데이터베이스 속성 검증에 실패했습니다.",
            ...(isProduction
              ? {}
              : {
                  validationError: { path, message: bodyMessage },
                  body: error?.body ?? null,
                  sentPropertyKeys: properties ? Object.keys(properties) : null,
                }),
          },
          { status: 400 },
        ),
      );
    }

    return withCors(
      NextResponse.json(
        {
          error: isProduction
            ? "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            : error.message || "Notion 데이터 저장 중 오류가 발생했습니다.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                details: error.body ?? error.response ?? undefined,
              }),
        },
        { status: 500 },
      ),
    );
  }
}
