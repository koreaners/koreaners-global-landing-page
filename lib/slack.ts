// Slack Incoming Webhook 유틸리티
// fire-and-forget 패턴: 실패해도 사용자 경험에 영향 없음

interface InquiryData {
  name: string;
  company?: string;
  position?: string;
  email: string;
  phone?: string;
  message: string;
  notionPageId?: string;
}

interface CreatorApplicationData {
  name: string;
  email: string;
  phone?: string;
  instagram_url: string;
  youtube_url?: string;
  tiktok_url?: string;
  x_url?: string;
  message?: string;
  track_type: "exclusive" | "partner" | "tripbridge";
  locale: "ko" | "ja";
}

async function sendSlackWebhook(
  webhookUrl: string,
  blocks: Record<string, unknown>[],
  context: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch (error) {
    console.error(`[Slack] ${context} fetch error:`, error);
    return;
  }

  // Slack incoming webhook은 정상 게시 시 HTTP 200 + body "ok"를 반환.
  // 4/22 19:03 사고처럼 channel disconnect 후에도 200을 받지만 body가 "ok"가 아닌 케이스
  // (예: "no_service") → res.ok만 보면 silent fail. body까지 검증해야 진짜 게시 여부 판정 가능.
  const body = await res.text().catch(() => "");
  if (!res.ok || body.trim() !== "ok") {
    console.error(
      `[Slack] ${context} webhook failed: status=${res.status} body=${JSON.stringify(body.slice(0, 200))}`,
    );
  }
}

export async function sendSlackInquiry(data: InquiryData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_INQUIRIES;
  if (!webhookUrl) {
    console.error("[Slack] SLACK_WEBHOOK_INQUIRIES env not set — inquiry alert dropped");
    return;
  }

  const fields = [
    `*이름:* ${data.name}`,
    `*이메일:* ${data.email}`,
    data.company ? `*회사:* ${data.company}` : null,
    data.position ? `*직급:* ${data.position}` : null,
    data.phone ? `*전화:* ${data.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const notionUrl = data.notionPageId
    ? `https://www.notion.so/${data.notionPageId.replace(/-/g, "")}`
    : null;

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📩 새 문의가 접수되었습니다",
        emoji: true,
      },
    },
    { type: "section", text: { type: "mrkdwn", text: fields } },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*💬 문의 내용*\n${data.message}` },
    },
  ];

  if (notionUrl) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `📋 <${notionUrl}|Notion에서 확인>` },
    });
  }

  await sendSlackWebhook(webhookUrl, blocks, "inquiry");
}

// 사용자 입력을 mrkdwn 에 넣을 때 <!channel>·링크 위장을 막는다.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendSlackBrandBrief(
  answers: Record<string, string | string[]>,
  fields: { key: string; label: string }[],
): Promise<void> {
  // 문의 웹훅(SLACK_WEBHOOK_INQUIRIES)은 구 Slack 앱 제거로 죽어 있다(404 no_service).
  // #문의-인바운드-웹 에 글을 올리는 Assistant Bot 토큰으로 직접 게시한다 (inquiry-responder 람다와 같은 명의·채널).
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("[Slack] SLACK_BOT_TOKEN env not set — brand brief alert dropped");
    return;
  }

  const val = (k: string) => {
    const v = answers[k];
    const s = Array.isArray(v) ? v.join(", ") : (v ?? "");
    return esc(s.slice(0, 1500));
  };
  const answered = fields.filter((f) => val(f.key));
  const summaryKeys = [
    "contact_name", "contact_title", "email", "target_countries", "budget_range",
    "campaign_goal", "desired_schedule", "products", "selling_points", "decision_maker",
  ];
  const line = (k: string, label: string) => (val(k) ? `*${label}*\n${val(k)}` : null);

  const summary = [
    `*담당자*\n${val("contact_name")} (${val("contact_title")})`,
    line("email", "이메일"),
    line("target_countries", "타겟 국가"),
    line("budget_range", "예산"),
    line("campaign_goal", "목표"),
    line("desired_schedule", "희망 일정"),
  ].filter((x): x is string => !!x);

  const brand = String(answers.brand_name ?? "").slice(0, 100);
  // 채널의 다른 알림(람다 slack_notifier.py)과 같은 형식: 색 막대 attachment 안에 mrkdwn 제목
  const blocks: Record<string, unknown>[] = [
    { type: "section", text: { type: "mrkdwn", text: `📋 *사전 인터뷰 도착* — ${esc(brand)}` } },
    { type: "section", fields: summary.map((text) => ({ type: "mrkdwn", text })) },
    // section text 상한 3000자 — 항목당 1500자로 자르고 블록을 나눈다
    ...[line("products", "제품"), line("selling_points", "핵심 셀링포인트")]
      .filter((x): x is string => !!x)
      .map((text) => ({ type: "section", text: { type: "mrkdwn", text } })),
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `작성 ${answered.length} / ${fields.length}개 항목 · 최종 의사결정: ${val("decision_maker")}` }],
    },
  ];

  const rest = answered.filter((f) => !summaryKeys.includes(f.key) && f.key !== "brand_name");
  if (rest.length) {
    blocks.push({ type: "divider" });
    for (const f of rest) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: `*${f.label}*\n${val(f.key)}` } });
    }
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        channel: process.env.SLACK_WEB_INBOX_CHANNEL_ID ?? "C0AHMSK2UA0",
        attachments: [{ color: "#2196F3", fallback: `사전 인터뷰 도착 — ${brand}`, blocks }],
      }),
    });
    // chat.postMessage 는 실패해도 HTTP 200 — body 의 ok 로 판정
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!body.ok) console.error(`[Slack] brand-brief post failed: status=${res.status} error=${body.error}`);
  } catch (error) {
    console.error("[Slack] brand-brief fetch error:", error);
  }
}

export async function sendSlackCreatorApplication(
  data: CreatorApplicationData,
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_CREATORS;
  if (!webhookUrl) {
    console.error("[Slack] SLACK_WEBHOOK_CREATORS env not set — creator application alert dropped");
    return;
  }

  const localeEmoji = data.locale === "ko" ? "🇰🇷" : "🇯🇵";
  const trackLabel =
    data.track_type === "exclusive"
      ? "Exclusive"
      : data.track_type === "tripbridge"
        ? "TRIP BRIDGE"
        : "Partner";

  const info = [
    `*이름:* ${data.name}`,
    `*이메일:* ${data.email}`,
    `*트랙:* ${trackLabel}`,
    `*로케일:* ${localeEmoji} ${data.locale.toUpperCase()}`,
    data.phone ? `*전화:* ${data.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const socials = [
    `• <${data.instagram_url}|Instagram>`,
    data.youtube_url ? `• <${data.youtube_url}|YouTube>` : null,
    data.tiktok_url ? `• <${data.tiktok_url}|TikTok>` : null,
    data.x_url ? `• <${data.x_url}|X>` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🎨 새 크리에이터 신청이 접수되었습니다",
        emoji: true,
      },
    },
    { type: "section", text: { type: "mrkdwn", text: info } },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*📱 소셜 미디어*\n${socials}` },
    },
  ];

  if (data.message) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*💬 자기소개*\n${data.message}` },
    });
  }

  await sendSlackWebhook(webhookUrl, blocks, "creator-application");
}
