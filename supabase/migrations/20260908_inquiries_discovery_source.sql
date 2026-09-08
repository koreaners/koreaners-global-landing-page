-- Inquiries discovery source: 문의 폼 "코리너스를 어떻게 알게 되셨나요" 선택값 (한국어 원문 저장)

alter table public.inquiries add column if not exists discovery_source text;
