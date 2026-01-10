"""Low-level HTTP client for Crawl4AI REST API."""

import asyncio
import logging
from typing import Any, Dict, Optional

import httpx

from .config import (
    DEFAULT_CRAWL4AI_URL,
    DEFAULT_MAX_RETRIES,
    DEFAULT_RETRY_DELAY,
    HEALTH_CHECK_ENDPOINT,
    HEALTH_CHECK_TIMEOUT,
)
from .errors import CrawlerConnectionError, CrawlerError, CrawlerTimeoutError

logger = logging.getLogger(__name__)


class Crawl4AIClient:
    """Low-level HTTP client for Crawl4AI REST API."""

    def __init__(
        self,
        base_url: str = DEFAULT_CRAWL4AI_URL,
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY,
    ):
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    async def health_check(self) -> bool:
        """Check if Crawl4AI service is healthy.

        Returns:
            True if service is healthy, False otherwise.
        """
        try:
            async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
                response = await client.get(f"{self.base_url}{HEALTH_CHECK_ENDPOINT}")
                return response.status_code == 200
        except Exception as e:
            logger.debug(f"Health check failed: {e}")
            return False

    async def health_check_detailed(self) -> Dict[str, Any]:
        """Get detailed health information from Crawl4AI service.

        Returns:
            Dict with health details including memory, CPU, uptime, etc.
            Returns {"healthy": False, "error": "..."} on failure.
        """
        try:
            async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
                response = await client.get(f"{self.base_url}{HEALTH_CHECK_ENDPOINT}")
                if response.status_code == 200:
                    data = response.json()
                    # Stats are nested under "container" in Crawl4AI response
                    container = data.get("container", {})
                    return {
                        "healthy": True,
                        "memory_percent": container.get("memory_percent"),
                        "cpu_percent": container.get("cpu_percent"),
                        "uptime_seconds": container.get("uptime_seconds"),
                    }
                return {"healthy": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.debug(f"Detailed health check failed: {e}")
            return {"healthy": False, "error": str(e)}

    async def crawl(
        self,
        url: str,
        screenshot: bool = False,
        pdf: bool = False,
        timeout: float = 120.0,
        wait_for: Optional[str] = None,
        js_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute a crawl request.

        Args:
            url: URL to crawl
            screenshot: Whether to capture a screenshot
            pdf: Whether to handle as PDF
            timeout: Request timeout in seconds
            wait_for: CSS selector to wait for before scraping
            js_code: JavaScript code to execute before scraping

        Returns:
            Crawl4AI response dict with structure:
            {
                "success": bool,
                "results": [{
                    "url": str,
                    "markdown": str,
                    "raw_html": str,
                    "cleaned_html": str,
                    "screenshot": str (base64),
                    "metadata": {...},
                    "links": {"internal": [], "external": []}
                }],
                "error_message": str (if failed)
            }

        Raises:
            CrawlerConnectionError: If cannot connect to Crawl4AI
            CrawlerTimeoutError: If request times out
        """
        crawler_params: Dict[str, Any] = {
            "cache_mode": "bypass",
            "screenshot": screenshot,
            "pdf": pdf,
        }

        if wait_for:
            crawler_params["wait_for"] = wait_for
        if js_code:
            crawler_params["js_code"] = js_code

        request_body = {
            "urls": [url],
            "crawler_config": {
                "type": "CrawlerRunConfig",
                "params": crawler_params,
            },
        }

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/crawl",
                        json=request_body,
                    )

                    if response.status_code != 200:
                        error_text = response.text[:500] if response.text else "Unknown error"
                        return {
                            "success": False,
                            "results": [],
                            "error_message": f"HTTP {response.status_code}: {error_text}",
                        }

                    return response.json()

            except httpx.ConnectError as e:
                if attempt == self.max_retries:
                    raise CrawlerConnectionError(
                        f"Cannot connect to Crawl4AI at {self.base_url}: {e}"
                    )
                logger.warning(
                    f"Connection failed (attempt {attempt + 1}/{self.max_retries + 1}), retrying..."
                )
                await asyncio.sleep(self.retry_delay * (attempt + 1))

            except httpx.TimeoutException as e:
                if attempt == self.max_retries:
                    raise CrawlerTimeoutError(
                        f"Request timed out after {timeout}s: {e}"
                    )
                logger.warning(
                    f"Timeout (attempt {attempt + 1}/{self.max_retries + 1}), retrying..."
                )
                await asyncio.sleep(self.retry_delay * (attempt + 1))

        raise CrawlerError("Max retries exceeded")

    async def crawl_batch(
        self,
        urls: list[str],
        screenshot: bool = False,
        timeout: float = 120.0,
    ) -> Dict[str, Any]:
        """Execute a batch crawl request for multiple URLs.

        Args:
            urls: List of URLs to crawl
            screenshot: Whether to capture screenshots
            timeout: Request timeout in seconds

        Returns:
            Crawl4AI response with results for all URLs
        """
        request_body = {
            "urls": urls,
            "crawler_config": {
                "type": "CrawlerRunConfig",
                "params": {
                    "cache_mode": "bypass",
                    "screenshot": screenshot,
                },
            },
        }

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/crawl",
                        json=request_body,
                    )

                    if response.status_code != 200:
                        error_text = response.text[:500] if response.text else "Unknown error"
                        return {
                            "success": False,
                            "results": [],
                            "error_message": f"HTTP {response.status_code}: {error_text}",
                        }

                    return response.json()

            except httpx.ConnectError as e:
                if attempt == self.max_retries:
                    raise CrawlerConnectionError(
                        f"Cannot connect to Crawl4AI at {self.base_url}: {e}"
                    )
                await asyncio.sleep(self.retry_delay * (attempt + 1))

            except httpx.TimeoutException as e:
                if attempt == self.max_retries:
                    raise CrawlerTimeoutError(
                        f"Batch request timed out after {timeout}s: {e}"
                    )
                await asyncio.sleep(self.retry_delay * (attempt + 1))

        raise CrawlerError("Max retries exceeded")
