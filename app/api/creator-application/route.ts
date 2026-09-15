import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import {
  checkRateLimit,
  getClientIp,
  addRateLimitHeaders,
} from "@/lib/rate-limit";
import { sendSlackCreatorApplication } from "@/lib/slack";
import { sendCAPIEvent } from "@/lib/meta-capi";

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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  } as const;
};

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const MAX_LEN = {
  name: 200,
  email: 254,
  phone: 30,
  url: 500,
  message: 5000,
} as const;

const clamp = (s: string, max: number) => s.slice(0, max);
const trim = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const has = (v: unknown) => trim(v).length > 0;

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

  // Rate Limiting (분당 5회)
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, {
    windowMs: 60 * 1000,
    maxRequests: 5,
  });

  if (!rateLimitResult.success) {
    return addRateLimitHeaders(
      withCors(
        NextResponse.json(
          { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 },
        ),
      ),
      rateLimitResult,
    );
  }

  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_CREATOR_DB_ID) {
      console.error(
        "[Creator API] NOTION_TOKEN 또는 NOTION_CREATOR_DB_ID 미설정",
      );
      return withCors(
        NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 }),
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      instagram_url,
      youtube_url,
      tiktok_url,
      x_url,
      message,
      track_type,
      locale,
      residence,
      visit_period,
      follower_range,
      categories,
      utm_source,
      utm_campaign,
      utm_content,
    } = body;

    // 필수 필드 검증
    if (!has(name)) {
      return withCors(
        NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 }),
      );
    }
    if (!has(email)) {
      return withCors(
        NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 }),
      );
    }
    if (!has(instagram_url)) {
      return withCors(
        NextResponse.json(
          { error: "Instagram URL을 입력해주세요." },
          { status: 400 },
        ),
      );
    }

    const safeName = clamp(trim(name), MAX_LEN.name);
    const safeEmail = clamp(trim(email), MAX_LEN.email);
    const safePhone = has(phone) ? clamp(trim(phone), MAX_LEN.phone) : null;
    const safeInstagram = clamp(trim(instagram_url), MAX_LEN.url);
    const safeYoutube = has(youtube_url)
      ? clamp(trim(youtube_url), MAX_LEN.url)
      : null;
    const safeTiktok = has(tiktok_url)
      ? clamp(trim(tiktok_url), MAX_LEN.url)
      : null;
    const safeX = has(x_url) ? clamp(trim(x_url), MAX_LEN.url) : null;
    const safeTrackType =
      track_type === "tripbridge"
        ? "tripbridge"
        : track_type === "partner"
          ? "partner"
          : "exclusive";
    const safeLocale = locale === "ja" ? "ja" : "ko";

    // tripbridge 전용 필드는 Notion 속성을 늘리지 않고 Message 한 줄로 접어 넣는다.
    const tripbridgeLine =
      safeTrackType === "tripbridge"
        ? [
            "[tripbridge]",
            `residence=${trim(residence) || "-"}`,
            `visit=${trim(visit_period) || "-"}`,
            `followers=${trim(follower_range) || "-"}`,
            `categories=${
              (Array.isArray(categories) ? categories.map(trim).filter(Boolean) : [])
                .join(",") || "-"
            }`,
            `utm=${trim(utm_source) || "-"}/${trim(utm_campaign) || "-"}/${trim(utm_content) || "-"}`,
          ].join(" ")
        : null;

    const rawMessage = has(message)
      ? clamp(trim(message), MAX_LEN.message)
      : null;
    const safeMessage =
      clamp(
        [tripbridgeLine, rawMessage].filter(Boolean).join("\n"),
        MAX_LEN.message,
      ) || null;

    const properties: Record<string, any> = {
      Name: { title: [{ text: { content: safeName } }] },
      Email: { email: safeEmail },
      Instagram: { url: safeInstagram },
      "Track Type": { select: { name: safeTrackType } },
      Locale: { select: { name: safeLocale } },
    };

    if (safePhone) properties["Phone"] = { phone_number: safePhone };
    if (safeYoutube) properties["YouTube"] = { url: safeYoutube };
    if (safeTiktok) properties["TikTok"] = { url: safeTiktok };
    if (safeX) properties["X"] = { url: safeX };
    if (safeMessage)
      properties["Message"] = {
        rich_text: [{ text: { content: safeMessage } }],
      };

    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_CREATOR_DB_ID.trim() },
      properties,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[Creator API] Notion 저장 성공, pageId:", response.id);
    }

    // Slack 알림 (응답 전 완료 보장)
    await sendSlackCreatorApplication({
      name: safeName,
      email: safeEmail,
      phone: safePhone || undefined,
      instagram_url: safeInstagram,
      youtube_url: safeYoutube || undefined,
      tiktok_url: safeTiktok || undefined,
      x_url: safeX || undefined,
      message: safeMessage || undefined,
      track_type: safeTrackType,
      locale: safeLocale,
    });

    // Meta CAPI: CompleteRegistration 이벤트 서버사이드 전송 (non-blocking)
    sendCAPIEvent({
      eventName: safeTrackType === "tripbridge" ? "Lead" : "CompleteRegistration",
      email: safeEmail,
      phone: safePhone || undefined,
      sourceUrl: request.headers.get("referer") || "https://koreaners.co/creator",
      clientIp: clientIp,
      userAgent: request.headers.get("user-agent") || undefined,
      fbc: request.cookies.get("_fbc")?.value,
      fbp: request.cookies.get("_fbp")?.value,
    }).catch(() => {});

    return addRateLimitHeaders(
      withCors(
        NextResponse.json(
          { success: true, pageId: response.id },
          { status: 200 },
        ),
      ),
      rateLimitResult,
    );
  } catch (error: any) {
    console.error("[Creator API] Notion 저장 실패:", {
      code: error?.code,
      message: error?.message,
      body: error?.body,
    });

    const isProduction = process.env.NODE_ENV === "production";

    if (error.code === "object_not_found") {
      return withCors(
        NextResponse.json(
          {
            error: isProduction
              ? "요청하신 리소스를 찾을 수 없습니다."
              : "Notion 데이터베이스를 찾을 수 없습니다. DB ID 또는 인테그레이션 연결을 확인해주세요.",
            ...(isProduction ? {} : { details: error.message }),
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
            ...(isProduction ? {} : { details: error.message }),
          },
          { status: 401 },
        ),
      );
    }

    if (error.code === "validation_error") {
      return withCors(
        NextResponse.json(
          {
            error: isProduction
              ? "입력 데이터 검증에 실패했습니다."
              : "Notion 속성 검증에 실패했습니다.",
            ...(isProduction
              ? {}
              : { details: error.message, body: error?.body }),
          },
          { status: 400 },
        ),
      );
    }

    return withCors(
      NextResponse.json(
        {
          error: isProduction ? "서버 오류가 발생했습니다." : error.message,
          ...(isProduction ? {} : { code: error.code, body: error?.body }),
        },
        { status: 500 },
      ),
    );
  }
}
