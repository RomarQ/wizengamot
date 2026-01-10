"""Firecrawl-compatible adapter for Crawl4AI.

This module provides drop-in replacement functions that transform
Crawl4AI responses to match Firecrawl's response format, allowing
seamless migration without changing existing code.
"""

import logging
import re
from typing import Any, Dict, Optional

from .client import Crawl4AIClient
from .config import (
    DEFAULT_ARTICLE_TIMEOUT,
    DEFAULT_PDF_TIMEOUT,
    DEFAULT_RAW_HTML_TIMEOUT,
    DEFAULT_SCREENSHOT_TIMEOUT,
)
from .errors import CrawlerConnectionError, CrawlerError, CrawlerTimeoutError

logger = logging.getLogger(__name__)


def _transform_crawl4ai_response(
    crawl4ai_response: Dict[str, Any],
    include_screenshot: bool = False,
    include_raw_html: bool = False,
) -> Dict[str, Any]:
    """
    Transform Crawl4AI response to Firecrawl-compatible format.

    Crawl4AI input:
    {
        "success": true,
        "results": [{
            "url": "...",
            "markdown": {"raw_markdown": "...", "fit_markdown": "...", ...},
            "html": "...",  # Raw HTML
            "cleaned_html": "...",
            "screenshot": "data:image/png;base64,...",
            "metadata": {"title": "...", "description": "...", "og_image": "..."}
        }]
    }

    Firecrawl output:
    {
        "success": true,
        "data": {
            "markdown": "...",
            "metadata": {"title": "...", "ogTitle": "...", "description": "..."}
        }
    }
    """
    if not crawl4ai_response.get("success", False):
        error_msg = crawl4ai_response.get("error_message", "Unknown error")
        return {
            "success": False,
            "data": {},
            "error": error_msg,
        }

    results = crawl4ai_response.get("results", [])
    if not results:
        return {
            "success": False,
            "data": {},
            "error": "No results returned from crawler",
        }

    result = results[0]
    metadata = result.get("metadata", {})

    # Normalize metadata field names (Crawl4AI -> Firecrawl)
    normalized_metadata = {
        "title": metadata.get("title", ""),
        "ogTitle": metadata.get("og_title", metadata.get("title", "")),
        "description": metadata.get("description", ""),
    }

    # Extract markdown - Crawl4AI returns a dict with nested keys
    markdown_data = result.get("markdown", {})
    if isinstance(markdown_data, dict):
        # Prefer raw_markdown, fallback to fit_markdown
        markdown = markdown_data.get("raw_markdown", "") or markdown_data.get("fit_markdown", "")
    else:
        # Handle case where it might be a string (for compatibility)
        markdown = markdown_data or ""

    data: Dict[str, Any] = {
        "markdown": markdown,
        "metadata": normalized_metadata,
    }

    if include_screenshot:
        screenshot = result.get("screenshot", "") or ""
        # Strip data URL prefix if present (Crawl4AI includes it, Firecrawl doesn't)
        if screenshot and screenshot.startswith("data:image"):
            if "," in screenshot:
                screenshot = screenshot.split(",", 1)[1]
        data["screenshot"] = screenshot

    if include_raw_html:
        # Crawl4AI uses "html" field, not "raw_html"
        data["rawHtml"] = result.get("html", "") or result.get("raw_html", "")

    return {
        "success": True,
        "data": data,
        "error": None,
    }


def _transform_error_response(error: Exception) -> Dict[str, Any]:
    """Transform exceptions to Firecrawl-compatible error format."""
    return {
        "success": False,
        "data": {},
        "error": str(error),
    }


class Crawl4AIAdapter:
    """
    Adapter that provides Firecrawl-compatible methods using Crawl4AI.

    All methods return response structures matching Firecrawl's API,
    allowing drop-in replacement in existing code.
    """

    def __init__(self, base_url: str = "http://localhost:11235"):
        """
        Initialize the adapter.

        Args:
            base_url: Crawl4AI service URL
        """
        self.client = Crawl4AIClient(base_url)

    async def health_check(self) -> bool:
        """Check if the Crawl4AI service is healthy."""
        return await self.client.health_check()

    async def scrape_article(
        self, url: str, timeout: int = DEFAULT_ARTICLE_TIMEOUT
    ) -> Dict[str, Any]:
        """
        Scrape article content (markdown + metadata).

        Args:
            url: URL to scrape
            timeout: Request timeout in seconds

        Returns:
            Firecrawl-compatible response:
            {
                "success": bool,
                "data": {
                    "markdown": str,
                    "metadata": {"title": str, "ogTitle": str, "description": str}
                },
                "error": str | None
            }
        """
        try:
            response = await self.client.crawl(url, timeout=float(timeout))
            return _transform_crawl4ai_response(response)
        except (CrawlerConnectionError, CrawlerTimeoutError, CrawlerError) as e:
            logger.warning(f"Crawl4AI scrape_article failed for {url}: {e}")
            return _transform_error_response(e)

    async def scrape_pdf(
        self, url: str, timeout: int = DEFAULT_PDF_TIMEOUT
    ) -> Dict[str, Any]:
        """
        Extract markdown from PDF URL.

        For arXiv papers, uses ar5iv.org which provides full HTML versions
        (much better than PDF text extraction). For other PDFs, attempts
        direct PDF parsing via Crawl4AI.

        Args:
            url: PDF URL to process
            timeout: Request timeout in seconds

        Returns:
            Firecrawl-compatible response with extracted markdown
        """
        # For arXiv papers, use ar5iv.org which provides full HTML versions
        # ar5iv is much more reliable than PDF text extraction
        if "arxiv.org/abs/" in url or "arxiv.org/pdf/" in url:
            # Extract paper ID and convert to ar5iv URL
            arxiv_id = self._extract_arxiv_id(url)
            if arxiv_id:
                ar5iv_url = f"https://ar5iv.org/abs/{arxiv_id}"
                logger.info(f"Converting arXiv URL to ar5iv: {url} -> {ar5iv_url}")
                try:
                    # Scrape as regular article (ar5iv provides HTML)
                    response = await self.client.crawl(ar5iv_url, timeout=float(timeout))
                    return _transform_crawl4ai_response(response)
                except (CrawlerConnectionError, CrawlerTimeoutError, CrawlerError) as e:
                    logger.warning(f"ar5iv scrape failed, falling back to PDF: {e}")
                    # Fall through to PDF scraping as fallback

        try:
            response = await self.client.crawl(url, pdf=True, timeout=float(timeout))
            return _transform_crawl4ai_response(response)
        except (CrawlerConnectionError, CrawlerTimeoutError, CrawlerError) as e:
            logger.warning(f"Crawl4AI scrape_pdf failed for {url}: {e}")
            return _transform_error_response(e)

    def _extract_arxiv_id(self, url: str) -> Optional[str]:
        """Extract arXiv paper ID from URL."""
        # Match patterns like: arxiv.org/abs/2208.06046 or arxiv.org/pdf/2208.06046.pdf
        match = re.search(r'arxiv\.org/(?:abs|pdf)/(\d+\.\d+)', url)
        if match:
            return match.group(1)
        return None

    async def scrape_with_screenshot(
        self, url: str, timeout: int = DEFAULT_SCREENSHOT_TIMEOUT
    ) -> Dict[str, Any]:
        """
        Scrape with screenshot capture.

        Args:
            url: URL to scrape
            timeout: Request timeout in seconds

        Returns:
            Firecrawl-compatible response:
            {
                "success": bool,
                "data": {
                    "markdown": str,
                    "screenshot": str (base64, no data URL prefix),
                    "metadata": {"title": str, ...}
                },
                "error": str | None
            }
        """
        try:
            response = await self.client.crawl(
                url, screenshot=True, timeout=float(timeout)
            )
            return _transform_crawl4ai_response(response, include_screenshot=True)
        except (CrawlerConnectionError, CrawlerTimeoutError, CrawlerError) as e:
            logger.warning(f"Crawl4AI scrape_with_screenshot failed for {url}: {e}")
            return _transform_error_response(e)

    async def scrape_raw_html(
        self, url: str, timeout: int = DEFAULT_RAW_HTML_TIMEOUT
    ) -> Dict[str, Any]:
        """
        Get full raw HTML including scripts.

        This is critical for podcast MP3 extraction where we need
        to parse script tags for audio URLs.

        Args:
            url: URL to scrape
            timeout: Request timeout in seconds

        Returns:
            Firecrawl-compatible response:
            {
                "success": bool,
                "data": {
                    "rawHtml": str
                },
                "error": str | None
            }
        """
        try:
            response = await self.client.crawl(url, timeout=float(timeout))
            return _transform_crawl4ai_response(response, include_raw_html=True)
        except (CrawlerConnectionError, CrawlerTimeoutError, CrawlerError) as e:
            logger.warning(f"Crawl4AI scrape_raw_html failed for {url}: {e}")
            return _transform_error_response(e)


# Module-level convenience functions for direct import
_default_adapter: Optional[Crawl4AIAdapter] = None


def get_adapter(base_url: str = "http://localhost:11235") -> Crawl4AIAdapter:
    """Get or create a Crawl4AI adapter instance."""
    global _default_adapter
    if _default_adapter is None:
        _default_adapter = Crawl4AIAdapter(base_url)
    return _default_adapter


async def scrape_article(
    url: str, base_url: str = "http://localhost:11235", timeout: int = DEFAULT_ARTICLE_TIMEOUT
) -> Dict[str, Any]:
    """Convenience function for article scraping."""
    adapter = get_adapter(base_url)
    return await adapter.scrape_article(url, timeout)


async def scrape_pdf(
    url: str, base_url: str = "http://localhost:11235", timeout: int = DEFAULT_PDF_TIMEOUT
) -> Dict[str, Any]:
    """Convenience function for PDF scraping."""
    adapter = get_adapter(base_url)
    return await adapter.scrape_pdf(url, timeout)


async def scrape_with_screenshot(
    url: str, base_url: str = "http://localhost:11235", timeout: int = DEFAULT_SCREENSHOT_TIMEOUT
) -> Dict[str, Any]:
    """Convenience function for screenshot scraping."""
    adapter = get_adapter(base_url)
    return await adapter.scrape_with_screenshot(url, timeout)


async def scrape_raw_html(
    url: str, base_url: str = "http://localhost:11235", timeout: int = DEFAULT_RAW_HTML_TIMEOUT
) -> Dict[str, Any]:
    """Convenience function for raw HTML scraping."""
    adapter = get_adapter(base_url)
    return await adapter.scrape_raw_html(url, timeout)
