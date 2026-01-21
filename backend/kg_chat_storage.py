"""JSON-based storage for Knowledge Graph chat sessions."""

import json
import os
import shutil
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

# Chat sessions stored in data/knowledge_graph/chat_sessions/{session_id}/
KG_CHAT_DIR = Path(os.getenv("DATA_DIR", "data")) / "knowledge_graph" / "chat_sessions"


def ensure_chat_dir():
    """Ensure the chat sessions directory exists."""
    KG_CHAT_DIR.mkdir(parents=True, exist_ok=True)


def get_session_dir(session_id: str) -> Path:
    """Get the directory path for a chat session."""
    return KG_CHAT_DIR / session_id


def get_session_file(session_id: str) -> Path:
    """Get the session.json file path for a chat session."""
    return get_session_dir(session_id) / "session.json"


def _truncate_title(text: str, max_length: int = 50) -> str:
    """Truncate text to max_length at word boundary."""
    if len(text) <= max_length:
        return text

    truncated = text[:max_length]
    # Find last space to break at word boundary
    last_space = truncated.rfind(' ')
    if last_space > 20:  # Only break at word if we have reasonable length
        truncated = truncated[:last_space]

    return truncated.rstrip() + "..."


def create_session(session_id: str, first_message: str) -> Dict[str, Any]:
    """
    Create a new chat session.

    Args:
        session_id: Unique session identifier
        first_message: First user message (used to generate title)

    Returns:
        The created session data
    """
    ensure_chat_dir()

    now = datetime.utcnow().isoformat()
    session = {
        "id": session_id,
        "title": _truncate_title(first_message),
        "created_at": now,
        "updated_at": now,
        "messages": []
    }

    save_session(session)
    return session


def save_session(session: Dict[str, Any]) -> None:
    """
    Save a chat session to disk.

    Args:
        session: The session data to save
    """
    ensure_chat_dir()
    session_dir = get_session_dir(session["id"])
    session_dir.mkdir(parents=True, exist_ok=True)

    session_file = get_session_file(session["id"])
    session_file.write_text(json.dumps(session, indent=2))


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a chat session by ID.

    Args:
        session_id: The session ID

    Returns:
        The session data or None if not found
    """
    session_file = get_session_file(session_id)
    if not session_file.exists():
        return None
    return json.loads(session_file.read_text())


def add_message(
    session_id: str,
    role: str,
    content: str,
    citations: Optional[List[Dict[str, Any]]] = None,
    follow_ups: Optional[List[str]] = None,
    notes_searched: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Add a message to a chat session.

    If session doesn't exist and this is a user message, creates a new session.

    Args:
        session_id: The session ID
        role: Message role ('user' or 'assistant')
        content: Message content
        citations: List of citations (assistant messages only)
        follow_ups: List of follow-up questions (assistant messages only)
        notes_searched: Number of notes searched (assistant messages only)

    Returns:
        The updated session or None if session not found
    """
    session = get_session(session_id)

    # Create session if it doesn't exist and this is a user message
    if session is None:
        if role == "user":
            session = create_session(session_id, content)
        else:
            return None

    now = datetime.utcnow().isoformat()

    message = {
        "role": role,
        "content": content,
        "created_at": now
    }

    # Add assistant-specific fields
    if role == "assistant":
        if citations is not None:
            message["citations"] = citations
        if follow_ups is not None:
            message["follow_ups"] = follow_ups
        if notes_searched is not None:
            message["notes_searched"] = notes_searched

    session["messages"].append(message)
    session["updated_at"] = now

    # Limit history to last 20 messages
    if len(session["messages"]) > 20:
        session["messages"] = session["messages"][-20:]

    save_session(session)
    return session


def get_history(session_id: str) -> List[Dict[str, str]]:
    """
    Get chat history for a session (simplified format for LLM context).

    Args:
        session_id: The session ID

    Returns:
        List of messages with role and content only
    """
    session = get_session(session_id)
    if not session:
        return []

    return [
        {"role": msg["role"], "content": msg["content"]}
        for msg in session.get("messages", [])
    ]


def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    """
    List chat sessions with metadata.

    Args:
        limit: Maximum number of sessions to return

    Returns:
        List of session metadata (excludes full messages for performance)
    """
    ensure_chat_dir()
    sessions = []

    for entry in KG_CHAT_DIR.iterdir():
        if entry.is_dir():
            session_file = entry / "session.json"
            if session_file.exists():
                try:
                    session = json.loads(session_file.read_text())

                    # Return metadata only (exclude full messages)
                    sessions.append({
                        "id": session["id"],
                        "title": session.get("title", "Untitled"),
                        "created_at": session.get("created_at"),
                        "updated_at": session.get("updated_at"),
                        "message_count": len(session.get("messages", []))
                    })
                except (json.JSONDecodeError, KeyError):
                    # Skip malformed files
                    continue

    # Sort by updated_at descending (most recent first)
    sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return sessions[:limit]


def delete_session(session_id: str) -> bool:
    """
    Delete a chat session and all its files.

    Args:
        session_id: The session ID

    Returns:
        True if deleted, False if not found
    """
    session_dir = get_session_dir(session_id)
    if session_dir.exists() and session_dir.is_dir():
        shutil.rmtree(session_dir)
        return True
    return False
