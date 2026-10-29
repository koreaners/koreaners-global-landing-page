'use client'

const PHRASES = [
  'YOUR BRAND × JAPAN',
  '300+ CAMPAIGNS',
  '185+ BRAND PARTNERS',
  'DATA-DRIVEN RESULTS',
  'FULL-CYCLE MARKETING',
]

const REPEAT = 4

export function TrustSignals() {
  const items = Array.from({ length: REPEAT }, (_, i) => i)
  const duplicated = items.flatMap((setIdx) =>
    PHRASES.map((phrase, phraseIdx) => ({ key: `${setIdx}-${phraseIdx}`, phrase }))
  )
  // 원본 + 복제 = 끊김 없는 루프
  const all = [...duplicated, ...duplicated]

  return (
    <div className="bg-background overflow-hidden">
      <div className="marquee-fade overflow-hidden py-4" role="marquee" aria-label={PHRASES.join(' · ')}>
        <div
          className="flex gap-6 w-max"
          style={{ animation: 'marquee-left 50s linear infinite' }}
        >
          {all.map((item, i) => (
            <span key={`${item.key}-${i}`} className="text-sm font-bold uppercase tracking-[0.15em] text-[#FF4500] whitespace-nowrap">
              {item.phrase} ✦
            </span>
          ))}
        </div>
      </div>

      {/* Orange accent line */}
      <div className="h-[2px] bg-[#FF4500]" />
    </div>
  )
}
