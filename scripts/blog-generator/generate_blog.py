#!/usr/bin/env python3
"""
KOREANERS Blog Auto-Generator

Selects unused keywords from keywords.json, generates blog posts via Claude API,
and creates Notion pages for human review.

Usage:
    python3 generate_blog.py              # Generate 3 posts
    python3 generate_blog.py --count 5    # Generate 5 posts
    python3 generate_blog.py --dry-run    # Preview without API calls
"""

import argparse
import json
import os
import re
import sys
import tempfile
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

sys.path.insert(0, str(Path.home() / ".config/shared-env"))
from krns_automation import wait_for_network, notify_slack, ping_healthcheck

# Max limits for Notion API
NOTION_MAX_CHILDREN = 100
NOTION_MAX_RICH_TEXT_LENGTH = 2000


def log(message: str) -> None:
    """Print a timestamped log message."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")


def load_env() -> None:
    """Load environment variables from .env.local at project root."""
    from dotenv import load_dotenv

    # 로컬 체크아웃엔 .env.local 이 없음 — 공용 키 파일을 먼저 읽고 .env.local 이 있으면 덮어씀
    load_dotenv(Path.home() / ".config/shared-env/.env.shared")
    env_path = PROJECT_ROOT / ".env.local"
    if not env_path.exists():
        log(f"WARNING: .env.local not found at {env_path}")
        return
    load_dotenv(env_path)
    log(f"Loaded env from {env_path}")


def load_keywords() -> list[dict]:
    """Load keywords from keywords.json."""
    keywords_path = SCRIPT_DIR / "keywords.json"
    with open(keywords_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["keywords"]


def save_keywords(keywords: list[dict]) -> None:
    """Save keywords back to keywords.json (atomic write via temp file)."""
    keywords_path = SCRIPT_DIR / "keywords.json"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=SCRIPT_DIR, suffix=".tmp", delete=False
    ) as tmp:
        json.dump({"keywords": keywords}, tmp, ensure_ascii=False, indent=2)
        tmp_path = tmp.name
    os.replace(tmp_path, keywords_path)
    log("Updated keywords.json")


def select_keywords(keywords: list[dict], count: int) -> list[dict]:
    """
    Select `count` unused keywords with round-robin pillar distribution.
    If all keywords are used, reset all to unused first.
    """
    unused = [kw for kw in keywords if not kw["used"]]

    if not unused:
        log("All keywords used. Resetting all to unused.")
        for kw in keywords:
            kw["used"] = False
        unused = keywords[:]

    # Group unused keywords by pillar
    pillar_groups: dict[str, list[dict]] = {}
    for kw in unused:
        pillar = kw["pillar"]
        if pillar not in pillar_groups:
            pillar_groups[pillar] = []
        pillar_groups[pillar].append(kw)

    # Round-robin selection across pillars
    selected: list[dict] = []
    pillar_names = list(pillar_groups.keys())
    pillar_index = 0

    while len(selected) < count and any(pillar_groups.values()):
        pillar = pillar_names[pillar_index % len(pillar_names)]
        if pillar_groups[pillar]:
            selected.append(pillar_groups[pillar].pop(0))
        pillar_index += 1

        # Remove empty pillars
        if not pillar_groups[pillar]:
            pillar_names = [p for p in pillar_names if pillar_groups.get(p)]
            if not pillar_names:
                break
            pillar_index = pillar_index % len(pillar_names) if pillar_names else 0

    log(f"Selected {len(selected)} keywords across {len(set(kw['pillar'] for kw in selected))} pillars")
    return selected


def load_prompt_template() -> str:
    """Load the prompt template from prompt_template.txt."""
    template_path = SCRIPT_DIR / "prompt_template.txt"
    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()


def generate_article(keyword: str, pillar: str, template: str) -> dict:
    """
    Call Claude API to generate a blog article.
    Returns parsed JSON dict with article fields.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    current_year = str(datetime.now().year)
    prompt = template.replace("{keyword}", keyword).replace("{pillar}", pillar).replace("{year}", current_year)

    log(f"Calling Claude API (with web_search) for: {keyword}")
    response = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=8192,
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 5,
        }],
        messages=[{"role": "user", "content": prompt}],
    )

    if not response.content:
        raise ValueError("Claude API returned empty content")

    # With tools enabled, response.content contains a mix of server_tool_use,
    # web_search_tool_result, and text blocks. We only care about text blocks
    # for JSON extraction.
    search_count = sum(
        1 for b in response.content
        if getattr(b, "type", None) == "server_tool_use"
        and getattr(b, "name", None) == "web_search"
    )
    text_blocks = [b for b in response.content if getattr(b, "type", None) == "text"]
    if not text_blocks:
        raise ValueError(
            f"Claude API returned no text blocks "
            f"(got {len(response.content)} blocks, stop_reason={response.stop_reason})"
        )

    raw_text = "".join(b.text for b in text_blocks).strip()
    if not raw_text:
        raise ValueError("Claude API returned empty text")

    log(f"web_search used {search_count} time(s)")

    if response.stop_reason == "max_tokens":
        log("WARNING: Response truncated (max_tokens). JSON may be incomplete.")

    # Handle ```json ... ``` wrapping
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*\n?", "", raw_text)
        raw_text = re.sub(r"\n?```\s*$", "", raw_text)

    # With web_search tool enabled, Claude may prepend prose ("리서치 결과...") or
    # append commentary. Extract the first top-level JSON object from raw_text.
    if not raw_text.lstrip().startswith("{"):
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            raw_text = match.group(0)

    try:
        article = json.loads(raw_text)
    except json.JSONDecodeError as e:
        preview = raw_text[:500].replace("\n", "\\n")
        raise ValueError(
            f"Failed to parse JSON from Claude response: {e}. "
            f"raw_text preview (first 500 chars): {preview}"
        ) from e

    # Validate required fields
    required_fields = [
        "title", "slug", "category", "format_type", "summary",
        "meta_title", "meta_description", "content_html",
    ]
    missing = [f for f in required_fields if f not in article]
    if missing:
        raise ValueError(f"Missing fields in Claude response: {missing}")

    # Validate format_type value
    valid_formats = {"concept", "tactical", "trend", "comparative", "pitfall", "case-study", "data-report"}
    if article["format_type"] not in valid_formats:
        log(f"WARNING: unknown format_type={article['format_type']!r}, defaulting to 'tactical'")
        article["format_type"] = "tactical"

    log(f"Generated [{article['format_type']}]: {article['title']}")
    return article


def strip_html_tags(html: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", html)


def html_to_notion_blocks(content_html: str) -> list[dict]:
    """
    Convert content_html into Notion block children.
    Produces heading_2, paragraph, bulleted_list_item, and table blocks.
    Respects Notion limits: max 100 children, max 2000 chars per rich_text.
    """
    blocks: list[dict] = []

    def make_rich_text(text: str) -> list[dict]:
        """Create rich_text array from plain text, chunking if >2000 chars."""
        chunks = []
        while text:
            chunk = text[:NOTION_MAX_RICH_TEXT_LENGTH]
            chunks.append({"type": "text", "text": {"content": chunk}})
            text = text[NOTION_MAX_RICH_TEXT_LENGTH:]
        return chunks

    def add_heading(html_fragment: str) -> None:
        text = strip_html_tags(html_fragment).strip()
        rich = make_rich_text(text)
        if rich and len(blocks) < NOTION_MAX_CHILDREN:
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": rich},
            })

    def add_paragraph(html_fragment: str) -> None:
        text = strip_html_tags(html_fragment).strip()
        rich = make_rich_text(text)
        if rich and len(blocks) < NOTION_MAX_CHILDREN:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": rich},
            })

    def add_bulleted_item(html_fragment: str) -> None:
        text = strip_html_tags(html_fragment).strip()
        rich = make_rich_text(text)
        if rich and len(blocks) < NOTION_MAX_CHILDREN:
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": rich},
            })

    def add_table_block(table_html: str) -> None:
        """Parse an HTML table and create a Notion table block."""
        if len(blocks) >= NOTION_MAX_CHILDREN:
            return

        rows_data: list[list[str]] = []

        # Extract rows
        row_matches = re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, re.DOTALL)
        for row_html in row_matches:
            cells = re.findall(r"<(?:td|th)[^>]*>(.*?)</(?:td|th)>", row_html, re.DOTALL)
            cells = [strip_html_tags(c).strip() for c in cells]
            if cells:
                rows_data.append(cells)

        if not rows_data:
            return

        # Normalize column count
        max_cols = max(len(row) for row in rows_data)
        for row in rows_data:
            while len(row) < max_cols:
                row.append("")

        table_rows = []
        for row in rows_data:
            table_rows.append({
                "type": "table_row",
                "table_row": {
                    "cells": [make_rich_text(cell) for cell in row],
                },
            })

        if len(blocks) < NOTION_MAX_CHILDREN:
            blocks.append({
                "object": "block",
                "type": "table",
                "table": {
                    "table_width": max_cols,
                    "has_column_header": True,
                    "has_row_header": False,
                    "children": table_rows,
                },
            })

    # --- Parse content_html ---

    # Split by table boundaries first, process non-table and table segments
    segments = re.split(r"(<table[^>]*>.*?</table>)", content_html, flags=re.DOTALL)

    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue

        if segment.startswith("<table"):
            add_table_block(segment)
            continue

        # Process non-table HTML: split by headings, paragraphs, lists
        # Split by h2 tags
        parts = re.split(r"(<h2[^>]*>.*?</h2>)", segment, flags=re.DOTALL)

        for part in parts:
            part = part.strip()
            if not part:
                continue

            if re.match(r"<h2[^>]*>", part):
                add_heading(part)
                continue

            # Split remaining content by paragraphs and list items
            sub_parts = re.split(
                r"(<p[^>]*>.*?</p>|<ul[^>]*>.*?</ul>|<ol[^>]*>.*?</ol>)",
                part,
                flags=re.DOTALL,
            )

            for sub in sub_parts:
                sub = sub.strip()
                if not sub:
                    continue

                if re.match(r"<ul[^>]*>", sub) or re.match(r"<ol[^>]*>", sub):
                    items = re.findall(r"<li[^>]*>(.*?)</li>", sub, re.DOTALL)
                    for item in items:
                        add_bulleted_item(item)
                elif re.match(r"<p[^>]*>", sub):
                    add_paragraph(sub)
                else:
                    # Fallback: plain text that wasn't wrapped in tags
                    cleaned = strip_html_tags(sub).strip()
                    if cleaned:
                        add_paragraph(cleaned)

    # Final safety: truncate to max children
    return blocks[:NOTION_MAX_CHILDREN]


def create_notion_page(article: dict) -> str:
    """
    Create a Notion page in the blog database.
    Returns the page URL.
    """
    from notion_client import Client

    notion = Client(auth=os.environ["NOTION_TOKEN"])
    database_id = os.environ["NOTION_BLOG_DB_ID"]

    # Build page properties
    properties = {
        "이름": {
            "title": [{"text": {"content": article["title"][:NOTION_MAX_RICH_TEXT_LENGTH]}}],
        },
        "상태": {
            "select": {"name": "리뷰"},
        },
        "슬러그": {
            "rich_text": [{"text": {"content": article["slug"][:NOTION_MAX_RICH_TEXT_LENGTH]}}],
        },
        "카테고리": {
            "multi_select": [{"name": article["category"]}],
        },
        "Meta Title": {
            "rich_text": [{"text": {"content": article["meta_title"][:NOTION_MAX_RICH_TEXT_LENGTH]}}],
        },
        "Meta Description": {
            "rich_text": [{"text": {"content": article["meta_description"][:NOTION_MAX_RICH_TEXT_LENGTH]}}],
        },
        "발행일": {
            "date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        },
    }

    # Build page body blocks
    children = html_to_notion_blocks(article["content_html"])

    log(f"Creating Notion page: {article['title']} ({len(children)} blocks)")
    page = notion.pages.create(
        parent={"database_id": database_id},
        properties=properties,
        children=children,
    )

    page_url = page.get("url", "")
    log(f"Created Notion page: {page_url}")
    return page_url


def dry_run_report(selected_keywords: list[dict], template: str) -> None:
    """Print a dry-run report without making any API calls."""
    log("=== DRY RUN MODE ===")
    log(f"Would generate {len(selected_keywords)} blog posts:")
    print()

    for i, kw in enumerate(selected_keywords, 1):
        print(f"  {i}. [{kw['pillar']}] {kw['keyword']}")

    print()
    log(f"Prompt template: {len(template)} chars")
    log(f"Model: claude-opus-5-5")
    log(f"Target Notion DB: NOTION_BLOG_DB_ID (from env)")
    log("=== DRY RUN COMPLETE (no API calls made) ===")


def main() -> int:
    parser = argparse.ArgumentParser(description="KOREANERS Blog Auto-Generator")
    parser.add_argument("--count", type=int, default=3, help="Number of posts to generate (default: 3)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making API calls")
    parser.add_argument("--json-only", action="store_true", help="Generate JSON files without creating Notion pages")
    args = parser.parse_args()

    log(f"Starting blog generation (count={args.count}, dry_run={args.dry_run})")

    # Load keywords and template
    keywords = load_keywords()
    template = load_prompt_template()
    selected = select_keywords(keywords, args.count)

    if not selected:
        log("ERROR: No keywords available")
        return 1

    # Dry run mode: just report and exit
    if args.dry_run:
        dry_run_report(selected, template)
        return 0

    # Load environment for API calls
    load_env()

    # Validate required env vars before starting generation
    required_env = ["ANTHROPIC_API_KEY", "NOTION_TOKEN", "NOTION_BLOG_DB_ID"]
    missing_env = [k for k in required_env if not os.environ.get(k)]
    if missing_env:
        log(f"ERROR: Missing required environment variables: {', '.join(missing_env)}")
        return 1

    # Generate articles
    success_count = 0
    fail_count = 0

    for kw in selected:
        keyword = kw["keyword"]
        pillar = kw["pillar"]

        try:
            # Generate article via Claude
            article = generate_article(keyword, pillar, template)

            if args.json_only:
                output_dir = SCRIPT_DIR / "output"
                output_dir.mkdir(exist_ok=True)
                output_path = output_dir / f"{article['slug']}.json"
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(article, f, ensure_ascii=False, indent=2)
                log(f"JSON saved: {output_path}")
            else:
                # Create Notion page
                page_url = create_notion_page(article)

            # Mark keyword as used
            kw["used"] = True
            save_keywords(keywords)

            success_count += 1
            log(f"SUCCESS [{success_count}/{len(selected)}]: {keyword}")

        except Exception as e:
            fail_count += 1
            log(f"FAILED [{fail_count}]: {keyword} - {type(e).__name__}: {e}")
            continue

    # Summary
    log(f"=== COMPLETE: {success_count} succeeded, {fail_count} failed out of {len(selected)} ===")

    if success_count == 0:
        log("ERROR: All generations failed")
        return 1

    return 0


if __name__ == "__main__":
    wait_for_network()
    ping_healthcheck("start")
    try:
        exit_code = main()
        ping_healthcheck("success")
        if exit_code == 0:
            notify_slack("블로그 자동 생성", "success", "블로그 포스트 초안 생성 완료")
        else:
            notify_slack("블로그 자동 생성", "fail", f"exit code: {exit_code}")
        sys.exit(exit_code)
    except Exception as e:
        tb = traceback.format_exc()
        log(f"[FATAL] {e}\n{tb}")
        ping_healthcheck("fail", f"{e}\n{tb}")
        notify_slack("블로그 자동 생성", "fail", f"{e}")
        sys.exit(1)
