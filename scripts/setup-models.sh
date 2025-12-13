#!/bin/bash
# Pre-download ML models for Wizengamot
# Run this once to avoid delays on first use of YouTube/podcast transcription

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Wizengamot Model Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "This script downloads ML models used by Wizengamot:"
echo "  - Whisper base model (~150MB) - audio transcription"
echo "  - fastembed model (~50MB) - semantic search"
echo ""
echo "This may take a few minutes depending on your connection."
echo ""

# Suppress tokenizer warnings
export TOKENIZERS_PARALLELISM=false

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}Error: uv not found. Please install uv first:${NC}"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "$PROJECT_ROOT/.venv" ]; then
    echo -e "${YELLOW}Python dependencies not installed. Running uv sync...${NC}"
    uv sync
    echo ""
fi

echo "Downloading models..."
echo ""

uv run python -c "
import sys

print('1/2: Downloading Whisper base model (~150MB)...')
print('     This is used for YouTube and podcast transcription.')
try:
    import whisper
    model = whisper.load_model('base')
    print('     Whisper model downloaded successfully!')
except ImportError:
    print('     Warning: whisper package not installed')
    print('     Run: uv sync')
except Exception as e:
    print(f'     Warning: Could not download Whisper model: {e}')

print('')
print('2/2: Downloading fastembed model (~50MB)...')
print('     This is used for semantic search (Cmd+K).')
try:
    from fastembed import TextEmbedding
    embedding = TextEmbedding('BAAI/bge-small-en-v1.5')
    # Trigger actual model download by running inference
    list(embedding.embed(['test']))
    print('     fastembed model downloaded successfully!')
except ImportError:
    print('     Warning: fastembed package not installed')
    print('     Run: uv sync')
except Exception as e:
    print(f'     Warning: Could not download fastembed model: {e}')

print('')
"

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Model setup complete!${NC}"
echo ""
echo "You can now run ./start.sh to start Wizengamot."
echo ""
