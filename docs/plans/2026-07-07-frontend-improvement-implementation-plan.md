# 코리너스 랜딩 전면 프론트 개선 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** koreaners.co 전 페이지의 프론트 품질을 디자인 가이드(§참조: `docs/plans/2026-07-07-frontend-improvement-guide.md`) 기준으로 끌어올린다. 모바일 홈 첫 화면(트래픽 92%가 모바일, 78%가 홈)과 /contact 전환 경험이 최우선.

**Architecture:** 기존 Organic Warm v2 디자인 시스템을 교체하지 않고 그 위에 (1) 공용 토큰/컴포넌트 4종(ShaderBackdrop, CountUp, StickyCtaBar, 표면/타이포 토큰)을 추가하고 (2) 페이지별로 그 부품을 조립한다. Phase 단위 브랜치/PR로 배포를 분리해 롤백 가능하게 유지한다.

**추가 입력 (2026-07-07 통합):** vault `work/프로젝트/260707-분석-코리너스-랜딩-CTA전환-개선.md` — Clarity 최근 3일 실측 기반 CTA 전환 아키텍처 분석. 핵심: 방문 97%가 모바일 인앱 웹뷰(인스타/페북), 99% 한국, 평균 스크롤 33%, 유일한 폼은 페이지 96% 깊이. Phase 3 이 이 분석을 반영해 개정됐고, 빅베팅 항목은 문서 말미 백로그에 정리.

**Tech Stack:** Next.js 16.0.10 (App Router, Turbopack) + React 19.2 + Tailwind 4 (CSS-first, `app/globals.css`) + framer-motion 12 + `@paper-design/shaders-react@0.0.77` (신규, 버전 고정)

## Global Constraints

- 디자인 결정의 SoT: `docs/plans/2026-07-07-frontend-improvement-guide.md` (전면 가이드) + `docs/plans/2026-07-07-frontend-shader-design-guide.md` (셰이더 별첨). 본 계획과 충돌 시 가이드가 우선.
- 색은 기존 토큰만: `#1C1917` / `#FAF7F2` / `#F3EDE4` / `#FF4500` / `#F59E0B` / `#0D9488`(그라데이션 전용) + 본 계획 Task 0.2가 추가하는 `--surface-1: #232019`, `--surface-2: #2A2620`. 그 외 새 hue 도입 금지.
- 크림 섹션 배경에 셰이더 금지. 페이지당 라이브 캔버스 최대 2개. 캔버스를 framer-motion 으로 감싸지 말 것(과거 LCP 10초 회귀 전력). 홈 LCP 요소는 히어로 H1 텍스트로 유지.
- `/contact` 의 수치·카피는 `meta-ads-automation/config/verified_numbers.json` 화이트리스트 게이트 대상 — 본 계획 범위에서 카피/수치 변경 금지. 폼의 name 속성, submit 핸들러, Meta Pixel 이벤트 호출은 수정 금지. 필드 필수 구성 변경은 Task 3.1 의 축소 스텝(Leo 컨펌 + 서버측 검증 동기화 게이트)에서만 허용.
- 사이트 전역 카피에 미검증 수치 추가 금지. 사용 가능 검증 수치: 누적 협업 브랜드 185개+, 크리에이터 네트워크 220명+, 현지 미디어 10곳 (이미 /contact 에 노출 중인 값).
- i18n: 사용자 노출 문자열은 반드시 `lib/translations.ts` 경유 (KR/JP 두 벌). 하드코딩 금지.
- 모든 vault 규칙과 무관 (이 레포 문서는 vault 아님). 커밋은 conventional commits (`feat:`/`fix:`/`refactor:`/`chore:`), 태스크당 1커밋 이상.
- Phase 당 브랜치 1개 + PR 1개: `feat/fe-improve-phase-0` ~ `feat/fe-improve-phase-4`. main 머지는 Leo 승인 후 (Vercel prod 자동 배포).
- 각 태스크의 검증은 아래 "표준 검증 프로토콜" 참조. 완료 선언 전 시각 검수 필수 (CLAUDE.md deck-render-check 정신 동일).

### 표준 검증 프로토콜 (모든 태스크의 "Verify" 단계에서 재사용)

```bash
# 1) 빌드 통과
npm run build
# 2) 로컬 기동 (별도 셸, 이후 태스크들 공용)
npm run dev  # http://localhost:3000
# 3) 스크린샷 (Task 0.5 가 만드는 스크립트)
node scripts/screenshot-audit.mjs --routes=/ --label=<task-id>
# → docs/plans/assets/shots/<task-id>/{route}-{1440|390}.jpg 생성. 직접 Read 로 열어 눈으로 확인.
# 4) 콘솔 에러 0건 확인 (screenshot-audit.mjs 가 콘솔 에러를 stdout 에 출력)
```

---

## Phase 0 — 공용 기반 (다른 모든 Phase 의 선행 조건)

### Task 0.1: Paper Shaders 설치 + 버전 고정

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `@paper-design/shaders-react` 의 `GrainGradient`, `MeshGradient` import 가능 상태. 이후 Task 0.3 이 소비.

- [ ] **Step 1: 설치 (정확 버전 고정)**

```bash
cd /Users/leo/Downloads/Claude-Projects/koreaners-global-landing-page
npm install --save-exact @paper-design/shaders-react@0.0.77
```

- [ ] **Step 2: package.json 에서 caret 없이 `"0.0.77"` 로 고정됐는지 확인**

```bash
grep '"@paper-design/shaders-react"' package.json
# 기대: "@paper-design/shaders-react": "0.0.77"
```

- [ ] **Step 3: 빌드 영향 확인**

```bash
npm run build
# 기대: 기존과 동일하게 성공 (아직 import 없음)
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @paper-design/shaders-react pinned to 0.0.77"
```

### Task 0.2: 디자인 토큰 추가 — 표면 elevation 2단 + KR 디스플레이 타이포

**Files:**
- Modify: `app/globals.css` (`:root` 블록과 `@theme inline` 블록, 파일 하단 `@utility` 구역)
- Modify: `design-system/MASTER.md` (토큰 문서화)

**Interfaces:**
- Produces: Tailwind 유틸리티 `bg-surface-1`, `bg-surface-2`, CSS 클래스 `.heading-kr`. 이후 Task 1.4, 2.1, 2.2, 2.4, 4.x 가 소비.

- [ ] **Step 1: `:root` 에 토큰 추가** (`--kn-card-light` 정의 근처에 삽입)

```css
  /* 다크 표면 elevation (2026-07-07 프론트 개선) */
  --surface-1: #232019;
  --surface-2: #2A2620;
```

- [ ] **Step 2: `@theme inline` 블록에 색 매핑 추가** (기존 `--color-*` 매핑들 옆에)

```css
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
```

- [ ] **Step 3: 파일 하단 `@utility` 구역에 KR 디스플레이 유틸리티 추가**

```css
/* KR 헤드라인 디스플레이 규격 — EN Barlow Condensed 와의 격차 해소 (가이드 §1-1) */
@utility heading-kr {
  letter-spacing: -0.03em;
  line-height: 1.08;
  word-break: keep-all;
}
```

- [ ] **Step 4: `design-system/MASTER.md` 색 토큰 표에 두 토큰과 heading-kr 규칙 추가.** 다음 내용을 색 시스템 섹션 뒤에 삽입:

```markdown
### 표면 elevation (2026-07-07 추가)
- `--surface-1: #232019` — 다크 섹션 위 카드/nav 스크롤 상태
- `--surface-2: #2A2620` — surface-1 위의 중첩 요소 (폼 필드, 호버 상태)
- 다크 배경 위 깊이는 색이 아니라 이 두 단계 + 기존 보더 토큰으로 표현한다.

### KR 헤드라인 규격 (2026-07-07 추가)
- 모든 KR h1/h2 디스플레이에 `.heading-kr` (자간 -0.03em, 행간 1.08) 적용.
- 헤드라인 내 핵심 구절 1곳만 `text-accent` 또는 weight 대비로 강조 (portfolio 히어로의 2줄 대비 패턴을 전 페이지 표준으로).
```

- [ ] **Step 5: Verify** — 표준 검증 프로토콜 1~2번 (빌드 + dev 기동). 아직 시각 변화 없음이 정상.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css design-system/MASTER.md
git commit -m "feat: add surface elevation tokens and KR display typography utility"
```

### Task 0.3: ShaderBackdrop 공용 컴포넌트

**Files:**
- Create: `components/ui/shader-backdrop.tsx`

**Interfaces:**
- Consumes: Task 0.1 의 `@paper-design/shaders-react`
- Produces: `<ShaderBackdrop variant="hero" | "hero-sub" | "card" | "cta" seed={number} />` — absolute 포지션 배경 레이어. 이후 Task 1.2, 4.5, (Phase 3 옵션) 가 소비.

- [ ] **Step 1: 컴포넌트 전체 구현**

```tsx
'use client';

import { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import { GrainGradient, MeshGradient } from '@paper-design/shaders-react';

type Variant = 'hero' | 'hero-sub' | 'card' | 'cta';

// 가이드 §3(가드레일)·§4(파라미터 스타터) 준수: 기존 토큰만, 저휘도, 저속.
const BASE_SPEED: Record<Variant, number> = {
  hero: 0.18,
  'hero-sub': 0.15,
  card: 0.2,
  cta: 0.12,
};

class ShaderErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ShaderBackdrop({
  variant,
  seed = 0,
  className = '',
}: {
  variant: Variant;
  seed?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [canRender, setCanRender] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!document.createElement('canvas').getContext('webgl2')) return;
    } catch {
      return;
    }
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setMobile(window.matchMedia('(max-width: 1023px)').matches);
    setCanRender(true);
    // 캔버스 첫 프레임 이후 페이드인 (CSS transition — framer-motion 금지)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const host = hostRef.current;
    let io: IntersectionObserver | undefined;
    if (host) {
      io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 });
      io.observe(host);
    }
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, []);

  if (!canRender) return null; // CSS 폴백(.hero-glow 등)은 부모 마크업이 상시 유지

  const speed = reduced || !inView ? 0 : BASE_SPEED[variant];
  const common = {
    speed,
    frame: 20000 + seed * 11000, // 페이지별 다른 컷
    fit: 'cover' as const,
    minPixelRatio: mobile ? 1 : 2,
    style: { width: '100%', height: '100%' },
  };

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      <ShaderErrorBoundary>
        {variant === 'card' ? (
          <MeshGradient
            {...common}
            colors={['#FF4500', '#F59E0B', '#0D9488']}
            distortion={0.6}
            swirl={0.3}
          />
        ) : (
          <GrainGradient
            {...common}
            colorBack="#1C1917"
            colors={['#FF4500', '#F59E0B']}
            softness={0.8}
            intensity={variant === 'hero' ? 0.15 : variant === 'hero-sub' ? 0.1 : 0.08}
            noise={0.3}
          />
        )}
      </ShaderErrorBoundary>
    </div>
  );
}
```

주의: `GrainGradient`/`MeshGradient` 의 prop 이름은 0.0.77 기준. 빌드 시 타입 에러가 나면 `node_modules/@paper-design/shaders-react/dist` 의 타입 선언을 열어 실제 prop 명(`softness`/`intensity`/`noise`, `distortion`/`swirl`)을 확인하고 맞출 것 — 컨셉(저휘도 ember 그레인 / sunset 메시)은 유지.

- [ ] **Step 2: 빌드로 타입 검증**

```bash
npm run build
# 기대: 성공. 실패 시 위 주의사항대로 prop 명 교정.
```

- [ ] **Step 3: 4케이스 수동 검증.** `app/dev/shader-test/page.tsx` 를 임시 생성:

```tsx
import { ShaderBackdrop } from '@/components/ui/shader-backdrop';

export default function ShaderTest() {
  return (
    <div className="flex flex-col gap-8 bg-[#1C1917] p-8">
      {(['hero', 'hero-sub', 'card', 'cta'] as const).map((v, i) => (
        <section key={v} className="relative h-[400px]">
          <ShaderBackdrop variant={v} seed={i} />
          <p className="relative z-10 text-white">{v}</p>
        </section>
      ))}
    </div>
  );
}
```

`http://localhost:3000/dev/shader-test` 를 스크린샷으로 확인: (a) 4종 렌더, (b) DevTools 로 prefers-reduced-motion 에뮬레이션 시 정지, (c) 콘솔 에러 0. 확인 후 **테스트 페이지 삭제**.

- [ ] **Step 4: Commit**

```bash
git add components/ui/shader-backdrop.tsx
git commit -m "feat: add ShaderBackdrop with webgl2/reduced-motion/viewport guards"
```

### Task 0.4: CountUp + StickyCtaBar 컴포넌트

**Files:**
- Create: `components/ui/count-up.tsx`
- Create: `components/ui/sticky-cta-bar.tsx`

**Interfaces:**
- Produces: `<CountUp value={300} suffix="+" />`, `<StickyCtaBar />` (모바일 전용 하단 고정 문의 바). Task 1.3, 1.6, 4.x 가 소비.
- Consumes: `useLocale()` (`contexts/locale-context.tsx`), 기존 번역 키 패턴 (`lib/translations.ts`)

- [ ] **Step 1: CountUp 구현**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 초기 렌더(SSR/JS 실패/reduced-motion)는 항상 실수치를 보여준다 — 0 노출 금지.
 * (CTA 전환 분석 문서의 지적: 인앱 웹뷰 JS 실패 세션에 0 이 노출되면 신뢰 훼손)
 * 애니메이션은 뷰포트 진입이 확인된 그 순간에만 0→value 로 잠깐 역치환해 재생.
 */
export function CountUp({
  value,
  suffix = '',
  duration = 1200,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [display, setDisplay] = useState(value); // 실수치로 시작

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // 정적 유지
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
```

- [ ] **Step 2: StickyCtaBar 구현**

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/locale-context';

/** 모바일 전용: 뷰포트 1.2배 스크롤 후 하단 고정 문의 바 (가이드 §1-3) */
export function StickyCtaBar() {
  const { t } = useLocale(); // 기존 훅 시그니처와 다르면 locale-context.tsx 를 열어 실제 사용 패턴에 맞출 것
  const [show, setShow] = useState(false);

  useEffect(() => {
    // CTA 전환 분석 반영: 스크롤 33% 데드존 어디서든 진입로 확보 —
    // 히어로(자체 CTA 보유)를 벗어나는 즉시 상시 노출
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300 lg:hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <Link
        href="/contact"
        className="gradient-warm block w-full rounded-lg py-3.5 text-center font-bold text-white shadow-xl"
      >
        {t('nav.contact') /* 기존 '문의하기' 번역 키 재사용 — 실제 키 이름은 navigation.tsx 에서 확인 */}
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: 빌드 + 번역 키 확인.** `components/navigation.tsx` 를 열어 '문의하기' 버튼이 쓰는 실제 번역 키/패턴을 확인하고 Step 2 의 `t(...)` 를 일치시킨다.

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/count-up.tsx components/ui/sticky-cta-bar.tsx
git commit -m "feat: add CountUp and mobile StickyCtaBar components"
```

### Task 0.5: 검증 하네스 — 스크린샷 스크립트 + 베이스라인 캡처

**Files:**
- Create: `scripts/screenshot-audit.mjs`
- Create: `docs/plans/assets/shots/baseline/` (산출물 디렉토리)
- Modify: `package.json` (devDependency `playwright`)

**Interfaces:**
- Produces: `node scripts/screenshot-audit.mjs --routes=/,/contact --label=<id>` CLI. 모든 후속 태스크의 Verify 가 소비.

- [ ] **Step 1: playwright 설치**

```bash
npm install -D playwright
npx playwright install chromium
```

- [ ] **Step 2: 스크립트 작성**

```js
// scripts/screenshot-audit.mjs
// 사용: node scripts/screenshot-audit.mjs --routes=/,/contact --label=baseline [--base=http://localhost:3000]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const routes = arg('routes', '/').split(',');
const label = arg('label', 'shot');
const base = arg('base', 'http://localhost:3000');
const outDir = `docs/plans/assets/shots/${label}`;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${tag}] ${page.url()} ${m.text()}`));
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2500);
    const slug = r === '/' ? 'home' : r.replaceAll('/', '_').replace(/^_/, '');
    await page.screenshot({ path: `${outDir}/${slug}-${tag}-top.jpg`, quality: 85, type: 'jpeg' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/${slug}-${tag}-mid.jpg`, quality: 85, type: 'jpeg' });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'console clean');
console.log(`saved to ${outDir}`);
```

- [ ] **Step 3: 베이스라인 캡처 (개선 전 상태 보존)**

```bash
npm run dev &   # 이미 떠 있으면 생략
node scripts/screenshot-audit.mjs --routes=/,/service,/creator,/portfolio,/blog,/contact,/about,/careers --label=baseline
# 기대: docs/plans/assets/shots/baseline/ 에 32장 + "console clean"
```

- [ ] **Step 4: Lighthouse 베이스라인**

```bash
npx lighthouse http://localhost:3000 --only-categories=performance --chrome-flags="--headless" --output=json --output-path=docs/plans/assets/lh-home-baseline.json --quiet
node -e "const r=require('./docs/plans/assets/lh-home-baseline.json');console.log('LCP',r.audits['largest-contentful-paint'].displayValue,'| CLS',r.audits['cumulative-layout-shift'].displayValue,'| TBT',r.audits['total-blocking-time'].displayValue)"
# 수치를 기록해 둘 것 — Phase 1/3 게이트가 이 값과 비교
```

- [ ] **Step 5: Commit** (스크린샷 바이너리는 커밋 제외 — `.gitignore` 에 `docs/plans/assets/shots/` 추가)

```bash
echo "docs/plans/assets/shots/" >> .gitignore
git add scripts/screenshot-audit.mjs package.json package-lock.json .gitignore
git commit -m "chore: add screenshot audit harness and capture baseline"
```

**Phase 0 게이트:** Task 0.1~0.5 완료 + `npm run build` 성공 → PR `feat/fe-improve-phase-0`.

---

## Phase 1 — 홈 모바일 퍼스트 (최우선, 트래픽 78%)

### Task 1.1: 히어로 카피 보강 — KR 가치제안 + 신뢰 pill

**Files:**
- Modify: `components/hero-section.tsx`
- Modify: `lib/translations.ts` (KR/JP 키 추가)

**Interfaces:**
- Consumes: 기존 번역 구조 (`lib/translations.ts` 를 먼저 읽고 기존 키 네이밍 컨벤션을 따를 것)
- Produces: 히어로 구성 = 태그라인 pill(기존) → BEYOND/AGENCY(기존) → **가치제안 1줄(신규, '코리너스' 단어 대체)** → **신뢰 라인(신규)** → CTA 2개(기존)

- [ ] **Step 1: 번역 키 추가.** `lib/translations.ts` 의 hero 관련 구역에:

```ts
// KR
heroValueProp: '일본 진출 크리에이터 마케팅, 진단부터 성과까지 직접 운영합니다',
heroTrustLine: '수출바우처 공식 수행기관 | 누적 185개+ 브랜드',
// JP
heroValueProp: '日本進出のクリエイターマーケティングを、診断から成果まで直接運営します',
heroTrustLine: '輸出バウチャー公式遂行機関 | 累計185以上のブランド',
```

카피는 초안 확정값 — Leo 가 PR 리뷰에서 수정할 수 있게 PR 본문에 "히어로 카피 2줄 신규" 라고 명시할 것. 185개+ 는 검증 수치(Global Constraints 참조), 다른 숫자로 바꾸지 말 것.

- [ ] **Step 2: `hero-section.tsx` 수정.** 현재 '코리너스' 서브 텍스트 요소를 찾아 다음 구조로 교체 (기존 클래스 어휘 재사용):

```tsx
<p className="heading-kr mx-auto mt-6 max-w-xl text-center text-lg text-foreground/90 sm:text-xl">
  {t('heroValueProp')}
</p>
<p className="mt-3 text-center text-sm tracking-wide text-foreground/50">
  {t('heroTrustLine')}
</p>
```

`t(...)` 호출 형태는 이 파일의 기존 사용 패턴에 맞춘다. 히어로 전체 높이(min-h-screen)와 CTA 위치는 유지.

- [ ] **Step 3: Verify** — 표준 프로토콜, `--routes=/ --label=t1.1`. 390 캡처에서 확인: 첫 화면(스크롤 0) 안에 가치제안+신뢰 라인+CTA 1개 이상이 들어오는지. 안 들어오면 BEYOND 타이포 사이즈 모바일 한 단계 축소(`text-[XXrem]` 모바일 브레이크포인트 조정)로 맞춘다.

- [ ] **Step 4: Commit**

```bash
git add components/hero-section.tsx lib/translations.ts
git commit -m "feat: add value proposition and trust line to home hero"
```

### Task 1.2: 홈 히어로 셰이더 적용

**Files:**
- Modify: `components/hero-section.tsx`

**Interfaces:**
- Consumes: Task 0.3 `<ShaderBackdrop variant="hero" seed={0} />`

- [ ] **Step 1: 히어로 최상위 section 이 `relative` + `.hero-glow` 인지 확인 후, section 첫 자식으로 삽입:**

```tsx
<ShaderBackdrop variant="hero" seed={0} />
```

`.hero-glow` 클래스는 제거하지 않는다 (폴백 레이어). 기존 콘텐츠 래퍼에 `relative z-10` 이 없으면 추가.

- [ ] **Step 2: 텍스트 대비 검수.** dev 에서 BEYOND(gradient-warm-text)가 배경과 뭉개지면 콘텐츠 래퍼 뒤에 스크림 한 겹 추가:

```tsx
<div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(28,25,23,0.5),transparent_70%)]" />
```

- [ ] **Step 3: Verify** — `--routes=/ --label=t1.2` + Lighthouse 재측정:

```bash
npx lighthouse http://localhost:3000 --only-categories=performance --chrome-flags="--headless" --output=json --output-path=docs/plans/assets/lh-home-t1.2.json --quiet
```

게이트: LCP 요소가 여전히 H1 텍스트, LCP 수치가 베이스라인 대비 +20% 이내, CLS 증가 0. 미달 시 `next/dynamic(() => import(...), { ssr: false })` 로 ShaderBackdrop 을 lazy 분리 후 재측정.

- [ ] **Step 4: Commit** (셰이더 단독 커밋 — 롤백 단위)

```bash
git add components/hero-section.tsx
git commit -m "feat: living hero backdrop via GrainGradient with CSS glow fallback"
```

### Task 1.3: 홈 정보 순서 재배치 — 신뢰 블록 상단 이동 + 스탯 count-up

**Files:**
- Modify: `components/main-content.tsx` (섹션 순서)
- Modify: 스탯 렌더 컴포넌트 (Results 스탯이 있는 파일 — `components/performance.tsx` 또는 인접 파일, `300+`/`30만`/`250%` 를 grep 으로 찾을 것)
- Modify: `components/client-showcase.tsx` (축약 prop)

**Interfaces:**
- Consumes: Task 0.4 `CountUp`
- Produces: 홈 섹션 순서 = Hero → TrustSignals(마퀴) → **스탯 3종 + 로고월 축약(신뢰 블록)** → MarketOpportunity → Performance(포트폴리오) → Barriers → SolutionRoadmap → FinalCTA → ClientShowcase(전체) → FooterCTA

- [ ] **Step 1: `main-content.tsx` 를 열어 실제 섹션 순서를 확인**하고, Results 스탯 섹션(데이터로 진단하고... 300+/30만/250%)을 TrustSignals 직후로 이동. ClientShowcase 가 하단에 이미 있으므로 중복 마운트 금지 — 이동만 한다.

- [ ] **Step 2: 스탯 숫자를 CountUp 으로 교체.** 해당 컴포넌트에서:

```tsx
<CountUp value={300} suffix="+" className="..." />
<CountUp value={30} suffix="만" className="..." />
<CountUp value={250} suffix="%" className="..." />
```

기존 gradient-warm-text 클래스는 유지 (className 으로 전달).

- [ ] **Step 3: Verify** — `--routes=/ --label=t1.3`. 390 캡처에서 히어로 다음 1스크롤 안에 스탯이 보이는지 확인.

- [ ] **Step 4: Commit**

```bash
git add components/main-content.tsx components/performance.tsx components/client-showcase.tsx
git commit -m "feat: surface trust stats above the fold and animate with CountUp"
```

### Task 1.4: SolutionRoadmap 리듬 압축

**Files:**
- Modify: `components/solution-roadmap.tsx`

- [ ] **Step 1: 현 구조 파악** — 01~04 스텝 각각의 수직 패딩/마진 값을 확인.

- [ ] **Step 2: 압축 적용:** (a) 스텝당 수직 패딩 30~40% 축소 (`py-32` 급 → `py-20` 급), (b) 각 스텝을 좌(넘버+타이틀+서브) / 우(키워드 pill 3개 세로 스택) 2컬럼 그리드로 재배치해 우측 대공백 해소 (`grid lg:grid-cols-[1.5fr_1fr] items-center`), (c) 스텝 간 구분선 유지.

- [ ] **Step 3: Verify** — `--routes=/ --label=t1.4`. 데스크톱 캡처에서 홈 전체 `document.body.scrollHeight` 를 콘솔로 확인해 7,640px → 6,200px 이하인지 (목표 5,500px 은 Phase 2 마무리 시점 달성).

- [ ] **Step 4: Commit**

```bash
git add components/solution-roadmap.tsx
git commit -m "refactor: compress solution roadmap rhythm with two-column steps"
```

### Task 1.5: 데드 클릭 정리 + StickyCtaBar 장착

**Files:**
- Modify: `components/client-showcase.tsx` (로고 pill)
- Modify: 스탯 카드 컴포넌트 (Task 1.3 과 동일 파일)
- Modify: `app/layout.tsx` 또는 `components/main-content.tsx` (StickyCtaBar 마운트)

**Interfaces:**
- Consumes: Task 0.4 `StickyCtaBar`

- [ ] **Step 1: 비인터랙티브 요소 명시.** 로고 pill 과 스탯 카드에 hover 시 커서가 포인터로 보이거나 클릭 반응처럼 보이는 스타일이 있으면 제거하고 `cursor-default select-none` 명시. 포트폴리오 보유 브랜드 pill 은 반대로 `/portfolio` 링크로 감싼다 (매핑 데이터가 없으면 이 절반은 스킵하고 PR 본문에 명시).

- [ ] **Step 2: StickyCtaBar 를 홈에 마운트.** `main-content.tsx` 최하단에 `<StickyCtaBar />` 추가. FooterCTA 폼 영역과 겹치면 폼 진입 시 숨기는 조건(IntersectionObserver 로 `#consult-form` 관찰) 추가.

- [ ] **Step 3: Verify** — 390 캡처 mid 지점에서 하단 바 노출 + 폼 도달 시 사라짐 확인.

- [ ] **Step 4: Commit**

```bash
git add components/client-showcase.tsx components/performance.tsx components/main-content.tsx
git commit -m "fix: resolve dead-click affordances and add mobile sticky contact CTA"
```

### Task 1.6: Phase 1 게이트

- [ ] **Step 1:** 표준 프로토콜 전체 + Lighthouse 최종 비교 (`lh-home-phase1.json` vs baseline).
- [ ] **Step 2:** `node scripts/screenshot-audit.mjs --routes=/ --label=phase1-final` 산출물을 직접 Read 로 열어 시각 검수 (그라데이션 뭉개짐, 오버플로, 폰트).
- [ ] **Step 3:** PR `feat/fe-improve-phase-1` 생성. PR 본문에: 히어로 카피 2줄(Leo 검토 포인트), before/after 스크린샷, Lighthouse 비교표, **부대표님 감성 컨펌용 홈 히어로 캡처** 첨부.

---

## Phase 2 — 전역 크롬 (nav, 푸터, 타이포, 표면, 모션)

### Task 2.1: 푸터 확장

**Files:**
- Create: `components/layout/site-footer.tsx`
- Modify: 기존 푸터 렌더 위치 (`components/layout/footer-wrapper.tsx` 및 법인 정보 3줄이 있는 컴포넌트 — `(주)코리너스글로벌` 을 grep)

**Interfaces:**
- Consumes: `useLocale()`, 기존 법인 정보 문자열(이동), org schema 의 Instagram sameAs URL (`app/layout.tsx` 에서 복사)
- Produces: 4컬럼 표준 푸터. 기존 법인 정보 블록은 이 컴포넌트 최하단 행으로 흡수.

- [ ] **Step 1: 구현.** 구조:

```tsx
'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';

const SITEMAP = [
  { href: '/service', key: 'nav.service' },
  { href: '/creator', key: 'nav.creator' },
  { href: '/portfolio', key: 'nav.portfolio' },
  { href: '/blog', key: 'nav.blog' },
  { href: '/careers', key: 'nav.careers' },
  { href: '/about', key: 'nav.about' }, // nav 에 about 키가 없으면 translations 에 추가
] as const;

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="bg-surface-1 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[2fr_1fr_1fr]">
        {/* 1) 브랜드: 로고 + 한 줄 소개 + 문의 CTA 버튼(gradient-warm, /contact) */}
        {/* 2) 사이트맵: SITEMAP.map — text-sm text-foreground/60 hover:text-accent */}
        {/* 3) 연락: sales@koreaners.com (mailto), 인스타그램 2계정 (app/layout.tsx org schema sameAs 의 URL 그대로) */}
      </div>
      {/* 최하단: 기존 법인 정보 3줄 + 개인정보처리방침 링크 이동 */}
    </footer>
  );
}
```

주석 3곳은 설명 그대로 마크업으로 구현한다 (링크 텍스트는 translations 경유). 이메일은 반드시 `sales@koreaners.com` (다른 주소 금지).

- [ ] **Step 2: 교체 장착.** 기존 법인 정보 렌더를 SiteFooter 최하단으로 옮기고 중복 제거. 모든 페이지에서 푸터가 1회만 렌더되는지 확인.

- [ ] **Step 3: Verify** — `--routes=/,/service,/contact --label=t2.1`, footer 영역 스크린샷 확인.

- [ ] **Step 4: Commit**

```bash
git add components/layout/site-footer.tsx components/layout/footer-wrapper.tsx lib/translations.ts
git commit -m "feat: expand footer with sitemap, contact, and CTA columns"
```

### Task 2.2: nav 스크롤 상태

**Files:**
- Modify: `components/navigation.tsx`

- [ ] **Step 1:** 스크롤 상태 추가:

```tsx
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

헤더 클래스에 조건 적용: 기본 `bg-transparent`, scrolled 시 `bg-[#1C1917]/80 backdrop-blur-md border-b border-border` + 세로 패딩 한 단계 축소. transition 은 `transition-[background-color,padding] duration-300`.

- [ ] **Step 2:** 모바일 햄버거 메뉴 열림 패널 배경을 `bg-surface-1` 로, 항목 간 divider 와 하단에 문의 CTA 버튼이 있는지 확인/추가.

- [ ] **Step 3: Verify** — 스크린샷 top(투명)과 mid(블러 배경) 비교.

- [ ] **Step 4: Commit**

```bash
git add components/navigation.tsx
git commit -m "feat: nav scroll state with blur surface and compact height"
```

### Task 2.3: KR 디스플레이 규격 전 페이지 적용

**Files:**
- Modify: `components/hero-section.tsx`, `components/service-content.tsx`, `components/creator-content.tsx`, `components/portfolio-content.tsx`, `components/blog-content.tsx`, `components/careers-content.tsx`, `components/contact-landing.tsx`, `app/about/page.tsx` (각 파일의 h1/h2 디스플레이)

- [ ] **Step 1:** 각 파일의 KR h1/h2 디스플레이 요소에 `heading-kr` 클래스 추가. 이미 portfolio 히어로처럼 2줄 대비(흰색/accent)가 있는 곳은 유지, 없는 페이지(service, creator 서브 헤딩 등)는 헤드라인의 핵심 구절 1곳에 `text-accent` 적용 — 가이드 §1-1. 페이지당 accent 강조는 h1 에 1곳만.

- [ ] **Step 2: Verify** — `--routes=/,/service,/creator,/portfolio,/blog,/careers,/about --label=t2.3` 로 전 페이지 캡처 후 자간/행간 적용과 어색한 줄바꿈(keep-all) 확인.

- [ ] **Step 3: Commit**

```bash
git add components/ app/about/page.tsx
git commit -m "feat: apply KR display typography spec across page headings"
```

### Task 2.4: 표면 elevation 적용 + 모션 튜닝 + 데드 코드 정리

**Files:**
- Modify: `components/ui/fade-in.tsx` (viewport margin)
- Modify: `app/globals.css` (데드 코드)
- Modify: 카드형 컴포넌트들 (barriers 카드, 폼 필드, 포트폴리오 카드 배경)

- [ ] **Step 1: fade-in.tsx** 의 whileInView `viewport` 옵션을 `{ once: true, margin: '-15% 0px' }` 로 통일 (빠른 스크롤 빈화면 완화).

- [ ] **Step 2: 표면 적용.** 다크 섹션 위 카드 배경 `bg-card`/`bg-[#292524]` 사용처를 `bg-surface-1` 로, 그 위 중첩 요소(폼 필드 등)는 `bg-surface-2` 로 정리. 크림 섹션 카드(`--kn-card-light`)는 그대로.

- [ ] **Step 3: 데드 코드 제거:** (a) `globals.css` 의 `.dark { ... }` oklch 블록 삭제 (사이트는 `.dark` 토글 미사용 — 삭제 전 `grep -rn '"dark"\|\.dark' app components lib` 로 사용처 0 확인), (b) `package.json` 에서 `tailwindcss-animate` 제거 (`tw-animate-css` 와 중복 — 제거 전 `grep -rn 'tailwindcss-animate' .` 로 참조 0 확인), (c) body 폴백 스택에서 `'Inter',` 제거.

- [ ] **Step 4: Verify** — 빌드 + 전 페이지 스크린샷 (`--label=t2.4`) 회귀 비교. 특히 shadcn UI 컴포넌트(admin 포함)가 `.dark` 블록 삭제로 깨지지 않는지 `/admin/login` 도 육안 확인.

- [ ] **Step 5: Commit**

```bash
git add components/ui/fade-in.tsx app/globals.css package.json package-lock.json
git commit -m "refactor: surface elevation rollout, earlier reveal trigger, dead code removal"
```

### Task 2.5: Market Opportunity 스탯 카드 셰이더 (배치 C)

**Files:**
- Modify: `components/market-opportunity.tsx` (gradient-sunset 스탯 카드)

**Interfaces:**
- Consumes: Task 0.3 `<ShaderBackdrop variant="card" seed={7} />`

- [ ] **Step 1:** 스탯 카드 컨테이너(현재 `gradient-sunset` 배경, rounded-2xl)에 `relative overflow-hidden` 확인 후 첫 자식으로 `<ShaderBackdrop variant="card" seed={7} />` 삽입. `gradient-sunset` 클래스는 폴백으로 유지, 내부 스탯 콘텐츠는 `relative z-10`.

- [ ] **Step 2: 캔버스 예산 확인.** 홈의 라이브 캔버스 = 히어로(Task 1.2) + 이 카드 = 2개로 상한 도달. FinalCTA 에는 셰이더를 넣지 않는다 (가이드 배치 D 는 캔버스 예산상 보류 — PR 본문에 명시).

- [ ] **Step 3: Verify** — `--routes=/ --label=t2.5`. 카드 내부 텍스트(487만/24%/87%) 가독성 확인, 흐림 시 카드에 `bg-[#1C1917]/10` 스크림 한 겹.

- [ ] **Step 4: Commit**

```bash
git add components/market-opportunity.tsx
git commit -m "feat: animate market opportunity stat card with mesh gradient shader"
```

**Phase 2 게이트:** 전 페이지 스크린샷 회귀 검수 → PR `feat/fe-improve-phase-2`.

---

## Phase 3 — 전환 아키텍처 (/contact + 홈 CTA 경로)

CTA 전환 분석(`260707-분석-코리너스-랜딩-CTA전환-개선.md`) 반영으로 개정. 방문 97%가 인앱 웹뷰 — 화면에 보이는 버튼이 사실상 유일한 액션 경로라는 전제로 설계한다.

### Task 3.0: Lead 이벤트 발화 검증 (Phase 3 전체의 전제 조건)

**Files:**
- 없음 (코드 변경 없이 검증만. 발화 안 되면 여기서 수정 태스크 파생)

- [ ] **Step 1:** 폼 컴포넌트(`grep -rn 'consult-form\|fbq' components/`)에서 제출 성공 시 `fbq('track', 'Lead')` 와 GA4 `generate_lead` 호출 코드의 존재 여부/위치 확인.
- [ ] **Step 2:** dev 환경 테스트 제출(내용에 `[테스트 - 무시]` 명시) 후 Playwright network 캡처로 facebook 트래킹 요청과 GA collect 요청이 실제로 나가는지 확인. Meta Events Manager 테스트 이벤트 확인은 Leo 계정 권한 필요 — PR 본문에 확인 요청으로 남긴다.
- [ ] **Step 3:** 결과를 PR 본문에 기록. **발화 누락 시 이 수정이 Phase 3 의 최우선 커밋이 된다** (Lead 최적화 캠페인 전환은 광고 계정측 작업 — 코드 범위 밖, Leo 에게 이관).

### Task 3.1: 폼 상태 UX — 인라인 유효성 + 제출 상태 + 필수 필드 축소(게이트)

**Files:**
- Modify: 폼 컴포넌트 (`grep -rn 'consult-form' components/` 로 특정 — FooterCTA 계열)

**Interfaces:**
- 금지: 필드 name/필수 구성, submit 핸들러 로직, Meta Pixel 호출(`fbq`), Supabase/Notion/Slack 파이프라인 수정. 오직 프레젠테이션 레이어만.

- [ ] **Step 1: 인라인 유효성.** 각 필드 blur 시 검증(이메일 형식, 전화 10~11자리 숫자)해 필드 하단에 `text-xs text-accent` 로 메시지. 기존 헬퍼 텍스트는 에러 시에만 accent 로 전환.

- [ ] **Step 2: 제출 상태 3종.** submitting(버튼 스피너 + disabled), success(폼 영역을 성공 메시지 카드로 교체 — "문의가 접수됐습니다. 1영업일 내 연락드립니다" KR/JP translations 경유), error(버튼 하단 재시도 안내). 기존 핸들러의 성공/실패 분기에 상태 set 만 연결.

- [ ] **Step 3: 필드 위계.** 폼 필드 배경 `bg-surface-2`, focus 시 `border-accent` + soft glow(`ring-1 ring-[#FF4500]/30`).

- [ ] **Step 3.5: 필수 필드 축소 (Leo 컨펌 게이트).** CTA 전환 분석 권고: 필수 8개 → 4개(이름, 연락처, 회사명, 문의내용). 직급/이메일은 선택으로 강등, **마케팅활용동의는 필수 해제**(개인정보보호법상 마케팅 동의는 선택이어야 함 — 법적 근거 있는 항목). 실행 조건: (a) Leo 1줄 컨펌, (b) 프론트 required 변경과 함께 서버측/API 검증 로직(`app/api/` 의 문의 핸들러)도 동기화 — 프론트만 풀면 400 에러 발생, (c) Supabase/Notion/Slack 파이프라인이 빈 값을 허용하는지 확인. 미컨펌 시 스킵하고 PR 본문에 명시.

- [ ] **Step 4: 픽셀 무결성 검증.** dev 에서 테스트 제출 1회 후:

```bash
# screenshot-audit.mjs 실행 중 콘솔에서 fbq 에러가 없는지 + 네트워크에 facebook 트래킹 요청이 나가는지
# Playwright 로 /contact 접속 → 폼 채움 → 제출 → page.on('request') 에 'facebook' 포함 요청 존재 확인
```

테스트 제출이 실데이터 파이프라인(Notion/Slack)에 들어가므로 제출 내용에 `[테스트 - 무시]` 를 명시하고 PR 본문에 알린다.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: inline validation and submit states for contact form (presentation only)"
```

### Task 3.2: 폼 주변 신뢰 요소 + 히어로 정적 셰이더 (옵션 플래그)

**Files:**
- Modify: `components/contact-landing.tsx`

- [ ] **Step 1: 신뢰 요소.** 폼 카드 직상단에 대표 브랜드 로고 3개(기존 `/public/logos/` 에서 medicube, d'Alba 급 인지도 순) + "수출바우처 공식 수행기관" pill 재노출. 새 수치 추가 금지.

- [ ] **Step 2: 히어로 정적 셰이더.** `<ShaderBackdrop variant="hero-sub" seed={9} />` 를 넣되 이 페이지 한정 정적으로 — ShaderBackdrop 에 `forceStatic?: boolean` prop 을 추가해 `speed 0` 강제 (드로우 1회 비용). 기본값 false 라 다른 사용처 영향 없음.

- [ ] **Step 3: Verify** — Lighthouse `/contact` before/after (`lh-contact-*.json`), LCP/CLS 회귀 없음 확인. 회귀 시 Step 2 만 revert.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: trust elements near form and static hero shader on contact"
```

### Task 3.3: CTA 페이지 이동 제거 — 같은 페이지 폼 모달/바텀시트

**Files:**
- Create: `components/ui/inquiry-sheet.tsx`
- Modify: `components/hero-section.tsx` (1차 CTA), `components/ui/sticky-cta-bar.tsx` (연결 대상 교체)

**Interfaces:**
- Consumes: 기존 문의 폼 컴포넌트 (Task 3.1 이 다듬은 것을 재사용 — 폼 로직 중복 구현 금지, 같은 컴포넌트를 시트 안에 마운트)
- Produces: `<InquirySheet open onOpenChange />` — 모바일 바텀시트/데스크톱 다이얼로그. 홈 히어로 1차 CTA 와 StickyCtaBar 가 `/contact` 이동 대신 이 시트를 연다.

- [ ] **Step 1:** 기존 Radix `Dialog`(`components/ui/` 의 shadcn dialog) 기반으로 InquirySheet 구현: 모바일 `max-h-[92dvh] overflow-y-auto` 하단 시트 스타일, 데스크톱 중앙 다이얼로그. 내부에 기존 문의 폼 컴포넌트 마운트 (id 충돌 방지 — 폼 컴포넌트가 `id="consult-form"` 을 하드코딩하면 prop 으로 분기).
- [ ] **Step 2:** 홈 히어로 1차 CTA(무료 상담 신청)와 StickyCtaBar 의 `href="/contact"` 를 시트 오픈으로 교체. 2차 CTA(성공 사례 보기)와 nav 의 문의하기 버튼은 기존 동작 유지 (인앱 웹뷰에서 페이지 이동 최소화가 목적 — 전면 교체는 A/B 검증 후).
- [ ] **Step 3:** 시트 안 폼 제출 시에도 Task 3.0 의 Lead 이벤트가 동일하게 발화하는지 재검증 (같은 컴포넌트 재사용이므로 통과가 정상).
- [ ] **Step 4: Verify** — 390 캡처: 히어로 CTA 탭 → 시트 오픈 → 폼 입력 가능. 콘솔 에러 0.
- [ ] **Step 5: Commit**

```bash
git add components/ui/inquiry-sheet.tsx components/hero-section.tsx components/ui/sticky-cta-bar.tsx
git commit -m "feat: in-page inquiry sheet replacing contact page navigation from primary CTAs"
```

### Task 3.4: 수치 정합 — 마퀴 라벨 분리

**Files:**
- Modify: `components/trust-signals.tsx` (마퀴 문구), `lib/translations.ts`

- [ ] **Step 1:** 현재 마퀴의 `300+ BRAND PARTNERS` 는 검증 수치(누적 브랜드 185개+)와 충돌. `meta-ads-automation/config/verified_numbers.json` 의 `ad_safe_claims` 를 열어 캠페인/브랜드 수치의 검증값을 확인하고, 마퀴를 검증값 기반 라벨로 교체 (예: 캠페인 수와 브랜드 수 라벨 분리 — 정확한 문구는 verified_numbers 값으로 조립).
- [ ] **Step 2:** 사이트 전역 grep 으로 `300+` 급 수치 사용처를 모두 나열해 PR 본문에 표로 첨부 (홈 스탯 300+ 주요 크리에이터 포함 — 크리에이터 검증값은 220명+). 교체는 verified 값이 확인된 것만, 불확실한 것은 표에 "확인 필요" 로 남긴다.
- [ ] **Step 3: Verify + Commit**

```bash
git add components/trust-signals.tsx lib/translations.ts
git commit -m "fix: reconcile marquee and stat figures with verified numbers"
```

- [ ] **Phase 3 PR.** PR `feat/fe-improve-phase-3` 본문에 "전환 페이지 — 머지 후 1주 Clarity/픽셀 전환 수 관찰 + Lead 이벤트 검증 결과 + 수치 정합 표" 명시.

---

## Phase 4 — 서브페이지

### Task 4.1: Service 프로세스 타임라인

**Files:**
- Modify: `components/service-content.tsx`
- Create: `components/service/process-timeline.tsx`

- [ ] **Step 1:** 4단계 프로세스(기존 translations 의 01~04 타이틀 재사용)를 가로 타임라인으로: 넘버(accent, Barlow Condensed) + 타이틀 + 1줄 설명 + 연결선(`border-t border-border` + accent 진행 도트). 모바일은 세로 스택. 신규 컴포넌트로 분리, 기존 pill/라인/넘버 어휘만 사용 (새 일러스트 금지).

- [ ] **Step 2:** service 본문 텍스트 월 구간의 수직 패딩을 Task 1.4 와 같은 비율로 압축.

- [ ] **Step 3: Verify + Commit**

```bash
git add components/service/process-timeline.tsx components/service-content.tsx
git commit -m "feat: service process timeline and rhythm compression"
```

### Task 4.2: Creator 익명 통계 그리드

**Files:**
- Modify: `components/creator-content.tsx`
- Create: `components/creator/network-stats.tsx`

**Interfaces:**
- 금지: 새 수치 도입, 크리에이터 실명/사진/핸들 노출. 기존 페이지에 이미 있는 텍스트 콘텐츠(플랫폼 3종 전문성, 성별연령 세분화, 200명+ 문구)만 시각 승격.

- [ ] **Step 1:** `SHOW_CREATOR_CARDS = false` 분기 아래(카드 그리드가 비어 있는 자리)에 `NetworkStats` 렌더: 좌 카드 = 플랫폼 3종(Instagram/TikTok/YouTube 아이콘 + 기존 설명문), 우 카드 = 성별연령 4구간(기존 설명문), 상단 스탯 = `<CountUp value={200} suffix="명+" />` (기존 200명+ 문구 재사용). 카드 배경 `bg-surface-1`, 아이콘은 Lucide 만.

- [ ] **Step 2:** 합류 Dialog 가 모바일에서 풀스크린에 가깝게 열리는지 확인, 아니면 `max-h-[90dvh] overflow-y-auto` 적용.

- [ ] **Step 3: Verify + Commit**

```bash
git add components/creator/network-stats.tsx components/creator-content.tsx
git commit -m "feat: anonymized creator network stats grid replacing hidden card area"
```

### Task 4.3: Portfolio 인덱스 톤 통일 + 상세 보강

**Files:**
- Modify: `components/portfolio-content.tsx` (인덱스 카드)
- Modify: `components/portfolio/portfolio-detail-view.tsx` (상세)

- [ ] **Step 1: 인덱스 카드 오버레이 규격.** 썸네일 이미지 위에 하단 그라데이션(`bg-gradient-to-t from-[#1C1917]/70 to-transparent`) + 카테고리 pill 위치를 좌상단 고정으로 통일 (로고형/사진형 썸네일의 톤 편차 흡수). 카드 전체를 Link 로 감싸 클릭 영역 확대.

- [ ] **Step 2: 상세 보강.** (a) 히어로 이미지 아래 KPI 밴드 — `Portfolio` 타입에 성과 필드가 있으면 CountUp 3개로 렌더, 없으면 섹션 자체를 렌더하지 않음 (타입은 `lib/` 의 Portfolio 정의 확인). (b) 본문 하단에 같은 category 포트폴리오 2~3장 "관련 사례" 그리드 (이미 서버에서 fetch 하는 목록 재사용 또는 Supabase 쿼리 1개 추가). (c) 최하단 문의 CTA 밴드: `<ShaderBackdrop variant="cta" seed={3} />` 배경 + 헤드라인 + /contact 버튼.

- [ ] **Step 3: Verify** — `/portfolio` 와 상세 1건 스크린샷, 페이지당 캔버스 수 1 확인.

- [ ] **Step 4: Commit**

```bash
git add components/portfolio-content.tsx components/portfolio/portfolio-detail-view.tsx
git commit -m "feat: portfolio card overlay standard, detail KPI band, related cases, CTA"
```

### Task 4.4: Blog 인덱스 카테고리 아트 + 상세 리딩 개선

**Files:**
- Create: `app/dev/blog-art/page.tsx` (dev 전용, production 은 notFound)
- Create: `scripts/bake-blog-art.mjs`
- Create: `public/blog-art/` (산출 에셋)
- Modify: `components/blog-content.tsx` (카드 썸네일 폴백)
- Modify: `components/blog/blog-post-view.tsx` (크림 본문 + TOC + 진행 바)
- Create: `components/blog/reading-progress.tsx`

- [ ] **Step 1: 아트 베이크 페이지.** `app/dev/blog-art/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { GrainGradient } from '@paper-design/shaders-react';

const CATEGORIES = [
  { slug: 'expert-insight', colors: ['#FF4500', '#F59E0B'], frame: 12000 },
  { slug: 'industry-trend', colors: ['#F59E0B', '#FF4500'], frame: 47000 },
  { slug: 'default', colors: ['#FF4500', '#0D9488'], frame: 83000 },
];

export default function BlogArt() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="flex flex-col gap-4 bg-black p-4">
      {CATEGORIES.map((c) => (
        <div key={c.slug} data-art={c.slug} style={{ width: 1200, height: 630 }}>
          <GrainGradient colorBack="#1C1917" colors={c.colors} softness={0.8} intensity={0.35} noise={0.35} speed={0} frame={c.frame} fit="cover" style={{ width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
}
```

카테고리 slug 는 실제 블로그 카테고리 값(`blog-content.tsx` 의 카테고리 필드)을 확인해 맞춘다.

- [ ] **Step 2: 베이크 스크립트.** `scripts/bake-blog-art.mjs` — playwright 로 `/dev/blog-art` 접속, `[data-art]` 요소별 `elementHandle.screenshot({ path: 'public/blog-art/<slug>.jpg', quality: 88, type: 'jpeg' })`. 실행 후 산출물 커밋.

- [ ] **Step 3: 카드 적용.** `blog-content.tsx` 카드 썸네일 로직에 폴백 체인: 포스트 고유 썸네일 → `/blog-art/<category>.jpg` → `/blog-art/default.jpg`. 현재처럼 동일 로고 타일이 3장 반복되는 상태 제거.

- [ ] **Step 4: 상세 크림 리딩 표면.** `blog-post-view.tsx` 본문 래퍼를 `bg-[#FAF7F2] text-[#1C1917] rounded-2xl` 카드로 전환하고, `globals.css` 의 `.blog-content-wrapper .prose` 오버라이드 중 다크 전제 색 지정(밝은 글자색, 다크 배경 코드블록 등)을 라이트 기준으로 교정. 본문 폭 `max-w-[65ch]`, 행간 `leading-relaxed` 이상 확인.

- [ ] **Step 5: 읽기 진행 바.** `components/blog/reading-progress.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent" style={{ transform: `scaleX(${p})` }} />;
}
```

blog-post-view 에 마운트. TOC 는 h2 가 3개 이상일 때만: useEffect 로 `.blog-content-wrapper h2` 스캔 → xl 이상에서 우측 sticky 목록 (앵커 스크롤), 미만에서는 생략.

- [ ] **Step 6: Verify + Commit**

```bash
node scripts/bake-blog-art.mjs && node scripts/screenshot-audit.mjs --routes=/blog --label=t4.4
git add app/dev/blog-art scripts/bake-blog-art.mjs public/blog-art components/blog-content.tsx components/blog/ app/globals.css
git commit -m "feat: shader-baked blog category art, cream reading surface, progress bar and TOC"
```

### Task 4.5: 서브 히어로 셰이더 롤아웃

**Files:**
- Modify: `components/service-content.tsx`, `components/creator-content.tsx`, `components/portfolio-content.tsx`, `components/blog-content.tsx`, `components/careers-content.tsx`, `app/about/page.tsx`

**Interfaces:**
- Consumes: Task 0.3 `<ShaderBackdrop variant="hero-sub" seed={n} />`

- [ ] **Step 1:** 각 페이지 히어로 section (hero-glow 클래스가 있는 곳)에 삽입 — seed: service 1, creator 2, portfolio 3, blog 4, careers 5, about 6. hero-glow 유지, 콘텐츠 `relative z-10` 확인. about 은 서버 컴포넌트이므로 ShaderBackdrop(클라이언트)을 직접 import 해 삽입하면 된다 (경계 자동 생성).

- [ ] **Step 2: 캔버스 예산 감사.** 각 라우트에서 동시 마운트 캔버스 수를 세어 2 이하 확인 (portfolio 상세 CTA 밴드와 히어로가 같은 페이지면 히어로 우선, CTA 밴드는 유지하되 IO 정지 동작 확인).

- [ ] **Step 3: Verify** — 전 서브페이지 스크린샷 + 연속 페이지 이동 10회 후 캔버스 소실(빈 배경) 없는지 확인.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: roll out hero-sub shader backdrop across sub pages with per-page seeds"
```

### Task 4.6: About 정돈 + JP 표기 검수 + 접근성 마감

**Files:**
- Modify: `app/about/page.tsx`, `lib/translations.ts`, `app/globals.css`

- [ ] **Step 1: about 스탯 블록** 을 Task 4.2 의 카드 어휘로 정돈 + CountUp 적용 (수치는 기존 값 그대로).

- [ ] **Step 2: JP 표기.** `lib/translations.ts` 에서 `コリナース` 검색. **머지 전 Leo 1줄 컨펌 필수** — 권고안은 `コリアナーズ` (KOREANERS 의 -ners 발음. 현행 표기는 "코리아 널스(간호사)"로 읽힐 여지). 컨펌 후 치환, 미컨펌 시 이 스텝만 보류하고 PR 본문에 명시.

- [ ] **Step 3: 접근성 마감.** (a) `globals.css` 에 전역 포커스 스타일:

```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--accent-orange);
    outline-offset: 2px;
  }
}
```

(b) 다크 위 서브카피 회색이 4.5:1 미달인 곳(`text-foreground/50` 이하 본문 텍스트)을 `/60` 이상으로 상향 — 대비 계산은 #FAF7F2 대 #1C1917 기준.

- [ ] **Step 4: Verify + Commit + PR** `feat/fe-improve-phase-4`.

```bash
git commit -am "feat: about stats polish, JP transliteration fix, a11y focus and contrast pass"
```

---

## 최종 게이트 (Phase 4 머지 후)

- [ ] 전 페이지 스크린샷 스윕 (`--label=final`) 을 baseline 과 나란히 검수.
- [ ] Lighthouse 3종 (`/`, `/contact`, `/blog` 상세) 베이스라인 비교 — LCP +10% 이내, CLS 동일, TBT +50ms 이내.
- [ ] `design-system/MASTER.md` 에 Shader Layer 섹션이 반영됐는지 확인 (셰이더 별첨 가이드 §6 의 허용/금지 목록).
- [ ] 2주 후 Clarity 재측정 기준선 기록: 평균 스크롤 깊이(30일 모바일 13.9% / 최근 3일 전체 33% — 측정창 명시해 비교), CTA 클릭률과 폼 시작률(성과 판정 지표), 데드 클릭, 홈 → 폼 제출 퍼널. (운영 태스크 — Leo 캘린더)

## 백로그 — CTA 전환 분석의 빅베팅 (A/B 또는 별도 결정 후 착수)

`260707-분석-코리너스-랜딩-CTA전환-개선.md` 의 고임팩트 항목 중 본 계획에 넣지 않은 것. 착수 시 별도 태스크로 구체화한다.

1. **히어로 직하단 3필드 미니폼** — 폼 시작률 상승 기대가 크지만 리드 품질 리스크 동시 검증 필요. Task 3.3(시트) 성과 확인 후 판단.
2. **Meta 유료 전용 LP(`/lp/japan`) 분기** — 광고 도착지 전략과 묶임. `docs/plans/2026-07-06-ad-landing-funnel-plan.md` 의 /contact 통합 구조와 충돌하지 않게 그 플랜의 후속으로 다룬다.
3. **히어로 H1 재작성** — "일본에서 팔리는 한국 브랜드를 만듭니다" 방향, BEYOND AGENCY 는 태그라인 격하. 브랜드 시그니처(디자인 가이드)와 전환 카피(CTA 분석)가 충돌하는 지점 — Leo 결정 + A/B 전제. 본 계획의 Task 1.1(가치제안 1줄 추가)이 저리스크 선행 버전.
4. **1차 CTA 문구 교체** ("무료 상담 신청" → "무료 일본 진출 진단 받기") — A/B 인프라 없이는 전후 비교만 가능. Task 3.3 배포와 분리해 단독 커밋으로.
5. **Meta 캠페인 Lead 최적화 전환 + 소재별 utm_content** — 코드 범위 밖(광고 계정 + `meta-ads-automation/scripts/set_url_tags_active_ads.py` 기존 잔여 작업). Leo 이관.

## 태스크 의존성 요약

```
Phase 0 (0.1 → 0.3, 0.2/0.4/0.5 병렬) → Phase 1 (1.1 → 1.2, 1.3 → 1.5, 1.4 병렬) → Phase 2 (2.1~2.5 병렬 가능)
Phase 3 은 Phase 0 만 선행하면 착수 가능 (Phase 1/2 와 독립). 내부 순서: 3.0(전제) → 3.1 → 3.3, 3.2/3.4 병렬
Phase 4 는 Phase 0 + 2.3(heading-kr) 선행 권장
```
