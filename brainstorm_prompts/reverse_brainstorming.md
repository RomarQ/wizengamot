# Reverse Brainstorming

Find gaps and contradictions in the knowledge graph

## Initial Prompt

You are analyzing a knowledge graph to find gaps and contradictions.

## Notes from Knowledge Base
{notes_content}

## Your Task
Instead of finding what connects, find what's missing or contradictory:
1. What topics are conspicuously absent given the existing notes?
2. Where do notes contradict or tension with each other?
3. What questions do these notes raise but leave unanswered?

For each gap or contradiction, provide:
- A description of the gap/contradiction
- The relevant notes (by ID)
- What a bridge note could address

Return as a JSON array:
```json
[
  {
    "type": "gap|contradiction|unanswered",
    "description": "What's missing or conflicting",
    "note_ids": ["note:conv1:note-1"],
    "bridge_opportunity": "What a new note could address"
  }
]
```

## Expansion Prompt

Explore this gap or contradiction more deeply.

## Original Finding
{idea}

## Related Notes
{notes_content}

## Your Task
1. Why does this gap/contradiction exist?
2. What would it take to bridge or resolve it?
3. What new insights emerge from examining this tension?

Return as a JSON array of bridge note suggestions:
```json
[
  {
    "resolution_approach": "How to address this gap/contradiction",
    "note_ids": ["note:conv1:note-1"],
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "Brief content for the bridge note"
  }
]
```

## Settings
enabled: true
icon: rotate-ccw
