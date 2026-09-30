-- 브랜드 사전 정보 시트 (/brand-brief). 컬럼은 lib/brand-brief.ts 의 질문 key 와 1:1.
create table if not exists public.brand_briefs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- 담당자 정보
  contact_name text not null,
  contact_title text not null,
  email text not null,
  decision_maker text not null,
  -- 브랜드/제품 소개
  brand_name text not null,
  intro_deck_url text,
  products text not null,
  selling_points text not null,
  brand_history text,
  -- 타겟 및 시장
  target_countries text[],
  domestic_target text,
  overseas_awareness text,
  competitors text,
  differentiators text,
  -- 채널 및 판매 현황
  sns_channels text,
  overseas_sales_channels text,
  customs_issues text,
  -- 브랜드 자산 (링크)
  logo_url text,
  brand_guide text,
  product_media_url text,
  -- 예산·일정·목표
  budget_range text,
  campaign_goal text,
  target_metrics text,
  desired_schedule text,
  -- 콘텐츠 활용 계획
  content_usage text[],
  content_usage_terms text,
  -- 과거 협업 이력
  past_collaborations text,
  review_assets text,
  -- 기타
  notes text,
  privacy_agreement boolean not null default false
);

-- inquiries·creator_applications 와 같은 정책: 공개 insert, 로그인 사용자만 조회·삭제
alter table public.brand_briefs enable row level security;
create policy "Public insert brand_briefs" on public.brand_briefs for insert with check (true);
create policy "Admin read brand_briefs" on public.brand_briefs for select using (auth.role() = 'authenticated');
create policy "Admin delete brand_briefs" on public.brand_briefs for delete using (auth.role() = 'authenticated');
