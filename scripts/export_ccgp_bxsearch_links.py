#!/usr/bin/env python3
"""
Export detail links from China Government Procurement bxsearch result pages.

This is an extraction utility for the parameterized search page only. It does
not fetch detail pages or write to the application database.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

import requests
import urllib3
from bs4 import BeautifulSoup


DEFAULT_URL = (
    "https://search.ccgp.gov.cn/bxsearch?"
    "searchtype=1&page_index=1&bidSort=0&buyerName=&projectId=&pinMu=0&"
    "bidType=0&dbselect=bidx&kw=&start_time=2025%3A12%3A30&"
    "end_time=2026%3A06%3A30&timeType=5&displayZone=&zoneId=&"
    "pppStatus=0&agentName="
)

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
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua": '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
}


def page_url(base_url: str, page_index: int) -> str:
    parsed = urlparse(base_url)
    query = parse_qs(parsed.query, keep_blank_values=True)
    query["page_index"] = [str(page_index)]
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


def fetch_html(session: requests.Session, url: str, timeout: int, retries: int) -> str:
    last_error: Exception | None = None
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

    raise RuntimeError(f"fetch failed: {url}: {last_error}")


def parse_total_count(html: str) -> int:
    text = BeautifulSoup(html, "lxml").get_text(" ", strip=True)
    match = re.search(r"找到\s*(\d+)\s*条内容", text)
    if not match:
        match = re.search(r"找到到\s*(\d+)\s*条内容", text)
    return int(match.group(1)) if match else 0


def parse_links(html: str, source_url: str, page_index: int) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(" ", strip=True)
    if "访问过于频繁" in text:
        raise RuntimeError("blocked by frequent access page")

    results: List[Dict[str, Any]] = []
    for li in soup.select("li"):
        anchor = li.select_one("a[href]")
        if not anchor:
            continue

        url = urljoin(source_url, anchor.get("href", "").strip())
        if not re.search(r"/cggg/.*/t\d+_\d+\.htm$", url):
            continue

        title = " ".join(anchor.get_text(" ", strip=True).split())
        meta = " ".join(li.get_text(" ", strip=True).split())
        publish_time = ""
        publish_match = re.search(r"20\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}", meta)
        if publish_match:
            publish_time = publish_match.group(0)

        item_index = len(results) + 1
        results.append(
            {
                "page_index": page_index,
                "item_index": item_index,
                "title": title,
                "url": url,
                "publish_time": publish_time,
                "list_text": meta,
            }
        )

    return results


def load_done_pages(progress_path: Path) -> set[int]:
    if not progress_path.exists():
        return set()

    done: set[int] = set()
    with progress_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("ok") and isinstance(row.get("page_index"), int):
                done.add(row["page_index"])
    return done


def load_progress_rows(progress_path: Path) -> Tuple[List[Dict[str, Any]], List[int]]:
    last_by_page: Dict[int, Dict[str, Any]] = {}
    if not progress_path.exists():
        return [], []

    with progress_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            page = row.get("page_index")
            if isinstance(page, int):
                last_by_page[page] = row

    links: List[Dict[str, Any]] = []
    failed_pages: List[int] = []
    for page in sorted(last_by_page):
        row = last_by_page[page]
        if row.get("ok"):
            links.extend(row.get("links") or [])
        else:
            failed_pages.append(page)
    return links, failed_pages


def fetch_page(
    base_url: str,
    page_index: int,
    timeout: int,
    retries: int,
) -> Dict[str, Any]:
    session = requests.Session()
    url = page_url(base_url, page_index)
    try:
        html = fetch_html(session, url, timeout=timeout, retries=retries)
        links = parse_links(html, url, page_index)
        return {"page_index": page_index, "ok": True, "links": links}
    except Exception as exc:
        return {"page_index": page_index, "ok": False, "error": str(exc)}


def unique_links(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen: set[str] = set()
    deduped: List[Dict[str, Any]] = []
    for row in rows:
        url = row.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        deduped.append(row)
    return deduped


def write_final_json(
    output_path: Path,
    source_url: str,
    total_count: int,
    total_pages: int,
    rows: List[Dict[str, Any]],
    failed_pages: List[int],
) -> None:
    deduped = unique_links(rows)
    payload = {
        "source": "ccgp_bxsearch",
        "source_url": source_url,
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "total_count_text": total_count,
        "total_pages": total_pages,
        "raw_link_rows": len(rows),
        "unique_link_count": len(deduped),
        "failed_pages": sorted(set(failed_pages)),
        "links": deduped,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", default="server/data/exports/ccgp_bxsearch_links.json")
    parser.add_argument("--progress", default="server/data/exports/ccgp_bxsearch_links.progress.jsonl")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--max-pages", type=int, default=0, help="0 means all pages")
    args = parser.parse_args()

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    output_path = Path(args.output)
    progress_path = Path(args.progress)
    progress_path.parent.mkdir(parents=True, exist_ok=True)

    probe_session = requests.Session()
    first_html = fetch_html(probe_session, page_url(args.url, 1), args.timeout, args.retries)
    total_count = parse_total_count(first_html)
    first_links = parse_links(first_html, page_url(args.url, 1), 1)
    if total_count <= 0:
        total_count = len(first_links)

    total_pages = max(1, math.ceil(total_count / 20))
    if args.max_pages > 0:
        total_pages = min(total_pages, args.max_pages)

    done_pages = load_done_pages(progress_path)
    pages = [page for page in range(1, total_pages + 1) if page not in done_pages]
    print(
        f"total_count={total_count} total_pages={total_pages} "
        f"done_pages={len(done_pages)} pending_pages={len(pages)} output={output_path}"
    )

    if 1 not in done_pages and 1 in pages:
        with progress_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"page_index": 1, "ok": True, "links": first_links}, ensure_ascii=False) + "\n")
        pages.remove(1)
        done_pages.add(1)

    completed = len(done_pages)
    failed_pages: List[int] = []
    with progress_path.open("a", encoding="utf-8") as handle:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futures = {
                executor.submit(fetch_page, args.url, page, args.timeout, args.retries): page
                for page in pages
            }
            for future in as_completed(futures):
                row = future.result()
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
                handle.flush()
                completed += 1
                if not row.get("ok"):
                    failed_pages.append(row["page_index"])

                if completed % 100 == 0 or failed_pages and len(failed_pages) % 10 == 0:
                    print(f"progress {completed}/{total_pages} failed={len(failed_pages)}")

    rows, existing_failed_pages = load_progress_rows(progress_path)
    write_final_json(output_path, args.url, total_count, total_pages, rows, existing_failed_pages)
    print(
        f"done output={output_path} raw_link_rows={len(rows)} "
        f"unique_link_count={len(unique_links(rows))} failed_pages={len(set(existing_failed_pages))}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
