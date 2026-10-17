import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { notion } from "@/lib/notion/client";
import { resolveImageUrl } from "@/lib/notion/image-upload";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// ─── Types ────────────────────────────────────────────────────

interface SyncResult {
  synced: number;
  deleted: number;
  errors: string[];
}

// ─── Auth ─────────────────────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function authenticate(
  request: NextRequest,
  body: unknown,
): Promise<boolean> {
  const secret = process.env.SYNC_SECRET;

  // 1. Check Authorization header
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme === "Bearer" && token && safeEqual(token, secret)) return true;
    }
  }

  // 2. Check request body secret
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
    console.error(
      "[sync/creators] SYNC_SECRET environment variable is not set",
    );
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

function getUrl(properties: any, key: string): string | null {
  const prop = properties[key];
  if (!prop || prop.type !== "url") return null;
  return prop.url ?? null;
}

function getNumber(properties: any, key: string): number | null {
  const prop = properties[key];
  if (!prop || prop.type !== "number") return null;
  return prop.number ?? null;
}

function getCheckbox(properties: any, key: string): boolean {
  const prop = properties[key];
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox ?? false;
}

function getFileOrUrl(
  properties: any,
  key: string,
):
  | { type: "file"; file: { url: string } }
  | { type: "external"; external: { url: string } }
  | null {
  const prop = properties[key];
  if (!prop) return null;

  // Files & Media property
  if (
    prop.type === "files" &&
    Array.isArray(prop.files) &&
    prop.files.length > 0
  ) {
    const first = prop.files[0];
    if (first.type === "file" && first.file?.url) {
      return { type: "file", file: { url: first.file.url } };
    }
    if (first.type === "external" && first.external?.url) {
      return { type: "external", external: { url: first.external.url } };
    }
  }

  // Fallback: URL property
  if (prop.type === "url" && prop.url) {
    return { type: "external", external: { url: prop.url } };
  }

  return null;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Fetch All Pages from Notion DB (with pagination) ─────────

async function fetchAllPages(): Promise<any[]> {
  const allPages: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: process.env.NOTION_CREATOR_LIST_DB_ID!,
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
  // Parse body
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Body might be empty (auth via header only) — that's fine
  }

  // Authenticate
  if (!(await authenticate(request, body))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate environment
  if (!process.env.NOTION_CREATOR_LIST_DB_ID) {
    return NextResponse.json(
      { error: "NOTION_CREATOR_LIST_DB_ID is not configured" },
      { status: 500 },
    );
  }

  const result: SyncResult = { synced: 0, deleted: 0, errors: [] };

  try {
    console.log("[sync/creators] Starting creator sync...");

    // 1. Fetch all pages from Notion DB
    const allPages = await fetchAllPages();
    console.log(
      `[sync/creators] Found ${allPages.length} pages in Notion DB`,
    );

    // 2. Filter: only sync pages where 홈페이지공개 checkbox is checked
    const publicPages = allPages.filter((page: any) =>
      getCheckbox(page.properties, "홈페이지 게시"),
    );
    console.log(
      `[sync/creators] ${publicPages.length} creators marked as public`,
    );

    // 3. Create Supabase admin client
    const supabase = createAdminClient();

    // 4. Collect public Notion IDs for cleanup later
    const publicNotionIds: string[] = [];

    // 5. Process each public creator
    for (const page of publicPages) {
      const creatorName = getTitle(page.properties, "이름") || page.id;

      try {
        console.log(`[sync/creators] Processing: "${creatorName}"`);

        const notionId = page.id;
        publicNotionIds.push(notionId);

        // Extract profile image
        const profileFile = getFileOrUrl(page.properties, "프로필 이미지");
        const profileImageUrl = profileFile
          ? await resolveImageUrl(supabase, profileFile)
          : null;

        // Extract social URLs
        const instagramUrl = getUrl(page.properties, "인스타");
        const youtubeUrl = getUrl(page.properties, "유튜브");
        const tiktokUrl = getUrl(page.properties, "틱톡");
        const xUrl = getUrl(page.properties, "X");
        const instagramFollowers = getNumber(page.properties, "인스타_구독자수");

        // Upsert to Supabase
        const { error: upsertError } = await supabase
          .from("creators")
          .upsert(
            {
              notion_id: notionId,
              name: getTitle(page.properties, "이름"),
              profile_image_url: profileImageUrl,
              instagram_url: instagramUrl,
              youtube_url: youtubeUrl,
              tiktok_url: tiktokUrl,
              x_url: xUrl,
              instagram_followers: instagramFollowers ?? 0,
            },
            { onConflict: "notion_id" },
          );

        if (upsertError) {
          console.error(
            `[sync/creators] Upsert failed for "${creatorName}":`,
            upsertError.message,
          );
          result.errors.push(`"${creatorName}": ${upsertError.message}`);
          continue;
        }

        result.synced++;
        console.log(`[sync/creators] Synced: "${creatorName}"`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[sync/creators] Error processing "${creatorName}":`,
          message,
        );
        result.errors.push(`"${creatorName}": ${message}`);
      }
    }

    // 6. Cleanup: delete creators that have notion_id but are no longer public
    if (publicNotionIds.length > 0) {
      const { data: existingCreators, error: fetchError } = await supabase
        .from("creators")
        .select("id, notion_id, name")
        .not("notion_id", "is", null);

      if (fetchError) {
        result.errors.push(`Cleanup fetch failed: ${fetchError.message}`);
      } else if (existingCreators) {
        const toDelete = existingCreators.filter(
          (c: any) => c.notion_id && !publicNotionIds.includes(c.notion_id),
        );

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((c: any) => c.id);
          const { error: deleteError } = await supabase
            .from("creators")
            .delete()
            .in("id", deleteIds);

          if (deleteError) {
            result.errors.push(`Cleanup delete failed: ${deleteError.message}`);
          } else {
            result.deleted = toDelete.length;
            console.log(
              `[sync/creators] Cleaned up ${toDelete.length} creators no longer public: ${toDelete.map((c: any) => c.name).join(", ")}`,
            );
          }
        }
      }
    }

    console.log(
      `[sync/creators] Sync complete. Synced: ${result.synced}, Deleted: ${result.deleted}, Errors: ${result.errors.length}`,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync/creators] Fatal error:", message);
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
