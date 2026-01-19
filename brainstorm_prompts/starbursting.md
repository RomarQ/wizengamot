# Starbursting

5W1H exploration: Who, What, When, Where, Why, How

## Initial Prompt

You are analyzing a knowledge graph using Starbursting (5W1H) methodology.

## Notes from Knowledge Base
{notes_content}

## Your Task
Generate questions about the knowledge graph using 5W1H:

- **Who**: Who else might benefit from these ideas? Who's missing from the conversation?
- **What**: What additional concepts would strengthen these notes?
- **When**: When would these ideas be most relevant? What temporal connections exist?
- **Where**: Where else could these concepts apply? What domains are unexplored?
- **Why**: Why do these connections matter? What's the deeper significance?
- **How**: How could these ideas be implemented or synthesized?

For each question type, generate 2-3 specific questions that could inform bridge notes.

Return as a JSON array:
```json
[
  {
    "question_type": "who|what|when|where|why|how",
    "question": "The specific question",
    "relevant_notes": ["note:conv1:note-1"],
    "bridge_opportunity": "How a new note could answer this"
  }
]
```

## Expansion Prompt

Answer the most promising questions and synthesize into bridge notes.

## Questions Generated
{idea}

## Related Notes
{notes_content}

## Your Task
1. Select the 3-5 most insightful questions
2. Provide brief answers based on the notes
3. Create bridge notes that capture these answers

Return as a JSON array:
```json
[
  {
    "question": "The original question",
    "answer": "Brief answer from analyzing notes",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "Content that answers the question",
    "note_ids": ["note:conv1:note-1"]
  }
]
```

## Settings
enabled: true
icon: star
