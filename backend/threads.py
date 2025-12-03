"""Thread management for follow-up conversations with specific models."""

from typing import List, Dict, Any, Optional
from .openrouter import query_model
from .storage import get_conversation, get_comments


def compile_context_from_comments(
    conversation: Dict[str, Any],
    comment_ids: List[str],
    context_segments: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Compile context from comments and optional manual segments into a formatted string.

    Args:
        conversation: The conversation dict
        comment_ids: List of comment IDs to include
        context_segments: Optional list of manually added segments

    Returns:
        Formatted context string
    """
    context_parts: List[str] = []

    comments = conversation.get("comments", [])
    relevant_comments = [c for c in comments if c["id"] in comment_ids]

    if relevant_comments:
        context_parts.append(
            "The user has highlighted and commented on specific content:\n"
        )

        for comment in relevant_comments:
            # Detect source type - check for note_id as fallback
            source_type = comment.get("source_type") or ("synthesizer" if comment.get("note_id") else "council")
            selection = comment["selection"]
            content = comment["content"]

            if source_type == "council":
                stage = comment.get("stage")
                model = comment.get("model")
                context_parts.append(f"\nStage {stage} response from {model}:")
            else:  # synthesizer
                note_title = comment.get("note_title", "Note")
                context_parts.append(f"\nFrom note '{note_title}':")

            context_parts.append(f'Selected text: "{selection}"')
            context_parts.append(f"User comment: {content}\n")

    if context_segments:
        context_parts.append(
            "The user also pinned larger context segments for your reference:\n"
        )
        for segment in context_segments:
            # Detect source type - check for note_id as fallback
            source_type = segment.get("source_type") or ("synthesizer" if segment.get("note_id") else "council")
            label = segment.get("label") or "Selected segment"
            content = segment.get("content") or ""

            if source_type == "council":
                stage = segment.get("stage")
                model = segment.get("model")
                context_parts.append(
                    f"\n{label} (Stage {stage} • {model}):\n{content.strip()}\n"
                )
            else:  # synthesizer
                note_title = segment.get("note_title", "Note")
                context_parts.append(
                    f"\n{label} (Note: {note_title}):\n{content.strip()}\n"
                )

    return "\n".join(context_parts).strip()


async def query_with_context(
    model: str,
    question: str,
    conversation: Dict[str, Any],
    comment_ids: List[str],
    context_segments: Optional[List[Dict[str, Any]]] = None,
    system_prompt: Optional[str] = None,
    compiled_context: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Query a specific model with context from comments.

    Args:
        model: Model identifier to query
        question: The follow-up question
        conversation: The conversation dict
        comment_ids: List of comment IDs to include in context
        system_prompt: Optional system prompt

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
    # Compile context from comments and segments, unless an explicit compiled blob is provided
    context = compiled_context or compile_context_from_comments(conversation, comment_ids, context_segments)

    # Build messages
    messages = []

    # Add system prompt if provided
    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt
        })

    # Add context as a system message if we have comments
    if context:
        messages.append({
            "role": "system",
            "content": context
        })

    # Add the user's question
    messages.append({
        "role": "user",
        "content": question
    })

    # Query the model
    return await query_model(model, messages)


async def continue_thread(
    model: str,
    thread_messages: List[Dict[str, Any]],
    new_question: str,
    system_prompt: Optional[str] = None,
    context: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Continue an existing thread with a new question.

    Args:
        model: Model identifier to query
        thread_messages: Previous messages in the thread
        new_question: The new question to ask
        system_prompt: Optional system prompt
        context: Optional compiled context from comments

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
    # Build messages
    messages = []

    # Add system prompt if provided
    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt
        })

    # Add context if provided (only for the first message)
    if context:
        messages.append({
            "role": "system",
            "content": context
        })

    # Add previous thread messages (skip the first message if it's already included as context)
    for msg in thread_messages:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    # Add the new question
    messages.append({
        "role": "user",
        "content": new_question
    })

    # Query the model
    return await query_model(model, messages)
