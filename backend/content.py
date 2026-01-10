"""Content fetching for Synthesizer mode.

Handles URL detection and content extraction from:
- YouTube videos (via transcription)
- Podcasts (via MP3 extraction and transcription)
- PDFs and arXiv papers (via Crawl4AI/Firecrawl)
- Articles/blogs (via Crawl4AI/Firecrawl)
"""

import re
import logging
import asyncio
from typing import Dict, Any, Optional
from functools import partial

from .settings import get_firecrawl_api_key, is_crawl4ai_enabled
from .workers.youtube import transcribe_youtube, extract_start_time
from .workers.podcast import is_podcast_url, transcribe_podcast
from .crawler import get_crawler, CrawlerError

logger = logging.getLogger(__name__)


def detect_url_type(url: str) -> str:
    """
    Detect if URL is YouTube, podcast, or a general article.

    Args:
        url: URL to analyze

    Returns:
        'youtube', 'podcast', or 'article'
    """
    youtube_patterns = [
        r'youtube\.com/watch',
        r'youtu\.be/',
        r'youtube\.com/shorts/',
        r'youtube\.com/live/',
        r'm\.youtube\.com/watch',
    ]

    for pattern in youtube_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return 'youtube'

    # Check for podcast platforms
    if is_podcast_url(url):
        return 'podcast'

    # Check for PDF or arXiv links
    if is_pdf_url(url):
        return 'pdf'

    return 'article'


def is_pdf_url(url: str) -> bool:
    """
    Detect if URL is a PDF or arXiv link.

    Args:
        url: URL to analyze

    Returns:
        True if URL is a PDF or arXiv paper
    """
    # Direct PDF links
    if url.lower().endswith('.pdf'):
        return True
    # arXiv abstract or PDF pages
    if 'arxiv.org/abs/' in url or 'arxiv.org/pdf/' in url:
        return True
    return False


async def fetch_youtube_content(url: str, whisper_model: str = "base") -> Dict[str, Any]:
    """
    Fetch content from a YouTube video via transcription.

    Args:
        url: YouTube video URL
        whisper_model: Whisper model to use for transcription

    Returns:
        {
            "source_type": "youtube",
            "content": str (transcript),
            "title": str,
            "error": Optional[str]
        }
    """
    try:
        # Check for start time in URL
        start_seconds = extract_start_time(url)

        # Run synchronous transcription in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(
                transcribe_youtube,
                url=url,
                whisper_model=whisper_model,
                start_seconds=start_seconds
            )
        )

        return {
            "source_type": "youtube",
            "content": result["transcript"],
            "title": result["title"],
            "duration": result.get("duration"),
            "channel": result.get("channel"),
            "error": None
        }

    except Exception as e:
        logger.error(f"Failed to fetch YouTube content: {e}")
        return {
            "source_type": "youtube",
            "content": None,
            "title": None,
            "error": str(e)
        }


async def fetch_podcast_content(url: str, whisper_model: str = "base") -> Dict[str, Any]:
    """
    Fetch content from a podcast episode via MP3 extraction and transcription.

    Args:
        url: Podcast episode page URL (Pocket Casts, Apple Podcasts, etc.)
        whisper_model: Whisper model to use for transcription

    Returns:
        {
            "source_type": "podcast",
            "content": str (transcript),
            "title": str,
            "description": str,
            "mp3_url": str,
            "error": Optional[str]
        }
    """
    from .workers.podcast import is_apple_podcast_url

    # Apple Podcasts don't need Firecrawl - they use iTunes API
    api_key = get_firecrawl_api_key()
    if not api_key and not is_apple_podcast_url(url):
        return {
            "source_type": "podcast",
            "content": None,
            "title": None,
            "error": "Firecrawl API key not configured. Please add it in Settings > Integrations."
        }

    try:
        result = await transcribe_podcast(
            url=url,
            api_key=api_key,
            whisper_model=whisper_model
        )

        if result.get("error"):
            return {
                "source_type": "podcast",
                "content": None,
                "title": result.get("title"),
                "description": result.get("description"),
                "mp3_url": result.get("mp3_url"),
                "error": result["error"]
            }

        return {
            "source_type": "podcast",
            "content": result["transcript"],
            "title": result["title"],
            "description": result.get("description"),
            "mp3_url": result.get("mp3_url"),
            "error": None
        }

    except Exception as e:
        logger.error(f"Failed to fetch podcast content: {e}")
        return {
            "source_type": "podcast",
            "content": None,
            "title": None,
            "error": str(e)
        }


async def fetch_article_content(url: str) -> Dict[str, Any]:
    """
    Fetch article content using Crawl4AI (primary) or Firecrawl (fallback).

    Args:
        url: Article URL

    Returns:
        {
            "source_type": "article",
            "content": str (markdown),
            "title": str,
            "error": Optional[str]
        }
    """
    # Check if any crawler is configured
    api_key = get_firecrawl_api_key()
    crawl4ai_enabled = is_crawl4ai_enabled()

    if not crawl4ai_enabled and not api_key:
        return {
            "source_type": "article",
            "content": None,
            "title": None,
            "error": "No crawler configured. Enable Crawl4AI or add Firecrawl API key in Settings."
        }

    try:
        crawler = get_crawler()
        result = await crawler.scrape_article(url)

        if not result.get("success"):
            return {
                "source_type": "article",
                "content": None,
                "title": None,
                "error": result.get("error", "Failed to scrape the URL")
            }

        result_data = result.get("data", {})
        markdown = result_data.get("markdown", "")
        metadata = result_data.get("metadata", {})
        title = metadata.get("title", metadata.get("ogTitle", ""))

        return {
            "source_type": "article",
            "content": markdown,
            "title": title,
            "description": metadata.get("description", ""),
            "error": None
        }

    except CrawlerError as e:
        logger.error(f"Crawler error for {url}: {e}")
        return {
            "source_type": "article",
            "content": None,
            "title": None,
            "error": str(e)
        }
    except Exception as e:
        logger.error(f"Failed to fetch article content: {e}")
        return {
            "source_type": "article",
            "content": None,
            "title": None,
            "error": str(e)
        }


async def fetch_pdf_content(url: str) -> Dict[str, Any]:
    """
    Fetch PDF content using Crawl4AI (primary) or Firecrawl (fallback).
    Handles both direct PDF URLs and arXiv links.

    Args:
        url: PDF URL or arXiv link

    Returns:
        {
            "source_type": "pdf",
            "content": str (markdown),
            "title": str,
            "error": Optional[str]
        }
    """
    # Check if any crawler is configured
    api_key = get_firecrawl_api_key()
    crawl4ai_enabled = is_crawl4ai_enabled()

    if not crawl4ai_enabled and not api_key:
        return {
            "source_type": "pdf",
            "content": None,
            "title": None,
            "error": "No crawler configured. Enable Crawl4AI or add Firecrawl API key in Settings."
        }

    original_url = url

    try:
        crawler = get_crawler()
        result = await crawler.scrape_pdf(url)

        if not result.get("success"):
            return {
                "source_type": "pdf",
                "content": None,
                "title": None,
                "error": result.get("error", "Failed to parse the PDF")
            }

        result_data = result.get("data", {})
        markdown = result_data.get("markdown", "")
        metadata = result_data.get("metadata", {})
        title = metadata.get("title", metadata.get("ogTitle", ""))

        # Try to extract title from arXiv URL if not in metadata
        if not title and 'arxiv.org' in original_url:
            title = "arXiv Paper"

        return {
            "source_type": "pdf",
            "content": markdown,
            "title": title,
            "description": metadata.get("description", ""),
            "error": None
        }

    except CrawlerError as e:
        logger.error(f"Crawler error for PDF {url}: {e}")
        return {
            "source_type": "pdf",
            "content": None,
            "title": None,
            "error": str(e)
        }
    except Exception as e:
        logger.error(f"Failed to fetch PDF content: {e}")
        return {
            "source_type": "pdf",
            "content": None,
            "title": None,
            "error": str(e)
        }


async def fetch_content(url: str, whisper_model: str = "base") -> Dict[str, Any]:
    """
    Main entry point: detect URL type and fetch content.

    Args:
        url: URL to fetch content from
        whisper_model: Whisper model for YouTube/podcast transcription

    Returns:
        {
            "source_type": "youtube" | "podcast" | "pdf" | "article",
            "content": str (transcript or markdown),
            "title": Optional[str],
            "error": Optional[str]
        }
    """
    source_type = detect_url_type(url)

    if source_type == 'youtube':
        return await fetch_youtube_content(url, whisper_model)
    elif source_type == 'podcast':
        return await fetch_podcast_content(url, whisper_model)
    elif source_type == 'pdf':
        return await fetch_pdf_content(url)
    else:
        return await fetch_article_content(url)
