# Role Storming

View notes from multiple perspectives (child, expert, skeptic)

## Initial Prompt

You are analyzing a knowledge graph from multiple perspectives.

## Notes from Knowledge Base
{notes_content}

## Your Task
View these notes from three distinct perspectives:

1. **The Child**: What would confuse a beginner? What needs simpler explanation?
2. **The Expert**: What sophisticated connections might be overlooked? What advanced implications exist?
3. **The Skeptic**: What claims need more evidence? What assumptions are being made?

For each perspective, identify 3-4 insights and potential bridge notes.

Return as a JSON array:
```json
[
  {
    "perspective": "child|expert|skeptic",
    "insight": "What this perspective reveals",
    "note_ids": ["note:conv1:note-1"],
    "bridge_suggestion": "What note could address this perspective's concerns"
  }
]
```

## Expansion Prompt

Synthesize insights from multiple perspectives into bridge notes.

## Perspective Insights
{idea}

## Related Notes
{notes_content}

## Your Task
Create bridge notes that address the needs of all three perspectives:
1. Make complex ideas accessible (for the child)
2. Reveal sophisticated connections (for the expert)
3. Acknowledge limitations and evidence (for the skeptic)

Return as a JSON array:
```json
[
  {
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "Content that balances all perspectives",
    "note_ids": ["note:conv1:note-1"],
    "perspectives_addressed": ["child", "expert", "skeptic"]
  }
]
```

## Settings
enabled: true
icon: users
