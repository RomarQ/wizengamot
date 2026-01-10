"""Custom exception classes for the crawler module."""


class CrawlerError(Exception):
    """Base class for crawler errors."""
    pass


class CrawlerConnectionError(CrawlerError):
    """Crawl4AI service unavailable or connection failed."""
    pass


class CrawlerTimeoutError(CrawlerError):
    """Request exceeded timeout."""
    pass


class CrawlerRateLimitError(CrawlerError):
    """Rate limit exceeded."""
    pass
