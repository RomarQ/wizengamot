"""
Diagram style management for Visualiser mode.
Stores diagram styles as markdown files with YAML frontmatter.
"""
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any

# Prompts directory - configurable for Docker
PROMPTS_DIR = Path(os.getenv("PROMPTS_DIR", "prompts"))
STYLES_DIR = PROMPTS_DIR / "visualiser"


def ensure_styles_dir():
    """Ensure the visualiser styles directory exists."""
    STYLES_DIR.mkdir(parents=True, exist_ok=True)


def parse_frontmatter(content: str) -> tuple[Dict[str, str], str]:
    """
    Parse YAML frontmatter from markdown content.

    Expected format:
    ---
    name: Style Name
    description: Description text
    icon: lucide-icon-name
    ---

    Prompt content here...

    Returns:
        Tuple of (frontmatter_dict, body_content)
    """
    frontmatter = {}
    body = content

    # Match frontmatter block
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
    if match:
        fm_text, body = match.groups()
        # Parse simple key: value pairs
        for line in fm_text.strip().split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                frontmatter[key.strip()] = value.strip()

    return frontmatter, body.strip()


def format_style_file(name: str, description: str, icon: str, prompt: str) -> str:
    """
    Format a diagram style as markdown with frontmatter.

    Args:
        name: Display name
        description: Short description
        icon: Lucide icon name
        prompt: The generation prompt

    Returns:
        Formatted markdown string
    """
    return f"""---
name: {name}
description: {description}
icon: {icon}
---

{prompt}
"""


def list_diagram_styles() -> Dict[str, Dict[str, str]]:
    """
    List all available diagram styles.

    Returns:
        Dict mapping style_id to {name, description, icon, prompt}
    """
    ensure_styles_dir()
    styles = {}

    for filepath in sorted(STYLES_DIR.glob("*.md")):
        try:
            content = filepath.read_text(encoding='utf-8')
            frontmatter, prompt = parse_frontmatter(content)

            style_id = filepath.stem  # filename without extension
            styles[style_id] = {
                "name": frontmatter.get("name", style_id.replace("_", " ").title()),
                "description": frontmatter.get("description", ""),
                "icon": frontmatter.get("icon", "image"),
                "prompt": prompt
            }
        except Exception as e:
            print(f"Error reading style {filepath}: {e}")
            continue

    return styles


def get_diagram_style(style_id: str) -> Optional[Dict[str, str]]:
    """
    Get a specific diagram style by ID.

    Args:
        style_id: Style identifier (filename without .md)

    Returns:
        Dict with name, description, icon, prompt or None if not found
    """
    ensure_styles_dir()
    filepath = STYLES_DIR / f"{style_id}.md"

    if not filepath.exists():
        return None

    try:
        content = filepath.read_text(encoding='utf-8')
        frontmatter, prompt = parse_frontmatter(content)

        return {
            "name": frontmatter.get("name", style_id.replace("_", " ").title()),
            "description": frontmatter.get("description", ""),
            "icon": frontmatter.get("icon", "image"),
            "prompt": prompt
        }
    except Exception as e:
        print(f"Error reading style {filepath}: {e}")
        return None


def create_diagram_style(style_id: str, name: str, description: str, icon: str, prompt: str) -> bool:
    """
    Create a new diagram style.

    Args:
        style_id: Unique identifier (will become filename)
        name: Display name
        description: Short description
        icon: Lucide icon name
        prompt: The generation prompt

    Returns:
        True if created, False if style_id already exists
    """
    ensure_styles_dir()
    filepath = STYLES_DIR / f"{style_id}.md"

    if filepath.exists():
        return False

    content = format_style_file(name, description, icon, prompt)
    filepath.write_text(content, encoding='utf-8')
    return True


def update_diagram_style(style_id: str, name: str, description: str, icon: str, prompt: str) -> bool:
    """
    Update an existing diagram style.

    Returns:
        True if updated, False if not found
    """
    ensure_styles_dir()
    filepath = STYLES_DIR / f"{style_id}.md"

    if not filepath.exists():
        return False

    content = format_style_file(name, description, icon, prompt)
    filepath.write_text(content, encoding='utf-8')
    return True


def delete_diagram_style(style_id: str) -> bool:
    """
    Delete a diagram style.

    Returns:
        True if deleted, False if not found or is the last style
    """
    ensure_styles_dir()
    filepath = STYLES_DIR / f"{style_id}.md"

    if not filepath.exists():
        return False

    # Don't allow deleting the last style
    remaining = list(STYLES_DIR.glob("*.md"))
    if len(remaining) <= 1:
        return False

    filepath.unlink()
    return True


def get_style_prompt(style_id: str) -> Optional[str]:
    """
    Get just the prompt for a style (for use in visualiser.py).

    Returns:
        The prompt string or None if not found
    """
    style = get_diagram_style(style_id)
    return style["prompt"] if style else None
