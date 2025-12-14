"""
Prompt management for system prompts stored as markdown files.
"""
import os
import json
from pathlib import Path
from typing import List, Dict, Optional

# Prompts directory - configurable for Docker
PROMPTS_DIR = Path(os.getenv("PROMPTS_DIR", "prompts"))

# Stage prompt files to exclude from system prompts list
STAGE_PROMPT_FILES = {"ranking.md", "chairman.md"}

# Config directory for labels storage
CONFIG_DIR = Path(os.getenv("CONFIG_DIR", "data/config"))
LABELS_FILE = CONFIG_DIR / "prompt_labels.json"

# Cheap model for generating labels
LABEL_MODEL = "openai/gpt-4.1-mini"

def ensure_prompts_dir():
    """Ensure the prompts directory exists."""
    PROMPTS_DIR.mkdir(exist_ok=True)

def extract_title_from_markdown(content: str) -> str:
    """Extract title from markdown content (first # heading)."""
    for line in content.strip().split('\n'):
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
    return "Untitled"

def get_prompt_filename(title: str) -> str:
    """Convert title to filename (lowercase, hyphens, .md extension)."""
    filename = title.lower().replace(' ', '-')
    # Remove special characters
    filename = ''.join(c for c in filename if c.isalnum() or c == '-')
    if not filename.endswith('.md'):
        filename += '.md'
    return filename

def list_prompts(mode: Optional[str] = None) -> List[Dict[str, str]]:
    """
    List all available prompts, optionally filtered by mode.

    Args:
        mode: Optional filter - 'council' or 'synthesizer'.
              If None, returns prompts from root directory (backwards compat).

    Returns:
        List of dicts with 'filename', 'title', 'content', and 'mode'.
    """
    ensure_prompts_dir()
    prompts = []

    # Determine which directory to search
    if mode and mode in ('council', 'synthesizer'):
        search_dir = PROMPTS_DIR / mode
        if not search_dir.exists():
            return []
    else:
        # Root directory for backwards compatibility
        search_dir = PROMPTS_DIR

    for filepath in sorted(search_dir.glob("*.md")):
        # Skip stage prompt files when listing council prompts
        if mode == 'council' and filepath.name in STAGE_PROMPT_FILES:
            continue

        try:
            content = filepath.read_text(encoding='utf-8')
            title = extract_title_from_markdown(content)
            prompts.append({
                "filename": filepath.name,
                "title": title,
                "content": content,
                "mode": mode or "root"
            })
        except Exception as e:
            print(f"Error reading prompt {filepath}: {e}")
            continue

    return prompts

def get_prompt(filename: str, mode: Optional[str] = None) -> Optional[Dict[str, str]]:
    """
    Get a specific prompt by filename.

    Args:
        filename: The prompt filename
        mode: Optional mode ('council' or 'synthesizer') to look in subdirectory

    Returns:
        Dict with 'filename', 'title', 'content', and 'mode', or None if not found.
    """
    ensure_prompts_dir()

    # Determine base directory
    if mode and mode in ('council', 'synthesizer'):
        base_dir = PROMPTS_DIR / mode
    else:
        base_dir = PROMPTS_DIR

    filepath = base_dir / filename

    if not filepath.exists() or not filepath.is_file():
        return None

    try:
        content = filepath.read_text(encoding='utf-8')
        title = extract_title_from_markdown(content)
        return {
            "filename": filename,
            "title": title,
            "content": content,
            "mode": mode or "root"
        }
    except Exception as e:
        print(f"Error reading prompt {filepath}: {e}")
        return None

def create_prompt(title: str, content: str, mode: Optional[str] = None) -> Dict[str, str]:
    """
    Create a new prompt file.

    Args:
        title: The prompt title
        content: The prompt content
        mode: Optional mode ('council' or 'synthesizer') for subdirectory

    Returns:
        Dict with 'filename', 'title', 'content', and 'mode'.
    Raises:
        ValueError if file already exists.
    """
    ensure_prompts_dir()

    # Ensure content starts with title as H1
    if not content.strip().startswith(f"# {title}"):
        content = f"# {title}\n\n{content.strip()}"

    filename = get_prompt_filename(title)

    # Determine base directory
    if mode and mode in ('council', 'synthesizer'):
        base_dir = PROMPTS_DIR / mode
        base_dir.mkdir(exist_ok=True)
    else:
        base_dir = PROMPTS_DIR

    filepath = base_dir / filename

    if filepath.exists():
        raise ValueError(f"Prompt file '{filename}' already exists")

    filepath.write_text(content, encoding='utf-8')

    return {
        "filename": filename,
        "title": title,
        "content": content,
        "mode": mode or "root"
    }

def update_prompt(filename: str, content: str, mode: Optional[str] = None) -> Dict[str, str]:
    """
    Update an existing prompt file.

    Args:
        filename: The prompt filename
        content: The new prompt content
        mode: Optional mode ('council' or 'synthesizer') for subdirectory

    Returns:
        Dict with 'filename', 'title', 'content', and 'mode'.
    Raises:
        ValueError if file doesn't exist.
    """
    ensure_prompts_dir()

    # Determine base directory
    if mode and mode in ('council', 'synthesizer'):
        base_dir = PROMPTS_DIR / mode
    else:
        base_dir = PROMPTS_DIR

    filepath = base_dir / filename

    if not filepath.exists():
        raise ValueError(f"Prompt file '{filename}' does not exist")

    filepath.write_text(content, encoding='utf-8')
    title = extract_title_from_markdown(content)

    return {
        "filename": filename,
        "title": title,
        "content": content,
        "mode": mode or "root"
    }

def delete_prompt(filename: str, mode: Optional[str] = None) -> bool:
    """
    Delete a prompt file.

    Args:
        filename: The prompt filename
        mode: Optional mode ('council' or 'synthesizer') for subdirectory

    Returns:
        True if successful.
    Raises:
        ValueError if file doesn't exist.
    """
    ensure_prompts_dir()

    # Determine base directory
    if mode and mode in ('council', 'synthesizer'):
        base_dir = PROMPTS_DIR / mode
    else:
        base_dir = PROMPTS_DIR

    filepath = base_dir / filename

    if not filepath.exists():
        raise ValueError(f"Prompt file '{filename}' does not exist")

    filepath.unlink()

    # Also remove label if exists (use mode-prefixed key)
    label_key = f"{mode}/{filename}" if mode else filename
    labels = load_labels()
    if label_key in labels:
        del labels[label_key]
        save_labels(labels)
    # Also check old-style key for backwards compat
    if filename in labels:
        del labels[filename]
        save_labels(labels)

    return True


# =============================================================================
# Prompt Label Management
# =============================================================================

def ensure_config_dir():
    """Ensure the config directory exists."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_labels() -> Dict[str, str]:
    """Load prompt labels from file."""
    if not LABELS_FILE.exists():
        return {}
    try:
        return json.loads(LABELS_FILE.read_text())
    except (json.JSONDecodeError, IOError):
        return {}


def save_labels(labels: Dict[str, str]) -> None:
    """Save prompt labels to file."""
    ensure_config_dir()
    LABELS_FILE.write_text(json.dumps(labels, indent=2))


def get_label(filename: str) -> Optional[str]:
    """Get cached label for a prompt."""
    return load_labels().get(filename)


def set_label(filename: str, label: str) -> None:
    """Set label for a prompt."""
    labels = load_labels()
    labels[filename] = label
    save_labels(labels)


async def generate_label(title: str, content: str) -> str:
    """
    Generate a single-word label using a cheap LLM.

    Args:
        title: The prompt title
        content: The prompt content

    Returns:
        A single-word label (capitalized)
    """
    from .openrouter import query_model

    messages = [{
        "role": "user",
        "content": f"""Generate a single word (one word only, no punctuation) that best categorizes this system prompt. The word should be a noun or adjective that captures the essence of the prompt's purpose.

Title: {title}
Content preview: {content[:500]}

Reply with exactly one word:"""
    }]

    try:
        result = await query_model(LABEL_MODEL, messages, timeout=10.0)
        if result and result.get("content"):
            # Clean up response - extract single word
            label = result["content"].strip().split()[0].strip('.,!?:;"\'')
            return label.capitalize()
    except Exception as e:
        print(f"Error generating label: {e}")

    return "General"  # Fallback


async def list_prompts_with_labels(mode: Optional[str] = None) -> List[Dict[str, str]]:
    """
    List all prompts with their labels.
    Lazily generates labels for prompts that don't have one.

    Args:
        mode: Optional filter - 'council' or 'synthesizer'.
    """
    import asyncio

    prompts_list = list_prompts(mode)
    labels = load_labels()
    pending_labels = []

    for prompt in prompts_list:
        # Use mode-prefixed key for labels
        label_key = f"{mode}/{prompt['filename']}" if mode else prompt["filename"]
        if label_key in labels:
            prompt["short_label"] = labels[label_key]
        elif prompt["filename"] in labels:
            # Backwards compat: try old-style key
            prompt["short_label"] = labels[prompt["filename"]]
        else:
            # Queue for lazy generation
            pending_labels.append(prompt)
            prompt["short_label"] = None

    # Generate missing labels (one-time migration for existing prompts)
    if pending_labels:
        tasks = [generate_label(p["title"], p["content"]) for p in pending_labels]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for prompt, label in zip(pending_labels, results):
            label_key = f"{mode}/{prompt['filename']}" if mode else prompt["filename"]
            if isinstance(label, str):
                set_label(label_key, label)
                prompt["short_label"] = label
            else:
                # On error, use a fallback
                prompt["short_label"] = "General"

    return prompts_list


async def create_prompt_with_label(title: str, content: str, mode: Optional[str] = None) -> Dict[str, str]:
    """
    Create a new prompt and generate its label.

    Args:
        title: The prompt title
        content: The prompt content
        mode: Optional mode ('council' or 'synthesizer') for subdirectory

    Returns:
        Dict with filename, title, content, mode, and short_label
    """
    prompt = create_prompt(title, content, mode)

    # Generate and store label with mode-prefixed key
    label = await generate_label(title, content)
    label_key = f"{mode}/{prompt['filename']}" if mode else prompt["filename"]
    set_label(label_key, label)
    prompt["short_label"] = label

    return prompt


def get_labels_mapping() -> Dict[str, str]:
    """
    Get mapping of prompt titles to labels.
    This is used to lookup labels by title (since conversations store full prompt content).
    """
    prompts_list = list_prompts()
    labels = load_labels()

    title_to_label = {}
    for prompt in prompts_list:
        if prompt["filename"] in labels:
            title_to_label[prompt["title"]] = labels[prompt["filename"]]

    return title_to_label
