"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { MarketingCTA } from "@/components/common/marketing-cta";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { resolveThumbnailSrc } from "@/lib/thumbnail";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";
import {
  getBlogTitle,
  getBlogContent,
} from "@/lib/localized-content";
import type { BlogPost } from "@/lib/supabase";
import { BlogContent } from "./blog-content";


interface BlogPostViewProps {
  blogPost: BlogPost;
  thumbnailSrc: string;
}

export function BlogPostView({ blogPost, thumbnailSrc }: BlogPostViewProps) {
  const { locale } = useLocale();
  const t = (key: Parameters<typeof getTranslation>[1]) =>
    getTranslation(locale, key);
  const displayTitle = getBlogTitle(blogPost, locale);

  // Force scroll to top on mount (detail page fix for mobile bottom-start bug)
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  const contentToShow = getBlogContent(blogPost, locale);
  const hasContent =
    contentToShow &&
    ((typeof contentToShow === "string" && contentToShow.trim().length > 0) ||
      (Array.isArray(contentToShow) && contentToShow.length > 0));

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
        <ReadingProgress />
        <article className="pt-32 sm:pt-40 pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 relative z-10">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8 sm:mb-12">
              {/* Section tag */}
              <span className="text-xs uppercase tracking-[0.2em] text-white/60">BLOG</span>
              <div className="w-12 h-0.5 bg-[#FF4500] mt-3 mb-8" />

              <Link href="/blog">
                <Button
                  variant="ghost"
                  className="mb-4 sm:mb-6 min-h-[44px] break-keep text-white hover:bg-card hover:text-[#FF4500] border-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("backToList")}
                </Button>
              </Link>
              <div className="space-y-4 sm:space-y-6 flex flex-col items-center">
                <div className="w-full max-w-none lg:max-w-4xl mx-auto">
                  <div className="aspect-video rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] relative bg-card w-full flex items-center justify-center">
                    {blogPost.thumbnail_url ? (
                      <SafeImage
                        src={thumbnailSrc}
                        alt={`${displayTitle} - ${blogPost.category}`}
                        fill
                        sizes="(max-width: 1023px) 100vw, 896px"
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-card">
                        <div className="text-center px-4">
                          <span className="text-4xl font-bold text-white/20 tracking-widest">BLOG</span>
                          <p className="text-sm text-white/60 mt-2">
                            {t("performanceNoImage")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap break-keep">
                    <Badge
                      variant="secondary"
                      className="text-xs break-keep bg-card text-white/80 border-[var(--border)] rounded-full"
                    >
                      {blogPost.category}
                    </Badge>
                    <time
                      className="text-xs sm:text-sm text-white/60 flex items-center gap-1 break-keep"
                      dateTime={blogPost.created_at}
                    >
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      {new Date(blogPost.created_at).toLocaleDateString(
                        locale === "ja" ? "ja-JP" : "ko-KR",
                      )}
                    </time>
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight break-keep text-white">
                    {displayTitle}
                  </h1>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/60 flex-wrap break-keep">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="font-semibold text-white/80">조인혁</span>
                    <span className="text-white/40">|</span>
                    <span>BD 팀장, KOREANERS</span>
                    <span className="hidden sm:inline text-white/40">|</span>
                    <span className="basis-full sm:basis-auto">일본 인플루언서 마케팅, 크로스보더 마케팅, K-뷰티 일본 진출</span>
                  </div>
                </div>
              </div>
            </header>
            <div className="mt-10 sm:mt-12 xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10 xl:items-start">
              <div
                className="border border-black/5 bg-[#FAF7F2] px-6 md:px-12 lg:px-16 py-8 md:py-10 lg:py-12 rounded-2xl blog-content-wrapper blog-reading-cream shadow-sm"
              >
                <div className="prose prose-lg max-w-[65ch] mx-auto break-keep text-[#1C1917] leading-relaxed text-base lg:text-lg blog-content-prose">
                  {hasContent ? (
                    <BlogContent blogPost={blogPost} content={contentToShow} />
                  ) : (
                    <p className="text-[#78716C]">{t("blogNoContent")}</p>
                  )}
                </div>
              </div>
              <TableOfContents />
            </div>
            {locale !== "ja" && (
              <p className="mt-8 text-center text-sm sm:text-base text-white/70 break-keep">
                대행사를 고르고 있다면{" "}
                <Link href="/japan-influencer-marketing" className="text-white underline underline-offset-4">
                  일본 인플루언서 마케팅 대행사 비교와 비용
                </Link>
                을 먼저 확인하세요.
              </p>
            )}
            <MarketingCTA />
          </div>
        </article>
      </main>
  );
}
