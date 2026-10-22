-- blog_posts.updated_at은 /api/sync/blog가 노션 last_edited_time으로 넣는다.
-- 이 트리거가 30분 동기화마다 now()로 덮어써서 sitemap lastmod와 dateModified가 늘 오늘 날짜였다.
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
