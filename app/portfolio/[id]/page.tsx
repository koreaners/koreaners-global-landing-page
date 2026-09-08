export const revalidate = 3600; // 1시간 ISR

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/static";
import type { Portfolio } from "@/lib/supabase";
import Navigation from "@/components/navigation";
import { safeJsonLdStringify } from "@/lib/json-ld";
import { resolveThumbnailSrc, toAbsoluteUrl } from "@/lib/thumbnail";
import { PortfolioDetailView } from "@/components/portfolio/portfolio-detail-view";

// summary(Notion '요약')가 비어 있을 때 본문 첫 문단으로 description 생성
function firstParagraph(html: string | null, max = 200): string | null {
  if (!html) return null;
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const text = (m ? m[1] : html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function portfolioDescription(p: Portfolio): string {
  const clientName = p.client_name?.trim();
  return (
    p.summary?.trim() ||
    firstParagraph(p.content) ||
    (clientName ? `${p.title.trim()} - ${clientName}` : p.title.trim())
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("portfolios")
    .select("id");
  return (data || []).map((p) => ({ id: p.id }));
}

async function getPortfolio(id: string): Promise<Portfolio | null> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[Portfolio Detail] 에러:", error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("[Portfolio Detail] 에러:", err?.message);
    return null;
  }
}

async function getOtherPortfolios(
  excludeId: string,
  category?: string[] | null,
): Promise<Portfolio[]> {
  try {
    const supabase = createStaticClient();

    // 1) 같은 category 관련 사례 우선
    const related: Portfolio[] = [];
    if (Array.isArray(category) && category.length > 0) {
      const { data } = await supabase
        .from("portfolios")
        .select("*")
        .neq("id", excludeId)
        .overlaps("category", category)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) related.push(...data);
    }

    // 2) 3장 미만이면 최신 사례로 보강 (중복 제외)
    if (related.length < 3) {
      const seen = new Set([excludeId, ...related.map((p) => p.id)]);
      const { data } = await supabase
        .from("portfolios")
        .select("*")
        .neq("id", excludeId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(6);
      for (const p of data || []) {
        if (related.length >= 3) break;
        if (!seen.has(p.id)) {
          related.push(p);
          seen.add(p.id);
        }
      }
    }

    return related.slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const portfolio = await getPortfolio(id);

  if (!portfolio) {
    return {
      title: "포트폴리오를 찾을 수 없습니다",
      description: "요청하신 포트폴리오를 찾을 수 없습니다.",
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.koreaners.co";
  const ogImage = portfolio.thumbnail_url
    ? toAbsoluteUrl(siteUrl, resolveThumbnailSrc(portfolio.thumbnail_url))
    : `${siteUrl}/images/logo.png`;

  const description = portfolioDescription(portfolio);

  return {
    title: portfolio.title,
    description,
    openGraph: {
      title: portfolio.title,
      description,
      type: "article",
      publishedTime: portfolio.published_at ?? portfolio.created_at,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: portfolio.title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${siteUrl}/portfolio/${id}`,
    },
  };
}

export default async function PortfolioDetailPage({ params }: PageProps) {
  const { id } = await params;
  const portfolio = await getPortfolio(id);

  if (!portfolio) {
    notFound();
  }

  const otherPortfolios = await getOtherPortfolios(id, portfolio.category);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.koreaners.co";

  // JSON-LD: Article + BreadcrumbList
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${siteUrl}/portfolio/${id}`,
      name: portfolio.title,
      headline: portfolio.title.trim(),
      description: portfolioDescription(portfolio),
      image: portfolio.thumbnail_url || undefined,
      datePublished: portfolio.published_at ?? portfolio.created_at,
      author: { "@id": "https://www.koreaners.co/#organization" },
      publisher: { "@id": "https://www.koreaners.co/#organization" },
      ...(portfolio.client_name?.trim()
        ? { about: { "@type": "Brand", name: portfolio.client_name.trim() } }
        : {}),
      ...(Array.isArray(portfolio.category) && portfolio.category.length
        ? { keywords: portfolio.category.join(", "), genre: portfolio.category }
        : {}),
      inLanguage: "ko",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${siteUrl}/portfolio/${id}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Portfolio",
          item: `${siteUrl}/portfolio`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: portfolio.title,
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      <Navigation />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <PortfolioDetailView
        portfolio={portfolio}
        otherPortfolios={otherPortfolios}
      />
    </main>
  );
}
