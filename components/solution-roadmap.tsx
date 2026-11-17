'use client'

import { useLocale } from '@/contexts/locale-context'
import { getTranslation } from '@/lib/translations'

const STEPS = [
  { tag: 'Diagnostic', titleKey: 'solutionStep1Title', descKey: 'solutionStep1Desc', featureKeys: ['solutionStep1F1', 'solutionStep1F2', 'solutionStep1F3'] },
  { tag: 'Seeding', titleKey: 'solutionStep2Title', descKey: 'solutionStep2Desc', featureKeys: ['solutionStep2F1', 'solutionStep2F2', 'solutionStep2F3'] },
  { tag: 'Impact', titleKey: 'solutionStep3Title', descKey: 'solutionStep3Desc', featureKeys: ['solutionStep3F1', 'solutionStep3F2', 'solutionStep3F3'] },
  { tag: 'Management', titleKey: 'solutionStep4Title', descKey: 'solutionStep4Desc', featureKeys: ['solutionStep4F1', 'solutionStep4F2', 'solutionStep4F3'] },
] as const

export function SolutionRoadmap() {
  const { locale } = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key)

  return (
    <section id="solution" className="bg-[var(--kn-dark)] px-6 py-24 lg:px-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="heading-kr text-3xl font-medium text-[var(--kn-light)] lg:text-5xl">{t('processTitle')}</h2>

        <ol className="mt-12 border-t border-white/[0.08]">
          {STEPS.map((step, i) => (
            <li key={step.tag} className="grid gap-4 border-b border-white/[0.08] py-8 lg:grid-cols-[160px_1fr_1fr] lg:gap-8 lg:py-10">
              <span className="font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-xs text-[#A8A29E] lg:pt-2">
                {String(i + 1).padStart(2, '0')} {step.tag}
              </span>
              <div>
                <h3 className="heading-kr text-2xl font-medium text-[var(--kn-light)] lg:text-4xl">{t(step.titleKey)}</h3>
                <p className="mt-3 text-[15px] leading-6 text-[#A8A29E]">{t(step.descKey)}</p>
              </div>
              <ul className="space-y-2 lg:pt-2">
                {step.featureKeys.map((f) => (
                  <li key={f} className="text-[15px] leading-6 text-[var(--kn-light)]/80">{t(f)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
