"""
中国政府采购网爬虫
网站：https://www.ccgp.gov.cn/
"""
import json
import re
import random
import time
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin

import requests

from .base import BaseCrawler, BidInfo, is_bid_related_text


class CCGPCrawler(BaseCrawler):
    """中国政府采购网爬虫"""

    name = "ccgp"
    base_url = "https://www.ccgp.gov.cn"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        try:
            raw_max_pages = int(config.get("ccgp_max_pages", 0) or 0)
        except (TypeError, ValueError):
            raw_max_pages = 0
        self.max_pages_per_entry = raw_max_pages if raw_max_pages > 0 else None

    def get_list_urls(self) -> List[str]:
        """用户指定的中国政府采购网信息入口。"""
        return [
            "https://www.ccgp.gov.cn/cggg/zygg/",
            "https://www.ccgp.gov.cn/cggg/dfgg/",
            "https://www.ccgp.gov.cn/zydwplcg/",
            "https://search.ccgp.gov.cn/eanotice",
            "https://www.ccgp.gov.cn/gg/",
            "https://www.ccgp.gov.cn/jnhb/jnhbqd/",
            "https://www.ccgp.gov.cn/xxgg/qtcgxx/index.htm",
            "https://www.ccgp.gov.cn/cgml/",
        ]

    def crawl(self, stop_event=None) -> Optional[List[BidInfo]]:
        """爬取入口页及其分页页。"""
        all_bids = []
        seen_urls = set()
        failed_count = 0
        urls = self.get_list_urls()

        self.logger.info(f"[{self.name}] Starting crawl, {len(urls)} entry page(s)")

        for url in urls:
            if stop_event and stop_event.is_set():
                self.logger.info(f"[{self.name}] Crawl interrupted by stop signal")
                break

            html = self.fetch(url)
            if not html or self._is_blocked(html):
                failed_count += 1
                continue

            self._collect_page_bids(url, html, all_bids, seen_urls)

            if "search.ccgp.gov.cn/eanotice" in url:
                page_count = self._extract_pager_size(html)
                last_page = self._limit_page_count(page_count)
                for page in range(2, last_page + 1):
                    if stop_event and stop_event.is_set():
                        break
                    page_html = self._fetch_eanotice_page(page)
                    if page_html and not self._is_blocked(page_html):
                        self._collect_page_bids(url, page_html, all_bids, seen_urls)
                continue

            for page_url in self._get_static_pagination_urls(url, html):
                if stop_event and stop_event.is_set():
                    break
                page_html = self.fetch(page_url)
                if page_html and not self._is_blocked(page_html):
                    self._collect_page_bids(page_url, page_html, all_bids, seen_urls)

        if failed_count == len(urls) and urls:
            self.logger.error(f"[{self.name}] ALL requests failed! Site may be blocking.")
            return None

        self.logger.info(f"[{self.name}] Crawl done, got {len(all_bids)} items total")
        return all_bids

    def parse(self, html: str) -> List[BidInfo]:
        """解析列表页，提取标题、详情链接和发布日期。"""
        if "search.ccgp.gov.cn/eanotice" in getattr(self, "current_list_url", ""):
            return self._parse_eanotice(html)
        return self._parse_anchor_list(html)

    def _collect_page_bids(self, url: str, html: str, all_bids: List[BidInfo], seen_urls: set):
        self.current_list_url = url
        for bid in self.parse(html):
            if bid.url in seen_urls:
                continue
            seen_urls.add(bid.url)
            all_bids.append(bid)

    def _get_static_pagination_urls(self, list_url: str, html: str) -> List[str]:
        pager = self._extract_pager_config(html)
        if not pager:
            return []

        size = pager["size"]
        prefix = pager["prefix"]
        suffix = pager["suffix"].lstrip(".")
        max_page_index = self._limit_page_count(size) - 1

        urls = []
        for page_index in range(1, max_page_index + 1):
            urls.append(urljoin(list_url, f"{prefix}_{page_index}.{suffix}"))
        return urls

    def _limit_page_count(self, page_count: int) -> int:
        if self.max_pages_per_entry is None:
            return page_count
        return min(page_count, self.max_pages_per_entry)

    def _extract_pager_config(self, html: str) -> Dict[str, Any]:
        for match in re.finditer(r"Pager\(\{(?P<body>.*?)\}\)", html, re.S):
            body = match.group("body")
            size_match = re.search(r"size\s*:\s*(\d+)", body)
            prefix_match = re.search(r"prefix\s*:\s*['\"]([^'\"]+)['\"]", body)
            suffix_match = re.search(r"suffix\s*:\s*['\"]([^'\"]+)['\"]", body)
            if size_match and prefix_match and suffix_match:
                return {
                    "size": int(size_match.group(1)),
                    "prefix": prefix_match.group(1),
                    "suffix": suffix_match.group(1),
                }
        return {}

    def _extract_pager_size(self, html: str) -> int:
        pager = self._extract_pager_config(html)
        return int(pager.get("size", 1))

    def _fetch_eanotice_page(self, page_index: int) -> str:
        try:
            response = self.session.post(
                "https://search.ccgp.gov.cn/eanotice",
                data={"page_index": str(page_index)},
                headers=self._get_headers(),
                timeout=self.timeout,
                verify=False,
            )
            response.raise_for_status()
            response.encoding = response.apparent_encoding or "utf-8"
            delay = self.request_delay + random.uniform(0, 1)
            time.sleep(delay)
            return response.text
        except requests.RequestException as e:
            self.logger.warning(f"单一来源公示第 {page_index} 页请求失败: {e}")
            return ""

    def _parse_anchor_list(self, html: str) -> List[BidInfo]:
        soup = self.parse_html(html)
        list_url = getattr(self, "current_list_url", self.base_url)
        bids = []
        seen_urls = set()

        for a in soup.find_all("a", href=True):
            title = (a.get("title") or a.get_text(" ", strip=True)).strip()
            title = " ".join(title.split())
            if len(title) < 6:
                continue

            href = a["href"].strip()
            if href.lower().startswith(("javascript:", "#", "mailto:", "tel:")):
                continue

            url = urljoin(list_url, href)
            if url in seen_urls or not self._is_detail_url(url):
                continue
            if not is_bid_related_text(title, url):
                continue

            seen_urls.add(url)
            bids.append(BidInfo(
                title=title,
                url=url,
                publish_date=self._extract_publish_date(a),
                source="中国政府采购网"
            ))

        return bids

    def _parse_eanotice(self, html: str) -> List[BidInfo]:
        bids = []
        seen_urls = set()

        for row in self._load_eanotice_rows(html):
            title = str(row.get("title") or "").strip()
            url = str(row.get("lnk") or "").strip()
            if not title or not url:
                continue
            if url in seen_urls or not self._is_detail_url(url):
                continue
            if not is_bid_related_text(title, url):
                continue

            seen_urls.add(url)
            bids.append(BidInfo(
                title=title,
                url=url,
                publish_date=str(row.get("date") or "").strip(),
                source="中国政府采购网"
            ))

        return bids

    def _load_eanotice_rows(self, html: str) -> List[Dict[str, Any]]:
        marker = "var a='"
        start = html.find(marker)
        if start == -1:
            return []

        start += len(marker)
        end = self._find_json_array_end(html, start)
        if end == -1:
            return []

        raw_data = re.sub(r",\s*]$", "]", html[start:end])

        try:
            data = json.loads(raw_data)
        except json.JSONDecodeError as e:
            self.logger.warning(f"解析单一来源公示数据失败: {e}，尝试字段提取")
            return self._extract_eanotice_rows(raw_data)

        return data if isinstance(data, list) else []

    def _extract_eanotice_rows(self, raw_data: str) -> List[Dict[str, Any]]:
        rows = []
        pattern = re.compile(
            r'"title":"(?P<title>.*?)".*?"date":"(?P<date>.*?)".*?"lnk":"(?P<lnk>.*?)"',
            re.S
        )
        for match in pattern.finditer(raw_data):
            rows.append({
                "title": match.group("title"),
                "date": match.group("date"),
                "lnk": match.group("lnk"),
            })
        return rows

    def _find_json_array_end(self, text: str, start: int) -> int:
        depth = 0
        in_string = False
        escaped = False

        for idx in range(start, len(text)):
            ch = text[idx]

            if in_string:
                if escaped:
                    escaped = False
                elif ch == "\\":
                    escaped = True
                elif ch == '"':
                    in_string = False
                continue

            if ch == '"':
                in_string = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return idx + 1

        return -1

    def _is_detail_url(self, url: str) -> bool:
        return "ccgp.gov.cn" in url and re.search(r"/t\d+_\d+\.htm$", url) is not None

    def _extract_publish_date(self, anchor) -> str:
        parent = anchor.find_parent(["li", "tr", "div", "p"])
        text = parent.get_text(" ", strip=True) if parent else ""
        match = re.search(r"20\d{2}[-年/]\d{1,2}[-月/]\d{1,2}日?", text)
        return match.group(0) if match else ""
