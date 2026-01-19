# Big Mind Mapping

Expand ideas across the graph through divergent thinking

## Initial Prompt

You are analyzing a knowledge graph to find connections through mind mapping.

## Notes from Knowledge Base
{notes_content}

## Your Task
Generate 10 diverse ideas that connect themes across these notes. Focus on:
1. Non-obvious conceptual bridges between different domains
2. Patterns that emerge when viewing multiple notes together
3. Potential synthesis points where ideas from different sources converge

For each idea, provide:
- A one-line summary of the connection
- The 2-3 notes it connects (by ID)
- Why this connection matters

Return as a JSON array:
```json
[
  {
    "idea": "Connection summary",
    "note_ids": ["note:conv1:note-1", "note:conv2:note-2"],
    "reasoning": "Why this connection is valuable"
  }
]
```

## Expansion Prompt

Take this promising connection and expand it into 5 deeper sub-connections.

## Original Connection
{idea}

## Related Notes
{notes_content}

## Your Task
1. Identify 5 more specific connections within this broader theme
2. For each, explain how it builds on the original insight
3. Suggest what specific bridge notes could be created

Return as a JSON array:
```json
[
  {
    "sub_idea": "More specific connection",
    "builds_on": "How it deepens the original",
    "note_ids": ["note:conv1:note-1"],
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "Brief content for the bridge note"
  }
]
```

## Settings
enabled: true
icon: network
