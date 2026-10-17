import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { notion } from "@/lib/notion/client";
import { blocksToHtml } from "@/lib/notion/blocks-to-html";
import { resolveImageUrl } from "@/lib/notion/image-upload";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// ─── Types ────────────────────────────────────────────────────

interface SyncResult {
  synced: number;
  deleted: number;
  errors: string[];
}

// ─── Auth (블로그/크리에이터와 동일) ──────────────────────────

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function authenticate(
  request: NextRequest,
  body: unknown,
): Promise<boolean> {
  const secret = process.env.SYNC_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme === "Bearer" && token && safeEqual(token, secret)) return true;
    }
  }

  if (
    secret &&
    body &&
    typeof body === "object" &&
    "secret" in body &&
    typeof (body as { secret: string }).secret === "string" &&
    safeEqual((body as { secret: string }).secret, secret)
  ) {
    return true;
  }


  if (!secret) {
    console.error("[sync/portfolio] SYNC_SECRET environment variable is not set");
  }

  return false;
}

// ─── Notion Property Extractors ───────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function getTitle(properties: any, key: string): string {
  const prop = properties[key];
  if (!prop || prop.type !== "title") return "";
  return (prop.title ?? []).map((rt: any) => rt.plain_text ?? "").join("");
}

function getRichText(properties: any, key: string): string {
  const prop = properties[key];
  if (!prop || prop.type !== "rich_text") return "";
  return (prop.rich_text ?? []).map((rt: any) => rt.plain_text ?? "").join("");
}

function getSelect(properties: any, key: string): string | null {
  const prop = properties[key];
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}

function getCheckbox(properties: any, key: string): boolean {
  const prop = properties[key];
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox ?? false;
}

function getUrl(properties: any, key: string): string | null {
  const prop = properties[key];
  if (!prop || prop.type !== "url") return null;
  return prop.url ?? null;
}

function getDate(properties: any, key: string): string | null {
  const prop = properties[key];
  if (!prop || prop.type !== "date") return null;
  return prop.date?.start ?? null;
}

function getFileOrUrl(
  properties: any,
  key: string,
): { type: "file"; file: { url: string } } | { type: "external"; external: { url: string } } | null {
  const prop = properties[key];
  if (!prop) return null;

  if (prop.type === "files" && Array.isArray(prop.files) && prop.files.length > 0) {
    const first = prop.files[0];
    if (first.type === "file" && first.file?.url) {
      return { type: "file", file: { url: first.file.url } };
    }
    if (first.type === "external" && first.external?.url) {
      return { type: "external", external: { url: first.external.url } };
    }
  }

  if (prop.type === "url" && prop.url) {
    return { type: "external", external: { url: prop.url } };
  }

  return null;
}

function getRelation(properties: any, key: string): string[] {
  const prop = properties[key];
  if (!prop || prop.type !== "relation") return [];
  return (prop.relation ?? []).map((r: any) => r.id as string);
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Relation Title Cache ────────────────────────────────────

const relationTitleCache = new Map<string, string>();

async function fetchRelationTitle(pageId: string): Promise<string> {
  const cached = relationTitleCache.get(pageId);
  if (cached !== undefined) return cached;

  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const props = page.properties ?? {};
    // 전사 Project Board의 title 속성은 "프로젝트 이름"
    const title = getTitle(props, "프로젝트 이름");
    relationTitleCache.set(pageId, title);
    return title;
  } catch (err) {
    console.error(`[sync/portfolio] Failed to fetch relation page ${pageId}:`, err);
    relationTitleCache.set(pageId, "");
    return "";
  }
}

// ─── Fetch All Blocks (with pagination + recursive children) ──

async function fetchAllBlocks(pageId: string): Promise<any[]> {
  const allBlocks: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: any = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    allBlocks.push(...(response.results ?? []));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  for (const block of allBlocks) {
    if (block.has_children && block.type !== "child_page" && block.type !== "child_database") {
      block.children = await fetchAllBlocks(block.id);
    }
  }

  return allBlocks;
}

// ─── Fetch All Pages from Notion DB (with pagination) ─────────

async function fetchAllPages(): Promise<any[]> {
  const allPages: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: process.env.NOTION_PORTFOLIO_DB_ID!,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    allPages.push(...(response.results ?? []));
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return allPages;
}

// ─── POST Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Body might be empty (auth via header only)
  }

  if (!(await authenticate(request, body))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_PORTFOLIO_DB_ID) {
    return NextResponse.json(
      { error: "NOTION_PORTFOLIO_DB_ID is not configured" },
      { status: 500 },
    );
  }

  const result: SyncResult = { synced: 0, deleted: 0, errors: [] };

  try {
    console.log("[sync/portfolio] Starting portfolio sync...");

    // 1. Fetch all pages
    const allPages = await fetchAllPages();
    console.log(`[sync/portfolio] Found ${allPages.length} pages in Notion DB`);

    // 2. Filter: 상태가 "발행"인 것만 동기화
    const publicPages = allPages.filter((page: any) => {
      const status = getSelect(page.properties, "상태");
      return status === "발행";
    });
    console.log(`[sync/portfolio] ${publicPages.length} portfolios with status "발행"`);

    // 3. Create Supabase admin client
    const supabase = createAdminClient();

    // 4. Collect public Notion IDs for cleanup
    const publicNotionIds: string[] = [];

    // 5. Process each portfolio
    for (const page of publicPages) {
      const portfolioTitle = getTitle(page.properties, "이름") || page.id;

      try {
        console.log(`[sync/portfolio] Processing: "${portfolioTitle}"`);

        const notionId = page.id;
        publicNotionIds.push(notionId);

        // Extract thumbnail
        const thumbnailFile = getFileOrUrl(page.properties, "썸네일");
        const thumbnailUrl = thumbnailFile
          ? await resolveImageUrl(supabase, thumbnailFile)
          : null;

        // Extract other properties
        const title = getTitle(page.properties, "이름");

        // 클라이언트/브랜드명: relation → 프로젝트 이름 추출
        const relationIds = getRelation(page.properties, "클라이언트/브랜드명");
        const clientNames = await Promise.all(
          relationIds.map((id) => fetchRelationTitle(id)),
        );
        let clientName = clientNames.filter(Boolean).join(", ") || "";

        // Notion relation 비어 있을 때 title prefix `{client}: {desc}` 에서 derive
        // SEO Brand schema 가 client_name 의존, 빈 값이면 schema emit 안 됨
        if (!clientName) {
          const colonIdx = title.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            clientName = title.slice(0, colonIdx).trim();
          }
        }

        const category = getSelect(page.properties, "카테고리");
        const link = getUrl(page.properties, "링크");
        const summary = getRichText(page.properties, "요약");
        const publishedAt = getDate(page.properties, "발행일");

        // Fetch blocks and convert to HTML
        const blocks = await fetchAllBlocks(page.id);
        const content = await blocksToHtml(blocks, supabase);

        // Upsert to Supabase
        const { error: upsertError } = await supabase
          .from("portfolios")
          .upsert(
            {
              notion_id: notionId,
              title,
              client_name: clientName,
              thumbnail_url: thumbnailUrl,
              category: category ? [category] : [],
              link,
              summary,
              content,
              published_at: publishedAt,
            },
            { onConflict: "notion_id" },
          );

        if (upsertError) {
          console.error(
            `[sync/portfolio] Upsert failed for "${portfolioTitle}":`,
            upsertError.message,
          );
          result.errors.push(`"${portfolioTitle}": ${upsertError.message}`);
          continue;
        }

        result.synced++;
        console.log(`[sync/portfolio] Synced: "${portfolioTitle}"`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[sync/portfolio] Error processing "${portfolioTitle}":`,
          message,
        );
        result.errors.push(`"${portfolioTitle}": ${message}`);
      }
    }

    // 6. Cleanup: Notion에서 비공개 전환된 포트폴리오 삭제
    if (publicNotionIds.length > 0) {
      const { data: existingPortfolios, error: fetchError } = await supabase
        .from("portfolios")
        .select("id, notion_id, title")
        .not("notion_id", "is", null);

      if (fetchError) {
        result.errors.push(`Cleanup fetch failed: ${fetchError.message}`);
      } else if (existingPortfolios) {
        const toDelete = existingPortfolios.filter(
          (p: any) => p.notion_id && !publicNotionIds.includes(p.notion_id),
        );

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((p: any) => p.id);
          const { error: deleteError } = await supabase
            .from("portfolios")
            .delete()
            .in("id", deleteIds);

          if (deleteError) {
            result.errors.push(`Cleanup delete failed: ${deleteError.message}`);
          } else {
            result.deleted = toDelete.length;
            console.log(
              `[sync/portfolio] Cleaned up ${toDelete.length} portfolios no longer public: ${toDelete.map((p: any) => p.title).join(", ")}`,
            );
          }
        }
      }
    }

    console.log(
      `[sync/portfolio] Sync complete. Synced: ${result.synced}, Deleted: ${result.deleted}, Errors: ${result.errors.length}`,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync/portfolio] Fatal error:", message);
    return NextResponse.json(
      {
        synced: result.synced,
        deleted: result.deleted,
        errors: [...result.errors, `Fatal: ${message}`],
      },
      { status: 500 },
    );
  }
}
