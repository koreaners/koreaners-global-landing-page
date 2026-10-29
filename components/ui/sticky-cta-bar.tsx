'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/locale-context';
import { getTranslation } from '@/lib/translations';
import { InquirySheet } from '@/components/ui/inquiry-sheet';

/** 모바일 전용: 히어로를 벗어나면 하단 고정 문의 바 (가이드 §1-3) */
export function StickyCtaBar() {
  const { locale, forced } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [formInView, setFormInView] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // CTA 전환 분석 반영: 스크롤 33% 데드존 어디서든 진입로 확보 —
    // 히어로를 조금만 벗어나도 일찍 노출 (0.35 뷰포트)
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.35);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // 문의 폼(#consult-form)이나 푸터 진입 시 바 숨김 — 폼 위 오버레이, 푸터 마지막 줄 가림 방지 (Task 1.5)
    const targets = [document.getElementById('consult-form'), document.querySelector('footer')].filter(
      (el): el is HTMLElement => !!el,
    );
    if (!targets.length) return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setFormInView(visible.size > 0);
    }, { threshold: 0 });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Hydration mismatch 방지 (navigation.tsx 의 effectiveLocale 패턴과 동일)
  const effectiveLocale = mounted || forced ? locale : 'ko';

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300 lg:hidden ${
          show && !formInView && !inquiryOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setInquiryOpen(true)}
          className="gradient-warm block w-full rounded-lg py-3.5 text-center font-bold text-white shadow-xl"
        >
          {getTranslation(effectiveLocale, 'contact') /* 기존 '문의하기' 번역 키 재사용 */}
        </button>
      </div>
      <InquirySheet open={inquiryOpen} onOpenChange={setInquiryOpen} />
    </>
  );
}
