// 브랜드 사전 정보 시트 (/partners) 질문 정의.
// 원본: 구글폼 「[KRNS] 파트너십 사전 정보 시트」 (2026-09-30, 심혜연 작성) 9섹션 29문항.
// 폼 렌더링·API 검증·Slack 카드가 모두 이 목록을 쓴다. 질문을 바꾸면 brand_briefs 컬럼도 함께 바꾼다.

export type BriefFieldType = "short" | "long" | "email" | "radio" | "checkbox";

export interface BriefField {
  key: string; // brand_briefs 컬럼명
  label: string;
  type: BriefFieldType;
  required?: boolean;
  help?: string;
  options?: string[]; // radio/checkbox. 「기타」 직접 입력은 항상 허용
}

export interface BriefSection {
  title: string;
  help?: string;
  fields: BriefField[];
}

// 원본 폼의 파일 업로드 문항(소개서·로고·제품 사진)은 링크 입력으로 받는다.
const FILE_HELP = "구글 드라이브 등 공유 링크를 붙여주세요. 파일로 보내실 경우 sales@koreaners.com (메일 제목에 브랜드명)";

export const BRIEF_SECTIONS: BriefSection[] = [
  {
    title: "담당자 정보",
    fields: [
      { key: "contact_name", label: "담당자 성함", type: "short", required: true, help: "예) 김민지" },
      { key: "contact_title", label: "직함/부서", type: "short", required: true, help: "예) 마케팅팀 대리" },
      { key: "email", label: "이메일", type: "email", required: true, help: "예) minji.kim@brand.com" },
      {
        key: "decision_maker",
        label: "최종 의사결정은 누가 하시나요?",
        type: "short",
        required: true,
        help: "담당자 본인인지, 별도 컨펌 라인이 있는지 알려주세요. 예) 대표이사 최종 컨펌 필요",
      },
    ],
  },
  {
    title: "브랜드/제품 소개",
    fields: [
      { key: "brand_name", label: "브랜드명 (한글/영문)", type: "short", required: true, help: "공식 표기 그대로 적어주세요. 예) 코리너스 / KOREANERS" },
      { key: "intro_deck_url", label: "브랜드/회사 소개서 (링크)", type: "short", help: `PDF/PPT 형태의 소개서. ${FILE_HELP}` },
      {
        key: "products",
        label: "소개하고 싶은 제품/서비스",
        type: "long",
        required: true,
        help: "이번 캠페인에서 다룰 제품 라인업을 알려주세요. 예) 이너케어 5종 (오메가3, 유산균 등)",
      },
      {
        key: "selling_points",
        label: "제품의 핵심 셀링포인트",
        type: "long",
        required: true,
        help: "소비자에게 가장 어필하고 싶은 포인트 2~3가지. 예) \"산부인과 전문의 공동개발\", \"천연 유래 성분 100%\"",
      },
      { key: "brand_history", label: "브랜드 히스토리·수상 이력·인증 (있다면)", type: "long", help: "없으면 비워두셔도 됩니다. 예) 2023 우수벤처기업 인증" },
    ],
  },
  {
    title: "타겟 및 시장",
    fields: [
      { key: "target_countries", label: "이번 캠페인의 타겟 국가", type: "checkbox", options: ["일본", "대만"], help: "여러 국가면 모두 선택해주세요" },
      { key: "domestic_target", label: "국내 핵심 타겟 고객", type: "long", help: "연령/성별/라이프스타일 등. 예) 25~35세 여성, 임신·출산 준비 단계" },
      {
        key: "overseas_awareness",
        label: "해외(타겟 국가) 내 브랜드 인지도",
        type: "radio",
        options: ["전혀 알려지지 않음", "일부 인지", "이미 팬층 있음"],
        help: "솔직하게 체크해주세요",
      },
      { key: "competitors", label: "국내·해외 경쟁 브랜드", type: "long", help: "한국 시장, 타겟 국가 시장 각각 적어주세요. 예) 국내: A사, B사 / 일본: C사" },
      { key: "differentiators", label: "경쟁 브랜드 대비 우리 브랜드의 차별점", type: "long", help: "예) \"가격 대비 고농축 성분\", \"산부인과 공동개발 신뢰도\"" },
    ],
  },
  {
    title: "채널 및 판매 현황",
    fields: [
      {
        key: "sns_channels",
        label: "운영 중인 SNS 채널",
        type: "long",
        help: "채널명 + 팔로워 수를 함께 적어주세요 (다른 국가 채널도 있다면 부탁드립니다). 예) 인스타그램 @brand (팔로워 3.2만), 틱톡 없음",
      },
      { key: "overseas_sales_channels", label: "해외(타겟 국가) 내 판매 채널", type: "long", help: "이미 있는 채널이 있다면 알려주세요. 예) 자사몰만 있음, 큐텐 미입점" },
      { key: "customs_issues", label: "반입 수량 제한, 통관 관련 알고 계신 이슈", type: "long", help: "없으면 비워두셔도 됩니다. 예) 1인당 6병 반입 제한 있음" },
    ],
  },
  {
    title: "브랜드 자산",
    help: "파일이 없으면 SNS·홈페이지 링크로 대체하셔도 괜찮습니다.",
    fields: [
      { key: "logo_url", label: "로고 파일 (링크)", type: "short", help: `투명 배경 PNG 권장합니다. ${FILE_HELP}` },
      { key: "brand_guide", label: "브랜드 가이드 (컬러/폰트 등)", type: "short", help: "별도 가이드가 없다면 SNS·홈페이지 링크로 대체 가능합니다. 예) https://instagram.com/brand" },
      { key: "product_media_url", label: "제품 사진/영상 (링크)", type: "short", help: `고해상도 제품 사진/영상. ${FILE_HELP}` },
    ],
  },
  {
    title: "예산·일정·목표",
    fields: [
      {
        key: "budget_range",
        label: "대략적인 예산 범위",
        type: "radio",
        options: ["500만원 미만", "500만원~1,000만원", "1,000만원~2,000만원", "2,000만원 이상", "미정 / 제안 받고 결정"],
        help: "정확한 숫자가 아니어도 괜찮습니다",
      },
      { key: "campaign_goal", label: "이번 캠페인에서 가장 중요하게 보는 목표", type: "radio", options: ["조회수", "판매 전환", "팔로워 증가", "브랜드 인지도"] },
      { key: "target_metrics", label: "목표 수치 (있다면)", type: "short", help: "예) 전환율 3% 이상" },
      { key: "desired_schedule", label: "희망 진행 일정/데드라인", type: "short", help: "예) 11월 중 콘텐츠 업로드 완료 희망" },
    ],
  },
  {
    title: "콘텐츠 활용 계획",
    fields: [
      {
        key: "content_usage",
        label: "콘텐츠를 SNS 게시 외에 다른 용도로도 활용하실 계획이 있나요?",
        type: "checkbox",
        options: ["SNS 게시", "기사화", "광고 소재", "자사몰 상세페이지"],
        help: "해당하는 항목을 모두 선택해주세요",
      },
      { key: "content_usage_terms", label: "콘텐츠 2차활용 관련 원하시는 조건", type: "long", help: "기간, 매체, 유료광고 집행 여부 등. 예) \"6개월간 유료광고 소재로 활용 희망\"" },
    ],
  },
  {
    title: "과거 협업 이력",
    fields: [
      {
        key: "past_collaborations",
        label: "지금까지 진행한 인플루언서/콜라보 이력",
        type: "long",
        help: "브랜드명, 시기, 간단한 성과를 적어주세요. 예) \"2025.03 인플루언서 A와 진행, 조회수 50만\"",
      },
      { key: "review_assets", label: "사용 가능한 후기/리뷰 자료 정보", type: "short" },
    ],
  },
  {
    title: "기타",
    fields: [{ key: "notes", label: "그 외 저희가 알아두면 좋을 내용", type: "long", help: "자유롭게 적어주세요" }],
  },
];

export const BRIEF_FIELDS: BriefField[] = BRIEF_SECTIONS.flatMap((s) => s.fields);

export type BriefAnswers = Record<string, string | string[]>;
