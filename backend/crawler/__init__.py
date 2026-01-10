"""Crawl4AI crawler module for web scraping.

This module provides a Firecrawl-compatible adapter for the Crawl4AI service,
allowing drop-in replacement with automatic response transformation.
"""

from .errors import (
    CrawlerError,
    CrawlerConnectionError,
    CrawlerTimeoutError,
    CrawlerRateLimitError,
)
from .config import (
    DEFAULT_CRAWL4AI_URL,
    DEFAULT_ARTICLE_TIMEOUT,
    DEFAULT_PDF_TIMEOUT,
    DEFAULT_SCREENSHOT_TIMEOUT,
    DEFAULT_RAW_HTML_TIMEOUT,
    DEFAULT_MAP_TIMEOUT,
    DEFAULT_MAP_LIMIT,
    DEFAULT_MAP_MAX_DEPTH,
    get_default_crawl4ai_url,
)
from .client import Crawl4AIClient
from .adapter import (
    Crawl4AIAdapter,
    scrape_article,
    scrape_pdf,
    scrape_with_screenshot,
    scrape_raw_html,
    get_adapter,
)
from .site_mapper import SiteMapper, map_website
from .fallback import CrawlerWithFallback, get_crawler

__all__ = [
    # Client
    "Crawl4AIClient",
    # Adapter
    "Crawl4AIAdapter",
    "scrape_article",
    "scrape_pdf",
    "scrape_with_screenshot",
    "scrape_raw_html",
    "get_adapter",
    # Site Mapper
    "SiteMapper",
    "map_website",
    # Fallback
    "CrawlerWithFallback",
    "get_crawler",
    # Errors
    "CrawlerError",
    "CrawlerConnectionError",
    "CrawlerTimeoutError",
    "CrawlerRateLimitError",
    # Config
    "DEFAULT_CRAWL4AI_URL",
    "DEFAULT_ARTICLE_TIMEOUT",
    "DEFAULT_PDF_TIMEOUT",
    "DEFAULT_SCREENSHOT_TIMEOUT",
    "DEFAULT_RAW_HTML_TIMEOUT",
    "DEFAULT_MAP_TIMEOUT",
    "DEFAULT_MAP_LIMIT",
    "DEFAULT_MAP_MAX_DEPTH",
    "get_default_crawl4ai_url",
]
