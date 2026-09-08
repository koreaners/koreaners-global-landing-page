import React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { Barlow_Condensed, Playfair_Display, Noto_Sans_JP } from "next/font/google";
import { safeJsonLdStringify } from "@/lib/json-ld";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { FooterWrapper } from "@/components/layout/footer-wrapper";
import { LocaleProvider } from "@/contexts/locale-context";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { UtmTracker } from "@/components/common/UtmTracker";
import ClarityProvider from "./ClarityProvider";
import AgentationProvider from "./AgentationProvider";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["italic"],
  variable: "--font-accent",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});


// 환경 변수 — 프로덕션 도메인을 폴백으로 사용 (VERCEL_URL 폴백 시 canonical이 깨짐)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : "https://www.koreaners.co";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "코리너스 | KOREANERS - 크로스보더 인플루언서 마케팅 전문 에이전시",
    template: "%s | 코리너스 KOREANERS",
  },
  description:
    "크로스보더 인플루언서 마케팅 전문 대행사 코리너스. 185+ 브랜드, 220+ 주요 크리에이터. 인플루언서 캠페인, 시딩, 콘텐츠 제작, 데이터 리포팅까지 크로스보더 마케팅 전 과정을 설계하고 운영합니다.",
  keywords: [
    "코리너스",
    "KOREANERS",
    "일본 인플루언서 마케팅 대행사",
    "일본 인플루언서 마케팅",
    "일본 마케팅 대행",
    "일본 인플루언서 섭외",
    "크로스보더 마케팅",
    "일본 진출",
    "일본 시딩",
    "일본 체험단",
    "일본 SNS 마케팅",
    "K-뷰티 일본",
    "Korean influencer marketing agency",
    "韓国 インフルエンサー マーケティング",
  ],
  verification: {
    google: "TevxoNyzDOk6ZIWhhkwYSrGTNwj3Y1T9TYGUnsBYlZU",
    other: {
      "naver-site-verification": "223270d36646f19566b9451e5f6775ac2996dbf2",
      "facebook-domain-verification": "zvee90i9i5809r573p525pqm6ekuta",
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: "코리너스 KOREANERS",
    title: "코리너스 | KOREANERS - 크로스보더 인플루언서 마케팅 전문 에이전시",
    description:
      "크로스보더 인플루언서 마케팅 전문 대행사 코리너스. 185+ 브랜드, 220+ 주요 크리에이터. 캠페인, 시딩, 콘텐츠, 리포팅까지.",
    url: baseUrl,
    locale: "ko_KR",
    images: [
      {
        url: "/images/logo.png",
        width: 800,
        height: 400,
        alt: "코리너스 KOREANERS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "코리너스 | KOREANERS",
    description:
      "크로스보더 인플루언서 마케팅, 시딩, 콘텐츠 제작까지. 글로벌 마케팅 전문 에이전시.",
    images: ["/images/logo.png"],
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      'ko': baseUrl,
      'x-default': baseUrl,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${barlowCondensed.variable} ${playfairDisplay.variable} ${notoSansJP.variable}`}>
      <body
        className="flex min-h-screen flex-col font-body antialiased bg-black text-base"
      >
        {/* 구조화 데이터 — 서버 렌더링 (afterInteractive에서 전환, 크롤러 즉시 인식) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdStringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": "https://www.koreaners.co/#organization",
                name: "코리너스",
                alternateName: "KOREANERS",
                url: "https://www.koreaners.co",
                logo: {
                  "@type": "ImageObject",
                  url: "https://www.koreaners.co/images/logo.png",
                  width: 800,
                  height: 400,
                },
                image: "https://www.koreaners.co/images/logo.png",
                description:
                  "크로스보더 인플루언서 마케팅 전문 대행사. 185+ 브랜드, 220+ 주요 크리에이터. 캠페인, 시딩, 콘텐츠, 리포팅까지.",
                foundingDate: "2022",
                areaServed: [
                  { "@type": "Country", name: "South Korea" },
                  { "@type": "Country", name: "Japan" },
                ],
                knowsLanguage: ["ko", "ja"],
                sameAs: [
                  "https://www.instagram.com/koreaners_global",
                  "https://www.instagram.com/paripari.korea",
                ],
                address: {
                  "@type": "PostalAddress",
                  streetAddress: "논현로36길 31, B1, 4F, 5F",
                  addressLocality: "Seoul",
                  addressRegion: "강남구",
                  postalCode: "06296",
                  addressCountry: "KR",
                },
                telephone: "+82-10-2368-2009",
                contactPoint: [
                  {
                    "@type": "ContactPoint",
                    telephone: "+82-10-2368-2009",
                    email: "sales@koreaners.com",
                    contactType: "sales",
                    availableLanguage: ["Korean", "Japanese"],
                    areaServed: ["KR", "JP"],
                  },
                  {
                    "@type": "ContactPoint",
                    telephone: "+82-10-2368-2009",
                    email: "sales@koreaners.com",
                    contactType: "customer support",
                    availableLanguage: ["Korean", "Japanese"],
                  },
                ],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": "https://www.koreaners.co/#website",
                name: "코리너스",
                alternateName: "KOREANERS",
                url: "https://www.koreaners.co",
                publisher: { "@id": "https://www.koreaners.co/#organization" },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: "https://www.koreaners.co/blog?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
                inLanguage: ["ko", "ja"],
              },
              {
                "@context": "https://schema.org",
                "@type": "ProfessionalService",
                "@id": "https://www.koreaners.co/#professionalservice",
                parentOrganization: { "@id": "https://www.koreaners.co/#organization" },
                name: "코리너스",
                alternateName: "KOREANERS",
                url: "https://www.koreaners.co",
                logo: "https://www.koreaners.co/images/logo.png",
                priceRange: "$$",
                areaServed: [
                  { "@type": "Country", name: "South Korea" },
                  { "@type": "Country", name: "Japan" },
                ],
                hasOfferCatalog: {
                  "@type": "OfferCatalog",
                  name: "크로스보더 마케팅 서비스",
                  itemListElement: [
                    {
                      "@type": "Offer",
                      itemOffered: {
                        "@type": "Service",
                        name: "일본 인플루언서 마케팅",
                        description: "일본 현지 인플루언서를 활용한 브랜드 마케팅 캠페인 기획 및 운영",
                      },
                    },
                    {
                      "@type": "Offer",
                      itemOffered: {
                        "@type": "Service",
                        name: "대량 시딩",
                        description: "일본 크리에이터 네트워크를 통한 제품 체험 및 리뷰 콘텐츠 확산",
                      },
                    },
                    {
                      "@type": "Offer",
                      itemOffered: {
                        "@type": "Service",
                        name: "콘텐츠 제작",
                        description: "일본 시장 맞춤 마케팅 콘텐츠 기획 및 제작",
                      },
                    },
                    {
                      "@type": "Offer",
                      itemOffered: {
                        "@type": "Service",
                        name: "데이터 리포팅",
                        description: "캠페인 성과 분석 및 데이터 기반 인사이트 리포트 제공",
                      },
                    },
                  ],
                },
              },
            ]),
          }}
        />
        <LocaleProvider>
          <ClarityProvider />
          <ScrollToTop />
          <UtmTracker />
          {children}
          <FooterWrapper />
        </LocaleProvider>
        <Toaster />
        <AgentationProvider />
        <Analytics />
        {/* GA4 - 환경변수로 관리 */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        {/* Meta Pixel - 환경변수로 관리 */}
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <>
            <Script id="fb-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window,document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height={1}
                width={1}
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_FB_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}
