'use client'

import Navigation from '@/components/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Tv,
  BookOpen,
  Globe,
  Brain,
  Zap,
  Handshake,
  Rocket,
  Calendar,
  FileText,
  Building2,
  Award,
  BarChart3,
  Target,
  TrendingUp,
  Network,
  ArrowUpRight,
} from 'lucide-react'
import { SectionTag } from '@/components/ui/section-tag'
import { ShaderBackdrop } from '@/components/ui/shader-backdrop'
import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import type { CareerJob } from '@/lib/notion/careers'

interface CareersContentProps {
  initialJobs: CareerJob[]
}

export default function CareersContent({ initialJobs }: CareersContentProps) {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const jobs = initialJobs

  const bizAreas = [
    {
      icon: Users,
      titleKey: 'careersBiz1Title' as const,
      descKey: 'careersBiz1Desc' as const,
      subKeys: ['careersBiz1Sub1' as const, 'careersBiz1Sub2' as const],
    },
    {
      icon: Tv,
      titleKey: 'careersBiz2Title' as const,
      descKey: 'careersBiz2Desc' as const,
      subKeys: ['careersBiz2Sub1' as const, 'careersBiz2Sub2' as const, 'careersBiz2Sub3' as const],
    },
    {
      icon: BookOpen,
      titleKey: 'careersBiz3Title' as const,
      descKey: 'careersBiz3Desc' as const,
      subKeys: ['careersBiz3Sub1' as const, 'careersBiz3Sub2' as const],
    },
  ]

  const strengthItems = [
    { icon: Globe, titleKey: 'careersStrength1Title' as const, descKey: 'careersStrength1Desc' as const },
    { icon: Building2, titleKey: 'careersStrength2Title' as const, descKey: 'careersStrength2Desc' as const },
    { icon: Award, titleKey: 'careersStrength3Title' as const, descKey: 'careersStrength3Desc' as const },
    { icon: BarChart3, titleKey: 'careersStrength4Title' as const, descKey: 'careersStrength4Desc' as const },
  ]

  const visionItems = [
    { titleKey: 'careersVision3Title' as const, descKey: 'careersVision3Desc' as const },
    { titleKey: 'careersVision2Title' as const, descKey: 'careersVision2Desc' as const },
    { titleKey: 'careersVision1Title' as const, descKey: 'careersVision1Desc' as const },
  ]

  const cultureValues = [
    { titleKey: 'careersCulture1Title' as const, descKey: 'careersCulture1Desc' as const, icon: Globe },
    { titleKey: 'careersCulture2Title' as const, descKey: 'careersCulture2Desc' as const, icon: Brain },
    { titleKey: 'careersCulture3Title' as const, descKey: 'careersCulture3Desc' as const, icon: Zap },
    { titleKey: 'careersCulture4Title' as const, descKey: 'careersCulture4Desc' as const, icon: Handshake },
    { titleKey: 'careersCulture5Title' as const, descKey: 'careersCulture5Desc' as const, icon: Rocket },
    { titleKey: 'careersCulture6Title' as const, descKey: 'careersCulture6Desc' as const, icon: ArrowUpRight },
  ]

  return (
    <main className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Navigation />

      {/* Hero Section (Dark) */}
      <section className="pt-32 sm:pt-40 pb-24 md:pb-32 lg:pb-40 px-6 lg:px-24 bg-background relative overflow-hidden w-full max-w-full hero-glow">
        <ShaderBackdrop variant="hero-sub" seed={5} className="absolute!" />
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionTag variant="dark">CAREERS</SectionTag>
          <div className="mt-6 mb-8" />
          <h1 className="font-display font-bold text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.85] mb-6">
            <span className="text-white">JOIN </span><span className="gradient-warm-text">KOREANERS</span>
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-[#A8A29E] max-w-4xl break-keep font-semibold mb-4">
            {t('careersHeroSubtitle')}
          </p>
          <p className="text-lg sm:text-xl text-[#A8A29E] max-w-2xl break-keep">
            {t('careersHeroTitle')}
          </p>
        </div>
      </section>

      {/* About Section (White) */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-[var(--kn-light)] w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="light">ABOUT US</SectionTag>
          <div className="mb-16" />
          <h2 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[var(--kn-dark)] mb-8 break-keep">
            {t('careersAboutTitle')}
          </h2>
          <div className="max-w-3xl space-y-4">
            <p className="text-lg sm:text-xl text-[var(--kn-dark)] font-semibold leading-relaxed break-keep">
              {t('careersAboutDesc1')}
            </p>
            <p className="text-lg sm:text-xl text-[#78716C] leading-relaxed break-keep">
              {t('careersAboutDesc2')}
            </p>
          </div>
        </div>
      </section>

      {/* Core Business Areas (Dark) */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-background w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">BUSINESS</SectionTag>
          <div className="mt-6 mb-8" />
          <h2 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-16 break-keep">
            {t('careersBizTitle')}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {bizAreas.map((area, index) => (
              <Card
                key={index}
                className="p-8 bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300 group min-w-0 overflow-hidden"
              >
                <p className="text-xs font-mono mb-4 text-[#FF4500]">{String(index + 1).padStart(2, '0')}</p>
                <div className="w-16 h-16 rounded-[var(--radius-sm)] bg-white/10 flex items-center justify-center mb-6 shrink-0">
                  <area.icon className="w-8 h-8 text-[#FF4500]/70" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 break-keep">
                  {t(area.titleKey)}
                </h3>
                <p className="text-base sm:text-lg text-[#A8A29E] leading-relaxed break-words mb-5">
                  {t(area.descKey)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {area.subKeys.map((subKey, subIdx) => (
                    <span key={subIdx} className="inline-flex items-center px-3 py-1.5 bg-white/5 border border-white/10 rounded-[var(--radius-sm)] text-sm text-[#A8A29E] font-medium">
                      {t(subKey)}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Strengths (White) */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-[var(--kn-light)] w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="light">STRENGTHS</SectionTag>
          <div className="mb-16" />
          <h2 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[var(--kn-dark)] mb-16 break-keep">
            {t('careersStrengthTitle')}
          </h2>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {strengthItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-8 bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 hover:border-[#FF4500]/40 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[var(--kn-light)] rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-[#FF4500]/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--kn-dark)] mb-1 break-keep">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-sm sm:text-base text-[#78716C] leading-relaxed break-words">
                    {t(item.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section (Dark) */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-background w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">VISION</SectionTag>
          <div className="mt-6 mb-8" />
          <h2 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6 break-keep">
            {t('careersVisionTitle')}
          </h2>
          <p className="text-lg sm:text-xl text-[#A8A29E] max-w-3xl mb-16 break-keep">
            {t('careersVisionDesc')}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {visionItems.map((item, index) => {
              const icons = [Network, TrendingUp, Target]
              const Icon = icons[index]
              return (
                <Card
                  key={index}
                  className="p-8 bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 hover:-translate-y-1 transition-all duration-300 group text-center"
                >
                  <div className="w-16 h-16 rounded-[var(--radius-sm)] bg-white/10 flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-[#FF4500]/70" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 break-keep">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-base sm:text-lg text-[#A8A29E] leading-relaxed break-words">
                    {t(item.descKey)}
                  </p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Culture / Talent Section (White) */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-[var(--kn-light)] w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="light">CULTURE</SectionTag>
          <div className="mb-16" />
          <h2 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[var(--kn-dark)] mb-16 break-keep">
            {t('careersCultureTitle')}
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {cultureValues.map((val, index) => {
              const isEven = index % 2 === 0
              return (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row items-center gap-6 sm:gap-8 p-6 sm:p-8 bg-[var(--kn-card-light)] rounded-[var(--radius)] border border-[var(--kn-dark)]/5 hover:border-[#FF4500]/40 transition-all duration-300 group ${
                    !isEven ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-display font-bold text-4xl text-[#FF4500] select-none leading-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="w-14 h-14 bg-[var(--kn-light)] rounded-[var(--radius-sm)] flex items-center justify-center">
                      <val.icon className="w-7 h-7 text-[#FF4500]/70" />
                    </div>
                  </div>
                  <div className={`flex-1 ${!isEven ? 'sm:text-right' : ''}`}>
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--kn-dark)] mb-2 break-keep">
                      {t(val.titleKey)}
                    </h3>
                    <p className="text-base sm:text-lg text-[#78716C] leading-relaxed break-words">
                      {t(val.descKey)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Job Openings Section (Dark) */}
      <section className="py-24 md:py-32 lg:py-40 px-6 lg:px-24 bg-background w-full max-w-full">
        <div className="max-w-7xl mx-auto">
          <SectionTag variant="dark">OPENINGS</SectionTag>
          <div className="mt-6 mb-8" />
          <h2 className="heading-kr text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-4 break-keep">
            {t('careersOpeningsTitle')}
          </h2>
          <p className="text-lg sm:text-xl text-[#A8A29E] mb-16 break-keep">
            {t('careersOpeningsSubtitle')}
          </p>

          {jobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-[var(--radius-sm)] bg-surface-1 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-white/50" />
              </div>
              <p className="text-[#A8A29E] text-lg">{t('careersNoOpenings')}</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              {jobs.map((job) => {
                const isClosed = job.status === '채용마감'
                return (
                  <Card
                    key={job.id}
                    className={`p-6 sm:p-8 bg-surface-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[#FF4500]/60 transition-all duration-300 min-w-0 overflow-hidden ${isClosed ? 'opacity-70' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-white break-keep">
                            {job.title}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-[var(--radius-sm)] shrink-0 ${
                            isClosed
                              ? 'bg-white/20 text-[#A8A29E]'
                              : 'bg-[#FF4500] text-white'
                          }`}>
                            {isClosed ? t('careersClosed') : t('careersHiring')}
                          </span>
                        </div>
                        {job.startDate && (
                          <div className="flex items-center gap-2 text-sm text-[#A8A29E] mb-1">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>{job.startDate}</span>
                          </div>
                        )}
                        {job.note && (
                          <p className="text-base text-[#A8A29E] mt-2 break-words">
                            {job.note}
                          </p>
                        )}
                      </div>
                      {isClosed ? (
                        <div className="w-full sm:w-auto shrink-0">
                          <Button size="lg" className="w-full sm:w-auto px-8 font-bold opacity-50 cursor-not-allowed" disabled>
                            {t('careersClosed')}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 shrink-0 w-full sm:w-auto">
                          {job.jdUrl && (
                            <a href={job.jdUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 font-bold">
                                {t('careersDetail')}
                              </Button>
                            </a>
                          )}
                          <a href={job.applyUrl || 'mailto:sales@koreaners.com'} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto px-8 font-bold gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300">
                              {t('careersApply')}
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="text-center mt-16 pt-8 border-t border-border">
            <p className="text-white text-lg font-semibold mb-2">{t('careersNoPositionQuestion')}</p>
            <p className="text-[#A8A29E] text-base mb-4">{t('careersNoPositionDesc')}</p>
            <a
              href="https://descriptive-wallflower-afd.notion.site/30601ca3e480805196f0dda3f1b0778c?pvs=105"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="px-8 font-bold gradient-warm text-white rounded-[var(--radius-sm)] hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300">
                {t('careersNoPositionCta')}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
