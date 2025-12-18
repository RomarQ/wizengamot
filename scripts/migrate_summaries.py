#!/usr/bin/env python3
"""
Batch generate summaries for existing Council and Synthesizer conversations.

This migration script processes all existing conversations that don't have
a summary field and generates one using Gemini Flash.

Usage:
    cd /path/to/llm-council
    uv run python scripts/migrate_summaries.py

Options:
    --dry-run    Show what would be processed without making changes
    --limit N    Process only N conversations
"""

import asyncio
import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.storage import get_conversation, save_conversation
from backend.summarizer import generate_summary
from backend.config import DATA_DIR
from pathlib import Path


def list_all_conversations():
    """List all conversation files."""
    data_path = Path(DATA_DIR)
    if not data_path.exists():
        return []

    import json
    conversations = []
    for filename in data_path.glob("*.json"):
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
                conversations.append(data)
        except Exception as e:
            print(f"  Warning: Could not load {filename}: {e}")

    return conversations


def extract_council_content(conversation):
    """Extract stage3 content from council conversation."""
    for msg in conversation.get("messages", []):
        if msg.get("role") == "assistant" and msg.get("stage3"):
            # Try 'response' first (current format), then 'content' (legacy)
            stage3 = msg["stage3"]
            return stage3.get("response") or stage3.get("content", "")
    return None


def extract_synthesizer_content(conversation):
    """Extract note bodies from synthesizer conversation."""
    for msg in conversation.get("messages", []):
        if msg.get("role") == "assistant" and msg.get("notes"):
            notes = msg["notes"]
            return "\n\n".join([note.get("body", "") for note in notes if note.get("body")])
    return None


async def migrate_conversation(conversation, dry_run=False):
    """Generate and save summary for a single conversation."""
    conv_id = conversation["id"]
    mode = conversation.get("mode", "council")
    title = conversation.get("title", "Untitled")

    # Skip if already has summary
    if conversation.get("summary"):
        return {"id": conv_id, "status": "skipped", "reason": "already has summary"}

    # Extract content based on mode
    if mode == "synthesizer":
        content = extract_synthesizer_content(conversation)
    elif mode == "visualiser":
        # Skip visualiser for now
        return {"id": conv_id, "status": "skipped", "reason": "visualiser mode"}
    else:
        # Council or legacy (no mode)
        content = extract_council_content(conversation)

    if not content:
        return {"id": conv_id, "status": "skipped", "reason": "no content found"}

    if dry_run:
        return {"id": conv_id, "status": "would_process", "mode": mode, "title": title}

    # Generate summary
    try:
        summary = await generate_summary(content, mode if mode else "council")
        if summary:
            conversation["summary"] = summary
            save_conversation(conversation)
            return {"id": conv_id, "status": "success", "summary": summary[:100] + "..."}
        else:
            return {"id": conv_id, "status": "failed", "reason": "no summary generated"}
    except Exception as e:
        return {"id": conv_id, "status": "error", "reason": str(e)}


async def main():
    parser = argparse.ArgumentParser(description="Generate summaries for existing conversations")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be processed")
    parser.add_argument("--limit", type=int, help="Process only N conversations")
    args = parser.parse_args()

    print("Loading conversations...")
    conversations = list_all_conversations()
    print(f"Found {len(conversations)} conversations")

    # Filter to only council and synthesizer modes
    conversations = [c for c in conversations if c.get("mode") != "visualiser"]
    print(f"Processing {len(conversations)} council/synthesizer conversations")

    if args.limit:
        conversations = conversations[:args.limit]
        print(f"Limited to {args.limit} conversations")

    if args.dry_run:
        print("\n=== DRY RUN - No changes will be made ===\n")

    results = {"success": 0, "skipped": 0, "failed": 0, "error": 0, "would_process": 0}

    for i, conv in enumerate(conversations):
        print(f"\n[{i+1}/{len(conversations)}] Processing {conv['id']}...")
        result = await migrate_conversation(conv, dry_run=args.dry_run)

        status = result["status"]
        results[status] = results.get(status, 0) + 1

        if status == "success":
            print(f"  Generated: {result.get('summary', '')[:80]}")
        elif status == "would_process":
            print(f"  Would process: {result.get('mode')} - {result.get('title')}")
        elif status == "skipped":
            print(f"  Skipped: {result.get('reason')}")
        elif status == "error":
            print(f"  Error: {result.get('reason')}")

        # Small delay to avoid rate limiting
        if not args.dry_run and status == "success":
            await asyncio.sleep(0.5)

    print("\n=== Summary ===")
    print(f"Success: {results['success']}")
    print(f"Skipped: {results['skipped']}")
    print(f"Failed: {results['failed']}")
    print(f"Errors: {results['error']}")
    if args.dry_run:
        print(f"Would process: {results['would_process']}")


if __name__ == "__main__":
    asyncio.run(main())
