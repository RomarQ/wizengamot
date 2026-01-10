"""Unit tests for the Crawl4AI adapter module."""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

from backend.crawler.adapter import (
    Crawl4AIAdapter,
    _transform_crawl4ai_response,
    _transform_error_response,
)
from backend.crawler.errors import CrawlerConnectionError, CrawlerTimeoutError


class TestTransformCrawl4AIResponse:
    """Tests for response transformation logic."""

    def test_transform_success_basic(self):
        """Test basic successful response transformation."""
        crawl4ai_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "# Test Content", "fit_markdown": "# Test"},
                "html": "<html><body>Test</body></html>",
                "metadata": {
                    "title": "Test Title",
                    "description": "Test description"
                }
            }]
        }

        result = _transform_crawl4ai_response(crawl4ai_response)

        assert result["success"] is True
        assert result["data"]["markdown"] == "# Test Content"
        assert result["data"]["metadata"]["title"] == "Test Title"
        assert result["data"]["metadata"]["description"] == "Test description"
        assert result["error"] is None

    def test_transform_with_og_title(self):
        """Test og_title -> ogTitle field normalization."""
        crawl4ai_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "Content"},
                "html": "<html></html>",
                "metadata": {
                    "title": "Regular Title",
                    "og_title": "OG Title"
                }
            }]
        }

        result = _transform_crawl4ai_response(crawl4ai_response)

        assert result["data"]["metadata"]["title"] == "Regular Title"
        assert result["data"]["metadata"]["ogTitle"] == "OG Title"

    def test_transform_screenshot_strips_prefix(self):
        """Test that screenshot base64 prefix is stripped."""
        crawl4ai_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "Content"},
                "html": "<html></html>",
                "screenshot": "data:image/png;base64,iVBORw0KGgo=",
                "metadata": {}
            }]
        }

        result = _transform_crawl4ai_response(crawl4ai_response, include_screenshot=True)

        assert result["data"]["screenshot"] == "iVBORw0KGgo="

    def test_transform_screenshot_no_prefix(self):
        """Test screenshot without data URL prefix."""
        crawl4ai_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "Content"},
                "html": "<html></html>",
                "screenshot": "iVBORw0KGgo=",
                "metadata": {}
            }]
        }

        result = _transform_crawl4ai_response(crawl4ai_response, include_screenshot=True)

        assert result["data"]["screenshot"] == "iVBORw0KGgo="

    def test_transform_raw_html(self):
        """Test raw HTML is included when requested."""
        crawl4ai_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "Content"},
                "html": "<html><body>Test</body></html>",
                "metadata": {}
            }]
        }

        result = _transform_crawl4ai_response(crawl4ai_response, include_raw_html=True)

        assert result["data"]["rawHtml"] == "<html><body>Test</body></html>"

    def test_transform_failure_response(self):
        """Test transformation of failed response."""
        crawl4ai_response = {
            "success": False,
            "error_message": "Connection timeout"
        }

        result = _transform_crawl4ai_response(crawl4ai_response)

        assert result["success"] is False
        assert result["error"] == "Connection timeout"
        assert result["data"] == {}

    def test_transform_empty_results(self):
        """Test transformation when results array is empty."""
        crawl4ai_response = {
            "success": True,
            "results": []
        }

        result = _transform_crawl4ai_response(crawl4ai_response)

        assert result["success"] is False
        assert "No results" in result["error"]


class TestTransformErrorResponse:
    """Tests for error response transformation."""

    def test_transform_connection_error(self):
        """Test CrawlerConnectionError transformation."""
        error = CrawlerConnectionError("Cannot connect to service")
        result = _transform_error_response(error)

        assert result["success"] is False
        assert "Cannot connect" in result["error"]
        assert result["data"] == {}

    def test_transform_timeout_error(self):
        """Test CrawlerTimeoutError transformation."""
        error = CrawlerTimeoutError("Request timed out after 120s")
        result = _transform_error_response(error)

        assert result["success"] is False
        assert "timed out" in result["error"]


class TestCrawl4AIAdapter:
    """Tests for the Crawl4AI adapter class."""

    @pytest.fixture
    def adapter(self):
        """Create adapter instance for testing."""
        return Crawl4AIAdapter("http://localhost:11235")

    @pytest.mark.asyncio
    async def test_scrape_article_success(self, adapter):
        """Test successful article scraping."""
        mock_response = {
            "success": True,
            "results": [{
                "url": "https://example.com/article",
                "markdown": {"raw_markdown": "# Article Title\n\nContent here"},
                "html": "<html></html>",
                "metadata": {
                    "title": "Article Title",
                    "description": "An article"
                }
            }]
        }

        with patch.object(adapter.client, 'crawl', new_callable=AsyncMock) as mock_crawl:
            mock_crawl.return_value = mock_response

            result = await adapter.scrape_article("https://example.com/article")

            assert result["success"] is True
            assert result["data"]["markdown"] == "# Article Title\n\nContent here"
            assert result["data"]["metadata"]["title"] == "Article Title"

    @pytest.mark.asyncio
    async def test_scrape_pdf_arxiv_conversion(self, adapter):
        """Test arXiv URL conversion to ar5iv for scraping."""
        mock_response = {
            "success": True,
            "results": [{
                "url": "https://ar5iv.org/abs/2301.00001",
                "markdown": {"raw_markdown": "Paper content"},
                "html": "<html></html>",
                "metadata": {"title": "Paper Title"}
            }]
        }

        with patch.object(adapter.client, 'crawl', new_callable=AsyncMock) as mock_crawl:
            mock_crawl.return_value = mock_response

            result = await adapter.scrape_pdf("https://arxiv.org/abs/2301.00001")

            # Verify ar5iv URL was called (not PDF scraping)
            mock_crawl.assert_called_once()
            call_args = mock_crawl.call_args[0]
            assert "ar5iv.org" in call_args[0]
            # Should NOT have pdf flag since ar5iv provides HTML
            call_kwargs = mock_crawl.call_args[1]
            assert call_kwargs.get('pdf') is None or call_kwargs.get('pdf') is False

            assert result["success"] is True

    @pytest.mark.asyncio
    async def test_scrape_with_screenshot(self, adapter):
        """Test screenshot scraping."""
        mock_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "Content"},
                "html": "<html></html>",
                "screenshot": "data:image/png;base64,ABC123",
                "metadata": {"title": "Page"}
            }]
        }

        with patch.object(adapter.client, 'crawl', new_callable=AsyncMock) as mock_crawl:
            mock_crawl.return_value = mock_response

            result = await adapter.scrape_with_screenshot("https://example.com")

            mock_crawl.assert_called_once()
            call_kwargs = mock_crawl.call_args[1]
            assert call_kwargs.get('screenshot') is True

            assert result["success"] is True
            assert result["data"]["screenshot"] == "ABC123"  # Prefix stripped

    @pytest.mark.asyncio
    async def test_scrape_raw_html(self, adapter):
        """Test raw HTML scraping."""
        mock_response = {
            "success": True,
            "results": [{
                "url": "https://example.com",
                "markdown": {"raw_markdown": "Content"},
                "html": "<html><script>mp3_url = 'test.mp3';</script></html>",
                "metadata": {}
            }]
        }

        with patch.object(adapter.client, 'crawl', new_callable=AsyncMock) as mock_crawl:
            mock_crawl.return_value = mock_response

            result = await adapter.scrape_raw_html("https://example.com")

            assert result["success"] is True
            assert "<script>" in result["data"]["rawHtml"]

    @pytest.mark.asyncio
    async def test_connection_error_handling(self, adapter):
        """Test handling of connection errors."""
        with patch.object(adapter.client, 'crawl', new_callable=AsyncMock) as mock_crawl:
            mock_crawl.side_effect = CrawlerConnectionError("Cannot connect")

            result = await adapter.scrape_article("https://example.com")

            assert result["success"] is False
            assert "Cannot connect" in result["error"]

    @pytest.mark.asyncio
    async def test_timeout_error_handling(self, adapter):
        """Test handling of timeout errors."""
        with patch.object(adapter.client, 'crawl', new_callable=AsyncMock) as mock_crawl:
            mock_crawl.side_effect = CrawlerTimeoutError("Timeout")

            result = await adapter.scrape_article("https://example.com")

            assert result["success"] is False
            assert "Timeout" in result["error"]
