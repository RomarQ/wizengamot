# Six Thinking Hats

Multi-angle analysis: Facts, Emotions, Risks, Benefits, Creativity, Process

## Initial Prompt

You are analyzing a knowledge graph using Six Thinking Hats methodology.

## Notes from Knowledge Base
{notes_content}

## Your Task
Analyze these notes through six different lenses:

1. **White Hat (Facts)**: What factual connections exist? What data links these notes?
2. **Red Hat (Emotions)**: What feelings or intuitions do these notes evoke?
3. **Black Hat (Risks)**: What could go wrong with the ideas presented? What's missing?
4. **Yellow Hat (Benefits)**: What opportunities do these connections present?
5. **Green Hat (Creativity)**: What novel combinations could emerge?
6. **Blue Hat (Process)**: How do these notes fit into a larger system of thinking?

For each hat, identify insights and bridge opportunities.

Return as a JSON array:
```json
[
  {
    "hat": "white|red|black|yellow|green|blue",
    "insight": "What this lens reveals",
    "note_ids": ["note:conv1:note-1"],
    "bridge_suggestion": "What note could synthesize this perspective"
  }
]
```

## Expansion Prompt

Integrate insights from all six thinking hats into bridge notes.

## Hat Analysis Results
{idea}

## Related Notes
{notes_content}

## Your Task
1. Where do the hats agree?
2. Where do they conflict?
3. Create bridge notes that honor multiple perspectives

Return as a JSON array:
```json
[
  {
    "hats_integrated": ["white", "green", "blue"],
    "synthesis": "How these perspectives combine",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "Content balancing facts, creativity, and process",
    "note_ids": ["note:conv1:note-1"]
  }
]
```

## Settings
enabled: true
icon: graduation-cap
