import type { MetadataRoute } from "next";

// NOTE: Vercel 프로덕션에서는 이 파일이 public/robots.txt 보다 우선 서빙됨.
// AI 크롤러 정책은 반드시 이 파일에 유지 (정적 public/robots.txt 는 2026-09-08 삭제).

// /api/og 는 블로그 og:image·JSON-LD 이미지라 허용 (더 긴 규칙이 /api/ 차단보다 우선)
const SHARED_ALLOW = ["/", "/api/og"];
const SHARED_DISALLOW = ["/admin/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      // AI search crawlers — explicit allow for GEO visibility
      { userAgent: "GPTBot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "OAI-SearchBot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "ChatGPT-User", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "ClaudeBot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "Claude-Web", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "PerplexityBot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "Google-Extended", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "Applebot-Extended", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      // Training-only crawlers — block (uncompensated scraping)
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
    ],
    sitemap: "https://www.koreaners.co/sitemap.xml",
  };
}

// llms.txt는 /llms.txt route로 별도 제공
