"""
Question set management for monitor campaigns.
Stores question sets as markdown files with CRUD operations.
"""
import os
import re
from pathlib import Path
from typing import List, Dict, Optional

# Question sets directory - configurable for Docker
QUESTION_SETS_DIR = Path(os.getenv("QUESTION_SETS_DIR", "question_sets"))


def ensure_question_sets_dir():
    """Ensure the question sets directory exists."""
    QUESTION_SETS_DIR.mkdir(exist_ok=True)


def get_filename(title: str) -> str:
    """Convert title to filename (lowercase, hyphens, .md extension)."""
    filename = title.lower().replace(' ', '-')
    # Remove special characters
    filename = ''.join(c for c in filename if c.isalnum() or c == '-')
    if not filename.endswith('.md'):
        filename += '.md'
    return filename


def parse_question_set(content: str) -> Dict:
    """
    Parse markdown content into structured question set.

    Expected format:
    # Title

    Description text (optional)

    ## Questions
    - key: Question text here
    - another_key: Another question text

    ## Output Schema (optional)
    - key: description of expected output

    Returns:
        {
            "title": str,
            "description": str,
            "questions": {"key": "question text", ...},
            "output_schema": {"key": "description", ...} or None
        }
    """
    result = {
        "title": "Untitled",
        "description": "",
        "questions": {},
        "output_schema": None
    }

    lines = content.strip().split('\n')
    current_section = None
    description_lines = []

    for line in lines:
        stripped = line.strip()

        # Extract title from first H1
        if stripped.startswith('# ') and result["title"] == "Untitled":
            result["title"] = stripped[2:].strip()
            continue

        # Detect section headers
        if stripped.startswith('## Questions'):
            current_section = 'questions'
            continue
        elif stripped.startswith('## Output Schema'):
            current_section = 'output_schema'
            result["output_schema"] = {}
            continue
        elif stripped.startswith('## '):
            current_section = None
            continue

        # Parse list items in sections
        if current_section and stripped.startswith('- '):
            # Parse "- key: value" format
            item_content = stripped[2:].strip()
            match = re.match(r'^(\w+):\s*(.+)$', item_content)
            if match:
                key, value = match.groups()
                if current_section == 'questions':
                    result["questions"][key] = value
                elif current_section == 'output_schema':
                    result["output_schema"][key] = value

        # Collect description (text before ## Questions)
        elif current_section is None and stripped and not stripped.startswith('#'):
            description_lines.append(stripped)

    result["description"] = ' '.join(description_lines)

    return result


def format_question_set(title: str, questions: Dict[str, str], description: str = "", output_schema: Dict[str, str] = None) -> str:
    """
    Format a question set as markdown content.

    Args:
        title: Question set title
        questions: Dict of {key: question_text}
        description: Optional description
        output_schema: Optional output schema {key: description}

    Returns:
        Formatted markdown string
    """
    lines = [f"# {title}", ""]

    if description:
        lines.extend([description, ""])

    lines.append("## Questions")
    for key, question in questions.items():
        lines.append(f"- {key}: {question}")

    if output_schema:
        lines.extend(["", "## Output Schema"])
        for key, desc in output_schema.items():
            lines.append(f"- {key}: {desc}")

    return '\n'.join(lines)


def list_question_sets() -> List[Dict]:
    """
    List all available question sets.

    Returns:
        List of dicts with 'filename', 'title', 'description', 'question_count'
    """
    ensure_question_sets_dir()
    question_sets = []

    for filepath in sorted(QUESTION_SETS_DIR.glob("*.md")):
        try:
            content = filepath.read_text(encoding='utf-8')
            parsed = parse_question_set(content)
            question_sets.append({
                "filename": filepath.name,
                "title": parsed["title"],
                "description": parsed["description"],
                "question_count": len(parsed["questions"])
            })
        except Exception as e:
            print(f"Error reading question set {filepath}: {e}")
            continue

    return question_sets


def get_question_set(filename: str) -> Optional[Dict]:
    """
    Get a specific question set by filename.

    Returns:
        Dict with 'filename', 'title', 'description', 'questions', 'output_schema', 'content'
        or None if not found.
    """
    ensure_question_sets_dir()
    filepath = QUESTION_SETS_DIR / filename

    if not filepath.exists() or not filepath.is_file():
        return None

    try:
        content = filepath.read_text(encoding='utf-8')
        parsed = parse_question_set(content)
        return {
            "filename": filename,
            "title": parsed["title"],
            "description": parsed["description"],
            "questions": parsed["questions"],
            "output_schema": parsed["output_schema"],
            "content": content
        }
    except Exception as e:
        print(f"Error reading question set {filepath}: {e}")
        return None


def get_question_set_by_name(name: str) -> Optional[Dict]:
    """
    Get a question set by name (for backwards compatibility).
    Tries exact filename match first, then searches by title.

    Args:
        name: Question set name or filename (e.g., "default_b2b_saas_v1" or "default-b2b-saas.md")

    Returns:
        Question set dict or None
    """
    ensure_question_sets_dir()

    # Try direct filename match
    if name.endswith('.md'):
        return get_question_set(name)

    # Try with .md extension
    result = get_question_set(f"{name}.md")
    if result:
        return result

    # Try converting underscores to hyphens
    converted = name.replace('_', '-')
    result = get_question_set(f"{converted}.md")
    if result:
        return result

    # Search by title match
    for filepath in QUESTION_SETS_DIR.glob("*.md"):
        try:
            content = filepath.read_text(encoding='utf-8')
            parsed = parse_question_set(content)
            # Check if title matches (case-insensitive)
            if parsed["title"].lower().replace(' ', '_') == name.lower():
                return get_question_set(filepath.name)
        except Exception:
            continue

    return None


def create_question_set(title: str, questions: Dict[str, str], description: str = "", output_schema: Dict[str, str] = None) -> Dict:
    """
    Create a new question set file.

    Args:
        title: Question set title
        questions: Dict of {key: question_text}
        description: Optional description
        output_schema: Optional output schema

    Returns:
        Dict with created question set info

    Raises:
        ValueError: If file already exists
    """
    ensure_question_sets_dir()

    filename = get_filename(title)
    filepath = QUESTION_SETS_DIR / filename

    if filepath.exists():
        raise ValueError(f"Question set file '{filename}' already exists")

    content = format_question_set(title, questions, description, output_schema)
    filepath.write_text(content, encoding='utf-8')

    return {
        "filename": filename,
        "title": title,
        "description": description,
        "questions": questions,
        "output_schema": output_schema,
        "content": content
    }


def update_question_set(filename: str, content: str = None, questions: Dict[str, str] = None, description: str = None, output_schema: Dict[str, str] = None) -> Dict:
    """
    Update an existing question set file.

    Can either provide raw content, or structured updates (questions, description, output_schema).

    Returns:
        Dict with updated question set info

    Raises:
        ValueError: If file doesn't exist
    """
    ensure_question_sets_dir()
    filepath = QUESTION_SETS_DIR / filename

    if not filepath.exists():
        raise ValueError(f"Question set file '{filename}' does not exist")

    if content is not None:
        # Use raw content directly
        filepath.write_text(content, encoding='utf-8')
        parsed = parse_question_set(content)
        return {
            "filename": filename,
            "title": parsed["title"],
            "description": parsed["description"],
            "questions": parsed["questions"],
            "output_schema": parsed["output_schema"],
            "content": content
        }
    else:
        # Update structured fields
        existing = get_question_set(filename)
        if not existing:
            raise ValueError(f"Question set file '{filename}' does not exist")

        new_questions = questions if questions is not None else existing["questions"]
        new_description = description if description is not None else existing["description"]
        new_output_schema = output_schema if output_schema is not None else existing["output_schema"]

        new_content = format_question_set(existing["title"], new_questions, new_description, new_output_schema)
        filepath.write_text(new_content, encoding='utf-8')

        return {
            "filename": filename,
            "title": existing["title"],
            "description": new_description,
            "questions": new_questions,
            "output_schema": new_output_schema,
            "content": new_content
        }


def delete_question_set(filename: str) -> bool:
    """
    Delete a question set file.

    Returns:
        True if successful

    Raises:
        ValueError: If file doesn't exist
    """
    ensure_question_sets_dir()
    filepath = QUESTION_SETS_DIR / filename

    if not filepath.exists():
        raise ValueError(f"Question set file '{filename}' does not exist")

    filepath.unlink()
    return True


def get_default_question_set() -> Dict:
    """
    Get the default question set.
    Falls back to hardcoded if file doesn't exist.
    """
    result = get_question_set_by_name("default-b2b-saas")

    if result:
        return result

    # Fallback to hardcoded default
    return {
        "filename": "default-b2b-saas.md",
        "title": "B2B SaaS Analysis",
        "description": "Default question set for analyzing B2B SaaS competitors.",
        "questions": {
            "icp": "Who is the ideal customer? What company size, industry, and role does this product target?",
            "problem": "What problem does this product solve? What pain points does it address?",
            "value_props": "What are the main value propositions? What benefits does the product claim to provide?",
            "pricing": "What is the pricing model? Are there tiers? Is there a free tier or trial?",
            "security": "What security or compliance claims are made? (SOC 2, HIPAA, GDPR, etc.)",
            "themes": "What are the key messaging themes and positioning? How does the product differentiate itself?"
        },
        "output_schema": None,
        "content": None
    }
