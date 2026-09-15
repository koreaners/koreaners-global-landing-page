"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionTag } from "@/components/ui/section-tag";
import { Zap, Users, Sparkles, Award, Target, TrendingUp } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { getTranslation } from "@/lib/translations";

const TRACK_LINKS = {
  exclusive: {
    ko: "https://descriptive-wallflower-afd.notion.site/30d01ca3e48080ca93f5c198fb8fc3f2",
    ja: "https://descriptive-wallflower-afd.notion.site/30d01ca3e480805a8863e42e6b84bf3a",
  },
  partner: {
    ko: "https://descriptive-wallflower-afd.notion.site/30d01ca3e48080cea0eec2ecaa888a6f",
    ja: "https://descriptive-wallflower-afd.notion.site/30d01ca3e480807c8c22cb29d8dee45b",
  },
};

interface CreatorTrackSectionProps {
  onSelectTrack: (trackType: "exclusive" | "partner") => void;
}

export function CreatorTrackSection({
  onSelectTrack,
}: CreatorTrackSectionProps) {
  const { locale } = useLocale();
  const t = (key: Parameters<typeof getTranslation>[1]) =>
    getTranslation(locale, key);

  return (
    <div id="join-us" className="scroll-mt-24">
      {/* Join Us Intro - Left aligned */}
      <div className="mb-16 sm:mb-20">
        <SectionTag variant="dark">JOIN US</SectionTag>
        <div className="mb-8" />

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6">
          {locale === "ja"
            ? "コリナースと共に成長する\nクリエイターを募集しています"
            : "코리너스와 함께 성장할\n크리에이터를 모집합니다"}
        </h2>
        <p className="text-base md:text-lg text-[#A8A29E] max-w-3xl">
          {locale === "ja"
            ? "K-ブランドと日本市場をつなぐクリエイターとして、あなたの影響力をさらに拡大してみませんか？"
            : "K-브랜드와 일본 시장을 잇는 크리에이터로서, 당신의 영향력을 더 넓혀보세요."}
        </p>
      </div>

      {/* Track Selection Heading */}
      <div className="mb-12 sm:mb-16">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
          {locale === "ja" ? "3つの合流ジャーニー" : "세 가지 합류 여정"}
        </h3>
        <p className="text-sm sm:text-base md:text-lg text-[#A8A29E] max-w-3xl">
          {locale === "ja"
            ? "あなたのキャリアと目標に合わせて、最適なパスを選択してください"
            : "당신의 커리어와 목표에 맞는 최적의 경로를 선택하세요"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exclusive Creator Track */}
        <div className="overflow-hidden bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300">
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-surface-2 border border-[var(--border)] rounded-[var(--radius-sm)]">
                <Zap className="w-7 h-7 text-[#FF4500]/70" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "ja" ? "専属クリエイター" : "전속 크리에이터"}
              </h3>
            </div>

            <p className="text-[#A8A29E] mb-8 text-sm sm:text-base leading-relaxed">
              {locale === "ja"
                ? "コンテンツ企画から撮影、商品企画・販売まで、すべてを一緒にサポート"
                : "컨텐츠 기획부터 촬영, 굿즈 기획 및 판매까지 모든 과정을 함께 지원"}
            </p>

            <div className="space-y-4 mb-10">
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja"
                      ? "エンドツーエンド支援"
                      : "End-to-End 지원"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "コンテンツ企画から販売まで全てをサポート"
                      : "기획부터 판매까지 전 과정 지원"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Award className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja" ? "専門サポート" : "전문가 지원"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "マーケティング、制作、営業チーム全て"
                      : "마케팅, 제작, 영업팀 전원 지원"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja" ? "継続的な成長" : "지속적 성장"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "あなたのチャネルと影響力を一緒に拡大"
                      : "당신의 채널과 영향력을 함께 확대"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja"
                      ? "独占的パートナーシップ"
                      : "독점 파트너십"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "長期的な独占契約で安定した収入源"
                      : "장기 독점 계약으로 안정적 수입"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-xs text-[#A8A29E] mb-4">
                {locale === "ja"
                  ? "最適な方：ブランドと長期的にコラボしたい、複数ジャンルを扱いたい"
                  : "추천 대상: 브랜드와 장기 협업, 다양한 분야 시도 희망"}
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={TRACK_LINKS.exclusive[locale]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 px-8 text-base font-semibold text-center inline-flex items-center justify-center border border-[#A8A29E]/30 text-white hover:border-[#FF4500]/60 hover:bg-white/5 rounded-[var(--radius-sm)] transition-all"
                >
                  {locale === "ja"
                    ? "専属クリエイター詳細案内"
                    : "전속 크리에이터 상세 안내"}
                </a>
                <Button
                  onClick={() => onSelectTrack("exclusive")}
                  className="w-full h-12 px-8 text-base font-bold gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
                >
                  {locale === "ja" ? "合流申し込む" : "합류 신청하기"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Partner Track */}
        <div className="overflow-hidden bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300">
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-surface-2 border border-[var(--border)] rounded-[var(--radius-sm)]">
                <Target className="w-7 h-7 text-[#FF4500]/70" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "ja" ? "パートナー" : "파트너"}
              </h3>
            </div>

            <p className="text-[#A8A29E] mb-8 text-sm sm:text-base leading-relaxed">
              {locale === "ja"
                ? "パートナーシッププールに登録して、最適な機会を待つ"
                : "파트너십 풀에 등록하고 최적의 기회를 받으세요"}
            </p>

            <div className="space-y-4 mb-10">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja" ? "カスタマイズ機会" : "맞춤형 기회"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "ブランドと案件に応じて最適なクリエイターをマッチング"
                      : "브랜드와 프로젝트에 맞는 기회 제공"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Users className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja" ? "フレキシブル協力" : "자유로운 협업"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "案件ごとに柔軟に参加・不参加を選択"
                      : "프로젝트별로 자유롭게 참여 선택"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Award className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja" ? "ブランド体験" : "다양한 브랜드 경험"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "複数ブランドとのコラボレーション機会"
                      : "여러 브랜드와 협업할 수 있는 기회"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">
                    {locale === "ja" ? "スポット報酬" : "프로젝트 수당"}
                  </h4>
                  <p className="text-[#A8A29E] text-sm">
                    {locale === "ja"
                      ? "プロジェクトごとに競争力のある報酬"
                      : "프로젝트마다 경쟁력 있는 수당 지급"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-xs text-[#A8A29E] mb-4">
                {locale === "ja"
                  ? "最適な方：複数ブランドを試したい、案件ベースの協業希望"
                  : "추천 대상: 다양한 브랜드 경험, 프로젝트 기반 협업 희망"}
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={TRACK_LINKS.partner[locale]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 px-8 text-base font-semibold text-center inline-flex items-center justify-center border border-[#A8A29E]/30 text-white hover:border-[#FF4500]/60 hover:bg-white/5 rounded-[var(--radius-sm)] transition-all"
                >
                  {locale === "ja" ? "パートナー詳細案内" : "파트너 상세 안내"}
                </a>
                <Button
                  onClick={() => onSelectTrack("partner")}
                  className="w-full h-12 px-8 text-base font-bold gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
                >
                  {locale === "ja" ? "合流申し込む" : "합류 신청하기"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* TripBridge 체험단 Track */}
        <div className="overflow-hidden bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300">
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-surface-2 border border-[var(--border)] rounded-[var(--radius-sm)]">
                <Sparkles className="w-7 h-7 text-[#FF4500]/70" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "ja" ? "TripBridge 体験団" : "트립브릿지 체험단"}
              </h3>
            </div>

            <p className="text-[#A8A29E] mb-8 text-sm sm:text-base leading-relaxed">
              {t("creatorTrackTripbridgeDesc")}
            </p>

            <div className="space-y-4 mb-10">
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <h4 className="font-bold text-white">
                  {locale === "ja"
                    ? "フォロワー3,000人から"
                    : "팔로워 3,000명부터"}
                </h4>
              </div>

              <div className="flex gap-3">
                <Award className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <h4 className="font-bold text-white">
                  {locale === "ja"
                    ? "コース全額無料＋原稿料あり"
                    : "코스 전액 무료 + 소정의 원고료"}
                </h4>
              </div>

              <div className="flex gap-3">
                <Target className="w-5 h-5 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <h4 className="font-bold text-white">
                  {locale === "ja"
                    ? "予約と動線はKOREANERSが運営"
                    : "예약과 동선은 코리너스가 운영"}
                </h4>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <Link
                href="/tripbridge/creator"
                className="w-full h-12 px-8 text-base font-bold gradient-warm text-white rounded-[var(--radius-sm)] inline-flex items-center justify-center hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
              >
                {t("creatorTrackTripbridgeCta")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
