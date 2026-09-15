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
