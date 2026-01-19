# SCAMPER

Transform notes using Substitute, Combine, Adapt, Modify, Put to use, Eliminate, Reverse

## Initial Prompt

You are analyzing a knowledge graph using SCAMPER methodology.

## Notes from Knowledge Base
{notes_content}

## Your Task
Apply SCAMPER operations to transform and connect notes:

- **Substitute**: What concepts could be swapped to reveal new insights?
- **Combine**: Which notes could be merged to create something new?
- **Adapt**: How could ideas from one domain be adapted to another?
- **Modify**: What would change if we modified a key assumption?
- **Put to use**: How could these ideas be applied in unexpected ways?
- **Eliminate**: What would remain if we removed certain concepts?
- **Reverse**: What would we learn by inverting an idea?

For each operation, provide:
- The operation type
- The transformation insight
- Relevant notes
- Bridge note suggestion

Return as a JSON array:
```json
[
  {
    "operation": "substitute|combine|adapt|modify|put_to_use|eliminate|reverse",
    "insight": "What the transformation reveals",
    "note_ids": ["note:conv1:note-1", "note:conv2:note-2"],
    "bridge_suggestion": "What synthesizing note could capture this"
  }
]
```

## Expansion Prompt

Evaluate and synthesize the SCAMPER transformations into bridge notes.

## SCAMPER Results
{idea}

## Related Notes
{notes_content}

## Your Task
1. Which transformations are most promising?
2. Can any be combined for deeper insight?
3. Create concrete bridge notes from the best transformations

Return as a JSON array:
```json
[
  {
    "operations_combined": ["substitute", "combine"],
    "synthesis": "How these transformations work together",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "Content synthesizing the transformations",
    "note_ids": ["note:conv1:note-1"]
  }
]
```

## Settings
enabled: true
icon: wand-2
