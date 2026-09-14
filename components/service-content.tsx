'use client'

import Link from 'next/link'
import Navigation from '@/components/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp, Users, Target, BarChart3, Globe, CheckCircle2, MessageSquare, Database, Shield, Zap, Lightbulb, Brain, GitCompare, Clock, Share2, Bookmark } from 'lucide-react'
import { SectionTag } from '@/components/ui/section-tag'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { ProcessTimeline } from '@/components/service/process-timeline'
import { ShaderBackdrop } from '@/components/ui/shader-backdrop'

const PAIN_DESC_KEYS = ['barrier1Desc', 'barrier2Desc', 'barrier3Desc', 'barrier4Desc'] as const
const INFLUENCER_KEYS = [
  { titleKey: 'serviceInfluencerF1Title' as const, descKey: 'serviceInfluencerF1Desc' as const },
  { titleKey: 'serviceInfluencerF2Title' as const, descKey: 'serviceInfluencerF2Desc' as const },
  { titleKey: 'serviceInfluencerF3Title' as const, descKey: 'serviceInfluencerF3Desc' as const },
] as const
const SEEDING_KEYS = [
  { titleKey: 'serviceSeedingF1Title' as const, descKey: 'serviceSeedingF1Desc' as const },
  { titleKey: 'serviceSeedingF2Title' as const, descKey: 'serviceSeedingF2Desc' as const },
  { titleKey: 'serviceSeedingF3Title' as const, descKey: 'serviceSeedingF3Desc' as const },
] as const

export default function ServiceContent() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const painPoints = [
    { icon: Database, title: 'Data Black-box', descKey: PAIN_DESC_KEYS[0] },
    { icon: Shield, title: 'Trust Barrier', descKey: PAIN_DESC_KEYS[1] },
    { icon: Target, title: 'Lack of Strategy', descKey: PAIN_DESC_KEYS[2] },
    { icon: AlertTriangle, title: 'Operational Risk', descKey: PAIN_DESC_KEYS[3] },
  ]
  const influencerFeatures = INFLUENCER_KEYS.map(({ titleKey, descKey }) => ({ title: t(titleKey), description: t(descKey) }))
  const seedingFeatures = SEEDING_KEYS.map(({ titleKey, descKey }) => ({ title: t(titleKey), description: t(descKey) }))

  const trustMetrics = [
    { number: locale === 'ja' ? '30万' : '30만', label: t('serviceTrustCommunity') },
    { number: '100+', label: t('serviceTrustMedia') },
    { number: '150%', label: t('serviceTrustGrowth') },
    { number: '5,000', label: t('serviceTrustSeeding') },
  ]

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* Hero Section — Dark */}
      <section className="pt-32 sm:pt-40 pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 bg-background hero-glow">
        <ShaderBackdrop variant="hero-sub" seed={1} className="absolute!" />
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionTag variant="dark">SERVICE</SectionTag>
          <h1 className="heading-kr text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight break-keep max-w-4xl mt-8">
            <span>{t('serviceHero1')}</span>{' '}
            <span className="gradient-warm-text">{t('serviceHero2')}</span>
            <span>{t('serviceHero3')}</span>
          </h1>
          <p className="text-lg md:text-xl text-[#A8A29E] max-w-2xl mt-6 leading-relaxed break-keep">
            {t('serviceHeroDesc')}
          </p>
        </div>
      </section>

      {/* Pain Points — Light */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <SectionTag variant="light">CHALLENGES</SectionTag>
            <div className="h-px flex-1 bg-[var(--kn-dark)]/10" />
          </div>

          <div className="mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--kn-dark)] leading-tight break-keep max-w-3xl">
              {t('serviceProblemTitle')}
            </h2>
            <p className="text-lg text-[#78716C] mt-4 max-w-2xl break-keep">
              {t('serviceProblemSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="bg-[var(--kn-card-light)] border border-[var(--kn-dark)]/5 rounded-[var(--radius)] p-8 hover:border-[#FF4500]/40 transition-all duration-300 group"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-6">
                  <point.icon className="w-7 h-7 text-[#FF4500]/70" />
                </div>
                <h3 className="text-xl font-bold text-[var(--kn-dark)] mb-3 break-keep">
                  {point.title}
                </h3>
                <p className="text-[#78716C] leading-relaxed break-words">
                  {t(point.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Timeline — Dark */}
      <ProcessTimeline />

      {/* Service 01: Influencer Marketing — Dark */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">SERVICE 01</SectionTag>
          <div className="mb-8" />

          <div className="grid md:grid-cols-[2fr_1fr] gap-16 items-start">
            {/* Left: Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight break-keep">
                {t('serviceInfluencerTitle')}
              </h2>
              <p className="text-xl md:text-2xl text-[#A8A29E] font-bold mt-4 mb-12 break-keep">
                {t('serviceInfluencerSubtitle')}
              </p>

              <div className="space-y-8">
                {influencerFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle2 className="w-5 h-5 text-[#FF4500]/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-bold text-white mb-1 break-words">
                        {feature.title}
                      </h4>
                      <p className="text-[#A8A29E] break-words leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 한국어 원문 그대로라 ko 로케일에서만 노출 */}
              {locale === 'ko' && (
                <p className="text-[#A8A29E] break-keep leading-relaxed mt-8">
                  일본 현지 대행사와 한국 대행사의 차이와 티어별 단가는{' '}
                  <Link href="/japan-influencer-marketing" className="text-[#FF4500] hover:underline">
                    일본 인플루언서 마케팅 대행사 비교와 비용
                  </Link>{' '}
                  페이지에 정리했습니다.
                </p>
              )}
            </div>

            {/* Right: Stat cards stacked */}
            <div className="space-y-4">
              <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/60 transition-all duration-300">
                <div className="text-xs text-[#A8A29E] mb-2">{t('serviceInfluencerStat1')}</div>
                <div className="font-display font-bold text-5xl text-[#FF4500]">220+</div>
              </div>
              <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/60 transition-all duration-300">
                <div className="text-xs text-[#A8A29E] mb-2">{t('serviceInfluencerStat2')}</div>
                <div className="font-display font-bold text-5xl text-[#FF4500]">0%</div>
              </div>
              <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/60 transition-all duration-300">
                <div className="text-xs text-[#A8A29E] mb-2">{t('serviceInfluencerStat3')}</div>
                <div className="font-display font-bold text-5xl text-[#FF4500]">6</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service 02: Seeding — Light */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-[var(--kn-light)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <SectionTag variant="light">SERVICE 02</SectionTag>
            <div className="h-px flex-1 bg-[var(--kn-dark)]/10" />
          </div>

          <div className="grid md:grid-cols-[1fr_2fr] gap-16 items-start">
            {/* Left: Stat cards */}
            <div className="space-y-4">
              <div className="bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 p-8 hover:border-[#FF4500]/40 transition-all duration-300">
                <div className="text-xs text-[#78716C] mb-2">{t('serviceSeedingStat1')}</div>
                <div className="font-display font-bold text-5xl text-[#FF4500]">5,023</div>
              </div>
              <div className="bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 p-8 hover:border-[#FF4500]/40 transition-all duration-300">
                <div className="text-xs text-[#78716C] mb-2">{t('serviceSeedingStat2')}</div>
                <div className="font-display font-bold text-5xl text-[#FF4500]">9,247</div>
              </div>
              <div className="bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 p-8 hover:border-[#FF4500]/40 transition-all duration-300">
                <div className="text-xs text-[#78716C] mb-2">{t('serviceSeedingStat3')}</div>
                <div className="font-display font-bold text-5xl text-[#FF4500]">96%</div>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--kn-dark)] leading-tight break-keep">
                {t('serviceSeedingTitle')}
              </h2>
              <p className="text-xl md:text-2xl text-[#78716C] font-bold mt-4 mb-12 break-keep">
                {t('serviceSeedingSubtitle')}
              </p>

              <div className="space-y-8">
                {seedingFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle2 className="w-5 h-5 text-[#FF4500]/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-bold text-[var(--kn-dark)] mb-1 break-words">
                        {feature.title}
                      </h4>
                      <p className="text-[#78716C] break-words leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data & Reporting — Dark */}
      <section className="py-16 md:py-24 lg:py-28 px-6 lg:px-24 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">DATA & REPORTING</SectionTag>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight break-keep max-w-4xl mt-8">
            <span>{t('serviceReportTitle1')}</span>{' '}
            <span className="gradient-warm-text">{t('serviceReportTitle2')}</span>{' '}
            <span>{t('serviceReportTitle3')}</span>
          </h2>
          <p className="text-lg text-[#A8A29E] max-w-2xl mt-4 leading-relaxed break-keep mb-20">
            {t('serviceReportDesc')}
          </p>

          {/* Report Sub-section */}
          <div className="mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 break-keep">
              {t('serviceReportSectionTitle')}<span>{t('serviceReportSectionTitle2')}</span>
            </h3>
            <p className="text-[#A8A29E] break-keep">{t('serviceReportSectionDesc')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1: Efficiency */}
            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF4500]/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white">{t('serviceMetricEfficiency')}</h4>
                  <p className="text-xs text-[#A8A29E]">{t('serviceMetricEfficiencySub')}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-[#FF4500]/70" />
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-[var(--border)]">
                  <p className="text-xs text-white/80 leading-relaxed">
                    <span className="font-semibold text-[#FF4500]">{t('serviceReportRoasIntro')}</span> {t('serviceReportRoasDesc')}
                  </p>
                </div>

                <div className="p-4 rounded-[var(--radius-sm)] bg-white/5 border border-[#FF4500]/20">
                  <div className="text-xs text-[#A8A29E] mb-1">{t('serviceCampaignRoas')}</div>
                  <div className="flex items-end gap-2">
                    <div className="font-display font-bold text-3xl gradient-warm-text">450%</div>
                    <div className="text-sm text-[#FF4500]/70 mb-1">+150% ↑</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-[#A8A29E]">{t('serviceCvrLabel')}</div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white">{t('serviceQoo10')}</span>
                      <span className="text-sm font-bold text-[#FF4500]">8.5%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#FF4500]" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white">{t('serviceAmazon')}</span>
                      <span className="text-sm font-bold text-[#FF4500]/80">7.2%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#FF4500]/80" style={{ width: '72%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white">{t('serviceRakuten')}</span>
                      <span className="text-sm font-bold text-[#FF4500]/60">6.8%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#FF4500]/60" style={{ width: '68%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Inflow */}
            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF4500]/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white">{t('serviceMetricInflow')}</h4>
                  <p className="text-xs text-[#A8A29E]">{t('serviceMetricInflowSub')}</p>
                </div>
                <Clock className="w-5 h-5 text-[#FF4500]/70" />
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-[var(--border)]">
                  <p className="text-xs text-white/80 leading-relaxed">
                    <span className="font-semibold text-[#FF4500]">{t('serviceMetricInflow')}:</span> {t('serviceReportSectionDesc')}
                  </p>
                </div>

                <div className="p-4 rounded-[var(--radius-sm)] bg-white/5 border border-[#FF4500]/20">
                  <div className="text-xs text-[#A8A29E] mb-1">{t('serviceAvgDwell')}</div>
                  <div className="flex items-end gap-2">
                    <div className="font-display font-bold text-3xl gradient-warm-text">4m 32s</div>
                    <div className="text-sm text-[#FF4500]/70 mb-1">+85% ↑</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-[#A8A29E]">{t('serviceBounceBySection')}</div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white">{t('serviceLandingPage')}</span>
                      <span className="text-sm font-bold text-red-400">28%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-400/60" style={{ width: '28%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white">{t('serviceDetailPage')}</span>
                      <span className="text-sm font-bold text-orange-400">18%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400/60" style={{ width: '18%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-white">{t('servicePaymentPage')}</span>
                      <span className="text-sm font-bold text-[#FF4500]">8%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#FF4500]" style={{ width: '8%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Spread */}
            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF4500]/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white">{t('serviceMetricSpread')}</h4>
                  <p className="text-xs text-[#A8A29E]">{t('serviceMetricSpreadSub')}</p>
                </div>
                <Share2 className="w-5 h-5 text-[#FF4500]/70" />
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-[var(--border)]">
                  <p className="text-xs text-white/80 leading-relaxed">
                    <span className="font-semibold text-[#FF4500]">{t('serviceSave')}/{t('serviceShare')}:</span> {t('serviceReportSectionDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-[#FF4500]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Bookmark className="w-4 h-4 text-[#FF4500]/70" />
                      <span className="text-xs text-[#A8A29E]">{t('serviceSave')}</span>
                    </div>
                    <div className="font-display font-bold text-2xl gradient-warm-text">24.5K</div>
                  </div>
                  <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-[#FF4500]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-4 h-4 text-[#FF4500]/70" />
                      <span className="text-xs text-[#A8A29E]">{t('serviceShare')}</span>
                    </div>
                    <div className="font-display font-bold text-2xl gradient-warm-text">18.2K</div>
                  </div>
                </div>

                <div className="p-4 rounded-[var(--radius-sm)] bg-white/5 border border-[#FF4500]/20">
                  <div className="text-xs text-[#A8A29E] mb-2">{t('serviceEstimatedRemarketing')}</div>
                  <div className="flex items-end gap-2">
                    <div className="font-display font-bold text-3xl gradient-warm-text">¥8.2M</div>
                    <div className="text-sm text-[#A8A29E] mb-1">(약 ₩72M)</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-[#FF4500]/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF4500]" />
                      <span>{t('serviceRemarketingNote')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Qualitative */}
            <div className="bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] p-8 hover:border-[#FF4500]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF4500]/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-white">{t('serviceMetricQualitative')}</h4>
                  <p className="text-xs text-[#A8A29E]">{t('serviceMetricQualitativeSub')}</p>
                </div>
                <MessageSquare className="w-5 h-5 text-[#FF4500]/70" />
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-[var(--border)]">
                  <p className="text-xs text-white/80 leading-relaxed">
                    <span className="font-semibold text-[#FF4500]">{t('serviceMetricQualitative')}:</span> {t('serviceReportSectionDesc')}
                  </p>
                </div>

                <div>
                  <div className="text-xs text-[#A8A29E] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4500]" />
                    <span>{t('serviceTrustCommunity')}: {locale === 'ja' ? '30万+' : '30만+'}</span>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#FF4500]/10 text-[#FF4500] text-[10px]">{t('serviceIntentKeyword')}</span>
                      <span>{t('serviceTop5Keywords')}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordBought')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordRepurchase')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordRecommend')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordSatisfaction')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordEffective')}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#FF4500]/10 text-[#FF4500] text-[10px]">{t('serviceBrandImage')}</span>
                      <span>{t('serviceTop5Keywords')}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordTrust')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordPremium')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordInnovative')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordQuality')}</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">{t('serviceKeywordTrendy')}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#FF4500]/10 text-[#FF4500] text-[10px]">{t('serviceLocalSentiment')}</span>
                      <span>{t('serviceJapanReaction')}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">コスパ良い</span>
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">使いやすい</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">リピ決定</span>
                      <span className="px-3 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] text-xs font-semibold">買ってよかった</span>
                      <span className="px-3 py-1.5 rounded-full bg-white/5 border border-[#FF4500]/15 text-[#FF4500] text-xs font-semibold">おすすめ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
