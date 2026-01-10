"""Configuration for the Crawl4AI crawler module."""

import os

# Default Crawl4AI settings
DEFAULT_CRAWL4AI_URL = "http://localhost:11235"
DEFAULT_CRAWL4AI_PORT = 11235

# Timeout settings (in seconds)
DEFAULT_ARTICLE_TIMEOUT = 120
DEFAULT_PDF_TIMEOUT = 180
DEFAULT_SCREENSHOT_TIMEOUT = 120
DEFAULT_RAW_HTML_TIMEOUT = 120
DEFAULT_MAP_TIMEOUT = 300

# Site mapping settings
DEFAULT_MAP_LIMIT = 200
DEFAULT_MAP_MAX_DEPTH = 2

# Retry settings
DEFAULT_MAX_RETRIES = 2
DEFAULT_RETRY_DELAY = 1.0

# Health check settings
HEALTH_CHECK_TIMEOUT = 5.0
HEALTH_CHECK_ENDPOINT = "/monitor/health"


def get_default_crawl4ai_url() -> str:
    """Get the default Crawl4AI URL from environment or default."""
    return os.environ.get("CRAWL4AI_URL", DEFAULT_CRAWL4AI_URL)
