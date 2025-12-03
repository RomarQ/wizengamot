"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage (configurable for Docker)
DATA_DIR = os.getenv("DATA_DIR", "data/conversations")


def get_council_models():
    """Get council models from settings (with fallback to defaults)."""
    from . import settings
    return settings.get_council_models()


def get_chairman_model():
    """Get chairman model from settings (with fallback to default)."""
    from . import settings
    return settings.get_chairman_model()


def get_model_pool():
    """Get the available model pool from settings."""
    from . import settings
    return settings.get_model_pool()


# Backwards compatibility - these are now functions
# Use get_council_models() and get_chairman_model() for dynamic values
COUNCIL_MODELS = None  # Deprecated - use get_council_models()
CHAIRMAN_MODEL = None  # Deprecated - use get_chairman_model()
