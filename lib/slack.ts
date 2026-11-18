// Slack Incoming Webhook 유틸리티
// fire-and-forget 패턴: 실패해도 사용자 경험에 영향 없음

// 사용자 입력을 mrkdwn 에 넣을 때 <!channel>·링크 위장을 막는다.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendSlackBrandBrief(
  answers: Record<string, string | string[]>,
  fields: { key: string; label: string }[],
  notionPageId?: string | null,
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

  // 문의 알림과 같은 구조: 마지막 줄에 Notion 페이지 링크
  if (notionPageId) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `📋 <https://www.notion.so/${notionPageId.replace(/-/g, "")}|Notion에서 확인>` },
    });
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

