"""
Sleep Time Compute - Multi-turn Knowledge Discovery Workflow

A budget-controlled, multi-turn knowledge discovery system that applies
brainstorming styles to explore the knowledge graph and suggest bridge notes.
"""

import json
import os
import re
import uuid
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

from .openrouter import query_model, get_generation_cost
from .storage import get_conversation, list_conversations, save_conversation, update_conversation_cost, update_conversation_summary
from .graph_search import search_knowledge_graph
from .knowledge_graph import load_entities, build_graph
from .brainstorm_styles import get_style, list_styles, get_enabled_styles
from .summarizer import generate_summary

logger = logging.getLogger(__name__)

# Storage directory
KNOWLEDGE_GRAPH_DIR = os.getenv("KNOWLEDGE_GRAPH_DIR", "data/knowledge_graph")

# Default model for sleep compute sessions
SLEEP_COMPUTE_MODEL = "anthropic/claude-opus-4.5"

# Maximum concurrent workers
MAX_WORKERS = 3


def ensure_kg_dir():
    """Ensure the knowledge graph directory exists."""
    Path(KNOWLEDGE_GRAPH_DIR).mkdir(parents=True, exist_ok=True)


def get_sessions_path() -> str:
    """Get the path to the sleep sessions storage file."""
    return os.path.join(KNOWLEDGE_GRAPH_DIR, "sleep_sessions.json")


def load_sessions() -> Dict[str, Any]:
    """Load sleep compute sessions from storage."""
    ensure_kg_dir()
    path = get_sessions_path()

    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)

    return {
        "sessions": {},
        "active_sessions": [],  # List of active session IDs (max 3)
        "settings": {
            "default_depth": 2,
            "default_max_notes": 30,
            "default_turns": 3,
            "model": None
        }
    }


def save_sessions(data: Dict[str, Any]):
    """Save sleep compute sessions to storage."""
    ensure_kg_dir()
    data["updated_at"] = datetime.utcnow().isoformat()

    path = get_sessions_path()
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)


class SleepComputeState:
    """Track sleep compute session state (singleton)."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.reset()
        return cls._instance

    def reset(self):
        self.running = False
        self.paused = False
        self.cancelled = False
        self.session_id = None
        self.phase = None  # "collecting", "brainstorming", "synthesizing"
        self.current_turn = 0
        self.total_turns = 0
        self.progress = 0
        self.started_at = None
        self.error = None


sleep_compute_state = SleepComputeState()


def get_sleep_compute_status() -> Dict[str, Any]:
    """Get current sleep compute status."""
    global sleep_compute_state

    return {
        "running": sleep_compute_state.running,
        "paused": sleep_compute_state.paused,
        "cancelled": sleep_compute_state.cancelled,
        "session_id": sleep_compute_state.session_id,
        "phase": sleep_compute_state.phase,
        "current_turn": sleep_compute_state.current_turn,
        "total_turns": sleep_compute_state.total_turns,
        "progress": sleep_compute_state.progress,
        "started_at": sleep_compute_state.started_at,
        "error": sleep_compute_state.error
    }


def cancel_sleep_compute():
    """Cancel running sleep compute session."""
    global sleep_compute_state

    if sleep_compute_state.running:
        sleep_compute_state.cancelled = True

        # Update session status
        data = load_sessions()
        if sleep_compute_state.session_id and sleep_compute_state.session_id in data["sessions"]:
            data["sessions"][sleep_compute_state.session_id]["status"] = "cancelled"
            save_sessions(data)

        return {"status": "cancelling"}

    return {"status": "not_running"}


def pause_sleep_compute():
    """Pause running sleep compute session."""
    global sleep_compute_state

    if sleep_compute_state.running and not sleep_compute_state.paused:
        sleep_compute_state.paused = True

        # Update session status
        data = load_sessions()
        if sleep_compute_state.session_id and sleep_compute_state.session_id in data["sessions"]:
            data["sessions"][sleep_compute_state.session_id]["status"] = "paused"
            save_sessions(data)

        return {"status": "paused"}

    return {"status": "not_running" if not sleep_compute_state.running else "already_paused"}


def resume_sleep_compute():
    """Resume paused sleep compute session."""
    global sleep_compute_state

    if sleep_compute_state.paused:
        sleep_compute_state.paused = False

        # Update session status
        data = load_sessions()
        if sleep_compute_state.session_id and sleep_compute_state.session_id in data["sessions"]:
            data["sessions"][sleep_compute_state.session_id]["status"] = "running"
            save_sessions(data)

        return {"status": "resumed"}

    return {"status": "not_paused"}


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get a single session by ID."""
    data = load_sessions()
    return data["sessions"].get(session_id)


def list_sessions(limit: int = 20) -> List[Dict[str, Any]]:
    """List all sleep compute sessions."""
    data = load_sessions()
    sessions = list(data["sessions"].values())

    # Sort by created_at descending
    sessions.sort(key=lambda s: s.get("created_at", ""), reverse=True)

    return sessions[:limit]


def get_sleep_compute_settings() -> Dict[str, Any]:
    """Get sleep compute default settings."""
    data = load_sessions()
    return data.get("settings", {
        "default_depth": 2,
        "default_max_notes": 30,
        "default_turns": 3,
        "model": None
    })


def update_sleep_compute_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Update sleep compute default settings."""
    data = load_sessions()

    for key, value in settings.items():
        if key in data["settings"]:
            data["settings"][key] = value

    save_sessions(data)
    return data["settings"]


def _collect_notes_for_session(
    prompt: str,
    depth: int = 2,
    max_notes: int = 30,
    entry_points: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Collect notes for sleep compute session using graph traversal.

    Args:
        prompt: User's discovery prompt
        depth: Graph traversal hops (1-3)
        max_notes: Maximum notes to collect
        entry_points: Optional list of entry points (notes or topics) to start from

    Returns:
        List of note dicts with content and metadata
    """
    # Get all synthesizer conversations
    all_conversations = list_conversations()
    synth_conversations = [c for c in all_conversations if c.get("mode") == "synthesizer"]

    # Collect all notes
    all_notes = []
    for conv in synth_conversations:
        full_conv = get_conversation(conv["id"])
        if not full_conv:
            continue

        source_title = full_conv.get("title", "Untitled")

        for msg in full_conv.get("messages", []):
            if msg.get("role") != "assistant":
                continue

            for note in msg.get("notes", []):
                note_id = f"note:{conv['id']}:{note['id']}"
                all_notes.append({
                    "id": note_id,
                    "title": note.get("title", ""),
                    "body": note.get("body", ""),
                    "tags": note.get("tags", []),
                    "source_id": conv["id"],
                    "source_title": source_title
                })

    if not all_notes:
        return []

    notes_by_id = {n["id"]: n for n in all_notes}
    relevant_notes = []

    # If entry points are provided, use them to seed the collection
    if entry_points and len(entry_points) > 0:
        entry_note_ids = set()
        entry_topics = []

        for ep in entry_points:
            if ep.get("type") == "note" and ep.get("id"):
                entry_note_ids.add(ep["id"])
            elif ep.get("type") == "topic" and ep.get("title"):
                entry_topics.append(ep["title"].lower())

        # First, add all specifically selected notes
        for note_id in entry_note_ids:
            if note_id in notes_by_id:
                note = notes_by_id[note_id]
                note["relevance_score"] = 1.0  # Highest relevance for selected notes
                relevant_notes.append(note)

        # Then find related notes via topics (tag matching)
        if entry_topics:
            for note in all_notes:
                if note["id"] in entry_note_ids:
                    continue  # Already added
                note_tags = [t.lower() for t in note.get("tags", [])]
                for topic in entry_topics:
                    if topic in note_tags or topic in note.get("title", "").lower():
                        note["relevance_score"] = 0.8
                        relevant_notes.append(note)
                        break

        # If we still need more notes, use semantic search with entry point context
        if len(relevant_notes) < max_notes:
            search_query = prompt
            # Enhance search query with entry point info
            if entry_topics:
                search_query = f"{prompt} {' '.join(entry_topics)}"

            search_limit = min(max_notes * depth, len(all_notes))
            search_results = search_knowledge_graph(
                query=search_query,
                node_types=["note"],
                limit=search_limit
            )

            existing_ids = {n["id"] for n in relevant_notes}
            for result in search_results:
                note_id = result["id"]
                if note_id in notes_by_id and note_id not in existing_ids:
                    note = notes_by_id[note_id]
                    note["relevance_score"] = result.get("score", 0) * 0.5  # Lower score for discovered
                    relevant_notes.append(note)
                    if len(relevant_notes) >= max_notes:
                        break
    else:
        # Original behavior: use semantic search with depth-based limit
        search_limit = min(max_notes * depth, len(all_notes))

        search_results = search_knowledge_graph(
            query=prompt,
            node_types=["note"],
            limit=search_limit
        )

        for result in search_results:
            note_id = result["id"]
            if note_id in notes_by_id:
                note = notes_by_id[note_id]
                note["relevance_score"] = result.get("score", 0)
                relevant_notes.append(note)

    # Sort by relevance and limit to max_notes
    relevant_notes.sort(key=lambda n: n.get("relevance_score", 0), reverse=True)
    return relevant_notes[:max_notes]


def _format_notes_for_prompt(notes: List[Dict[str, Any]]) -> str:
    """Format notes for inclusion in brainstorm prompts."""
    lines = []

    for i, note in enumerate(notes, 1):
        tags_str = " ".join(note.get("tags", [])) if note.get("tags") else "(no tags)"

        lines.append(f"""
[Note {i}] ID: {note['id']}
Source: {note.get('source_title', 'Unknown')}
Title: {note['title']}
Tags: {tags_str}
Content: {note['body'][:500]}
""")

    return "\n".join(lines)


def _parse_json_response(content: str) -> Any:
    """Parse JSON from LLM response, handling markdown code blocks."""
    # Strip markdown code blocks
    if content.startswith("```"):
        content = re.sub(r'^```(?:json)?\n?', '', content)
        content = re.sub(r'\n?```$', '', content)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to find JSON array or object
        json_match = re.search(r'(\[[\s\S]*\]|\{[\s\S]*\})', content)
        if json_match:
            return json.loads(json_match.group())
        raise


async def _execute_turn(
    session: Dict[str, Any],
    turn_number: int,
    style: Dict[str, Any],
    notes: List[Dict[str, Any]],
    previous_ideas: List[Dict[str, Any]],
    model: str
) -> Dict[str, Any]:
    """
    Execute a single brainstorming turn.

    Args:
        session: Current session data
        turn_number: Current turn number (1-indexed)
        style: Brainstorming style dict
        notes: Notes to analyze
        previous_ideas: Ideas from previous turns
        model: Model to use

    Returns:
        Turn result with ideas
    """
    global sleep_compute_state

    turn_result = {
        "turn_number": turn_number,
        "style": style["id"],
        "started_at": datetime.utcnow().isoformat(),
        "ideas": [],
        "generation_ids": []
    }

    notes_content = _format_notes_for_prompt(notes)

    # Choose prompt based on turn number
    if turn_number == 1:
        # Initial turn - use initial prompt
        prompt_template = style.get("initial_prompt", "")
        prompt = prompt_template.replace("{notes_content}", notes_content)
    else:
        # Expansion turn - use expansion prompt with previous ideas
        prompt_template = style.get("expansion_prompt", "")
        idea_json = json.dumps(previous_ideas[-5:], indent=2)  # Top 5 from previous
        prompt = prompt_template.replace("{idea}", idea_json)
        prompt = prompt.replace("{notes_content}", notes_content)

    messages = [{"role": "user", "content": prompt}]

    response = await query_model(model, messages, timeout=120.0)

    if not response or not response.get("content"):
        turn_result["error"] = "No response from model"
        return turn_result

    if response.get("error"):
        turn_result["error"] = response["error"]
        return turn_result

    # Track generation ID for cost
    generation_id = response.get("generation_id")
    if generation_id:
        turn_result["generation_ids"].append(generation_id)
        session["generation_ids"].append(generation_id)

        # Fetch cost immediately
        cost = await get_generation_cost(generation_id)
        if cost:
            session["total_cost"] = session.get("total_cost", 0) + cost

    # Parse response
    try:
        ideas = _parse_json_response(response["content"])
        if isinstance(ideas, list):
            turn_result["ideas"] = ideas
        else:
            turn_result["ideas"] = [ideas]
    except json.JSONDecodeError as e:
        turn_result["error"] = f"Failed to parse response: {e}"
        turn_result["raw_response"] = response["content"][:500]

    turn_result["completed_at"] = datetime.utcnow().isoformat()
    return turn_result


def _prune_ideas(ideas: List[Dict[str, Any]], max_keep: int = 10) -> List[Dict[str, Any]]:
    """
    Score and prune ideas, keeping top N between turns.

    Simple scoring based on:
    - Number of notes connected
    - Presence of reasoning/insight
    - Bridge suggestion quality
    """
    scored = []
    for idea in ideas:
        score = 0

        # More notes connected = higher score
        note_ids = idea.get("note_ids", idea.get("relevant_notes", []))
        score += len(note_ids) * 2

        # Has reasoning/insight
        if idea.get("reasoning") or idea.get("insight"):
            score += 3

        # Has bridge suggestion
        if idea.get("bridge_suggestion") or idea.get("bridge_title"):
            score += 3

        # Has concrete bridge body
        if idea.get("bridge_body"):
            score += 5

        scored.append((score, idea))

    # Sort by score descending and take top N
    scored.sort(key=lambda x: x[0], reverse=True)
    return [idea for score, idea in scored[:max_keep]]


def _generate_bridge_suggestions(
    session: Dict[str, Any],
    final_ideas: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generate final bridge note suggestions from brainstorming ideas.

    Converts raw ideas into discovery-compatible format.
    """
    suggestions = []

    for idea in final_ideas:
        # Extract note IDs from various possible fields
        note_ids = (
            idea.get("note_ids", []) or
            idea.get("relevant_notes", []) or
            []
        )

        # Extract bridge note title - try specific fields first, then use full idea text
        title = (
            idea.get("bridge_title") or
            idea.get("title") or
            idea.get("sub_idea") or  # For expansion prompts
            idea.get("insight") or   # For role_storming, six_hats
            idea.get("question") or  # For starbursting
            idea.get("description") or  # For reverse_brainstorming
            idea.get("idea", "")     # NO TRUNCATION - use full text
        )

        # Extract body content - use reasoning as meaningful fallback
        body = (
            idea.get("bridge_body") or
            idea.get("body") or
            idea.get("answer") or
            idea.get("synthesis") or
            idea.get("reasoning") or  # Use reasoning as fallback
            idea.get("insight") or    # Use insight as fallback
            ""
        )

        # Extract reasoning separately for the reasoning field
        reasoning = (
            idea.get("reasoning") or
            idea.get("insight") or
            idea.get("bridge_suggestion") or
            idea.get("bridge_opportunity") or
            idea.get("why_gap_exists") or  # For reverse_brainstorming expansion
            ""
        )

        # Extract tags - ensure it's always a list
        tags = idea.get("suggested_tags", idea.get("tags", []))
        if not isinstance(tags, list):
            tags = []

        if not title and not body:
            continue

        suggestion = {
            "id": f"sleep_{uuid.uuid4().hex[:8]}",
            "type": "bridge_note",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "session_id": session["id"],
            "user_prompt": session.get("prompt", ""),
            "source_notes": note_ids,
            "source_entities": [],
            "connection_type": "conceptual",
            "connection_strength": "moderate",
            "suggested_title": title,
            "suggested_body": body,
            "suggested_tags": tags,
            "reasoning": reasoning,
            "generation_ids": session.get("generation_ids", [])
        }

        suggestions.append(suggestion)

    return suggestions


def create_sleep_session(
    prompt: str,
    style_id: str,
    depth: int = 2,
    max_notes: int = 30,
    turns: int = 3,
    model: Optional[str] = None,
    entry_points: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Create a new sleep compute session (synchronous, returns immediately).

    Args:
        prompt: User's discovery prompt
        style_id: Brainstorming style to use
        depth: Graph traversal depth (1-3)
        max_notes: Maximum notes to analyze
        turns: Number of brainstorming iterations
        model: Model to use (defaults to settings or SLEEP_COMPUTE_MODEL)
        entry_points: Optional list of entry points (notes or topics) to start from

    Returns:
        Dict with session_id and status, or error
    """
    global sleep_compute_state

    # Check max workers limit
    data = load_sessions()
    active_sessions = data.get("active_sessions", [])
    # Clean up stale entries (sessions that no longer exist or are not running)
    active_sessions = [
        sid for sid in active_sessions
        if sid in data["sessions"] and data["sessions"][sid].get("status") == "running"
    ]

    if len(active_sessions) >= MAX_WORKERS:
        return {"error": f"Maximum workers ({MAX_WORKERS}) already running. Wait for one to complete."}

    if sleep_compute_state.running:
        return {"error": "Sleep compute already running"}

    # Get style
    style = get_style(style_id)
    if not style:
        return {"error": f"Style '{style_id}' not found"}

    if not style.get("enabled", True):
        return {"error": f"Style '{style_id}' is disabled"}

    # Get model from settings if not provided
    if not model:
        settings = get_sleep_compute_settings()
        model = settings.get("model") or SLEEP_COMPUTE_MODEL

    # Validate parameters
    depth = max(1, min(3, depth))
    max_notes = max(10, min(50, max_notes))
    turns = max(2, min(5, turns))

    # Initialize session
    session_id = f"sleep_{uuid.uuid4().hex[:8]}"
    session = {
        "id": session_id,
        "status": "running",
        "config": {
            "style": style_id,
            "depth": depth,
            "max_notes": max_notes,
            "turns": turns,
            "model": model
        },
        "prompt": prompt,
        "entry_points": entry_points or [],
        "progress": {
            "current_turn": 0,
            "phase": "initializing"
        },
        "turns": [],
        "final_output": None,
        "generation_ids": [],
        "total_cost": 0.0,
        "created_at": datetime.utcnow().isoformat()
    }

    # Save initial session and add to active list
    data = load_sessions()
    data["sessions"][session_id] = session
    # Update active_sessions list
    active_sessions = data.get("active_sessions", [])
    active_sessions.append(session_id)
    data["active_sessions"] = active_sessions
    save_sessions(data)

    # Initialize state
    sleep_compute_state.reset()
    sleep_compute_state.running = True
    sleep_compute_state.session_id = session_id
    sleep_compute_state.total_turns = turns
    sleep_compute_state.started_at = datetime.utcnow().isoformat()
    sleep_compute_state.phase = "initializing"

    return {
        "status": "started",
        "session_id": session_id,
        "config": session["config"]
    }


async def run_sleep_compute(session_id: str) -> Dict[str, Any]:
    """
    Run the sleep compute session (async, runs in background).

    This function should be called via BackgroundTasks after create_sleep_session.

    Args:
        session_id: The session ID returned from create_sleep_session

    Returns:
        Session result dict
    """
    global sleep_compute_state

    # Load session
    data = load_sessions()
    session = data["sessions"].get(session_id)

    if not session:
        logger.error(f"Session {session_id} not found")
        return {"error": "Session not found", "session_id": session_id}

    # Extract config
    config = session["config"]
    style_id = config["style"]
    depth = config["depth"]
    max_notes = config["max_notes"]
    turns = config["turns"]
    model = config["model"]
    prompt = session["prompt"]
    entry_points = session.get("entry_points", [])

    # Get style
    style = get_style(style_id)
    if not style:
        session["status"] = "failed"
        session["error"] = f"Style '{style_id}' not found"
        data["sessions"][session_id] = session
        save_sessions(data)
        sleep_compute_state.running = False
        return {"error": session["error"], "session_id": session_id}

    try:
        # Phase 1: Collect notes
        sleep_compute_state.phase = "collecting"
        sleep_compute_state.progress = 5
        session["progress"]["phase"] = "collecting"
        data["sessions"][session_id] = session
        save_sessions(data)

        notes = _collect_notes_for_session(prompt, depth, max_notes, entry_points=entry_points)

        if len(notes) < 2:
            sleep_compute_state.error = "Not enough notes for discovery"
            session["status"] = "failed"
            session["error"] = sleep_compute_state.error
            data["sessions"][session_id] = session
            save_sessions(data)
            return {"error": sleep_compute_state.error, "notes_found": len(notes)}

        if sleep_compute_state.cancelled:
            session["status"] = "cancelled"
            data["sessions"][session_id] = session
            save_sessions(data)
            return {"status": "cancelled"}

        # Phase 2: Multi-turn brainstorming
        sleep_compute_state.phase = "brainstorming"
        all_ideas = []

        for turn_num in range(1, turns + 1):
            if sleep_compute_state.cancelled:
                session["status"] = "cancelled"
                break

            # Wait if paused
            while sleep_compute_state.paused:
                await asyncio.sleep(0.5)
                if sleep_compute_state.cancelled:
                    break

            sleep_compute_state.current_turn = turn_num
            sleep_compute_state.progress = 10 + (turn_num / turns) * 70

            session["progress"]["current_turn"] = turn_num
            session["progress"]["phase"] = "brainstorming"

            # Execute turn
            turn_result = await _execute_turn(
                session=session,
                turn_number=turn_num,
                style=style,
                notes=notes,
                previous_ideas=all_ideas,
                model=model
            )

            session["turns"].append(turn_result)

            # Accumulate and prune ideas
            all_ideas.extend(turn_result.get("ideas", []))
            all_ideas = _prune_ideas(all_ideas, max_keep=15)

            # Checkpoint save
            data = load_sessions()
            data["sessions"][session_id] = session
            save_sessions(data)

        if sleep_compute_state.cancelled:
            data = load_sessions()
            data["sessions"][session_id] = session
            save_sessions(data)
            return {"status": "cancelled", "session_id": session_id}

        # Phase 3: Generate final bridge suggestions
        sleep_compute_state.phase = "synthesizing"
        sleep_compute_state.progress = 85

        session["progress"]["phase"] = "synthesizing"

        bridge_suggestions = _generate_bridge_suggestions(session, all_ideas)

        session["final_output"] = {
            "bridge_suggestions": bridge_suggestions,
            "total_ideas_generated": sum(len(t.get("ideas", [])) for t in session["turns"]),
            "notes_analyzed": len(notes)
        }

        session["status"] = "completed"
        session["completed_at"] = datetime.utcnow().isoformat()

        sleep_compute_state.progress = 100

        # Save final session (active_sessions cleanup is done in finally block)
        data = load_sessions()
        data["sessions"][session_id] = session
        save_sessions(data)

        # Add suggestions to discoveries
        from . import knowledge_discovery
        discoveries_data = knowledge_discovery.load_discoveries()
        discoveries_data["discoveries"].extend(bridge_suggestions)
        knowledge_discovery.save_discoveries(discoveries_data)

        return {
            "status": "completed",
            "session_id": session_id,
            "notes_analyzed": len(notes),
            "turns_completed": len(session["turns"]),
            "suggestions_generated": len(bridge_suggestions),
            "total_cost": session.get("total_cost", 0),
            "suggestions": bridge_suggestions
        }

    except Exception as e:
        logger.error(f"Sleep compute error: {e}")
        sleep_compute_state.error = str(e)

        data = load_sessions()
        session["status"] = "failed"
        session["error"] = str(e)
        data["sessions"][session_id] = session
        save_sessions(data)

        return {"error": str(e), "session_id": session_id}

    finally:
        sleep_compute_state.running = False
        data = load_sessions()
        # Remove this session from active_sessions list
        active_sessions = data.get("active_sessions", [])
        if session_id in active_sessions:
            active_sessions.remove(session_id)
        data["active_sessions"] = active_sessions
        save_sessions(data)


def delete_session(session_id: str) -> bool:
    """Delete a sleep compute session."""
    data = load_sessions()

    if session_id not in data["sessions"]:
        return False

    del data["sessions"][session_id]
    save_sessions(data)
    return True


def cleanup_old_sessions(max_age_days: int = 30):
    """Clean up old completed sessions."""
    data = load_sessions()
    now = datetime.utcnow()

    sessions_to_delete = []
    for session_id, session in data["sessions"].items():
        if session.get("status") in ["completed", "cancelled", "failed"]:
            created_at = session.get("created_at")
            if created_at:
                created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                age = (now - created.replace(tzinfo=None)).days
                if age > max_age_days:
                    sessions_to_delete.append(session_id)

    for session_id in sessions_to_delete:
        del data["sessions"][session_id]

    if sessions_to_delete:
        save_sessions(data)

    return len(sessions_to_delete)
