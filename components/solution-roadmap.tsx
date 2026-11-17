'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'
import { FadeIn } from '@/components/ui/fade-in'
import { SectionTag } from '@/components/ui/section-tag'

const STEP_KEYS = [
  { tag: 'Diagnostic', titleKey: 'solutionStep1Title' as const, descKey: 'solutionStep1Desc' as const, featureKeys: ['solutionStep1F1', 'solutionStep1F2', 'solutionStep1F3'] as const },
  { tag: 'Seeding', titleKey: 'solutionStep2Title' as const, descKey: 'solutionStep2Desc' as const, featureKeys: ['solutionStep2F1', 'solutionStep2F2', 'solutionStep2F3'] as const },
  { tag: 'Impact', titleKey: 'solutionStep3Title' as const, descKey: 'solutionStep3Desc' as const, featureKeys: ['solutionStep3F1', 'solutionStep3F2', 'solutionStep3F3'] as const },
  { tag: 'Management', titleKey: 'solutionStep4Title' as const, descKey: 'solutionStep4Desc' as const, featureKeys: ['solutionStep4F1', 'solutionStep4F2', 'solutionStep4F3'] as const },
]

export function SolutionRoadmap() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)
  const steps = STEP_KEYS

  return (
    <section id="solution" className="bg-[var(--kn-dark)] py-16 md:py-20 lg:py-24 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto">
        {/* Section tag */}
        <FadeIn>
          <div className="flex items-center gap-4 mb-12">
            <SectionTag variant="dark">OUR PROCESS</SectionTag>
            <div className="h-px flex-1 bg-[var(--kn-light)]/10" />
          </div>
        </FadeIn>

        {/* Steps — 좌(넘버+타이틀+서브) / 우(키워드 pill 세로 스택) 2컬럼 (Task 1.4 리듬 압축) */}
        <div className="space-y-12 md:space-y-14">
          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-12 lg:items-center">
                  {/* Left: number + tag + title + description */}
                  <div>
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                      <span className="font-display font-bold text-xl md:text-2xl gradient-warm-text">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E] font-bold">
                        {step.tag}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-5xl md:text-7xl lg:text-[6rem] uppercase leading-[0.85] tracking-tight text-[var(--kn-light)]">
                      {t(step.titleKey)}
                    </h3>

                    <p className="mt-6 md:mt-8 text-base md:text-lg text-[#A8A29E] leading-relaxed max-w-xl">
                      {t(step.descKey)}
                    </p>
                  </div>

                  {/* Right: keyword pills */}
                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                    {step.featureKeys.map((f, j) => (
                      <span key={j} className="text-xs text-[#A8A29E] border border-[var(--kn-light)]/10 px-3 py-1.5 uppercase tracking-wider rounded-full">
                        {t(f)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                {i < steps.length - 1 && (
                  <div className="h-px bg-[var(--kn-light)]/10 mt-12 md:mt-14" />
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
