import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그 | 일본 마케팅 인사이트 & 트렌드",
  description:
    "일본 시장 트렌드, 인플루언서 마케팅 전략, K-뷰티 일본 진출 노하우 등 크로스보더 마케팅 인사이트를 공유합니다.",
  openGraph: {
    title: "블로그 | 코리너스 KOREANERS",
    description:
      "일본 마케팅 트렌드, 인플루언서 전략, 크로스보더 마케팅 인사이트.",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
