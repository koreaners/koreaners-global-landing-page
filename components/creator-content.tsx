"use client";

import { useEffect, useState, Suspense } from "react";
import Navigation from "@/components/navigation";
import {
  Users,
  Instagram,
  Youtube,
  Music,
  Award,
  Target,
  X,
  Plus,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Creator } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";
import { CreatorTrackSection } from "@/components/creator-track-section";
import { SectionTag } from "@/components/ui/section-tag";
import { NetworkStats } from "@/components/creator/network-stats";
import { ShaderBackdrop } from "@/components/ui/shader-backdrop";
import Image from "next/image";

const CREATORS_PER_PAGE = 8;

// 크리에이터 동의 전까지 카드 그리드 숨김 (2026-04-24). true 로 바꾸면 롤백.
const SHOW_CREATOR_CARDS = false;

// useSearchParams 는 정적 프리렌더 시 가장 가까운 Suspense 전체를 클라이언트 전용으로 만든다.
// 페이지 파라미터만 이 컴포넌트로 격리해 나머지 본문은 서버 렌더되게 한다.
function PageParamSync({ onChange }: { onChange: (page: number) => void }) {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  useEffect(() => {
    onChange(Number.isNaN(page) || page < 1 ? 1 : page);
  }, [page, onChange]);
  return null;
}

function CreatorContent() {
  const { locale } = useLocale();
  const t = (key: Parameters<typeof getTranslation>[1]) =>
    getTranslation(locale, key);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  const totalPages = Math.ceil(allCreators.length / CREATORS_PER_PAGE);
  const startIndex = (currentPage - 1) * CREATORS_PER_PAGE;
  const endIndex = startIndex + CREATORS_PER_PAGE;
  const creators = allCreators.slice(startIndex, endIndex);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    instagram_url: "",
    youtube_url: "",
    tiktok_url: "",
    x_url: "",
    message: "",
    track_type: "exclusive" as "exclusive" | "partner",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, []);

  async function fetchCreators() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("instagram_followers", { ascending: false });

      if (error) throw error;
      setAllCreators(data || []);
    } catch (error: any) {
      console.error("Error fetching creators:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: t("creatorToastSubmitFail"),
        description: t("creatorToastNameRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.email.trim()) {
      toast({
        title: t("creatorToastSubmitFail"),
        description: t("creatorToastEmailRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.instagram_url.trim()) {
      toast({
        title: t("creatorToastSubmitFail"),
        description: t("creatorToastInstagramRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
      const phoneValue = formData.phone.trim() ? cleanPhone : "";

      // Supabase creator_applications 테이블에 저장
      const insertData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: phoneValue || null,
        instagram_url: formData.instagram_url.trim(),
        youtube_url: formData.youtube_url?.trim() || null,
        tiktok_url: formData.tiktok_url?.trim() || null,
        x_url: formData.x_url?.trim() || null,
        message: formData.message.trim() || null,
        track_type: formData.track_type,
        locale: locale,
      };

      const { error: insertError } = await supabase
        .from("creator_applications")
        .insert([insertData]);

      if (insertError) {
        console.error("Error submitting creator application:", insertError);
        throw insertError;
      }

      // Meta Pixel CompleteRegistration 이벤트
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("track", "CompleteRegistration");
      }

      // Notion에도 비동기 저장 (실패해도 유저 경험 영향 없음)
      fetch("/api/creator-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          instagram_url: formData.instagram_url.trim(),
          youtube_url: formData.youtube_url?.trim() || null,
          tiktok_url: formData.tiktok_url?.trim() || null,
          x_url: formData.x_url?.trim() || null,
          message: formData.message.trim() || null,
          track_type: formData.track_type,
          locale,
        }),
      }).catch((err) => {
        console.error("[Creator] Notion 저장 실패 (무시):", err);
      });

      // 성공 처리
      setSuccessDialogOpen(true);

      // 폼 초기화
      setFormData({
        name: "",
        phone: "",
        email: "",
        instagram_url: "",
        youtube_url: "",
        tiktok_url: "",
        x_url: "",
        message: "",
        track_type: "exclusive",
      });
    } catch (error: any) {
      console.error("Error submitting creator application:", error);
      toast({
        title: t("creatorToastSubmitFail"),
        description: t("creatorToastSubmitFailDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectTrack = (trackType: "exclusive" | "partner") => {
    setFormData({ ...formData, track_type: trackType });
    setApplyModalOpen(true);
  };

  return (
    <>
      <Suspense fallback={null}>
        <PageParamSync onChange={setCurrentPage} />
      </Suspense>
      {/* ============================================================
          SECTION 1: Hero + Creator Cards (Dark bg-background)
          ============================================================ */}
      <section className="pt-32 sm:pt-40 pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 bg-background hero-glow">
        <ShaderBackdrop variant="hero-sub" seed={2} className="absolute!" />
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Hero - Left aligned */}
          <div className="mb-20 sm:mb-28">
            <SectionTag variant="dark">CREATOR</SectionTag>
            <div className="mb-8" />

            <h1 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6">
              <span>{t("creatorHero1")}</span>
              <br />
              <span className="gradient-warm-text">{t("creatorHero2")}</span>
            </h1>
            <p className="text-base md:text-lg text-[#A8A29E] max-w-3xl mb-10">
              {t("creatorHeroDesc")}
            </p>
            <Button
              onClick={() => {
                document
                  .getElementById("join-us")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group px-12 py-5 text-lg font-bold uppercase tracking-wider gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
            >
              {locale === "ja" ? "合流する" : "합류하기"}
              <ArrowDown className="ml-3 w-6 h-6 animate-bounce-slow" />
            </Button>
          </div>

          {/* 동의 전: 익명 네트워크 통계 그리드로 대체 */}
          {!SHOW_CREATOR_CARDS && <NetworkStats />}

          {/* Creator Cards Grid */}
          {SHOW_CREATOR_CARDS && (
          <div className="mb-20 sm:mb-28">
            <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-white">
              {t("creatorPoolTitle1")}
              <span className="text-white">{t("creatorPoolTitle2")}</span>
            </h2>

            {loading ? (
              <div className="text-center py-20">
                <p className="text-[#A8A29E]">{t("loading")}</p>
              </div>
            ) : allCreators.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#A8A29E] text-lg">{t("creatorEmpty")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-8 min-w-0">
                  {creators.map((creator) => {
                    const instagramHandle = creator.instagram_url
                      ? "@" +
                        creator.instagram_url
                          .replace(/\/$/, "")
                          .split("/")
                          .pop()
                      : null;

                    return (
                      <Card
                        key={creator.id}
                        className="group overflow-hidden bg-card rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300 min-w-0"
                      >
                        {/* Creator Avatar */}
                        <div className="aspect-[3/4] min-h-0 bg-card relative overflow-hidden">
                          {creator.profile_image_url ? (
                            <Image
                              src={creator.profile_image_url}
                              alt={creator.name}
                              fill
                              sizes="(max-width: 768px) 33vw, 25vw"
                              className="object-cover object-center"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-[#FF4500]/30" />
                            </div>
                          )}
                        </div>

                        {/* Creator Info */}
                        <div className="p-2 md:p-4 min-w-0 overflow-hidden">
                          <div className="mb-1 md:mb-2 flex items-baseline justify-between gap-0.5 min-w-0">
                            <span
                              className="text-[10px] sm:text-xs md:text-base font-bold text-white truncate min-w-0 flex-1"
                              title={instagramHandle || creator.name}
                            >
                              {instagramHandle || creator.name}
                            </span>
                          </div>

                          {/* SNS Links */}
                          <div className="flex gap-1 sm:gap-1.5 md:gap-2 flex-wrap overflow-hidden">
                            {creator.instagram_url ? (
                              <a
                                href={creator.instagram_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 sm:p-1.5 md:p-2 bg-white/10 text-white hover:bg-white hover:text-black transition-colors shrink-0"
                                aria-label="Instagram"
                              >
                                <Instagram className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                              </a>
                            ) : (
                              <div className="p-1 sm:p-1.5 md:p-2 bg-white/10 opacity-30 pointer-events-none shrink-0">
                                <Instagram className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-[#A8A29E]" />
                              </div>
                            )}

                            {creator.youtube_url ? (
                              <a
                                href={creator.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 sm:p-1.5 md:p-2 bg-white/10 text-white hover:bg-white hover:text-black transition-colors shrink-0"
                                aria-label="YouTube"
                              >
                                <Youtube className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                              </a>
                            ) : (
                              <div className="p-1 sm:p-1.5 md:p-2 bg-white/10 opacity-30 pointer-events-none shrink-0">
                                <Youtube className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-[#A8A29E]" />
                              </div>
                            )}

                            {creator.tiktok_url ? (
                              <a
                                href={creator.tiktok_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 sm:p-1.5 md:p-2 bg-white/10 text-white hover:bg-white hover:text-black transition-colors shrink-0"
                                aria-label="TikTok"
                              >
                                <Music className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                              </a>
                            ) : (
                              <div className="p-1 sm:p-1.5 md:p-2 bg-white/10 opacity-30 pointer-events-none shrink-0">
                                <Music className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-[#A8A29E]" />
                              </div>
                            )}

                            {creator.x_url || creator.twitter_url ? (
                              <a
                                href={
                                  creator.x_url ||
                                  creator.twitter_url ||
                                  undefined
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 sm:p-1.5 md:p-2 bg-white/10 text-white hover:bg-white hover:text-black transition-colors shrink-0"
                                aria-label="X (Twitter)"
                              >
                                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                              </a>
                            ) : (
                              <div className="p-1 sm:p-1.5 md:p-2 bg-white/10 opacity-30 pointer-events-none shrink-0">
                                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-[#A8A29E]" />
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {/* 업데이트 중 플레이스홀더 카드 2개 - 마지막 페이지에만 노출 */}
                  {currentPage === totalPages &&
                    [1, 2].map((i) => (
                      <Card
                        key={`placeholder-${i}`}
                        className="overflow-hidden bg-card/40 rounded-[var(--radius)] border border-dashed border-white/20 opacity-60 pointer-events-none min-w-0"
                      >
                        <div className="aspect-[3/4] bg-card/50 relative flex items-center justify-center min-h-0">
                          <Plus className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-[#A8A29E]" />
                        </div>
                        <div className="p-2 md:p-4 h-[64px] sm:h-[72px] md:h-[88px]" />
                      </Card>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mb-12 sm:mb-20">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentPage > 1) router.push(`/creator?page=${currentPage - 1}`)
                      }}
                      disabled={currentPage === 1}
                      className="border-border bg-card text-white hover:bg-white/10 hover:text-white hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t("prev")}
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 2 && page <= currentPage + 2)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={page === currentPage ? "default" : "outline"}
                                onClick={() => router.push(`/creator?page=${page}`)}
                                className={`min-w-[44px] ${
                                  page === currentPage
                                    ? "gradient-warm text-white hover:opacity-90"
                                    : "border-border bg-card text-white hover:bg-white/10 hover:text-white hover:border-border"
                                }`}
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 3 ||
                            page === currentPage + 3
                          ) {
                            return (
                              <span key={page} className="px-2 text-[#A8A29E]">
                                ...
                              </span>
                            );
                          }
                          return null;
                        },
                      )}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentPage < totalPages) router.push(`/creator?page=${currentPage + 1}`)
                      }}
                      disabled={currentPage === totalPages}
                      className="border-border bg-card text-white hover:bg-white/10 hover:text-white hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
                {/* 하단 멘트 - 마지막 페이지에만 노출 */}
                {currentPage === totalPages && (
                  <div className="text-center py-12 mt-8 sm:mt-12">
                    <p className="text-[#A8A29E] text-sm sm:text-base italic">
                      {t("creatorUpdating")}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 2: Creator Categories (Light bg-kn-light)
          ============================================================ */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <SectionTag variant="light">OUR CREATORS</SectionTag>
            <div className="h-px flex-1 bg-[#78716C]/20" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 p-8 hover:border-[#FF4500]/40 transition-all duration-300">
              <h3 className="text-2xl font-bold text-[var(--kn-dark)] mb-4">
                {t("creatorPlatformExpertise")}
              </h3>
              <ul className="space-y-3 text-[#78716C]">
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">Instagram:</span>{" "}
                    {t("creatorPlatformIg")}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">TikTok:</span>{" "}
                    {t("creatorPlatformTiktok")}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">YouTube:</span>{" "}
                    {t("creatorPlatformYoutube")}
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 p-8 hover:border-[#FF4500]/40 transition-all duration-300">
              <h3 className="text-2xl font-bold text-[var(--kn-dark)] mb-4">
                {t("creatorDemographicTitle")}
              </h3>
              <ul className="space-y-3 text-[#78716C]">
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">
                      {t("creatorDemographicLabel10s")}:
                    </span>{" "}
                    {t("creatorDemographic10s")}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">
                      {t("creatorDemographicLabel20s")}:
                    </span>{" "}
                    {t("creatorDemographic20s")}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">
                      {t("creatorDemographicLabel30s")}:
                    </span>{" "}
                    {t("creatorDemographic30s")}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF4500] mt-1">•</span>
                  <span>
                    <span className="font-medium text-[var(--kn-dark)]">
                      {t("creatorDemographicLabelMale")}:
                    </span>{" "}
                    {t("creatorDemographicMale")}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: Differentiators (Dark bg-background)
          ============================================================ */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">WHY KOREANERS</SectionTag>
          <div className="mb-8" />

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-16">
            <span>{t("creatorDifferentiatorTitle1")}</span>
            <span>{t("creatorDifferentiatorTitle2")}</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/60 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-surface-2 rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <Award className="w-6 h-6 text-[#FF4500]/70" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t("creatorQualityTitle")}
                  </h3>
                  <p className="text-[#A8A29E] leading-relaxed">
                    {t("creatorQualityDesc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/60 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-surface-2 rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <Target className="w-6 h-6 text-[#FF4500]/70" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t("creatorExplainTitle")}
                  </h3>
                  <p className="text-[#A8A29E] leading-relaxed">
                    {t("creatorExplainDesc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/60 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-surface-2 rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <Users className="w-6 h-6 text-[#FF4500]/70" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t("creatorLocalTitle")}
                  </h3>
                  <p className="text-[#A8A29E] leading-relaxed">
                    {t("creatorLocalDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: Track Selection (separate component)
          ============================================================ */}
      <section className="pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <CreatorTrackSection onSelectTrack={handleSelectTrack} />
        </div>
      </section>

      {/* ============================================================
          DIALOGS
          ============================================================ */}
      {/* Creator Application Form Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto bg-background border-[var(--border)] p-0">
          <div className="p-8 sm:p-10">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-4 py-2 bg-[#FF4500]/10 border border-[#FF4500]/20 text-sm font-bold text-[#FF4500]">
                  {formData.track_type === "exclusive"
                    ? locale === "ja"
                      ? "専属クリエイター"
                      : "전속 크리에이터"
                    : locale === "ja"
                      ? "パートナー"
                      : "파트너"}
                </div>
              </div>
              <DialogTitle className="text-3xl font-bold text-white text-left">
                {formData.track_type === "exclusive"
                  ? locale === "ja"
                    ? "専属クリエイター合流申し込み"
                    : "전속 크리에이터 합류 신청"
                  : locale === "ja"
                    ? "パートナー合流申し込み"
                    : "파트너 합류 신청"}
              </DialogTitle>
              <DialogDescription className="pt-4 text-base text-[#A8A29E] text-left">
                <span className="inline-block">
                  {t("creatorApplyDesc1")}
                </span>{" "}
                <span className="inline-block">
                  {t("creatorApplyDesc2")}
                </span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Name and Phone */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="creator-name"
                    className="block text-sm font-bold text-white mb-2"
                  >
                    {t("formName")} <span className="text-[#FF4500]">*</span>
                  </label>
                  <input
                    type="text"
                    id="creator-name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                    placeholder={t("creatorPlaceholderName")}
                  />
                </div>

                <div>
                  <label
                    htmlFor="creator-phone"
                    className="block text-sm font-bold text-white mb-2"
                  >
                    {t("formPhone")}
                  </label>
                  <input
                    type="tel"
                    id="creator-phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, phone: value });
                    }}
                    className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                    placeholder="01000000000"
                  />
                  <p className="mt-1.5 text-xs text-[#A8A29E]">
                    {locale === "ja"
                      ? "ハイフン(-)なしで入力してください"
                      : "- 없이 숫자만 입력해주세요"}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="creator-email"
                  className="block text-sm font-bold text-white mb-2"
                >
                  {t("formEmail")} <span className="text-[#FF4500]">*</span>
                </label>
                <input
                  type="email"
                  id="creator-email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                  placeholder="example@email.com"
                />
              </div>

              {/* SNS Links */}
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label
                    htmlFor="creator-instagram"
                    className="block text-sm font-bold text-white mb-2"
                  >
                    {t("creatorLabelInstagram")}{" "}
                    <span className="text-[#FF4500]">*</span>
                  </label>
                  <input
                    type="url"
                    id="creator-instagram"
                    name="instagram_url"
                    value={formData.instagram_url}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="creator-youtube"
                    className="block text-sm font-bold text-white mb-2"
                  >
                    {t("creatorLabelYoutube")}
                  </label>
                  <input
                    type="url"
                    id="creator-youtube"
                    name="youtube_url"
                    value={formData.youtube_url}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="creator-tiktok"
                    className="block text-sm font-bold text-white mb-2"
                  >
                    {t("creatorLabelTiktok")}
                  </label>
                  <input
                    type="url"
                    id="creator-tiktok"
                    name="tiktok_url"
                    value={formData.tiktok_url}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                    placeholder="https://tiktok.com/..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="creator-x"
                    className="block text-sm font-bold text-white mb-2"
                  >
                    {t("creatorLabelX")}
                  </label>
                  <input
                    type="url"
                    id="creator-x"
                    name="x_url"
                    value={formData.x_url}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all"
                    placeholder="https://x.com/..."
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="creator-message"
                  className="block text-sm font-bold text-white mb-2"
                >
                  {t("creatorMessage")}
                </label>
                <textarea
                  id="creator-message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3.5 bg-surface-2 border border-[var(--border)] text-white placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-[#FF4500] transition-all resize-none"
                  placeholder={t("creatorPlaceholderMessage")}
                />
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplyModalOpen(false)}
                  className="flex-1 border-[var(--border)] text-white hover:bg-card"
                >
                  {t("dialogCancel") || "취소"}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? t("formSubmitting")
                    : t("creatorSubmitButton")}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-[var(--border)]">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-[#FF4500]/10 border border-[#FF4500]/20">
              <CheckCircle2 className="h-10 w-10 text-[#FF4500]" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              {locale === "ja"
                ? "合流申し込み完了！"
                : "합류 신청이 완료되었습니다!"}
            </DialogTitle>
            <DialogDescription className="pt-4 text-base leading-relaxed text-[#A8A29E]">
              {locale === "ja"
                ? "申し込みを受け付けました。内容を確認後、担当者より1〜2営業日以内にご連絡いたします。ありがとうございます！"
                : "신청이 정상적으로 접수되었습니다. 내용 확인 후 담당자가 1~2 영업일 내로 연락드리겠습니다. 감사합니다!"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setSuccessDialogOpen(false);
                setApplyModalOpen(false);
                setFormData({
                  name: "",
                  phone: "",
                  email: "",
                  instagram_url: "",
                  youtube_url: "",
                  tiktok_url: "",
                  x_url: "",
                  message: "",
                  track_type: "exclusive",
                });
              }}
              className="w-full sm:w-auto px-8 font-bold gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
            >
              {t("dialogConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CreatorPageContent() {
  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />
      <CreatorContent />
    </main>
  );
}
