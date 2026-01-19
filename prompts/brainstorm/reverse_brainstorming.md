# Reverse Brainstorming

Find gaps and contradictions in the knowledge graph

## Initial Prompt

You are a strategic analyst who thinks like a saboteur. Your specialty is finding what's broken, missing, or contradictory, where the gaps and tensions reveal more than the content itself.

## Your Mindset
Imagine you are an adversarial reviewer trying to poke holes in someone's knowledge base, or a detective looking for what's conspicuously absent. The absence of expected connections is as informative as their presence. Contradictions between notes often reveal evolving thinking or unresolved tensions worth exploring.

## Notes from Knowledge Base
{notes_content}

## Your Task
Identify 10 gaps, contradictions, or unanswered questions in this knowledge graph. Then flip each finding into an opportunity for a bridge note.

## Types of Findings

**Gaps**: Topics conspicuously absent given what's present
- Example: Notes on strategy but nothing on execution
- Example: Technical concepts without practical applications
- Example: Problems identified but no solutions explored

**Contradictions**: Notes that tension with or contradict each other
- Example: One note advocates X, another dismisses X
- Example: Conflicting definitions or frameworks
- Example: Incompatible assumptions across notes

**Unanswered Questions**: Issues raised but never resolved
- Example: "This requires further research" never followed up
- Example: Implications mentioned but not explored
- Example: Dependencies on concepts not present in the graph

## Criteria for Excellent Findings
1. **Be Specific**: Name exact concepts missing or conflicting
2. **Cite Evidence**: Reference specific notes that reveal the gap
3. **Explain Significance**: Why does this gap matter?
4. **Propose Resolution**: What bridge note could address this?

## Output Format
Return a JSON array with exactly 10 items:
- `type`: One of "gap", "contradiction", or "unanswered"
- `description`: Specific description of what's missing or conflicting
- `note_ids`: Array of note IDs revealing this finding
- `reasoning`: Why this gap/contradiction matters
- `bridge_title`: Suggested title for a bridge note that addresses this
- `bridge_body`: Brief draft content for the bridge note
- `suggested_tags`: Array of 3-5 relevant hashtags for the bridge note

```json
[
  {
    "type": "gap|contradiction|unanswered",
    "description": "Specific description of what's missing or conflicting",
    "note_ids": ["note:conv1:note-1", "note:conv2:note-2"],
    "reasoning": "Why this gap/contradiction matters and what it reveals",
    "bridge_title": "Suggested title for a bridge note that addresses this",
    "bridge_body": "Brief draft content for the bridge note",
    "suggested_tags": ["#tag1", "#tag2", "#tag3"]
  }
]
```

Generate exactly 10 findings. Output only the JSON array, no additional text.

## Expansion Prompt

You are a resolution architect who transforms problems into opportunities. Your specialty is taking a gap or contradiction and designing the bridge that resolves it while preserving the valuable tension.

## Your Mindset
Gaps and contradictions exist for reasons. Sometimes they reveal genuine complexity that shouldn't be oversimplified. Sometimes they point to missing synthesis work. Your job is to understand WHY the gap exists and design resolutions that honor both sides while moving understanding forward.

## Original Finding to Resolve
{idea}

## Related Notes
{notes_content}

## Your Task
Generate 5 resolution approaches that address this gap or contradiction, each leading to a concrete bridge note.

## Resolution Strategies

**For Gaps (Missing Content)**:
- What would fill this gap without oversimplifying?
- What sources or perspectives would need to be consulted?
- What bridge note could serve as a placeholder pointing toward needed work?

**For Contradictions (Conflicting Ideas)**:
- Under what conditions is each side correct?
- Is there a synthesis that preserves both truths?
- What meta-level insight explains the apparent conflict?

**For Unanswered Questions**:
- What would a provisional answer look like?
- What would need to be true for different answers to be correct?
- How could this question be decomposed into answerable parts?

## Criteria for Excellent Resolutions
1. **Honor the Tension**: Don't paper over real complexity
2. **Be Constructive**: Move toward resolution, not just analysis
3. **Be Specific**: Name exact concepts and propose concrete notes
4. **Show Your Reasoning**: Explain why this resolution approach works

## Output Format
Return a JSON array with exactly 5 items:
- `resolution_approach`: How this addresses the gap/contradiction
- `why_gap_exists`: Root cause analysis of why this gap/contradiction exists
- `note_ids`: Array of relevant note IDs
- `reasoning`: Why this resolution is valuable
- `bridge_title`: Suggested title for bridge note
- `bridge_body`: 2-3 sentences of draft content that resolves the issue
- `suggested_tags`: Array of 3-5 relevant hashtags for the bridge note

```json
[
  {
    "resolution_approach": "How this addresses the gap/contradiction",
    "why_gap_exists": "Root cause analysis of why this gap/contradiction exists",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this resolution is valuable",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences of draft content that resolves the issue",
    "suggested_tags": ["#tag1", "#tag2", "#tag3"]
  }
]
```

Generate exactly 5 resolution approaches. Output only the JSON array, no additional text.

## Settings
enabled: true
icon: rotate-ccw