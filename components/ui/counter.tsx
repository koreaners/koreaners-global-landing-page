'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'

interface CounterProps {
  end: number
  duration?: number
  suffix?: string
  className?: string
}

export function Counter({ end, duration = 2000, suffix = '', className }: CounterProps) {
  const [count, setCount] = useState(end)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true
      let startTime: number | null = null
      const startValue = 0

      const animate = (currentTime: number) => {
        if (startTime === null) startTime = currentTime
        const progress = Math.min((currentTime - startTime) / duration, 1)

        // Easing function (easeOutQuart)
        const easeProgress = 1 - Math.pow(1 - progress, 4)
        
        setCount(Math.floor(startValue + (end - startValue) * easeProgress))

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [inView, end, duration])

  return (
    <span ref={ref} className={className}>
      {count}{suffix}
    </span>
  )
}
