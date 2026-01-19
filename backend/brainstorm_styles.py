"""
Brainstorm styles management for Sleep Time Compute knowledge discovery.

Handles CRUD operations for brainstorming style prompts stored as markdown files.
"""
import os
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any

# Prompts directory for brainstorm styles
BRAINSTORM_PROMPTS_DIR = Path(os.getenv("BRAINSTORM_PROMPTS_DIR", "brainstorm_prompts"))

# Default styles with their metadata
DEFAULT_STYLES = {
    "big_mind_mapping": {
        "id": "big_mind_mapping",
        "name": "Big Mind Mapping",
        "description": "Expand ideas across the graph through divergent thinking",
        "icon": "network",
        "turn_pattern": ["Diverge", "Expand branches", "Synthesize"],
        "enabled": True
    },
    "reverse_brainstorming": {
        "id": "reverse_brainstorming",
        "name": "Reverse Brainstorming",
        "description": "Find gaps and contradictions in the knowledge graph",
        "icon": "rotate-ccw",
        "turn_pattern": ["Find gaps", "Explore contradictions", "Bridge"],
        "enabled": True
    },
    "role_storming": {
        "id": "role_storming",
        "name": "Role Storming",
        "description": "View notes from multiple perspectives (child, expert, skeptic)",
        "icon": "users",
        "turn_pattern": ["View perspectives", "Synthesize", "Bridge"],
        "enabled": True
    },
    "scamper": {
        "id": "scamper",
        "name": "SCAMPER",
        "description": "Transform notes using Substitute, Combine, Adapt, Modify, Put to use, Eliminate, Reverse",
        "icon": "wand-2",
        "turn_pattern": ["Apply operations", "Evaluate", "Synthesize"],
        "enabled": True
    },
    "six_thinking_hats": {
        "id": "six_thinking_hats",
        "name": "Six Thinking Hats",
        "description": "Multi-angle analysis: Facts, Emotions, Risks, Benefits, Creativity, Process",
        "icon": "graduation-cap",
        "turn_pattern": ["Analyze hats", "Integrate", "Synthesize"],
        "enabled": True
    },
    "starbursting": {
        "id": "starbursting",
        "name": "Starbursting",
        "description": "5W1H exploration: Who, What, When, Where, Why, How",
        "icon": "star",
        "turn_pattern": ["Generate questions", "Answer", "Synthesize"],
        "enabled": True
    }
}


def ensure_prompts_dir():
    """Ensure the brainstorm prompts directory exists."""
    BRAINSTORM_PROMPTS_DIR.mkdir(parents=True, exist_ok=True)


def get_style_path(style_id: str) -> Path:
    """Get the path to a style's prompt file."""
    return BRAINSTORM_PROMPTS_DIR / f"{style_id}.md"


def parse_style_markdown(content: str, style_id: str) -> Dict[str, Any]:
    """
    Parse a brainstorm style markdown file.

    Expected format:
    # Style Name

    Description text here...

    ## Initial Prompt
    Initial prompt content...

    ## Expansion Prompt
    Expansion prompt content...

    ## Settings
    enabled: true
    icon: network
    """
    result = {
        "id": style_id,
        "name": "",
        "description": "",
        "initial_prompt": "",
        "expansion_prompt": "",
        "enabled": True,
        "icon": "sparkles"
    }

    lines = content.split('\n')
    current_section = None
    section_content = []

    for line in lines:
        # Check for section headers
        if line.startswith('# ') and not line.startswith('## '):
            result["name"] = line[2:].strip()
        elif line.startswith('## Initial Prompt'):
            if current_section and section_content:
                _save_section(result, current_section, section_content)
            current_section = 'initial_prompt'
            section_content = []
        elif line.startswith('## Expansion Prompt'):
            if current_section and section_content:
                _save_section(result, current_section, section_content)
            current_section = 'expansion_prompt'
            section_content = []
        elif line.startswith('## Settings'):
            if current_section and section_content:
                _save_section(result, current_section, section_content)
            current_section = 'settings'
            section_content = []
        elif current_section:
            # Include all lines (including ## subsections) in the current section
            section_content.append(line)
        elif not result["description"] and line.strip() and not line.startswith('#'):
            # First non-header, non-empty line is description
            result["description"] = line.strip()

    # Save final section
    if current_section and section_content:
        _save_section(result, current_section, section_content)

    return result


def _save_section(result: Dict, section: str, content: List[str]):
    """Save a section's content to the result dict."""
    if section == 'settings':
        # Parse key: value pairs
        for line in content:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                if key == 'enabled':
                    result['enabled'] = value.lower() == 'true'
                elif key == 'icon':
                    result['icon'] = value
    else:
        # Join lines preserving content
        text = '\n'.join(content).strip()
        result[section] = text


def format_style_markdown(style: Dict[str, Any]) -> str:
    """Format a style dict as markdown content."""
    lines = [
        f"# {style.get('name', 'Untitled Style')}",
        "",
        style.get('description', ''),
        "",
        "## Initial Prompt",
        "",
        style.get('initial_prompt', ''),
        "",
        "## Expansion Prompt",
        "",
        style.get('expansion_prompt', ''),
        "",
        "## Settings",
        f"enabled: {'true' if style.get('enabled', True) else 'false'}",
        f"icon: {style.get('icon', 'sparkles')}"
    ]
    return '\n'.join(lines)


def list_styles() -> List[Dict[str, Any]]:
    """
    List all available brainstorming styles.

    Returns styles from disk files, or defaults if no files exist.
    """
    ensure_prompts_dir()
    styles = []

    # Check for existing prompt files
    existing_files = list(BRAINSTORM_PROMPTS_DIR.glob("*.md"))

    if existing_files:
        # Load from files
        for filepath in sorted(existing_files):
            style_id = filepath.stem
            try:
                content = filepath.read_text(encoding='utf-8')
                style = parse_style_markdown(content, style_id)
                # Add default metadata if available
                if style_id in DEFAULT_STYLES:
                    defaults = DEFAULT_STYLES[style_id]
                    style.setdefault('turn_pattern', defaults.get('turn_pattern', []))
                styles.append(style)
            except Exception as e:
                print(f"Error reading style {filepath}: {e}")
    else:
        # Return defaults (prompts not created yet)
        for style_id, defaults in DEFAULT_STYLES.items():
            styles.append({
                **defaults,
                "initial_prompt": "",
                "expansion_prompt": ""
            })

    return styles


def get_style(style_id: str) -> Optional[Dict[str, Any]]:
    """Get a single style by ID."""
    ensure_prompts_dir()
    filepath = get_style_path(style_id)

    if filepath.exists():
        try:
            content = filepath.read_text(encoding='utf-8')
            style = parse_style_markdown(content, style_id)
            # Add default metadata if available
            if style_id in DEFAULT_STYLES:
                defaults = DEFAULT_STYLES[style_id]
                style.setdefault('turn_pattern', defaults.get('turn_pattern', []))
            return style
        except Exception as e:
            print(f"Error reading style {filepath}: {e}")
            return None

    # Return default if it exists
    if style_id in DEFAULT_STYLES:
        return {
            **DEFAULT_STYLES[style_id],
            "initial_prompt": "",
            "expansion_prompt": ""
        }

    return None


def create_style(style: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new brainstorming style.

    Args:
        style: Dict with id, name, description, initial_prompt, expansion_prompt, enabled, icon

    Returns:
        Created style dict

    Raises:
        ValueError if style already exists
    """
    ensure_prompts_dir()

    style_id = style.get('id')
    if not style_id:
        raise ValueError("Style ID is required")

    filepath = get_style_path(style_id)
    if filepath.exists():
        raise ValueError(f"Style '{style_id}' already exists")

    content = format_style_markdown(style)
    filepath.write_text(content, encoding='utf-8')

    return get_style(style_id)


def update_style(style_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an existing brainstorming style.

    Args:
        style_id: Style ID to update
        updates: Dict with fields to update

    Returns:
        Updated style dict

    Raises:
        ValueError if style doesn't exist
    """
    ensure_prompts_dir()
    filepath = get_style_path(style_id)

    # Get existing style
    existing = get_style(style_id)
    if not existing:
        raise ValueError(f"Style '{style_id}' does not exist")

    # Merge updates
    for key, value in updates.items():
        if key != 'id':  # Don't allow changing ID
            existing[key] = value

    # Write back
    content = format_style_markdown(existing)
    filepath.write_text(content, encoding='utf-8')

    return get_style(style_id)


def delete_style(style_id: str) -> bool:
    """
    Delete a brainstorming style.

    Args:
        style_id: Style ID to delete

    Returns:
        True if deleted

    Raises:
        ValueError if style doesn't exist or is a default style
    """
    ensure_prompts_dir()

    # Don't allow deleting default styles
    if style_id in DEFAULT_STYLES:
        raise ValueError(f"Cannot delete default style '{style_id}'")

    filepath = get_style_path(style_id)
    if not filepath.exists():
        raise ValueError(f"Style '{style_id}' does not exist")

    filepath.unlink()
    return True


def enable_style(style_id: str) -> Dict[str, Any]:
    """Enable a brainstorming style."""
    return update_style(style_id, {"enabled": True})


def disable_style(style_id: str) -> Dict[str, Any]:
    """Disable a brainstorming style."""
    return update_style(style_id, {"enabled": False})


def get_enabled_styles() -> List[Dict[str, Any]]:
    """Get all enabled brainstorming styles."""
    return [s for s in list_styles() if s.get('enabled', True)]


def initialize_default_prompts():
    """
    Initialize default brainstorm prompt files if they don't exist.

    This is called at startup to ensure prompt files exist.
    """
    ensure_prompts_dir()

    for style_id in DEFAULT_STYLES:
        filepath = get_style_path(style_id)
        if not filepath.exists():
            # Create with placeholder prompts
            defaults = DEFAULT_STYLES[style_id]
            style = {
                **defaults,
                "initial_prompt": _get_default_initial_prompt(style_id),
                "expansion_prompt": _get_default_expansion_prompt(style_id)
            }
            content = format_style_markdown(style)
            filepath.write_text(content, encoding='utf-8')


def _get_default_initial_prompt(style_id: str) -> str:
    """Get the default initial prompt for a style."""
    prompts = {
        "big_mind_mapping": """You are a creative knowledge discovery specialist who excels at finding hidden connections across diverse domains. Your specialty is divergent thinking, where you deliberately seek out non-obvious relationships that would not be apparent to someone reading notes individually.

## Your Mindset
Think like a jazz musician improvising across genres, or a polymath seeing patterns that specialists miss. The best connections are surprising yet make perfect sense once explained. Avoid surface-level similarities (e.g., "both mention technology"). Instead, find deep structural parallels, unexpected causal links, or conceptual bridges that create genuine "aha" moments.

## Notes from Knowledge Base
{notes_content}

## Your Task
Generate exactly 10 diverse, innovative connection ideas that bridge concepts across these notes.

## Criteria for Excellent Connections
A great connection should:
1. **Be Non-Obvious**: Connect ideas that seem unrelated at first glance
2. **Bridge Domains**: Link concepts from different fields, sources, or contexts
3. **Reveal Patterns**: Identify recurring structures or principles across notes
4. **Be Specific**: Name exact concepts, not vague themes like "both discuss ideas"
5. **Enable Synthesis**: Point toward a bridge note that would add genuine value
6. **Explain WHY**: Articulate why this connection matters, not just that it exists

Avoid:
- Trivial connections (same author, same day, same format)
- Redundant ideas (10 variations of the same insight)
- Vague themes ("both relate to learning")
- Connections requiring only one note

## Output Format
Return a JSON array with exactly 10 items. Each item must have:
- `idea`: One compelling sentence summarizing the conceptual bridge
- `note_ids`: Array of 2-4 note IDs (format: "note:convX:note-Y")
- `reasoning`: 2-3 sentences explaining WHY this connection is valuable and what insight emerges
- `bridge_title`: A specific title for a potential bridge note
- `bridge_body`: 2-3 sentences of draft content for the bridge note

```json
[
  {
    "idea": "One-line summary of the conceptual bridge",
    "note_ids": ["note:conv1:note-1", "note:conv2:note-2"],
    "reasoning": "2-3 sentences explaining the value and insight",
    "bridge_title": "Suggested title for a bridge note",
    "bridge_body": "Brief draft content for the bridge note"
  }
]
```

Generate exactly 10 diverse connections. Output only the JSON array, no additional text.""",

        "reverse_brainstorming": """You are a strategic analyst who thinks like a saboteur. Your specialty is finding what's broken, missing, or contradictory, where the gaps and tensions reveal more than the content itself.

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

```json
[
  {
    "type": "gap|contradiction|unanswered",
    "description": "Specific description of what's missing or conflicting",
    "note_ids": ["note:conv1:note-1", "note:conv2:note-2"],
    "reasoning": "Why this gap/contradiction matters and what it reveals",
    "bridge_title": "Suggested title for a bridge note that addresses this",
    "bridge_body": "Brief draft content for the bridge note"
  }
]
```

Generate exactly 10 findings. Output only the JSON array, no additional text.""",

        "role_storming": """You are a master of perspective-taking who can authentically inhabit different mindsets. Your specialty is viewing the same material through radically different lenses to reveal insights invisible from any single viewpoint.

## Your Mindset
Each perspective you adopt should be fully committed, not a caricature. A child isn't just "confused", they ask fundamental questions experts forget to ask. An expert isn't just "knowledgeable", they see subtle patterns and implications. A skeptic isn't just "negative", they demand rigor and evidence. A futurist isn't just "imaginative", they trace trajectories and anticipate emergence.

## Notes from Knowledge Base
{notes_content}

## Your Task
Analyze these notes from four distinct perspectives, generating 3 insights per perspective (12 total).

## The Four Perspectives

**The Curious Child**
Ask the questions adults forget to ask. Challenge jargon. Demand simple explanations.
- "Why is this important?"
- "What does this word actually mean?"
- "How would you explain this to someone who knows nothing?"
- Bridge opportunity: Notes that clarify fundamentals

**The Domain Expert**
See sophisticated connections and advanced implications others miss.
- "What subtle patterns exist across these ideas?"
- "What are the second-order effects?"
- "How does this connect to established theory?"
- Bridge opportunity: Notes that deepen understanding

**The Rigorous Skeptic**
Demand evidence and expose assumptions. Not cynical, just careful.
- "What evidence supports this claim?"
- "What assumptions are being made?"
- "Under what conditions would this be false?"
- Bridge opportunity: Notes that strengthen arguments

**The Strategic Futurist**
Trace trajectories forward. What emerges from these ideas over time?
- "Where is this heading?"
- "What new possibilities does this enable?"
- "What would change if this idea spreads?"
- Bridge opportunity: Notes that explore implications

## Criteria for Excellent Insights
1. **Authentic Voice**: Each perspective should feel genuine, not stereotyped
2. **Specific Citations**: Reference exact notes and concepts
3. **Actionable Bridge**: Propose a note that serves this perspective's needs
4. **Distinct Value**: Each insight should be unique to its perspective

## Output Format
Return a JSON array with exactly 12 items (3 per perspective):

```json
[
  {
    "perspective": "child|expert|skeptic|futurist",
    "insight": "What this perspective reveals about the notes",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this insight matters from this perspective",
    "bridge_title": "Suggested title for a bridge note",
    "bridge_body": "Brief content addressing this perspective's needs"
  }
]
```

Generate exactly 12 insights (3 per perspective). Output only the JSON array, no additional text.""",

        "scamper": """You are a transformation specialist who uses the SCAMPER methodology to systematically reinvent ideas. Your specialty is applying creative operations to existing concepts to generate novel insights.

## Your Mindset
SCAMPER is a forcing function for creativity. Each operation asks you to deliberately manipulate ideas in specific ways. The best transformations produce genuine "I never thought of it that way" moments, not trivial word substitutions.

## Notes from Knowledge Base
{notes_content}

## Your Task
Apply each SCAMPER operation to the notes, generating at least one insight per operation (7-10 total).

## The SCAMPER Operations

**Substitute**: What if we replaced a key component with something else?
- Swap a concept with its opposite or an analog from another domain
- Replace an assumption with a different one
- Example: "What if instead of optimizing for speed, we optimized for understanding?"

**Combine**: What happens when we merge two or more ideas?
- Fuse concepts from different notes into a hybrid
- Layer frameworks on top of each other
- Example: "Combining the workflow from Note A with the principles from Note B"

**Adapt**: How could we borrow ideas from elsewhere?
- Apply a concept from one domain to a different context
- Import a framework from an unrelated field
- Example: "Adapting biological evolution concepts to knowledge management"

**Modify/Magnify/Minimize**: What if we changed the scale or emphasis?
- Exaggerate a concept to its extreme
- Reduce something to its minimal essence
- Example: "What if we took this micro-habit and applied it organization-wide?"

**Put to Other Uses**: What unexpected applications exist?
- Use an idea for a purpose it wasn't designed for
- Find problems this solution could address
- Example: "This debugging technique could be used for personal decision-making"

**Eliminate**: What if we removed something?
- Strip away assumptions, steps, or components
- Find the essential core
- Example: "What remains if we eliminate all the technical jargon?"

**Reverse/Rearrange**: What if we flipped or reordered things?
- Invert cause and effect
- Reverse the sequence
- Example: "What if we started with the conclusion and worked backward?"

## Criteria for Excellent Transformations
1. **Genuine Novelty**: The transformation should produce a non-obvious insight
2. **Specific Application**: Name exact concepts being transformed
3. **Clear Mechanism**: Explain how the operation creates new value
4. **Actionable Output**: Propose a bridge note capturing the transformation

## Output Format
Return a JSON array with 7-10 items covering all operations:

```json
[
  {
    "operation": "substitute|combine|adapt|modify|put_to_use|eliminate|reverse",
    "insight": "What the transformation reveals",
    "note_ids": ["note:conv1:note-1", "note:conv2:note-2"],
    "reasoning": "How this operation creates new understanding",
    "bridge_title": "Suggested title for a bridge note",
    "bridge_body": "Brief content capturing the transformation"
  }
]
```

Generate 7-10 transformations covering all operations. Output only the JSON array, no additional text.""",

        "six_thinking_hats": """You are a facilitator using Edward de Bono's Six Thinking Hats methodology. Your specialty is enforcing strict "hat discipline", ensuring each mode of thinking is fully explored without contamination from other modes.

## Your Mindset
The power of Six Hats comes from separating thinking modes that usually happen simultaneously. When wearing the Black Hat, you are ONLY looking for risks, not balancing them with benefits. When wearing the Green Hat, you are ONLY generating ideas, not evaluating them. This discipline reveals insights that blended thinking would miss.

## Notes from Knowledge Base
{notes_content}

## Your Task
Analyze these notes through each of the six hats, generating 2 insights per hat (12 total).

## The Six Thinking Hats

**White Hat - Facts and Information**
Pure data. What do we know? What don't we know? No opinions or interpretations.
- What factual claims are made in these notes?
- What data or evidence is cited?
- What information is missing?
- What would we need to verify these claims?

**Red Hat - Feelings and Intuitions**
Gut reactions. No justification required. What do these notes make you feel?
- What's exciting about these ideas?
- What feels wrong or off?
- What intuitions arise when reading across notes?
- What emotional response do these concepts evoke?

**Black Hat - Caution and Risks**
Devil's advocate. What could go wrong? This is not negativity, it's prudent caution.
- What risks do these ideas carry?
- What could fail?
- What are the weaknesses in reasoning?
- What dangerous assumptions are being made?

**Yellow Hat - Benefits and Value**
Optimistic logic. What value exists? Why might this work?
- What opportunities do these connections present?
- What's the best-case scenario?
- What strengths exist in these ideas?
- How could these concepts create value?

**Green Hat - Creativity and Alternatives**
Novel ideas. New possibilities. No judgment, just generation.
- What new ideas emerge from combining these notes?
- What alternatives haven't been considered?
- What wild possibilities exist?
- What creative leaps could be made?

**Blue Hat - Process and Overview**
Meta-thinking. How does this fit together? What's the big picture?
- How do these notes fit into larger systems?
- What's the organizing principle?
- What process would help develop these ideas further?
- What's missing from the overall knowledge structure?

## Criteria for Excellent Hat Analysis
1. **Hat Discipline**: Stay strictly within each hat's domain
2. **Specific Citations**: Reference exact notes and concepts
3. **Genuine Insight**: Each observation should be non-trivial
4. **Bridge Opportunity**: Each insight should suggest a potential note

## Output Format
Return a JSON array with exactly 12 items (2 per hat):

```json
[
  {
    "hat": "white|red|black|yellow|green|blue",
    "insight": "What this thinking mode reveals",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Deeper explanation of the insight",
    "bridge_title": "Suggested title for a bridge note",
    "bridge_body": "Brief content from this hat's perspective"
  }
]
```

Generate exactly 12 insights (2 per hat). Output only the JSON array, no additional text.""",

        "starbursting": """You are a master questioner using the Starbursting methodology. Your specialty is generating penetrating questions that reveal what's unknown, assumed, or unexplored in a body of knowledge.

## Your Mindset
The quality of your questions determines the quality of understanding. Great questions are specific enough to be answerable, yet probing enough to reveal genuine unknowns. Avoid rhetorical questions or questions with obvious answers. Each question should make someone pause and say "Hmm, I hadn't considered that."

## Notes from Knowledge Base
{notes_content}

## Your Task
Generate 12 thought-provoking questions using the 5W1H framework (2 per category).

## The 5W1H Framework

**Who - People and Stakeholders**
- Who would benefit most from these ideas?
- Who might be harmed or disadvantaged?
- Who is missing from this conversation?
- Who has the authority to implement these concepts?
- Whose perspective is underrepresented?

**What - Objects and Concepts**
- What exactly is being claimed?
- What concepts are undefined or fuzzy?
- What additional ideas would strengthen this?
- What's the core insight beneath the surface?
- What would falsify these claims?

**When - Time and Sequence**
- When would these ideas be most relevant?
- When did these concepts originate?
- When might these ideas become obsolete?
- What sequence or timing matters?
- What temporal dependencies exist?

**Where - Context and Domain**
- Where else could these concepts apply?
- Where do these ideas break down?
- What domains are unexplored?
- Where are the boundaries of applicability?
- In what contexts would this be inappropriate?

**Why - Purpose and Causation**
- Why do these connections matter?
- Why might someone disagree?
- Why was this approach chosen over alternatives?
- What's the deeper significance?
- Why hasn't this been explored before?

**How - Process and Mechanism**
- How would these ideas be implemented?
- How do we know this is true?
- How could we test these claims?
- How do these concepts interact?
- How could this be taught to others?

## Criteria for Excellent Questions
1. **Specific**: Reference exact concepts from the notes
2. **Probing**: Reveal genuine unknowns or assumptions
3. **Answerable**: Could be addressed with research or reflection
4. **Generative**: Lead toward potential bridge notes

## Output Format
Return a JSON array with exactly 12 items (2 per category):

```json
[
  {
    "question_type": "who|what|when|where|why|how",
    "question": "The specific, probing question",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this question matters and what it might reveal",
    "bridge_title": "Suggested title for a bridge note that answers this",
    "bridge_body": "Brief sketch of how a note could address this question"
  }
]
```

Generate exactly 12 questions (2 per category). Output only the JSON array, no additional text."""
    }
    return prompts.get(style_id, "")


def _get_default_expansion_prompt(style_id: str) -> str:
    """Get the default expansion prompt for a style."""
    prompts = {
        "big_mind_mapping": """You are a knowledge archaeologist who digs deeper into promising connections to unearth hidden layers of meaning. Your specialty is taking a broad connection and finding the specific, actionable sub-connections that make it concrete and useful.

## Your Mindset
Think of the original connection as a promising vein of gold. Your job is to follow it deeper, finding the specific nuggets that can be extracted and refined. Each sub-connection should be more specific and actionable than the original, not just a restatement at the same level of abstraction.

## Original Connection to Expand
{idea}

## Related Notes
{notes_content}

## Your Task
Generate exactly 5 deeper sub-connections that build on and extend the original insight.

## Criteria for Excellent Sub-Connections
Each sub-connection should:
1. **Go Deeper**: Be more specific than the original, not just a restatement
2. **Be Actionable**: Point toward a concrete bridge note that could be written
3. **Build Logically**: Show how it extends or refines the original insight
4. **Stand Alone**: Make sense even without reading the original connection
5. **Avoid Redundancy**: Each sub-connection should explore a different dimension

Think about:
- What specific mechanism explains this connection?
- What are the boundary conditions where this applies?
- What practical applications emerge from this insight?
- What related connections does this reveal?
- What would someone need to understand to fully grasp this?

## Output Format
Return a JSON array with exactly 5 items:

```json
[
  {
    "sub_idea": "Specific sub-connection that deepens the original",
    "builds_on": "How this extends or refines the original insight",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this sub-connection matters",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences of draft content for the bridge note"
  }
]
```

Generate exactly 5 sub-connections. Output only the JSON array, no additional text.""",

        "reverse_brainstorming": """You are a resolution architect who transforms problems into opportunities. Your specialty is taking a gap or contradiction and designing the bridge that resolves it while preserving the valuable tension.

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

```json
[
  {
    "resolution_approach": "How this addresses the gap/contradiction",
    "why_gap_exists": "Root cause analysis of why this gap/contradiction exists",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this resolution is valuable",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences of draft content that resolves the issue"
  }
]
```

Generate exactly 5 resolution approaches. Output only the JSON array, no additional text.""",

        "role_storming": """You are an integration specialist who synthesizes insights from multiple perspectives into coherent bridge notes that serve diverse audiences. Your specialty is finding the common ground and unique contributions of each viewpoint.

## Your Mindset
Each perspective (child, expert, skeptic, futurist) sees something true that the others miss. The child sees what's confusing. The expert sees what's sophisticated. The skeptic sees what's uncertain. The futurist sees what's emerging. Great bridge notes honor all of these without becoming watered-down compromises.

## Perspective Insights to Synthesize
{idea}

## Related Notes
{notes_content}

## Your Task
Create 5 bridge notes that integrate multiple perspectives, serving the needs of different audiences within a single note.

## Integration Strategies

**Layered Explanation**:
- Start with fundamentals (child), build to sophistication (expert)
- Acknowledge limitations throughout (skeptic)
- Point toward future implications (futurist)

**Perspective Synthesis**:
- Find where perspectives agree (strong foundation)
- Identify where they disagree (valuable tensions)
- Propose resolutions that honor all views

**Audience-Aware Writing**:
- Lead with accessibility, reward depth
- Flag assumptions explicitly
- Distinguish established facts from speculation

## Criteria for Excellent Integration
1. **Multi-Level Access**: Useful to beginners AND experts
2. **Intellectual Honesty**: Clear about what's known vs. assumed
3. **Forward-Looking**: Points toward implications and open questions
4. **Cohesive**: Feels like one unified note, not four glued together

## Output Format
Return a JSON array with exactly 5 items:

```json
[
  {
    "perspectives_integrated": ["child", "expert", "skeptic", "futurist"],
    "integration_approach": "How these perspectives are woven together",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this integration creates value",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences demonstrating the integrated approach"
  }
]
```

Generate exactly 5 integrated bridge notes. Output only the JSON array, no additional text.""",

        "scamper": """You are a synthesis engineer who combines multiple SCAMPER transformations into powerful hybrid insights. Your specialty is finding how different operations reinforce and amplify each other.

## Your Mindset
Individual SCAMPER operations are useful, but the real magic happens when you combine them. Substitute + Combine creates novel hybrids. Reverse + Adapt imports inverted concepts from other domains. Eliminate + Modify finds the essential core and amplifies it. Look for these synergies.

## SCAMPER Results to Synthesize
{idea}

## Related Notes
{notes_content}

## Your Task
Generate 5 synthesis notes that combine multiple SCAMPER operations for amplified insight.

## Powerful Combinations

**Substitute + Combine**: Replace a concept with something from another domain, then merge it with existing ideas
**Reverse + Adapt**: Invert a concept, then apply it to a new context
**Eliminate + Modify**: Strip to essentials, then amplify what remains
**Combine + Put to Other Uses**: Merge ideas, then apply the hybrid to unexpected problems
**Adapt + Reverse**: Import a concept from another field, then invert it

## Criteria for Excellent Synthesis
1. **Genuine Synergy**: The combination should be more than the sum of its parts
2. **Clear Mechanism**: Explain how the operations work together
3. **Concrete Output**: Each synthesis should yield a specific bridge note
4. **Novel Insight**: The combination should produce something non-obvious

## Output Format
Return a JSON array with exactly 5 items:

```json
[
  {
    "operations_combined": ["substitute", "combine"],
    "synergy_explanation": "How these operations amplify each other",
    "synthesis": "The insight that emerges from combining these operations",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this combination is valuable",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences capturing the synthesized insight"
  }
]
```

Generate exactly 5 synthesis notes. Output only the JSON array, no additional text.""",

        "six_thinking_hats": """You are a perspective integrator using the Six Thinking Hats methodology. Your specialty is finding where different thinking modes converge, diverge, and complement each other to produce balanced, actionable insights.

## Your Mindset
The six hats often reveal tensions: Black (risks) vs Yellow (benefits), Red (feelings) vs White (facts), Green (creativity) vs Blue (process). The most valuable bridge notes honor these tensions while finding productive synthesis. Don't smooth over conflicts; illuminate them.

## Hat Analysis to Integrate
{idea}

## Related Notes
{notes_content}

## Your Task
Generate 5 bridge notes that integrate insights from multiple thinking hats, creating balanced, multi-dimensional understanding.

## Integration Patterns

**Fact-Feeling Synthesis** (White + Red):
- Where do facts and intuitions align?
- Where do they conflict, and what does that reveal?

**Risk-Benefit Balance** (Black + Yellow):
- What risks and benefits are linked?
- How can benefits be preserved while mitigating risks?

**Creative Process** (Green + Blue):
- How can creative ideas be structured for action?
- What process would help develop green hat ideas further?

**Full Spectrum** (All Six):
- What consensus emerges across all hats?
- What hat is most important for this topic?

## Criteria for Excellent Integration
1. **Acknowledge Tensions**: Don't pretend all hats agree when they don't
2. **Find Productive Synthesis**: Move beyond "some say X, others say Y"
3. **Prioritize Appropriately**: Some situations call for more Black Hat, others more Green
4. **Be Actionable**: Each integration should yield a useful bridge note

## Output Format
Return a JSON array with exactly 5 items:

```json
[
  {
    "hats_integrated": ["white", "black", "yellow"],
    "tensions_identified": "Key disagreements or tensions between hats",
    "synthesis": "How these perspectives can be productively combined",
    "note_ids": ["note:conv1:note-1"],
    "reasoning": "Why this integration creates value",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences demonstrating the balanced perspective"
  }
]
```

Generate exactly 5 integration notes. Output only the JSON array, no additional text.""",

        "starbursting": """You are a question-answer architect who transforms probing questions into substantive bridge notes. Your specialty is providing thoughtful, evidence-based answers while acknowledging uncertainty.

## Your Mindset
Great questions deserve great answers, but great answers also acknowledge their limits. When answering from the notes, distinguish between what's explicitly stated, what can be reasonably inferred, and what requires additional research. A bridge note that says "we don't know, but here's what would help us find out" is more valuable than a confident guess.

## Questions to Answer
{idea}

## Related Notes
{notes_content}

## Your Task
Select the 5 most valuable questions and create bridge notes that answer them based on the available evidence in the knowledge graph.

## Answer Quality Criteria

**For Questions with Clear Answers**:
- Cite specific notes as evidence
- Explain the reasoning chain
- Acknowledge limitations of the evidence

**For Questions with Partial Answers**:
- State what IS known
- Identify what remains unknown
- Suggest how to find out more

**For Questions with No Clear Answer**:
- Explain why this is hard to answer
- Propose how the question could be decomposed
- Suggest what research would help

## Criteria for Excellent Answers
1. **Evidence-Based**: Cite specific notes, don't just opine
2. **Intellectually Honest**: Clear about certainty levels
3. **Constructive**: Even "I don't know" should point forward
4. **Actionable**: Each answer should enable a useful bridge note

## Output Format
Return a JSON array with exactly 5 items:

```json
[
  {
    "question": "The original question being answered",
    "answer_type": "clear|partial|unknown",
    "answer": "The substantive answer based on the notes",
    "evidence": "Specific notes and reasoning supporting this answer",
    "note_ids": ["note:conv1:note-1"],
    "uncertainty": "What remains unknown or assumed",
    "bridge_title": "Suggested title for bridge note",
    "bridge_body": "2-3 sentences capturing the answer and its context"
  }
]
```

Generate exactly 5 answered questions. Output only the JSON array, no additional text."""
    }
    return prompts.get(style_id, "")
