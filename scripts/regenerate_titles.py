#!/usr/bin/env python3
"""
One-off script to regenerate titles for old conversations that have
"New Conversation" as their title or no title at all.

Usage:
    uv run python scripts/regenerate_titles.py [--dry-run]
"""

import asyncio
import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import storage
from backend.council import generate_conversation_title


async def generate_synthesizer_title(notes_content: str) -> str:
    """Generate a title for a synthesizer conversation based on notes content."""
    title_prompt = f"""Generate a very short title (3-5 words maximum) that summarizes the main topic of these notes.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Notes:
{notes_content[:2000]}

Title:"""

    from backend.openrouter import query_model
    messages = [{"role": "user", "content": title_prompt}]
    response = await query_model("google/gemini-2.5-flash", messages, timeout=30.0)

    if response is None:
        return "New Conversation"

    title = response.get('content', 'New Conversation').strip().strip('"\'')
    if len(title) > 50:
        title = title[:47] + "..."
    return title


async def regenerate_titles(dry_run: bool = False, all_titles: bool = False):
    """Regenerate titles for conversations without proper titles."""

    conversations = storage.list_conversations()

    needs_update = []
    for conv in conversations:
        title = conv.get("title", "")
        if all_titles or not title or title == "New Conversation":
            needs_update.append(conv)

    if not needs_update:
        print("All conversations already have titles.")
        return

    print(f"Found {len(needs_update)} conversations needing title updates:")
    for conv in needs_update:
        mode = conv.get("mode", "council")
        print(f"  - {conv['id']}: '{conv.get('title', '(no title)')}' [{mode}]")

    if dry_run:
        print("\n[DRY RUN] Would update the above conversations.")
        return

    print("\nGenerating titles...")

    updated = 0
    failed = 0

    for conv in needs_update:
        conv_id = conv["id"]
        mode = conv.get("mode", "council")

        # Load full conversation
        full_conv = storage.get_conversation(conv_id)
        if not full_conv:
            print(f"  [SKIP] {conv_id}: Could not load conversation")
            failed += 1
            continue

        messages = full_conv.get("messages", [])

        # Handle based on mode
        if mode == "synthesizer":
            # For synthesizer, look for notes in assistant messages
            notes_content = None
            for msg in messages:
                if msg.get("role") == "assistant" and msg.get("notes"):
                    notes = msg.get("notes", [])
                    if notes:
                        # Combine first few notes - notes have 'title' and 'body' fields
                        notes_parts = []
                        for note in notes[:5]:
                            title = note.get("title", "")
                            body = note.get("body", "") or note.get("content", "")
                            if title or body:
                                notes_parts.append(f"{title}\n{body}" if title else body)
                        notes_text = "\n\n".join(notes_parts)
                        if notes_text.strip():
                            notes_content = notes_text
                            break

            if not notes_content:
                print(f"  [SKIP] {conv_id}: No notes found")
                failed += 1
                continue

            try:
                new_title = await generate_synthesizer_title(notes_content)
                storage.update_conversation_title(conv_id, new_title)
                print(f"  [OK] {conv_id}: '{new_title}'")
                updated += 1
            except Exception as e:
                print(f"  [ERROR] {conv_id}: {e}")
                failed += 1
        else:
            # For council, use first user message
            first_user_msg = None
            for msg in messages:
                if msg.get("role") == "user":
                    first_user_msg = msg.get("content", "")
                    break

            if not first_user_msg:
                print(f"  [SKIP] {conv_id}: No user message found")
                failed += 1
                continue

            try:
                new_title = await generate_conversation_title(first_user_msg)
                storage.update_conversation_title(conv_id, new_title)
                print(f"  [OK] {conv_id}: '{new_title}'")
                updated += 1
            except Exception as e:
                print(f"  [ERROR] {conv_id}: {e}")
                failed += 1

    print(f"\nDone! Updated: {updated}, Failed: {failed}")


def main():
    parser = argparse.ArgumentParser(
        description="Regenerate titles for old conversations"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be updated without making changes"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Regenerate titles for ALL conversations, not just untitled ones"
    )
    args = parser.parse_args()

    asyncio.run(regenerate_titles(dry_run=args.dry_run, all_titles=args.all))


if __name__ == "__main__":
    main()
