"""
Prompt management for system prompts stored as markdown files.
"""
import os
import json
from pathlib import Path
from typing import List, Dict, Optional

# Prompts directory - configurable for Docker
PROMPTS_DIR = Path(os.getenv("PROMPTS_DIR", "prompts"))

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

def list_prompts() -> List[Dict[str, str]]:
    """
    List all available prompts.
    Returns list of dicts with 'filename', 'title', and 'content'.
    """
    ensure_prompts_dir()
    prompts = []

    for filepath in sorted(PROMPTS_DIR.glob("*.md")):
        try:
            content = filepath.read_text(encoding='utf-8')
            title = extract_title_from_markdown(content)
            prompts.append({
                "filename": filepath.name,
                "title": title,
                "content": content
            })
        except Exception as e:
            print(f"Error reading prompt {filepath}: {e}")
            continue

    return prompts

def get_prompt(filename: str) -> Optional[Dict[str, str]]:
    """
    Get a specific prompt by filename.
    Returns dict with 'filename', 'title', and 'content', or None if not found.
    """
    ensure_prompts_dir()
    filepath = PROMPTS_DIR / filename

    if not filepath.exists() or not filepath.is_file():
        return None

    try:
        content = filepath.read_text(encoding='utf-8')
        title = extract_title_from_markdown(content)
        return {
            "filename": filename,
            "title": title,
            "content": content
        }
    except Exception as e:
        print(f"Error reading prompt {filepath}: {e}")
        return None

def create_prompt(title: str, content: str) -> Dict[str, str]:
    """
    Create a new prompt file.
    Returns dict with 'filename', 'title', and 'content'.
    Raises ValueError if file already exists.
    """
    ensure_prompts_dir()

    # Ensure content starts with title as H1
    if not content.strip().startswith(f"# {title}"):
        content = f"# {title}\n\n{content.strip()}"

    filename = get_prompt_filename(title)
    filepath = PROMPTS_DIR / filename

    if filepath.exists():
        raise ValueError(f"Prompt file '{filename}' already exists")

    filepath.write_text(content, encoding='utf-8')

    return {
        "filename": filename,
        "title": title,
        "content": content
    }

def update_prompt(filename: str, content: str) -> Dict[str, str]:
    """
    Update an existing prompt file.
    Returns dict with 'filename', 'title', and 'content'.
    Raises ValueError if file doesn't exist.
    """
    ensure_prompts_dir()
    filepath = PROMPTS_DIR / filename

    if not filepath.exists():
        raise ValueError(f"Prompt file '{filename}' does not exist")

    filepath.write_text(content, encoding='utf-8')
    title = extract_title_from_markdown(content)

    return {
        "filename": filename,
        "title": title,
        "content": content
    }

def delete_prompt(filename: str) -> bool:
    """
    Delete a prompt file.
    Returns True if successful, raises ValueError if file doesn't exist.
    """
    ensure_prompts_dir()
    filepath = PROMPTS_DIR / filename

    if not filepath.exists():
        raise ValueError(f"Prompt file '{filename}' does not exist")

    filepath.unlink()

    # Also remove label if exists
    labels = load_labels()
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


async def list_prompts_with_labels() -> List[Dict[str, str]]:
    """
    List all prompts with their labels.
    Lazily generates labels for prompts that don't have one.
    """
    import asyncio

    prompts_list = list_prompts()
    labels = load_labels()
    pending_labels = []

    for prompt in prompts_list:
        if prompt["filename"] in labels:
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
            if isinstance(label, str):
                set_label(prompt["filename"], label)
                prompt["short_label"] = label
            else:
                # On error, use a fallback
                prompt["short_label"] = "General"

    return prompts_list


async def create_prompt_with_label(title: str, content: str) -> Dict[str, str]:
    """
    Create a new prompt and generate its label.

    Args:
        title: The prompt title
        content: The prompt content

    Returns:
        Dict with filename, title, content, and short_label
    """
    prompt = create_prompt(title, content)

    # Generate and store label
    label = await generate_label(title, content)
    set_label(prompt["filename"], label)
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
