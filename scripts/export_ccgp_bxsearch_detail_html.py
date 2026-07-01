#!/usr/bin/env python3
"""
Fetch detail-page body HTML for links exported from ccgp bxsearch.

Input:  JSON produced by export_ccgp_bxsearch_links.py
Output: JSON containing title, url, publish_time, body_html for each link.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import requests
import urllib3

ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from crawler.base import extract_body_html  # noqa: E402


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua": '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Referer": "https://search.ccgp.gov.cn/bxsearch",
}


def fetch_html(url: str, timeout: int, retries: int) -> str:
    last_error: Exception | None = None
    session = requests.Session()
    for attempt in range(retries + 1):
        try:
            response = session.get(
                url,
                headers=HEADERS,
                timeout=timeout,
                verify=False,
                allow_redirects=True,
            )
            response.raise_for_status()
            response.encoding = response.apparent_encoding or "utf-8"
            return response.text
        except requests.RequestException as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(0.5 * (attempt + 1))

    raise RuntimeError(f"fetch failed: {last_error}")


def fetch_detail(link: Dict[str, Any], timeout: int, retries: int) -> Dict[str, Any]:
    url = str(link.get("url") or "")
    try:
        html = fetch_html(url, timeout=timeout, retries=retries)
        if "访问过于频繁" in html:
            raise RuntimeError("blocked by frequent access page")

        body_html = extract_body_html(html)
        if not body_html:
            raise RuntimeError("empty body html")

        return {
            "url": url,
            "title": link.get("title", ""),
            "publish_time": link.get("publish_time", ""),
            "source_page_index": link.get("page_index"),
            "source_item_index": link.get("item_index"),
            "body_html": body_html,
            "body_html_length": len(body_html),
            "ok": True,
        }
    except Exception as exc:
        return {
            "url": url,
            "title": link.get("title", ""),
            "publish_time": link.get("publish_time", ""),
            "source_page_index": link.get("page_index"),
            "source_item_index": link.get("item_index"),
            "body_html": "",
            "body_html_length": 0,
            "ok": False,
            "error": str(exc),
        }


def load_latest_by_url(progress_path: Path) -> Dict[str, Dict[str, Any]]:
    latest: Dict[str, Dict[str, Any]] = {}
    if not progress_path.exists():
        return latest

    with progress_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            url = row.get("url")
            if isinstance(url, str) and url:
                latest[url] = row
    return latest


def load_links(input_path: Path, limit: int) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    links = payload.get("links") or []
    if limit > 0:
        links = links[:limit]
    return payload, links


def write_output(
    output_path: Path,
    source_payload: Dict[str, Any],
    rows: Iterable[Dict[str, Any]],
) -> Dict[str, Any]:
    ordered_rows = list(rows)
    ok_rows = [row for row in ordered_rows if row.get("ok")]
    failed_rows = [row for row in ordered_rows if not row.get("ok")]
    payload = {
        "source": "ccgp_bxsearch_detail_html",
        "source_links_file": source_payload.get("source", "ccgp_bxsearch"),
        "source_url": source_payload.get("source_url", ""),
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "input_unique_link_count": len(source_payload.get("links") or []),
        "attempted_count": len(ordered_rows),
        "success_count": len(ok_rows),
        "failed_count": len(failed_rows),
        "failed_urls": [
            {"url": row.get("url"), "title": row.get("title"), "error": row.get("error", "")}
            for row in failed_rows
        ],
        "results": ok_rows,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="server/data/exports/ccgp_bxsearch_links.json")
    parser.add_argument("--output", default="server/data/exports/ccgp_bxsearch_detail_html.json")
    parser.add_argument("--progress", default="server/data/exports/ccgp_bxsearch_detail_html.progress.jsonl")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--limit", type=int, default=0, help="0 means all links")
    args = parser.parse_args()

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    input_path = Path(args.input)
    output_path = Path(args.output)
    progress_path = Path(args.progress)
    progress_path.parent.mkdir(parents=True, exist_ok=True)

    source_payload, links = load_links(input_path, args.limit)
    latest_by_url = load_latest_by_url(progress_path)
    pending = [link for link in links if not latest_by_url.get(link.get("url", ""), {}).get("ok")]

    print(
        f"input_links={len(links)} done_ok={len([r for r in latest_by_url.values() if r.get('ok')])} "
        f"pending={len(pending)} output={output_path}"
    )

    completed = len(links) - len(pending)
    with progress_path.open("a", encoding="utf-8") as handle:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futures = {
                executor.submit(fetch_detail, link, args.timeout, args.retries): link
                for link in pending
            }
            for future in as_completed(futures):
                row = future.result()
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
                handle.flush()
                latest_by_url[row["url"]] = row
                completed += 1
                if completed % 100 == 0 or not row.get("ok"):
                    ok_count = len([r for r in latest_by_url.values() if r.get("ok")])
                    failed_count = len([r for r in latest_by_url.values() if not r.get("ok")])
                    print(f"progress {completed}/{len(links)} ok={ok_count} failed={failed_count}")

    ordered_rows = [
        latest_by_url[link["url"]]
        for link in links
        if link.get("url") in latest_by_url
    ]
    result = write_output(output_path, source_payload, ordered_rows)
    print(
        f"done output={output_path} attempted={result['attempted_count']} "
        f"success={result['success_count']} failed={result['failed_count']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
