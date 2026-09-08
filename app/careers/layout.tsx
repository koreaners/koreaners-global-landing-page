import type { Metadata } from "next";
import { getCareerJobs, type CareerJob } from "@/lib/notion/careers";

export const metadata: Metadata = {
  title: "채용 | 코리너스와 함께 성장하세요",
  description:
    "코리너스 채용 정보. 일본 마케팅, 크로스보더 비즈니스에 관심 있는 인재를 찾습니다.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "채용 | 코리너스 KOREANERS",
    description: "코리너스 채용 정보. 크로스보더 마케팅 인재를 찾습니다.",
  },
};

export const revalidate = 60;

function buildJobPostingLd(roles: CareerJob[]) {
  return roles.flatMap((role) => {
    // validThrough: datePosted + 90일 (Notion 에 명시적 만료일 없을 때 default)
    const datePosted = role.startDate ?? new Date().toISOString().slice(0, 10);
    const validThrough = new Date(datePosted);
    validThrough.setDate(validThrough.getDate() + 90);

    // 만료된 공고는 JobPosting 에서 제외 (Google 은 validThrough 지난 공고를 오류로 봄)
    if (validThrough < new Date()) return [];

    return [{
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: role.title,
    description:
      role.note ||
      `${role.title} — 코리너스(KOREANERS) 크로스보더 인플루언서 마케팅 에이전시 포지션. 상세 JD와 지원 링크를 공고 페이지에서 확인해주세요.`,
    datePosted,
    validThrough: validThrough.toISOString().slice(0, 10),
    hiringOrganization: {
      "@type": "Organization",
      "@id": "https://www.koreaners.co/#organization",
      name: "코리너스 KOREANERS",
      sameAs: "https://www.koreaners.co",
      logo: "https://www.koreaners.co/icon-512.png",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "KR",
        addressRegion: "Seoul",
      },
    },
    employmentType: "FULL_TIME",
    applicantLocationRequirements: {
      "@type": "Country",
      name: "KR",
    },
    directApply: false,
    ...(role.applyUrl ? { url: role.applyUrl } : {}),
    identifier: {
      "@type": "PropertyValue",
      name: "KOREANERS",
      value: role.id,
    },
    }];
  });
}

export default async function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roles = await getCareerJobs({ includeClosed: false });
  const ldJson = buildJobPostingLd(roles);
  return (
    <>
      {ldJson.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
        />
      )}
      {children}
    </>
  );
}
