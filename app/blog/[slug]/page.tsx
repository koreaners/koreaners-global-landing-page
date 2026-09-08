export const revalidate = 3600; // 1시간 ISR

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/static";
import type { BlogPost } from "@/lib/supabase";
import Navigation from "@/components/navigation";
import { BlogPostView } from "@/components/blog/blog-post-view";
import { resolveThumbnailSrc, toAbsoluteUrl } from "@/lib/thumbnail";
import { safeJsonLdStringify } from "@/lib/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("published", true);
  return (data || []).map((post) => ({ slug: post.slug }));
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = createStaticClient();

    const { data, error: supabaseError } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (supabaseError) {
      console.error(
        "[Blog Detail] 에러: " + (supabaseError.message || "알 수 없는 에러"),
      );
      return null;
    }

    if (!data || !data.published) {
      return null;
    }

    return data;
  } catch (err: any) {
    console.error("[Blog Detail] 에러: " + (err?.message || "알 수 없는 에러"));
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const blogPost = await getBlogPost(slug);

  if (!blogPost) {
    return {
      title: "블로그 포스트를 찾을 수 없습니다",
      description: "요청하신 블로그 포스트를 찾을 수 없습니다.",
    };
  }

  const metaTitle = blogPost.meta_title || blogPost.title;
  const metaDescription =
    blogPost.meta_description ||
    `${blogPost.title} - ${blogPost.category}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.koreaners.co";
  const ogImage = `${siteUrl}/api/og?title=${encodeURIComponent(blogPost.title)}&category=${encodeURIComponent(blogPost.category || "")}`;

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "article",
      publishedTime: blogPost.created_at,
      modifiedTime: blogPost.updated_at,
      authors: ["KOREANERS"],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: blogPost.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const blogPost = await getBlogPost(slug);

  if (!blogPost) {
    notFound();
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.koreaners.co";

  // 카테고리에 따라 스키마 타입 결정
  const isNews =
    blogPost.category === "마케팅 뉴스" || blogPost.category === "업계 동향";
  const schemaType = isNews ? "NewsArticle" : "BlogPosting";
  const thumbnailSrc = resolveThumbnailSrc(blogPost.thumbnail_url);
  const thumbnailAbsolute = toAbsoluteUrl(siteUrl, thumbnailSrc);
  const ogCardUrl = `${siteUrl}/api/og?title=${encodeURIComponent(blogPost.title)}&category=${encodeURIComponent(blogPost.category || "")}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaType,
    headline: blogPost.meta_title || blogPost.title,
    description:
      blogPost.meta_description || blogPost.title,
    image: [ogCardUrl, thumbnailAbsolute],
    datePublished: blogPost.created_at,
    dateModified: blogPost.updated_at,
    author: {
      "@type": "Person",
      "@id": `${siteUrl}/about#leo`,
      name: "조인혁",
      jobTitle: "BD 팀장",
      worksFor: { "@id": "https://www.koreaners.co/#organization" },
      url: "https://www.koreaners.co/about",
      knowsAbout: [
        "일본 인플루언서 마케팅",
        "크로스보더 마케팅",
        "K-뷰티 일본 진출",
        "Qoo10, 라쿠텐 이커머스 전략",
      ],
    },
    publisher: {
      "@id": "https://www.koreaners.co/#organization",
    },
    inLanguage: "ko",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${slug}`,
    },
    articleSection: blogPost.category,
    keywords: [
      blogPost.category,
      '일본 인플루언서 마케팅',
      '크로스보더 마케팅',
      '코리너스',
      ...(blogPost.title.includes('비용') ? ['일본 인플루언서 비용', '마케팅 비용 가이드'] : []),
      ...(blogPost.title.includes('시딩') ? ['일본 시딩', '일본 체험단'] : []),
      ...(blogPost.title.includes('뷰티') || blogPost.title.includes('Beauty') ? ['K-뷰티 일본', 'K-Beauty'] : []),
    ].join(', '),
  };

  // BreadcrumbList Schema (Home → Blog → Post)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blogPost.title,
        item: `${siteUrl}/blog/${slug}`,
      },
    ],
  };

  // FAQ Schema (faqs가 있을 때만)
  const faqJsonLd =
    blogPost.faqs && Array.isArray(blogPost.faqs) && blogPost.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: blogPost.faqs
            .filter((f: any) => f.question?.trim() && f.answer?.trim())
            .map((faq: any) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdStringify(faqJsonLd),
          }}
        />
      )}
      <Navigation />
      <BlogPostView blogPost={blogPost} thumbnailSrc={thumbnailSrc} />
    </>
  );
}
