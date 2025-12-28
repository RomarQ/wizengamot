"""Tweet generation for Zettelkasten notes."""

from typing import Optional, List, Dict
from .openrouter import query_model

TWEET_SYSTEM_PROMPT = """Your task is to compress a note into 280 characters or fewer.

RULES:
1. The output MUST be 280 characters or fewer
2. Preserve the original meaning and wording as much as possible
3. Only remove words or shorten phrases to fit the limit
4. Do NOT add new ideas, hooks, or embellishments
5. Do NOT make it "catchy" or "engaging" - just compress it
6. Do not use hashtags unless specifically requested
7. Do not include URLs

If comments are provided, they indicate what the user found important - prioritize keeping those parts.
If additional instructions are provided, follow them.

Return ONLY the compressed text, nothing else."""


async def generate_tweet(
    note_body: str,
    note_title: str,
    comments: Optional[List[Dict]] = None,
    custom_prompt: Optional[str] = None,
    model: str = "google/gemini-3-flash-preview"
) -> Optional[str]:
    """
    Generate a tweet from a note.

    Args:
        note_body: The note content
        note_title: The note title
        comments: Optional list of comments associated with the note
        custom_prompt: Optional user customization instructions
        model: Model to use (default: GPT-5.1)

    Returns:
        Generated tweet text or None if failed
    """
    # Build user message
    user_content_parts = []
    user_content_parts.append(f"Note Title: {note_title}")
    user_content_parts.append(f"\nNote Content:\n{note_body}")

    if comments:
        user_content_parts.append("\nRelevant comments on this note:")
        for comment in comments:
            selection = comment.get('selection', '')
            content = comment.get('content', '')
            if selection or content:
                user_content_parts.append(f"- Highlighted: \"{selection}\"\n  Comment: {content}")

    if custom_prompt:
        user_content_parts.append(f"\nAdditional instructions: {custom_prompt}")
    else:
        user_content_parts.append("\nGenerate a tweet that captures the essence of this note.")

    messages = [
        {"role": "system", "content": TWEET_SYSTEM_PROMPT},
        {"role": "user", "content": "\n".join(user_content_parts)}
    ]

    response = await query_model(model, messages)

    if response and response.get("content"):
        tweet = response["content"].strip()
        # Remove any surrounding quotes the model might add
        if tweet.startswith('"') and tweet.endswith('"'):
            tweet = tweet[1:-1]
        # Ensure it's within limit (model should handle this, but safety check)
        if len(tweet) > 280:
            tweet = tweet[:277] + "..."
        return tweet

    return None
