"""Summary generation for conversation gallery previews."""

from typing import Optional
from .openrouter import query_model

# Model for summary generation - fast and cheap
SUMMARY_MODEL = "google/gemini-2.0-flash-001"


async def generate_summary(content: str, mode: str) -> Optional[str]:
    """
    Generate a 2-3 sentence summary for gallery card preview.

    Args:
        content: The content to summarize (stage3 for council, note bodies for synthesizer)
        mode: 'council' or 'synthesizer' to adjust the prompt

    Returns:
        A brief summary string, or None if generation failed
    """
    if not content or not content.strip():
        return None

    # Truncate content to avoid token limits (keep first ~2000 chars)
    truncated_content = content[:2000]

    if mode == 'council':
        system_prompt = "You are a summarizer. Create a 2-3 sentence summary of this council discussion synthesis for a preview card. Focus on the key insights and conclusions. Be concise."
    else:
        system_prompt = "You are a summarizer. Create a 2-3 sentence summary of these notes for a preview card. Focus on the main topic and key points. Be concise."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": truncated_content}
    ]

    try:
        response = await query_model(SUMMARY_MODEL, messages, timeout=30.0)
        if response and response.get('content'):
            return response['content'].strip()
        return None
    except Exception as e:
        print(f"Error generating summary: {e}")
        return None
