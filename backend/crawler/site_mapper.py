"""BFS-based site mapping for Crawl4AI.

Crawl4AI does not have a dedicated /map endpoint like Firecrawl,
so we implement site discovery using BFS crawling with link extraction.
"""

import asyncio
import logging
from typing import Any, Dict, List, Set
from urllib.parse import urljoin, urlparse

from .client import Crawl4AIClient
from .config import DEFAULT_MAP_LIMIT, DEFAULT_MAP_MAX_DEPTH, DEFAULT_MAP_TIMEOUT
from .errors import CrawlerConnectionError, CrawlerError, CrawlerTimeoutError

logger = logging.getLogger(__name__)


class SiteMapper:
    """
    Implements site mapping via BFS crawling.

    This is a fallback implementation for Crawl4AI which lacks
    Firecrawl's /map endpoint.
    """

    def __init__(self, client: Crawl4AIClient):
        """
        Initialize the site mapper.

        Args:
            client: Crawl4AI client instance
        """
        self.client = client

    async def map_website(
        self,
        url: str,
        limit: int = DEFAULT_MAP_LIMIT,
        max_depth: int = DEFAULT_MAP_MAX_DEPTH,
        timeout: float = DEFAULT_MAP_TIMEOUT,
    ) -> Dict[str, Any]:
        """
        Discover pages on a website using BFS crawling.

        Strategy:
        1. Crawl initial URL, extract internal links from response
        2. BFS to max_depth (default 2)
        3. Collect unique URLs up to limit

        Args:
            url: Starting URL to map
            limit: Maximum number of URLs to discover
            max_depth: Maximum crawl depth (0 = starting URL only)
            timeout: Overall timeout for the mapping operation

        Returns:
            Firecrawl-compatible response:
            {
                "success": bool,
                "links": [str, ...],  # List of discovered URLs
                "error": str | None
            }
        """
        try:
            base_domain = urlparse(url).netloc
            discovered: Set[str] = set()
            queue: List[tuple] = [(url, 0)]  # (url, depth)
            visited: Set[str] = set()

            # Set a deadline for the entire operation
            start_time = asyncio.get_event_loop().time()

            while queue and len(discovered) < limit:
                # Check timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > timeout:
                    logger.warning(f"Site mapping timed out after {elapsed:.1f}s")
                    break

                current_url, depth = queue.pop(0)

                # Skip if already visited
                if current_url in visited:
                    continue
                visited.add(current_url)

                # Normalize and add to discovered
                normalized_url = self._normalize_url(current_url)
                if normalized_url:
                    discovered.add(normalized_url)

                # Stop BFS at max depth
                if depth >= max_depth:
                    continue

                # Crawl page and extract links
                try:
                    remaining_time = max(10.0, timeout - elapsed)
                    response = await self.client.crawl(
                        current_url, timeout=min(30.0, remaining_time)
                    )

                    if response.get("success") and response.get("results"):
                        links = response["results"][0].get("links", {})
                        internal_links = links.get("internal", [])

                        for link in internal_links:
                            # Handle both string and dict link formats
                            link_url = (
                                link if isinstance(link, str) else link.get("href", "")
                            )
                            if not link_url:
                                continue

                            # Make absolute URL
                            absolute_url = urljoin(url, link_url)

                            # Only follow same-domain links
                            if urlparse(absolute_url).netloc != base_domain:
                                continue

                            # Skip if already discovered or queued
                            normalized = self._normalize_url(absolute_url)
                            if normalized and normalized not in discovered:
                                if len(discovered) + len(queue) < limit * 2:  # Allow some buffer
                                    queue.append((absolute_url, depth + 1))

                except (CrawlerConnectionError, CrawlerTimeoutError) as e:
                    logger.debug(f"Failed to crawl {current_url}: {e}")
                    continue

            return {
                "success": True,
                "links": sorted(list(discovered)),
                "error": None,
            }

        except Exception as e:
            logger.error(f"Site mapping failed for {url}: {e}")
            return {
                "success": False,
                "links": [],
                "error": str(e),
            }

    def _normalize_url(self, url: str) -> str:
        """
        Normalize a URL for deduplication.

        - Removes trailing slashes
        - Removes fragments
        - Lowercases scheme and domain
        """
        try:
            parsed = urlparse(url)

            # Skip non-HTTP URLs
            if parsed.scheme not in ("http", "https"):
                return ""

            # Skip certain file types
            path = parsed.path.lower()
            skip_extensions = (
                ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
                ".pdf", ".doc", ".docx", ".xls", ".xlsx",
                ".zip", ".tar", ".gz", ".rar",
                ".mp3", ".mp4", ".wav", ".avi", ".mov",
            )
            if any(path.endswith(ext) for ext in skip_extensions):
                return ""

            # Rebuild URL without fragment, normalized
            normalized = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{parsed.path.rstrip('/')}"
            if parsed.query:
                normalized += f"?{parsed.query}"

            return normalized

        except Exception:
            return ""


async def map_website(
    url: str,
    base_url: str = "http://localhost:11235",
    limit: int = DEFAULT_MAP_LIMIT,
    max_depth: int = DEFAULT_MAP_MAX_DEPTH,
    timeout: float = DEFAULT_MAP_TIMEOUT,
) -> Dict[str, Any]:
    """
    Convenience function for site mapping.

    Args:
        url: Starting URL to map
        base_url: Crawl4AI service URL
        limit: Maximum number of URLs to discover
        max_depth: Maximum crawl depth
        timeout: Overall timeout

    Returns:
        Firecrawl-compatible response with discovered links
    """
    client = Crawl4AIClient(base_url)
    mapper = SiteMapper(client)
    return await mapper.map_website(url, limit, max_depth, timeout)
